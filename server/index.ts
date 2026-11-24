import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getPool, sql } from './db';
import {
  MOBILE_ALLOWED_ROLES,
  SEED_ACCOUNTS,
  requireAuth,
  requireRoles,
  revokeToken,
  signToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth';
import {
  UPLOADS_DIR,
  store,
  type ExtendedNotificationItem,
  type ExtendedPrRecord,
  type ExtendedTransactionLog,
  type ExtendedWithdrawalRecord,
  type StoredAttachmentMeta,
} from './store';
import { ITEMIZED_FITTINGS_PRESET } from '../src/data/seedData';
import type { BoqItem, FileAttachment, PqtoRecord, PrLineItem, UserRole } from '../src/types/erp';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

const ALLOWED_EXTENSIONS = new Set(['PDF', 'JPG', 'JPEG', 'PNG', 'XLSX']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ROLE_VISIBLE_LOG_MODULES: Record<UserRole, string[]> = {
  'Applicant/Requestor': ['BOQ', 'PQTO', 'PR', 'PO', 'WITHDRAWAL', 'SYSTEM', 'SMTP'],
  'REQ Approver': ['BOQ', 'PQTO', 'PR', 'PO', 'SYSTEM', 'SMTP'],
  'PO Approver': ['BOQ', 'PQTO', 'PR', 'PO', 'SYSTEM', 'SMTP'],
  'Warehouse Manager': ['RECEIVING', 'WITHDRAWAL', 'TRANSFERS', 'PO', 'INVENTORY', 'SYSTEM', 'SMTP'],
  Purchaser: ['BOQ', 'PQTO', 'PR', 'PO', 'INVENTORY', 'SYSTEM', 'SMTP'],
  Admin: ['BOQ', 'PQTO', 'PR', 'PO', 'RECEIVING', 'WITHDRAWAL', 'TRANSFERS', 'INVENTORY', 'SYSTEM', 'SMTP'],
};

function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function nowShortStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function appendLog(
  user: { fullName: string; role: UserRole },
  moduleName: string,
  docNo: string,
  action: string,
  comments: string,
  spName = 'SP-MECH-ALPHA'
): ExtendedTransactionLog {
  const entry: ExtendedTransactionLog = {
    id: `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: nowStamp(),
    adminOrUser: user.fullName,
    userRole: user.role,
    spName,
    module: moduleName,
    docNo,
    action,
    comments,
  };
  store.getState().logs.unshift(entry);
  store.save();
  return entry;
}

function pushNotification(
  recipientRole: 'Approver' | 'Applicant',
  title: string,
  message: string,
  link?: { docType: ExtendedNotificationItem['docType']; docId: string; docNo: string }
): ExtendedNotificationItem {
  const item: ExtendedNotificationItem = {
    id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    recipientRole,
    title,
    message,
    timestamp: nowShortStamp(),
    read: false,
    docType: link?.docType,
    docId: link?.docId,
    docNo: link?.docNo,
  };
  store.getState().notifications.unshift(item);
  store.save();
  return item;
}

function findPqtoByNo(pqtoNo: string): PqtoRecord | undefined {
  const state = store.getState();
  for (const list of Object.values(state.pqtosByProject)) {
    const found = list.find((p) => p.pqtoNo === pqtoNo);
    if (found) return found;
  }
  return undefined;
}

function computePqtoRemaining(pqto: PqtoRecord | undefined, itemCode: string): number | null {
  if (!pqto) return null;
  const match = pqto.items.find((i) => i.itemCode.toLowerCase() === itemCode.trim().toLowerCase());
  if (!match) return null;
  return Math.max(0, match.pqtoQty - match.prOrderedQty);
}

function adjustPqtoOrderedQty(pqtoNo: string, items: PrLineItem[], deltaSign: 1 | -1): void {
  const pqto = findPqtoByNo(pqtoNo);
  if (!pqto) return;
  for (const line of items) {
    if (line.isNewItem) continue;
    const target = pqto.items.find(
      (p) => p.itemCode.toLowerCase() === line.itemCode.trim().toLowerCase()
    );
    if (target) {
      target.prOrderedQty = Math.max(0, target.prOrderedQty + deltaSign * line.requestedQty);
    }
  }
}

// ============================================================================
// 1. HEALTH & PROJECTS
// ============================================================================

app.get('/api/health', async (_req, res) => {
  const mssqlStatus = await store.checkMssqlHealth();
  res.json({
    status: 'ok',
    engine: mssqlStatus.connected ? 'MSSQL' : 'PERSISTENT_STORE',
    mssqlConnected: mssqlStatus.connected,
    ...(mssqlStatus.connected ? {} : { note: mssqlStatus.error }),
    timestamp: nowStamp(),
  });
});

app.get('/api/projects', requireAuth, (_req, res) => {
  const state = store.getState();
  res.json({
    projects: state.projects,
    config: state.config,
  });
});

// ============================================================================
// 2. AUTHENTICATION (WITH MOBILE 2-ROLE ENFORCEMENT)
// ============================================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password, client } = req.body as {
      email?: string;
      username?: string;
      password?: string;
      client?: 'mobile' | 'web';
    };

    const identifier = (email || username || '').trim().toLowerCase();
    const pwd = String(password || '');

    if (!identifier || !pwd) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const account = SEED_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === identifier && verifyPassword(pwd, acc.passwordHash)
    );

    if (!account) {
      return res
        .status(401)
        .json({ error: 'Invalid credentials. Please check your account email and password.' });
    }

    const targetClient = client === 'web' ? 'web' : 'mobile';

    // Strictly enforce mobile 2-role policy on backend
    if (targetClient === 'mobile' && !MOBILE_ALLOWED_ROLES.includes(account.role)) {
      return res.status(403).json({
        error: `Mobile access is restricted to Applicant/Requestor and REQ Approver accounts. Your role (${account.role}) must use the web application.`,
      });
    }

    const authUser = {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      department: account.department,
    };

    const { token, expiresAt } = signToken(authUser, targetClient);
    appendLog(authUser, 'System', authUser.role, 'Mobile Sign In', `${authUser.fullName} signed in via ${targetClient}.`);

    return res.json({
      token,
      expiresAt,
      user: authUser,
      permissions: getPermissionsForRole(authUser.role),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Authentication service error.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user,
    permissions: getPermissionsForRole(user.role),
  });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (req.token) revokeToken(req.token);
  appendLog(user, 'System', user.role, 'Signed Out', `${user.fullName} signed out.`);
  res.json({ ok: true });
});

function getPermissionsForRole(role: UserRole) {
  return {
    canViewDashboard: true,
    canViewBoq: role === 'Applicant/Requestor' || role === 'REQ Approver' || role === 'Admin',
    canEditBoq: role === 'REQ Approver' || role === 'Admin',
    canImportBoq: role === 'REQ Approver' || role === 'Admin',
    canPostBoqToPqto: role === 'REQ Approver' || role === 'Admin',
    canViewPqto: role === 'Applicant/Requestor' || role === 'REQ Approver' || role === 'Admin',
    canCreatePr: role === 'Applicant/Requestor' || role === 'REQ Approver' || role === 'Admin',
    canApprovePr: role === 'REQ Approver',
    canRejectPr: role === 'REQ Approver',
    canViewPo: true,
    canApprovePo: false, // Never authorized for mobile roles
    canAccessWithdrawal: role === 'Applicant/Requestor' || role === 'Warehouse Manager' || role === 'Admin',
    canViewTracking: true,
    canViewLogs: true,
  };
}

// ============================================================================
// 3. ROLE-ADAPTIVE DASHBOARD
// ============================================================================

app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const projectCode = String(req.query.project || 'PROJ-TWRB');
  const state = store.getState();
  const project = state.projects.find((p) => p.code === projectCode) || state.projects[0];

  const allPrs = state.prs;
  const visibleModules = ROLE_VISIBLE_LOG_MODULES[user.role] || [];
  const recentLogs = state.logs
    .filter((l) => visibleModules.includes(l.module.toUpperCase()))
    .slice(0, 8);

  const recipientRole = user.role === 'REQ Approver' ? 'Approver' : 'Applicant';
  const unreadNotifications = state.notifications.filter(
    (n) => n.recipientRole === recipientRole && !n.read
  ).length;

  const totalPrs = allPrs.length;
  const pendingPrs = allPrs.filter((p) => p.status === 'Pending Approval');
  const approvedPrs = allPrs.filter(
    (p) => p.status === 'Approved' || p.status === 'Converted to PO'
  );
  const rejectedPrs = allPrs.filter(
    (p) => p.status === 'Returned to Applicant' || p.status === 'Rejected'
  );
  const draftPrs = allPrs.filter((p) => p.status === 'Draft');

  const boqItems = state.boqByProject[project.code] || [];
  const pqtos = state.pqtosByProject[project.code] || [];

  if (user.role === 'REQ Approver') {
    const approvalLogs = recentLogs.filter((l) => l.module.toUpperCase() === 'PR');
    return res.json({
      role: user.role,
      project,
      boqStatus: state.boqStatusByProject[project.code] || 'Draft',
      boqItemCount: boqItems.filter((i) => !i.isBlankRow).length,
      pqtoCount: pqtos.length,
      unreadNotifications,
      metrics: {
        pendingApproval: pendingPrs.length,
        totalReviewed: approvedPrs.length + rejectedPrs.length,
        approved: approvedPrs.length,
        rejected: rejectedPrs.length,
        totalPrs,
        activePos: state.pos.length,
      },
      recentlySubmittedPrs: pendingPrs.slice(0, 5),
      recentActivities: approvalLogs.length > 0 ? approvalLogs : recentLogs.slice(0, 6),
    });
  }

  return res.json({
    role: user.role,
    project,
    boqStatus: state.boqStatusByProject[project.code] || 'Draft',
    boqItemCount: boqItems.filter((i) => !i.isBlankRow).length,
    pqtoCount: pqtos.length,
    unreadNotifications,
    metrics: {
      totalPrs,
      pending: pendingPrs.length,
      approved: approvedPrs.length,
      rejected: rejectedPrs.length,
      drafts: draftPrs.length,
      totalPos: state.pos.length,
      totalWithdrawals: state.withdrawals.length,
    },
    recentPrs: allPrs.slice(0, 5),
    recentActivities: recentLogs.slice(0, 6),
  });
});

// ============================================================================
// 4. BOQ — BILL OF QUANTITIES
// ============================================================================

app.get('/api/boq', async (req, res) => {
  const projectCode = String(req.query.project || 'PROJ-TWRB');
  const search = String(req.query.search || '').trim().toLowerCase();
  const sort = String(req.query.sort || 'boq-order');
  const filter = String(req.query.filter || 'all'); // all | transactional | non-transactional

  // If MSSQL is explicitly connected and no local store override, query MSSQL
  if (store.isMssqlAvailable()) {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('projectCode', sql.NVarChar, projectCode)
        .query('SELECT * FROM boq_items WHERE project_code = @projectCode ORDER BY line_no ASC');
      if (result.recordset.length > 0) {
        return res.json({
          projectCode,
          boqStatus: store.getState().boqStatusByProject[projectCode] || 'Draft',
          items: result.recordset,
        });
      }
    } catch {
      // Fallback to store
    }
  }

  const state = store.getState();
  let items = [...(state.boqByProject[projectCode] || state.boqByProject['PROJ-TWRB'] || [])];

  if (filter === 'transactional') {
    items = items.filter((i) => !i.isBlankRow && !i.isWorksRelated);
  } else if (filter === 'non-transactional') {
    items = items.filter((i) => i.isWorksRelated || i.isBlankRow);
  }

  if (search) {
    items = items.filter(
      (i) =>
        i.itemCode.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search) ||
        i.assignedLocation.toLowerCase().includes(search) ||
        (i.costCenter || '').toLowerCase().includes(search)
    );
  }

  if (sort === 'item-code') {
    items.sort((a, b) => (a.itemCode || 'ZZZ').localeCompare(b.itemCode || 'ZZZ'));
  } else {
    items.sort((a, b) => a.lineNo - b.lineNo);
  }

  res.json({
    projectCode,
    boqStatus: state.boqStatusByProject[projectCode] || 'Draft',
    items,
  });
});

app.post(
  '/api/boq/items',
  requireAuth,
  requireRoles(['REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const projectCode = String(req.body.projectCode || 'PROJ-TWRB');
    const state = store.getState();
    const list = state.boqByProject[projectCode] || (state.boqByProject[projectCode] = []);
    const itemCode = String(req.body.itemCode || '').trim();
    const description = String(req.body.description || '').trim();
    if (!itemCode || !description) {
      return res.status(400).json({ error: 'Item Code and Description are required.' });
    }
    const isWorksRelated = Boolean(req.body.isWorksRelated);
    const newItem: BoqItem = {
      id: `boq-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      lineNo: list.length + 1,
      itemCode,
      description,
      boqUom: String(req.body.boqUom || 'PC/s'),
      boqQty: Number(req.body.boqQty) || 1,
      pqtoUom: String(req.body.pqtoUom || 'PC/s'),
      pqtoQty: isWorksRelated ? 0 : Number(req.body.pqtoQty) || Number(req.body.boqQty) || 1,
      assignedLocation: String(req.body.assignedLocation || 'Site-Wide'),
      costCenter: req.body.costCenter ? String(req.body.costCenter) : undefined,
      remarks: req.body.remarks ? String(req.body.remarks) : undefined,
      isWorksRelated,
    };
    list.push(newItem);
    state.boqStatusByProject[projectCode] = 'Draft';
    store.save();
    appendLog(req.user!, 'BOQ', `BOQ-${projectCode}`, 'Added BOQ Item', `Added ${newItem.itemCode} — ${newItem.description}`);
    res.status(201).json({ item: newItem, boqStatus: 'Draft' });
  }
);

app.post(
  '/api/boq/import',
  requireAuth,
  requireRoles(['REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const projectCode = String(req.body.projectCode || 'PROJ-TWRB');
    const fileName = String(req.body.fileName || 'boq_import.csv');
    const rows = req.body.items as Array<Partial<BoqItem>> | undefined;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No valid BOQ rows provided for import.' });
    }
    const state = store.getState();
    const list = state.boqByProject[projectCode] || (state.boqByProject[projectCode] = []);
    const created: BoqItem[] = [];
    for (const r of rows) {
      const code = String(r.itemCode || '').trim();
      const desc = String(r.description || '').trim();
      if (!code && !desc) continue;
      const item: BoqItem = {
        id: `boq-imp-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        lineNo: list.length + created.length + 1,
        itemCode: code,
        description: desc,
        boqUom: String(r.boqUom || 'PC/s'),
        boqQty: Number(r.boqQty) || 1,
        pqtoUom: String(r.pqtoUom || 'PC/s'),
        pqtoQty: Number(r.pqtoQty) || Number(r.boqQty) || 1,
        assignedLocation: String(r.assignedLocation || 'Site-Wide'),
        costCenter: r.costCenter ? String(r.costCenter) : undefined,
        remarks: r.remarks ? String(r.remarks) : undefined,
      };
      created.push(item);
    }
    if (created.length === 0) {
      return res.status(400).json({ error: 'No valid items with Item Code or Description found.' });
    }
    list.push(...created);
    state.boqStatusByProject[projectCode] = 'Draft';
    store.save();
    appendLog(req.user!, 'BOQ', `BOQ-${projectCode}`, 'BOQ Import', `Imported ${created.length} item(s) from ${fileName}.`);
    res.status(201).json({ importedCount: created.length, items: list });
  }
);

app.post(
  '/api/boq/replace-fittings',
  requireAuth,
  requireRoles(['REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const projectCode = String(req.body.projectCode || 'PROJ-TWRB');
    const state = store.getState();
    const list = state.boqByProject[projectCode] || [];
    if (!list.some((i) => i.isLegacyFittingsRow)) {
      return res.status(400).json({ error: 'No legacy "Fittings of the above" row found.' });
    }
    const next: BoqItem[] = [];
    let lineNo = 1;
    for (const item of list) {
      if (item.isLegacyFittingsRow) {
        next.push({
          id: `boq-ref-${Date.now()}`,
          lineNo: lineNo++,
          itemCode: 'NOTE-FIT-00',
          description: 'Refer to the itemized fittings (Itemized below)',
          boqUom: 'lot',
          boqQty: 1,
          pqtoUom: 'PC/s',
          pqtoQty: 0,
          assignedLocation: item.assignedLocation,
          costCenter: item.costCenter,
          remarks: 'Section Header / Reference',
          isWorksRelated: true,
        });
        ITEMIZED_FITTINGS_PRESET.forEach((preset, idx) => {
          next.push({
            ...preset,
            id: `boq-fit-${Date.now()}-${idx}`,
            lineNo: lineNo++,
          });
        });
      } else {
        next.push({ ...item, lineNo: lineNo++ });
      }
    }
    state.boqByProject[projectCode] = next;
    store.save();
    appendLog(req.user!, 'BOQ', `BOQ-${projectCode}`, 'Replaced Legacy Fittings', 'Expanded "Fittings of the above" into 5 itemized fittings.');
    res.json({ items: next });
  }
);

app.post(
  '/api/boq/post-to-pqto',
  requireAuth,
  requireRoles(['REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const projectCode = String(req.body.projectCode || 'PROJ-TWRB');
    const state = store.getState();
    const list = state.boqByProject[projectCode] || [];
    const transactional = list.filter(
      (i) => !i.isBlankRow && !i.isWorksRelated && i.itemCode.trim() !== ''
    );
    if (transactional.length === 0) {
      return res.status(400).json({ error: 'No transactional BOQ items to post to PQTO.' });
    }
    const pqtos = state.pqtosByProject[projectCode] || (state.pqtosByProject[projectCode] = []);
    const project = state.projects.find((p) => p.code === projectCode);
    const pqtoNo = `PQTO-2026-${String(pqtos.length + 1).padStart(3, '0')}`;
    const newPqto: PqtoRecord = {
      id: `pqto-${Date.now()}`,
      pqtoNo,
      jobNo: project?.jobNo || 'JOB-2026-884',
      projectTitle: project?.description || 'Posted from BOQ',
      status: 'Posted',
      createdAt: nowShortStamp(),
      items: transactional.map((it) => ({
        boqItemId: it.id,
        itemCode: it.itemCode,
        description: it.description,
        boqUom: it.boqUom || 'lot',
        boqQty: it.boqQty,
        pqtoUom: it.pqtoUom || 'PC/s',
        pqtoQty: it.pqtoQty || it.boqQty,
        prOrderedQty: 0,
        assignedLocation: it.assignedLocation || 'Site-Wide',
      })),
    };
    pqtos.unshift(newPqto);
    state.boqStatusByProject[projectCode] = 'Posted';
    store.save();

    appendLog(
      req.user!,
      'BOQ',
      `BOQ-${projectCode}`,
      'Posted to PQTO',
      `Created ${pqtoNo} with ${transactional.length} transactional item(s).`
    );
    pushNotification(
      'Applicant',
      'BOQ Posted to PQTO',
      `${pqtoNo} is now available for Purchase Requisitions (${transactional.length} items).`,
      { docType: 'PQTO', docId: newPqto.id, docNo: pqtoNo }
    );

    res.status(201).json({ pqto: newPqto, boqStatus: 'Posted' });
  }
);

// ============================================================================
// 5. PQTO — PROJECT QUANTITY TAKE-OFF
// ============================================================================

app.get('/api/pqtos', requireAuth, (req: AuthenticatedRequest, res) => {
  const projectCode = String(req.query.project || 'PROJ-TWRB');
  const state = store.getState();
  const pqtos = state.pqtosByProject[projectCode] || state.pqtosByProject['PROJ-TWRB'] || [];
  const boqItems = state.boqByProject[projectCode] || [];
  const costCenterByCode = new Map(
    boqItems.filter((b) => b.itemCode).map((b) => [b.itemCode.toLowerCase(), b.costCenter || ''])
  );

  const enriched = pqtos.map((pqto) => ({
    ...pqto,
    items: pqto.items.map((it) => ({
      ...it,
      remainingQty: Math.max(0, it.pqtoQty - it.prOrderedQty),
      costCenter: costCenterByCode.get(it.itemCode.toLowerCase()) || 'CC-MEPF-01',
    })),
  }));

  res.json({ projectCode, pqtos: enriched });
});

// ============================================================================
// 6. PURCHASE REQUISITIONS (PR) & APPROVAL WORKFLOW
// ============================================================================

app.get('/api/prs', requireAuth, (req: AuthenticatedRequest, res) => {
  const statusFilter = String(req.query.status || '').trim();
  const search = String(req.query.search || '').trim().toLowerCase();
  const state = store.getState();

  let list = [...state.prs];
  if (statusFilter && statusFilter !== 'ALL') {
    list = list.filter((p) => p.status.toLowerCase() === statusFilter.toLowerCase());
  }
  if (search) {
    list = list.filter(
      (p) =>
        p.prNo.toLowerCase().includes(search) ||
        p.pqtoNo.toLowerCase().includes(search) ||
        p.refDocNo.toLowerCase().includes(search) ||
        p.jobNo.toLowerCase().includes(search) ||
        p.applicant.toLowerCase().includes(search) ||
        (p.spName || '').toLowerCase().includes(search)
    );
  }

  // Enrich each PR item with current PQTO remaining balance
  const enriched = list.map((pr) => {
    const pqto = findPqtoByNo(pr.pqtoNo);
    return {
      ...pr,
      items: pr.items.map((it) => {
        const currentRemaining = computePqtoRemaining(pqto, it.itemCode);
        return {
          ...it,
          currentPqtoRemaining: currentRemaining ?? it.pqtoQty,
        };
      }),
    };
  });

  res.json({ prs: enriched, config: state.config });
});

app.get('/api/prs/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = store.getState();
  const pr = state.prs.find((p) => p.id === req.params.id || p.prNo === req.params.id);
  if (!pr) return res.status(404).json({ error: 'Purchase Requisition not found.' });

  const pqto = findPqtoByNo(pr.pqtoNo);
  const enriched = {
    ...pr,
    items: pr.items.map((it) => ({
      ...it,
      currentPqtoRemaining: computePqtoRemaining(pqto, it.itemCode) ?? it.pqtoQty,
    })),
  };
  res.json({ pr: enriched });
});

function validatePrSubmission(
  pqtoNo: string,
  refDocNo: string,
  jobNo: string,
  items: PrLineItem[],
  attachments: FileAttachment[],
  asDraft: boolean
): string | null {
  const config = store.getState().config;
  if (!jobNo.trim()) return 'Job / Project Number is required.';
  if (asDraft) return null;

  if (config.refDocNo && !refDocNo.trim()) {
    return 'Reference Document Number is required.';
  }
  if (!Array.isArray(items) || items.length === 0) {
    return 'Please add at least one line item.';
  }
  for (const it of items) {
    if (!it.itemCode.trim() || !it.description.trim()) {
      return 'Every line item must have an Item Code and Description.';
    }
    if (!Number.isFinite(it.requestedQty) || it.requestedQty <= 0) {
      return `Requested quantity for ${it.itemCode} must be greater than 0.`;
    }
  }
  if (config.attachments && attachments.length === 0) {
    return 'At least 1 supporting attachment (PDF, JPG, PNG, XLSX) is required.';
  }
  if (config.blockExceedPqto) {
    const pqto = findPqtoByNo(pqtoNo);
    for (const it of items) {
      if (it.isNewItem) continue;
      const remaining = computePqtoRemaining(pqto, it.itemCode);
      const ceiling = remaining !== null ? remaining : it.pqtoQty;
      if (it.requestedQty > ceiling) {
        return `Blocked: Requested qty (${it.requestedQty}) for ${it.itemCode} exceeds PQTO remaining balance (${ceiling}).`;
      }
    }
  }
  return null;
}

app.post(
  '/api/prs',
  requireAuth,
  requireRoles(['Applicant/Requestor', 'REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const {
      pqtoNo = 'PQTO-2026-001',
      refDocNo = '',
      jobNo = 'JOB-2026-884',
      projectCode = 'PROJ-TWRB',
      spName = '',
      asDraft = false,
      attachments = [],
      items = [],
    } = req.body as {
      pqtoNo?: string;
      refDocNo?: string;
      jobNo?: string;
      projectCode?: string;
      spName?: string;
      asDraft?: boolean;
      attachments?: FileAttachment[];
      items?: PrLineItem[];
    };

    const normalizedItems: PrLineItem[] = (items || []).map((it, idx) => {
      const pqto = findPqtoByNo(pqtoNo);
      const rem = computePqtoRemaining(pqto, it.itemCode);
      const isNew = Boolean(it.isNewItem) || rem === null;
      const code =
        it.itemCode?.trim() ||
        (isNew ? `SYS-NEW-${Math.floor(Math.random() * 900 + 100)}` : '');
      return {
        id: it.id || `pr-li-${Date.now()}-${idx}`,
        itemCode: code,
        description: String(it.description || '').trim(),
        uom: String(it.uom || 'PC/s').trim(),
        pqtoQty: rem !== null ? rem : Number(it.pqtoQty) || 0,
        requestedQty: Number(it.requestedQty) || 0,
        assignedLocation: String(it.assignedLocation || 'Site-Wide').trim(),
        isNewItem: isNew,
        systemAssignedCode: isNew ? code : undefined,
      };
    });

    const validationError = validatePrSubmission(
      pqtoNo,
      refDocNo,
      jobNo,
      normalizedItems,
      attachments,
      Boolean(asDraft)
    );
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const state = store.getState();
    const seq = 104 + state.prs.length + 1;
    const prNo = `PR-2026-${String(seq).padStart(4, '0')}`;
    const newPr: ExtendedPrRecord = {
      id: `pr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      prNo,
      pqtoNo,
      refDocNo: refDocNo.trim(),
      jobNo: jobNo.trim(),
      projectCode,
      applicant: user.fullName,
      applicantId: user.id,
      spName: spName.trim(),
      status: asDraft ? 'Draft' : 'Pending Approval',
      createdAt: nowShortStamp(),
      attachments,
      items: normalizedItems,
      requiresBoqApproval: normalizedItems.some((i) => i.isNewItem),
    };

    state.prs.unshift(newPr);
    if (!asDraft) {
      adjustPqtoOrderedQty(pqtoNo, normalizedItems, 1);
    }
    store.save();

    appendLog(
      user,
      'PR',
      prNo,
      asDraft ? 'Saved as Draft' : 'Submitted for Approval',
      `Ref: ${newPr.refDocNo || 'N/A'} | Items: ${normalizedItems.length}${
        newPr.requiresBoqApproval ? ' | Contains Non-BOQ Item' : ''
      }`,
      newPr.spName || 'SP-MECH-ALPHA'
    );

    if (!asDraft) {
      pushNotification(
        'Approver',
        'New PR Submitted',
        `${prNo} from ${user.fullName} (${normalizedItems.length} items) requires your approval.`,
        { docType: 'PR', docId: newPr.id, docNo: prNo }
      );
    }

    res.status(201).json({ pr: newPr });
  }
);

app.put(
  '/api/prs/:id',
  requireAuth,
  requireRoles(['Applicant/Requestor', 'REQ Approver', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const state = store.getState();
    const idx = state.prs.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Purchase Requisition not found.' });

    const existing = state.prs[idx];
    const editableStatuses = ['Draft', 'Returned to Applicant', 'Rejected'];
    if (!editableStatuses.includes(existing.status)) {
      return res.status(409).json({
        error: `Cannot edit ${existing.prNo} because its status is "${existing.status}". Only Draft or Returned requests can be edited.`,
      });
    }

    // Ensure Applicant can edit their own PR (or drafts/returned requests created by applicants)
    if (
      user.role === 'Applicant/Requestor' &&
      existing.applicantId &&
      existing.applicantId !== user.id
    ) {
      return res.status(403).json({
        error: 'You can only edit Purchase Requisitions that you created.',
      });
    }

    const {
      pqtoNo = existing.pqtoNo,
      refDocNo = existing.refDocNo,
      jobNo = existing.jobNo,
      spName = existing.spName || '',
      asDraft = false,
      attachments = existing.attachments,
      items = existing.items,
    } = req.body as {
      pqtoNo?: string;
      refDocNo?: string;
      jobNo?: string;
      spName?: string;
      asDraft?: boolean;
      attachments?: FileAttachment[];
      items?: PrLineItem[];
    };

    const normalizedItems: PrLineItem[] = (items || []).map((it, i) => {
      const pqto = findPqtoByNo(pqtoNo);
      const rem = computePqtoRemaining(pqto, it.itemCode);
      const isNew = Boolean(it.isNewItem) || rem === null;
      return {
        id: it.id || `pr-li-${Date.now()}-${i}`,
        itemCode: String(it.itemCode || '').trim(),
        description: String(it.description || '').trim(),
        uom: String(it.uom || 'PC/s').trim(),
        pqtoQty: rem !== null ? rem : Number(it.pqtoQty) || 0,
        requestedQty: Number(it.requestedQty) || 0,
        assignedLocation: String(it.assignedLocation || 'Site-Wide').trim(),
        isNewItem: isNew,
        systemAssignedCode: isNew ? String(it.itemCode || '').trim() : undefined,
      };
    });

    const validationError = validatePrSubmission(
      pqtoNo,
      refDocNo,
      jobNo,
      normalizedItems,
      attachments,
      Boolean(asDraft)
    );
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const wasReturned = existing.status === 'Returned to Applicant' || existing.status === 'Rejected';
    const nextStatus = asDraft ? 'Draft' : 'Pending Approval';

    const updated: ExtendedPrRecord = {
      ...existing,
      pqtoNo,
      refDocNo: refDocNo.trim(),
      jobNo: jobNo.trim(),
      spName: spName.trim(),
      attachments,
      items: normalizedItems,
      status: nextStatus,
      requiresBoqApproval: normalizedItems.some((i) => i.isNewItem),
      rejectionComments: asDraft ? existing.rejectionComments : undefined,
    };

    state.prs[idx] = updated;
    if (!asDraft) {
      adjustPqtoOrderedQty(pqtoNo, normalizedItems, 1);
    }
    store.save();

    appendLog(
      user,
      'PR',
      updated.prNo,
      asDraft ? 'Updated Draft' : wasReturned ? 'Corrected & Resubmitted' : 'Submitted for Approval',
      `Ref: ${updated.refDocNo} | Items: ${normalizedItems.length}`,
      updated.spName || 'SP-MECH-ALPHA'
    );

    if (!asDraft) {
      pushNotification(
        'Approver',
        wasReturned ? 'PR Resubmitted for Approval' : 'New PR Submitted',
        `${updated.prNo} from ${user.fullName} has been ${wasReturned ? 'corrected and resubmitted' : 'submitted'} for review.`,
        { docType: 'PR', docId: updated.id, docNo: updated.prNo }
      );
    }

    res.json({ pr: updated });
  }
);

app.post(
  '/api/prs/:id/approve',
  requireAuth,
  requireRoles(['REQ Approver']),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const state = store.getState();
    const pr = state.prs.find((p) => p.id === req.params.id);
    if (!pr) return res.status(404).json({ error: 'Purchase Requisition not found.' });

    // Prevent self-approval (Segregation of Duties)
    if (pr.applicantId === user.id || pr.applicant.toLowerCase() === user.fullName.toLowerCase()) {
      return res.status(403).json({
        error: 'Segregation of Duties violation: You cannot approve your own Purchase Requisition.',
      });
    }

    // Prevent duplicate approvals or approving non-pending PRs
    if (pr.status !== 'Pending Approval') {
      return res.status(409).json({
        error: `Cannot approve ${pr.prNo}. Current status is "${pr.status}" (must be "Pending Approval").`,
      });
    }

    pr.status = 'Approved';
    pr.approvedBy = user.fullName;
    pr.approvedAt = nowShortStamp();
    pr.rejectionComments = undefined;
    store.save();

    appendLog(
      user,
      'PR',
      pr.prNo,
      'Approved',
      `Approved by ${user.fullName}. Ready for PO conversion.`,
      pr.spName || 'SP-MECH-ALPHA'
    );
    pushNotification(
      'Applicant',
      `PR Approved: ${pr.prNo}`,
      `${pr.prNo} was approved by ${user.fullName} and is now available for Purchase Order processing.`,
      { docType: 'PR', docId: pr.id, docNo: pr.prNo }
    );

    res.json({ ok: true, pr });
  }
);

app.post(
  '/api/prs/:id/reject',
  requireAuth,
  requireRoles(['REQ Approver']),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { comments, reason } = req.body as { comments?: string; reason?: string };
    const rejectionReason = (comments || reason || '').trim();
    if (!rejectionReason) {
      return res.status(400).json({ error: 'A rejection reason is mandatory.' });
    }

    const state = store.getState();
    const pr = state.prs.find((p) => p.id === req.params.id);
    if (!pr) return res.status(404).json({ error: 'Purchase Requisition not found.' });

    if (pr.applicantId === user.id || pr.applicant.toLowerCase() === user.fullName.toLowerCase()) {
      return res.status(403).json({
        error: 'Segregation of Duties violation: You cannot reject your own Purchase Requisition.',
      });
    }

    if (pr.status !== 'Pending Approval') {
      return res.status(409).json({
        error: `Cannot reject ${pr.prNo}. Current status is "${pr.status}" (must be "Pending Approval").`,
      });
    }

    pr.status = 'Returned to Applicant';
    pr.rejectedBy = user.fullName;
    pr.rejectedAt = nowShortStamp();
    pr.rejectionComments = rejectionReason;
    // Release reserved PQTO qty back to remaining balance until corrected & resubmitted
    adjustPqtoOrderedQty(pr.pqtoNo, pr.items, -1);
    store.save();

    appendLog(
      user,
      'PR',
      pr.prNo,
      'REJECTED → Returned to Applicant',
      rejectionReason,
      pr.spName || 'SP-MECH-ALPHA'
    );
    pushNotification(
      'Applicant',
      `PR Returned: ${pr.prNo}`,
      `${pr.prNo} was returned by ${user.fullName}. Reason: "${rejectionReason}"`,
      { docType: 'PR', docId: pr.id, docNo: pr.prNo }
    );

    res.json({ ok: true, pr });
  }
);

// ============================================================================
// 7. PURCHASE ORDERS (PO) — READ-ONLY FOR MOBILE ROLES
// ============================================================================

app.get('/api/pos', requireAuth, (req: AuthenticatedRequest, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const state = store.getState();
  let list = state.pos.map((po) => ({
    ...po,
    totalAmount: po.items.reduce((sum, it) => sum + it.poQty * it.unitPrice, 0),
  }));

  if (search) {
    list = list.filter(
      (p) =>
        p.poNo.toLowerCase().includes(search) ||
        p.prNo.toLowerCase().includes(search) ||
        p.refDocNo.toLowerCase().includes(search) ||
        p.iaas2RefNo.toLowerCase().includes(search) ||
        p.vendor.toLowerCase().includes(search) ||
        p.status.toLowerCase().includes(search)
    );
  }

  res.json({ pos: list });
});

app.get('/api/pos/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = store.getState();
  const po = state.pos.find((p) => p.id === req.params.id || p.poNo === req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
  res.json({
    po: {
      ...po,
      totalAmount: po.items.reduce((sum, it) => sum + it.poQty * it.unitPrice, 0),
    },
  });
});

// Preserved existing PO reject endpoint — strictly restricted to PO Approver / Admin
app.post(
  '/api/po/:id/reject',
  requireAuth,
  requireRoles(['PO Approver', 'Admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body as { comments: string };
      if (!comments?.trim()) {
        return res.status(400).json({ error: 'Rejection comments are required.' });
      }
      if (store.isMssqlAvailable()) {
        const pool = await getPool();
        await pool
          .request()
          .input('id', sql.NVarChar, id)
          .input('comments', sql.NVarChar, comments.trim())
          .query(
            "UPDATE pos SET status = 'Returned to Applicant', rejection_comments = @comments WHERE id = @id"
          );
      }
      const po = store.getState().pos.find((p) => p.id === id);
      if (po) {
        po.status = 'Returned to Applicant';
        po.rejectionComments = comments.trim();
        store.save();
        appendLog(req.user!, 'PO', po.poNo, 'REJECTED → Returned to Applicant', comments.trim(), po.spName);
      }
      return res.json({ ok: true, status: 'Returned to Applicant' });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }
);

// ============================================================================
// 8. MATERIAL WITHDRAWAL & WAREHOUSE STOCK (APPLICANT ONLY ON MOBILE)
// ============================================================================

app.get(
  '/api/stock',
  requireAuth,
  requireRoles(['Applicant/Requestor', 'Warehouse Manager', 'Purchaser', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const search = String(req.query.search || '').trim().toLowerCase();
    const systemTag = String(req.query.systemTag || 'ALL');
    let list = [...store.getState().stock];
    if (systemTag && systemTag !== 'ALL') {
      list = list.filter((s) => s.systemTag === systemTag);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.itemCode.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search) ||
          s.assignedLocation.toLowerCase().includes(search) ||
          s.systemTag.toLowerCase().includes(search)
      );
    }
    const systems = Array.from(new Set(store.getState().stock.map((s) => s.systemTag)));
    res.json({ stock: list, systems });
  }
);

app.get(
  '/api/withdrawals',
  requireAuth,
  requireRoles(['Applicant/Requestor', 'Warehouse Manager', 'Admin']),
  (_req, res) => {
    res.json({ withdrawals: store.getState().withdrawals });
  }
);

app.post(
  '/api/withdrawals',
  requireAuth,
  requireRoles(['Applicant/Requestor', 'Warehouse Manager', 'Admin']),
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const {
      stockId,
      itemCode,
      requestedQty,
      requestedBy,
      jobNo = 'JOB-2026-884',
      projectCode = 'PROJ-TWRB',
      spName = 'SP-MECH-ALPHA',
      remarks = '',
      attachments = [],
    } = req.body as {
      stockId?: string;
      itemCode?: string;
      requestedQty?: number;
      requestedBy?: string;
      jobNo?: string;
      projectCode?: string;
      spName?: string;
      remarks?: string;
      attachments?: FileAttachment[];
    };

    const state = store.getState();
    const stockItem = state.stock.find(
      (s) => (stockId && s.id === stockId) || (itemCode && s.itemCode === itemCode)
    );
    if (!stockItem) {
      return res.status(400).json({ error: 'Selected inventory item was not found.' });
    }

    const qty = Number(requestedQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Requested quantity must be greater than 0.' });
    }

    if (state.config.attachments && (!Array.isArray(attachments) || attachments.length === 0)) {
      return res
        .status(400)
        .json({ error: 'At least 1 supporting issuance slip (PDF, JPG, PNG) is required.' });
    }

    const requesterName = (requestedBy || user.fullName).trim();
    if (!requesterName) {
      return res.status(400).json({ error: 'Requester name is required.' });
    }

    const hasStock = stockItem.availableStock >= qty;
    const wdSeq = 301 + state.withdrawals.length + 1;
    const wdNo = `WD-2026-${String(wdSeq).padStart(4, '0')}`;

    // Warehouse issuance & actual stock deduction remains controlled by Warehouse Manager/Admin.
    // Applicants submit withdrawal requests: never allow negative stock or unauthorized stock deduction.
    let status: ExtendedWithdrawalRecord['status'];
    if (user.role === 'Warehouse Manager' || user.role === 'Admin') {
      status = hasStock ? 'With Stock' : 'Without Stock';
      if (hasStock) {
        stockItem.availableStock = Math.max(0, stockItem.availableStock - qty);
      }
    } else {
      status = hasStock ? 'Pending Issuance' : 'Without Stock';
      if (hasStock) {
        const reservable = Math.min(qty, Math.max(0, stockItem.availableStock - stockItem.reservedStock));
        stockItem.reservedStock += reservable;
      }
    }

    const newWd: ExtendedWithdrawalRecord = {
      id: `wd-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      wdNo,
      systemTag: stockItem.systemTag,
      jobNo: jobNo.trim(),
      projectCode,
      requestedBy: requesterName,
      spName: spName.trim(),
      performedAt: nowShortStamp(),
      status,
      remarks: remarks.trim() || undefined,
      attachments,
      items: [
        {
          itemCode: stockItem.itemCode,
          description: stockItem.description,
          uom: stockItem.uom,
          availableAtRequest: stockItem.availableStock,
          requestedQty: qty,
          assignedLocation: stockItem.assignedLocation,
        },
      ],
    };

    state.withdrawals.unshift(newWd);
    store.save();

    appendLog(
      user,
      'Withdrawal',
      wdNo,
      `Withdrawal Requested (${status})`,
      `Item: ${stockItem.itemCode} | Qty: ${qty} ${stockItem.uom} | Available: ${stockItem.availableStock}`,
      newWd.spName
    );

    pushNotification(
      'Applicant',
      `Withdrawal Submitted: ${wdNo}`,
      hasStock
        ? `${wdNo} for ${qty} ${stockItem.uom} of ${stockItem.itemCode} is queued for Warehouse issuance.`
        : `${wdNo} logged as "Without Stock" (${stockItem.availableStock} available vs ${qty} requested).`,
      { docType: 'WITHDRAWAL', docId: newWd.id, docNo: wdNo }
    );

    res.status(201).json({ withdrawal: newWd, stockItem });
  }
);

// ============================================================================
// 9. END-TO-END TRACKING (6-STAGE PROCUREMENT LIFECYCLE)
// ============================================================================

app.get('/api/tracking', requireAuth, (req: AuthenticatedRequest, res) => {
  const stageFilter = String(req.query.stage || 'ALL').toUpperCase();
  const query = String(req.query.search || '').trim().toLowerCase();
  const state = store.getState();

  const chains = state.prs.map((pr) => {
    const pqto = findPqtoByNo(pr.pqtoNo);
    const linkedPos = state.pos.filter((p) => p.prNo === pr.prNo);
    const primaryPo = linkedPos[0];
    const linkedReceivings = linkedPos.flatMap((po) =>
      state.receivings.filter((r) => r.poNo === po.poNo)
    );
    const prItemCodes = new Set(pr.items.map((i) => i.itemCode));
    const linkedWithdrawals = state.withdrawals.filter((w) =>
      w.items.some((wi) => prItemCodes.has(wi.itemCode))
    );

    const totalOrderedQty = linkedPos.reduce(
      (sum, po) => sum + po.items.reduce((s, it) => s + it.poQty, 0),
      0
    );
    const totalReceivedQty = linkedPos.reduce(
      (sum, po) => sum + po.items.reduce((s, it) => s + it.receivedQty, 0),
      0
    );

    const boqStatus = state.boqStatusByProject[pr.projectCode || 'PROJ-TWRB'] || 'Posted';
    const steps = [
      {
        stageNumber: 1,
        key: 'BOQ',
        label: '1. Bill of Quantities (BOQ)',
        status: boqStatus,
        state: 'done' as 'done' | 'active' | 'rejected' | 'pending',
        docNo: `BOQ-${pr.projectCode || 'PROJ-TWRB'}`,
        timestamp: pqto?.createdAt || pr.createdAt,
        responsibleUser: 'Engineering Control',
        remarks: `Project master BOQ (${pr.jobNo})`,
      },
      {
        stageNumber: 2,
        key: 'PQTO',
        label: '2. Project Qty Take-Off (PQTO)',
        status: pqto?.status || 'Posted',
        state: 'done' as 'done' | 'active' | 'rejected' | 'pending',
        docNo: pr.pqtoNo,
        timestamp: pqto?.createdAt || pr.createdAt,
        responsibleUser: 'Engineering Control',
        remarks: pqto ? `${pqto.projectTitle} (${pqto.items.length} items)` : 'Linked PQTO',
      },
      {
        stageNumber: 3,
        key: 'PR',
        label: '3. Purchase Requisition (PR)',
        status: pr.status,
        state:
          pr.status === 'Draft' || pr.status === 'Pending Approval'
            ? ('active' as const)
            : pr.status === 'Returned to Applicant' || pr.status === 'Rejected'
            ? ('rejected' as const)
            : ('done' as const),
        docNo: pr.prNo,
        timestamp: pr.approvedAt || pr.rejectedAt || pr.createdAt,
        responsibleUser: pr.approvedBy || pr.rejectedBy || pr.applicant,
        remarks:
          pr.rejectionComments ||
          (pr.status === 'Approved'
            ? `Approved by ${pr.approvedBy || 'REQ Approver'}`
            : pr.status === 'Pending Approval'
            ? `Submitted by ${pr.applicant} — Pending REQ Approver`
            : `Draft by ${pr.applicant} (${pr.items.length} items)`),
      },
      {
        stageNumber: 4,
        key: 'PO',
        label: '4. Purchase Order (PO)',
        status: primaryPo?.status || (pr.status === 'Approved' ? 'Awaiting PO' : 'Pending'),
        state: primaryPo
          ? primaryPo.status === 'Pending Approval'
            ? ('active' as const)
            : primaryPo.status === 'Returned to Applicant'
            ? ('rejected' as const)
            : ('done' as const)
          : pr.status === 'Approved'
          ? ('active' as const)
          : ('pending' as const),
        docNo: primaryPo ? linkedPos.map((p) => p.poNo).join(', ') : 'Pending PO',
        timestamp: primaryPo?.createdAt || '',
        responsibleUser: primaryPo?.approver || primaryPo?.vendor || 'Procurement',
        remarks: primaryPo
          ? primaryPo.rejectionComments || `${primaryPo.vendor} (${primaryPo.iaas2RefNo})`
          : pr.status === 'Approved'
          ? 'Approved PR ready for PO generation'
          : 'Awaiting PR approval',
      },
      {
        stageNumber: 5,
        key: 'RECEIVING',
        label: '5. Goods Receiving (GRN)',
        status:
          primaryPo?.status === 'Completed'
            ? 'Completed'
            : primaryPo?.status === 'Partially Received'
            ? 'Partially Received'
            : primaryPo?.status === 'Approved'
            ? 'In Transit'
            : 'Pending',
        state:
          primaryPo?.status === 'Completed'
            ? ('done' as const)
            : primaryPo?.status === 'Partially Received' || primaryPo?.status === 'Approved'
            ? ('active' as const)
            : ('pending' as const),
        docNo:
          linkedReceivings.length > 0
            ? linkedReceivings.map((r) => r.grnNo).join(', ')
            : primaryPo?.status === 'Approved'
            ? 'In Transit'
            : 'Awaiting Delivery',
        timestamp: linkedReceivings[0]?.performedAt || '',
        responsibleUser: linkedReceivings.length > 0 ? 'Warehouse Manager' : '',
        remarks:
          primaryPo?.status === 'Completed'
            ? `Delivered in full (${totalReceivedQty}/${totalOrderedQty})`
            : primaryPo?.status === 'Partially Received'
            ? `Partially received (${totalReceivedQty}/${totalOrderedQty})`
            : primaryPo?.status === 'Approved'
            ? `Awaiting delivery (0/${totalOrderedQty})`
            : 'Not yet dispatched',
      },
      {
        stageNumber: 6,
        key: 'WITHDRAWAL',
        label: '6. Material Withdrawal (WD)',
        status: linkedWithdrawals[0]?.status || 'Pending Issuance',
        state:
          linkedWithdrawals.length > 0
            ? primaryPo?.status === 'Completed'
              ? ('done' as const)
              : ('active' as const)
            : ('pending' as const),
        docNo:
          linkedWithdrawals.length > 0
            ? linkedWithdrawals.map((w) => w.wdNo).join(', ')
            : 'Pending Withdrawal',
        timestamp: linkedWithdrawals[0]?.performedAt || '',
        responsibleUser: linkedWithdrawals[0]?.requestedBy || '',
        remarks:
          linkedWithdrawals.length > 0
            ? `${linkedWithdrawals.reduce(
                (sum, w) => sum + w.items.reduce((s, it) => s + it.requestedQty, 0),
                0
              )} unit(s) requested/issued to site`
            : 'Awaiting site material withdrawal',
      },
    ];

    let category: 'PR' | 'PO' | 'DELIVERY' | 'DONE' = 'PR';
    if (primaryPo?.status === 'Completed') {
      category = 'DONE';
    } else if (primaryPo?.status === 'Approved' || primaryPo?.status === 'Partially Received') {
      category = 'DELIVERY';
    } else if (primaryPo || pr.status === 'Approved') {
      category = 'PO';
    }

    const allAttachments: FileAttachment[] = [
      ...pr.attachments,
      ...linkedPos.flatMap((p) => p.attachments),
      ...linkedReceivings.flatMap((r) => r.attachments),
      ...linkedWithdrawals.flatMap((w) => w.attachments),
    ];

    const relatedLogs = state.logs.filter(
      (l) =>
        l.docNo === pr.prNo ||
        linkedPos.some((p) => p.poNo === l.docNo) ||
        linkedReceivings.some((r) => r.grnNo === l.docNo) ||
        linkedWithdrawals.some((w) => w.wdNo === l.docNo)
    );

    return {
      id: pr.id,
      prNo: pr.prNo,
      pqtoNo: pr.pqtoNo,
      refDocNo: pr.refDocNo,
      jobNo: pr.jobNo,
      applicant: pr.applicant,
      overallStatus: primaryPo ? primaryPo.status : pr.status,
      category,
      linkedPoNos: linkedPos.map((p) => p.poNo),
      linkedGrnNos: linkedReceivings.map((r) => r.grnNo),
      linkedWdNos: linkedWithdrawals.map((w) => w.wdNo),
      attachments: allAttachments,
      steps,
      latestLog: relatedLogs[0] || null,
    };
  });

  const filtered = chains.filter((c) => {
    const matchesStage = stageFilter === 'ALL' || c.category === stageFilter;
    const matchesQuery =
      !query ||
      c.prNo.toLowerCase().includes(query) ||
      c.pqtoNo.toLowerCase().includes(query) ||
      c.refDocNo.toLowerCase().includes(query) ||
      c.applicant.toLowerCase().includes(query) ||
      c.linkedPoNos.some((n) => n.toLowerCase().includes(query)) ||
      c.linkedGrnNos.some((n) => n.toLowerCase().includes(query)) ||
      c.linkedWdNos.some((n) => n.toLowerCase().includes(query));
    return matchesStage && matchesQuery;
  });

  res.json({
    counts: {
      ALL: chains.length,
      PR: chains.filter((c) => c.category === 'PR').length,
      PO: chains.filter((c) => c.category === 'PO').length,
      DELIVERY: chains.filter((c) => c.category === 'DELIVERY').length,
      DONE: chains.filter((c) => c.category === 'DONE').length,
    },
    chains: filtered,
  });
});

// ============================================================================
// 10. TRANSACTION LOGS (IMMUTABLE & ROLE-SCOPED)
// ============================================================================

app.get('/api/logs', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const search = String(req.query.search || '').trim().toLowerCase();
  const moduleFilter = String(req.query.module || 'ALL').toUpperCase();
  const userFilter = String(req.query.user || '').trim().toLowerCase();
  const dateFilter = String(req.query.date || '').trim();

  const allowedModules = ROLE_VISIBLE_LOG_MODULES[user.role] || [];
  let logs = store
    .getState()
    .logs.filter((l) => allowedModules.includes(l.module.toUpperCase()));

  if (moduleFilter && moduleFilter !== 'ALL') {
    logs = logs.filter((l) => l.module.toUpperCase() === moduleFilter);
  }
  if (userFilter) {
    logs = logs.filter((l) => l.adminOrUser.toLowerCase().includes(userFilter));
  }
  if (dateFilter) {
    logs = logs.filter((l) => l.timestamp.startsWith(dateFilter));
  }
  if (search) {
    logs = logs.filter(
      (l) =>
        l.docNo.toLowerCase().includes(search) ||
        l.spName.toLowerCase().includes(search) ||
        l.adminOrUser.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        l.comments.toLowerCase().includes(search) ||
        l.module.toLowerCase().includes(search)
    );
  }

  res.json({
    allowedModules,
    logs: logs.slice(0, 200),
  });
});

// ============================================================================
// 11. NOTIFICATIONS
// ============================================================================

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const recipientRole = user.role === 'REQ Approver' ? 'Approver' : 'Applicant';
  const notifications = store
    .getState()
    .notifications.filter((n) => n.recipientRole === recipientRole);
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
});

app.post('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  const notif = store.getState().notifications.find((n) => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });
  notif.read = true;
  store.save();
  res.json({ ok: true, notification: notif });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const recipientRole = user.role === 'REQ Approver' ? 'Approver' : 'Applicant';
  store.getState().notifications.forEach((n) => {
    if (n.recipientRole === recipientRole) n.read = true;
  });
  store.save();
  res.json({ ok: true });
});

// ============================================================================
// 12. SECURE FILE ATTACHMENTS (PDF, JPG, PNG, XLSX)
// ============================================================================

app.post('/api/attachments', requireAuth, (req: AuthenticatedRequest, res) => {
  const { fileName, base64Data, mimeType } = req.body as {
    fileName?: string;
    base64Data?: string;
    mimeType?: string;
  };

  if (!fileName || !base64Data) {
    return res.status(400).json({ error: 'fileName and base64Data are required.' });
  }

  const safeOriginalName = path.basename(fileName).replace(/[^a-zA-Z0-9._ -]/g, '_');
  const rawExt = safeOriginalName.split('.').pop()?.toUpperCase() || '';
  if (!ALLOWED_EXTENSIONS.has(rawExt)) {
    return res.status(400).json({
      error: `Unsupported file type ".${rawExt}". Allowed formats: PDF, JPG, PNG, XLSX.`,
    });
  }

  const strippedBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const buffer = Buffer.from(strippedBase64, 'base64');
  if (buffer.length === 0) {
    return res.status(400).json({ error: 'Uploaded file is empty.' });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'File exceeds the 10 MB maximum upload size.' });
  }

  const id = `att-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const storedFileName = `${id}_${safeOriginalName}`;
  const fullPath = path.join(UPLOADS_DIR, storedFileName);
  fs.writeFileSync(fullPath, buffer);

  const normalizedType: FileAttachment['type'] =
    rawExt === 'JPEG' ? 'JPG' : (rawExt as FileAttachment['type']);

  const meta: StoredAttachmentMeta = {
    id,
    name: safeOriginalName,
    type: normalizedType,
    size: formatFileSize(buffer.length),
    uploadedAt: nowShortStamp(),
    storagePath: storedFileName,
    mimeType: mimeType || 'application/octet-stream',
  };

  store.getState().attachmentsIndex[id] = meta;
  store.save();

  res.status(201).json({
    attachment: {
      id: meta.id,
      name: meta.name,
      type: meta.type,
      size: meta.size,
      uploadedAt: meta.uploadedAt,
      downloadUrl: `/api/attachments/${meta.id}/download`,
    },
  });
});

app.get('/api/attachments/:id/download', requireAuth, (req: AuthenticatedRequest, res) => {
  const meta = store.getState().attachmentsIndex[req.params.id];
  if (!meta || !meta.storagePath) {
    return res.status(404).json({ error: 'Attachment file not found on server.' });
  }
  const fullPath = path.join(UPLOADS_DIR, path.basename(meta.storagePath));
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Attachment file missing on storage.' });
  }
  res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${meta.name}"`);
  fs.createReadStream(fullPath).pipe(res);
});

// Safe fallback error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

app.listen(PORT, HOST, () => {
  console.log(`Purchasing & Inventory API server ready on http://${HOST}:${PORT}`);
});
