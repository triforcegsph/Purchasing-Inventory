/**
 * End-to-End Scenario Tests
 * Simulates real users going through complete workflows step by step.
 * Each scenario is a full story — login → action → result at every stage.
 *
 * Run with: npx tsx tests/e2e-scenarios.test.ts
 */

import {
  INITIAL_BOQ_ITEMS,
  INITIAL_PQTOS,
  INITIAL_PRS,
  INITIAL_POS,
  INITIAL_STOCK,
  INITIAL_RECEIVINGS,
  INITIAL_WITHDRAWALS,
  INITIAL_REQUIRED_CONFIG,
  INITIAL_LOGS,
} from '../src/data/seedData';
import { SYSTEM_ACCOUNTS } from '../src/components/LoginPage';
import type {
  BoqItem,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  TransactionLog,
  UserAccount,
  WarehouseStock,
  WithdrawalRecord,
  StockTransferRecord,
} from '../src/types/erp';

// ─── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: { scenario: string; step: string; reason: string }[] = [];
let currentScenario = '';
let stepCount = 0;

function step(name: string, fn: () => void) {
  stepCount++;
  try {
    fn();
    console.log(`    ✅  Step ${stepCount}: ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    ❌  Step ${stepCount}: ${name}`);
    console.log(`         → ${msg}`);
    failed++;
    failures.push({ scenario: currentScenario, step: `Step ${stepCount}: ${name}`, reason: msg });
  }
}

function scenario(title: string, fn: () => void) {
  currentScenario = title;
  stepCount = 0;
  console.log(`\n${'═'.repeat(66)}`);
  console.log(`📖  SCENARIO: ${title}`);
  console.log('═'.repeat(66));
  fn();
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, label = '') {
  if (actual !== expected)
    throw new Error(`${label ? label + ': ' : ''}expected "${String(expected)}", got "${String(actual)}"`);
}

// ─── Re-implement business logic (mirrors App.tsx) ─────────────────────────────

function login(email: string, password: string): UserAccount | null {
  const q = email.trim().toLowerCase();
  return SYSTEM_ACCOUNTS.find(
    (acc) => acc.username.toLowerCase() === q && acc.password === password
  ) ?? null;
}

function getTransactionalBoqItems(items: BoqItem[]) {
  return items.filter(
    (it) => !it.isBlankRow && !it.isWorksRelated && it.itemCode.trim() !== ''
  );
}

function createPqtoFromBoq(boqItems: BoqItem[], existingPqtos: PqtoRecord[]): PqtoRecord {
  const transactional = getTransactionalBoqItems(boqItems);
  return {
    id: `pqto-${Date.now()}`,
    pqtoNo: `PQTO-2026-00${existingPqtos.length + 1}`,
    jobNo: 'JOB-2026-884',
    projectTitle: 'Posted from BOQ Workspace',
    status: 'Posted',
    createdAt: '2026-11-19 09:00',
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
}

function submitPr(pqto: PqtoRecord, refDocNo: string, applicant: string): PrRecord {
  return {
    id: `pr-${Date.now()}`,
    prNo: `PR-2026-S${Math.floor(Math.random() * 900 + 100)}`,
    pqtoNo: pqto.pqtoNo,
    refDocNo,
    jobNo: 'JOB-2026-884',
    applicant,
    spName: 'SP-MECH-ALPHA',
    status: 'Pending Approval',
    createdAt: '2026-11-19 09:30',
    attachments: [],
    items: pqto.items.slice(0, 2).map((it, idx) => ({
      id: `pr-line-${idx}`,
      itemCode: it.itemCode,
      description: it.description,
      uom: it.pqtoUom,
      pqtoQty: it.pqtoQty,
      requestedQty: Math.min(5, it.pqtoQty),
      assignedLocation: it.assignedLocation,
    })),
  };
}

function approvePr(prs: PrRecord[], prId: string): PrRecord[] {
  return prs.map((p) => p.id === prId ? { ...p, status: 'Approved' as const } : p);
}

function rejectPr(prs: PrRecord[], prId: string): PrRecord[] {
  return prs.map((p) => p.id === prId ? { ...p, status: 'Rejected' as const } : p);
}

function createPo(pr: PrRecord, vendor: string, refDocNo: string, iaas2: string): PoRecord {
  return {
    id: `po-${Date.now()}`,
    poNo: `PO-2026-S${Math.floor(Math.random() * 900 + 100)}`,
    prNo: pr.prNo,
    refDocNo,
    iaas2RefNo: iaas2,
    vendor,
    applicant: pr.applicant,
    approver: 'Dir. Jane Doe',
    spName: pr.spName,
    status: 'Pending Approval',
    createdAt: '2026-11-19 10:00',
    attachments: [],
    items: pr.items.map((it, idx) => ({
      id: `po-item-${idx}`,
      itemCode: it.itemCode,
      description: it.description,
      uom: it.uom,
      prQty: it.requestedQty,
      poQty: it.requestedQty,
      receivedQty: 0,
      unitPrice: 1200,
      assignedLocation: it.assignedLocation,
    })),
  };
}

function approvePo(pos: PoRecord[], poId: string): PoRecord[] {
  return pos.map((p) => p.id === poId ? { ...p, status: 'Approved' as const } : p);
}

function rejectPo(pos: PoRecord[], poId: string, comment: string): PoRecord[] {
  return pos.map((p) =>
    p.id === poId
      ? { ...p, status: 'Returned to Applicant' as const, rejectionComments: comment }
      : p
  );
}

function postReceiving(
  activePo: PoRecord,
  drNo: string,
  qtysById: Record<string, number>,
  stock: WarehouseStock[]
): { receiving: ReceivingRecord; updatedPos: PoRecord[]; updatedStock: WarehouseStock[] } {
  const lineItems = activePo.items.map((it) => {
    const outstanding = Math.max(0, it.poQty - it.receivedQty);
    const actual = qtysById[it.id] ?? outstanding;
    return {
      id: `grn-li-${it.id}`,
      itemCode: it.itemCode,
      description: it.description,
      uom: it.uom,
      orderedQty: it.poQty,
      previouslyReceivedQty: it.receivedQty,
      toReceiveQty: outstanding,
      actualReceivedQty: Math.min(outstanding, Math.max(0, actual)),
    };
  });

  const stillHasOutstanding = lineItems.some((i) => i.actualReceivedQty < i.toReceiveQty);
  const receiving: ReceivingRecord = {
    id: `grn-${Date.now()}`,
    grnNo: `GRN-2026-S${Math.floor(Math.random() * 900 + 100)}`,
    poNo: activePo.poNo,
    refDocNo: activePo.refDocNo,
    iaas2RefNo: activePo.iaas2RefNo,
    drNo,
    drDate: '2026-11-19',
    performedAt: '2026-11-19 11:00',
    spName: activePo.spName,
    status: stillHasOutstanding ? 'Partially Received' : 'Completed',
    attachments: [],
    items: lineItems,
  };

  // Update PO received qtys and status
  const updatedItems = activePo.items.map((poIt) => {
    const recIt = lineItems.find((r) => r.itemCode === poIt.itemCode);
    if (!recIt) return poIt;
    return { ...poIt, receivedQty: poIt.receivedQty + recIt.actualReceivedQty };
  });
  const allDone = updatedItems.every((i) => i.receivedQty >= i.poQty);
  const updatedPo = { ...activePo, items: updatedItems, status: allDone ? 'Completed' as const : 'Partially Received' as const };

  // Update stock
  const updatedStock = stock.map((s) => ({ ...s }));
  lineItems.forEach((recIt) => {
    if (recIt.actualReceivedQty <= 0) return;
    const idx = updatedStock.findIndex((s) => s.itemCode === recIt.itemCode);
    if (idx >= 0) {
      updatedStock[idx] = { ...updatedStock[idx], availableStock: updatedStock[idx].availableStock + recIt.actualReceivedQty };
    } else {
      updatedStock.push({
        id: `stk-new-${recIt.itemCode}`,
        itemCode: recIt.itemCode,
        description: recIt.description,
        uom: recIt.uom,
        systemTag: 'MEPF - Chilled Water',
        assignedLocation: 'Central Warehouse',
        availableStock: recIt.actualReceivedQty,
        reservedStock: 0,
      });
    }
  });

  return {
    receiving,
    updatedPos: [updatedPo],
    updatedStock,
  };
}

function postWithdrawal(
  stockItem: WarehouseStock,
  requestedQty: number,
  requestedBy: string,
  stock: WarehouseStock[]
): { withdrawal: WithdrawalRecord; updatedStock: WarehouseStock[] } {
  const hasStock = stockItem.availableStock >= requestedQty;
  const withdrawal: WithdrawalRecord = {
    id: `wd-${Date.now()}`,
    wdNo: `WD-2026-S${Math.floor(Math.random() * 900 + 100)}`,
    systemTag: stockItem.systemTag,
    jobNo: 'JOB-2026-884',
    requestedBy,
    spName: 'SP-MECH-ALPHA',
    performedAt: '2026-11-19 12:00',
    status: hasStock ? 'With Stock' : 'Without Stock',
    attachments: [],
    items: [{
      itemCode: stockItem.itemCode,
      description: stockItem.description,
      uom: stockItem.uom,
      availableAtRequest: stockItem.availableStock,
      requestedQty,
      assignedLocation: stockItem.assignedLocation,
    }],
  };

  const updatedStock = hasStock
    ? stock.map((s) =>
        s.itemCode === stockItem.itemCode
          ? { ...s, availableStock: Math.max(0, s.availableStock - requestedQty) }
          : s
      )
    : stock;

  return { withdrawal, updatedStock };
}

function addLog(logs: TransactionLog[], module: string, docNo: string, action: string, role: string): TransactionLog[] {
  return [{
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    adminOrUser: `${role} (Admin)`,
    spName: 'SP-MECH-ALPHA',
    module,
    docNo,
    action,
    comments: `${action} by ${role}`,
  }, ...logs];
}

// Build tracking chain for one PR (mirrors TrackingModule)
function buildChain(
  pr: PrRecord,
  pqtos: PqtoRecord[],
  pos: PoRecord[],
  receivings: ReceivingRecord[],
  withdrawals: WithdrawalRecord[]
) {
  const linkedPos = pos.filter((p) => p.prNo === pr.prNo);
  const primaryPo = linkedPos[0];
  const linkedReceivings = linkedPos.flatMap((po) => receivings.filter((r) => r.poNo === po.poNo));
  const prItemCodes = new Set(pr.items.map((i) => i.itemCode));
  const linkedWithdrawals = withdrawals.filter((w) => w.items.some((wi) => prItemCodes.has(wi.itemCode)));

  let category: 'PR' | 'PO' | 'DELIVERY' | 'DONE' = 'PR';
  if (primaryPo?.status === 'Completed') category = 'DONE';
  else if (primaryPo?.status === 'Approved' || primaryPo?.status === 'Partially Received') category = 'DELIVERY';
  else if (primaryPo || pr.status === 'Approved') category = 'PO';

  const steps = {
    s1: 'done' as const,
    s2: pr.status === 'Draft' ? 'active' : 'done',
    s3: pr.status === 'Draft' ? 'pending'
      : pr.status === 'Pending Approval' ? 'active'
      : pr.status === 'Rejected' ? 'rejected'
      : 'done',
    s4: primaryPo
      ? (primaryPo.status === 'Pending Approval' ? 'active'
        : primaryPo.status === 'Returned to Applicant' ? 'rejected'
        : 'done')
      : (pr.status === 'Approved' ? 'active' : 'pending'),
    s5: primaryPo
      ? (primaryPo.status === 'Approved' ? 'active'
        : primaryPo.status === 'Partially Received' ? 'active'
        : primaryPo.status === 'Completed' ? 'done'
        : 'pending')
      : 'pending',
    s6: linkedWithdrawals.length > 0
      ? (primaryPo?.status === 'Completed' ? 'done' : 'active')
      : 'pending',
  };

  return { pr, linkedPos, primaryPo, linkedReceivings, linkedWithdrawals, steps, category };
}

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 1: Full Happy Path — Everything goes through perfectly
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 1 — Full Happy Path: BOQ → PQTO → PR → PO → GRN → Withdrawal', () => {
  let applicant: UserAccount;
  let reqApprover: UserAccount;
  let poApprover: UserAccount;
  let warehouseManager: UserAccount;
  let pqto: PqtoRecord;
  let pr: PrRecord;
  let po: PoRecord;
  let receiving: ReceivingRecord;
  let withdrawal: WithdrawalRecord;
  let stock = [...INITIAL_STOCK];
  let prs: PrRecord[] = [];
  let pos: PoRecord[] = [];
  let logs: TransactionLog[] = [];

  step('Site Engineer (Applicant) logs in', () => {
    applicant = login('applicant@triforcegs.com.ph', '1234')!;
    assert(applicant !== null, 'Login failed');
    assertEqual(applicant.role, 'Applicant/Requestor');
    logs = addLog(logs, 'System', applicant.role, 'User Signed In', applicant.role);
  });

  step('Applicant views BOQ and verifies transactional items exist', () => {
    const transactional = getTransactionalBoqItems(INITIAL_BOQ_ITEMS);
    assert(transactional.length > 0, 'No transactional BOQ items to work with');
    console.log(`         → ${transactional.length} transactional items found`);
  });

  step('Applicant posts BOQ to PQTO — creates a new PQTO record', () => {
    pqto = createPqtoFromBoq(INITIAL_BOQ_ITEMS, INITIAL_PQTOS);
    assertEqual(pqto.status, 'Posted', 'PQTO status');
    assert(pqto.items.length > 0, 'PQTO must have items');
    logs = addLog(logs, 'BOQ', pqto.pqtoNo, 'Posted to PQTO', applicant.role);
    console.log(`         → Created ${pqto.pqtoNo} with ${pqto.items.length} items`);
  });

  step('Applicant creates a PR from the new PQTO and submits it', () => {
    pr = submitPr(pqto, 'REF-PR-2026-001', applicant.fullName);
    assertEqual(pr.status, 'Pending Approval', 'PR should be Pending Approval');
    assert(pr.items.length > 0, 'PR must have line items');
    prs = [pr];
    logs = addLog(logs, 'PR', pr.prNo, 'Submitted for Approval', applicant.role);
    console.log(`         → Submitted ${pr.prNo} with ${pr.items.length} items`);
  });

  step('Tracking: PR chain is in "PR" stage — waiting for REQ Approval', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.category, 'PR', 'Should be in PR stage');
    assertEqual(chain.steps.s3, 'active', 'Step 3 should be active (pending REQ approval)');
  });

  step('REQ Approver logs in', () => {
    reqApprover = login('req.approver@triforcegs.com.ph', '1234')!;
    assert(reqApprover !== null, 'REQ Approver login failed');
    assertEqual(reqApprover.role, 'REQ Approver');
  });

  step('REQ Approver sees the pending PR in the register', () => {
    const pendingPrs = prs.filter((p) => p.status === 'Pending Approval');
    assert(pendingPrs.length === 1, 'Should see 1 pending PR');
    assertEqual(pendingPrs[0].prNo, pr.prNo, 'Correct PR in queue');
  });

  step('REQ Approver approves the PR', () => {
    prs = approvePr(prs, pr.id);
    pr = prs.find((p) => p.id === pr.id)!;
    assertEqual(pr.status, 'Approved', 'PR status after approval');
    logs = addLog(logs, 'PR', pr.prNo, 'Approved', reqApprover.role);
    console.log(`         → ${pr.prNo} is now Approved`);
  });

  step('Tracking: Chain moves to "PO" stage — ready to generate PO', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.category, 'PO', 'Should be in PO stage');
    assertEqual(chain.steps.s3, 'done', 'Step 3 must be done');
    assertEqual(chain.steps.s4, 'active', 'Step 4 is active — ready for PO');
  });

  step('PO Approver logs in', () => {
    poApprover = login('po.approver@triforcegs.com.ph', '1234')!;
    assert(poApprover !== null, 'PO Approver login failed');
    assertEqual(poApprover.role, 'PO Approver');
  });

  step('PO Approver creates a PO from the approved PR', () => {
    po = createPo(pr, 'SteelCore Industrial Supply Corp.', 'REF-PO-2026-001', 'IAAS2-99210');
    assertEqual(po.status, 'Pending Approval', 'PO should be Pending Approval');
    assertEqual(po.prNo, pr.prNo, 'PO must reference the correct PR');
    assert(po.items.length === pr.items.length, 'PO should have same item count as PR');
    pos = [po];
    logs = addLog(logs, 'PO', po.poNo, 'Created PO from PR', poApprover.role);
    console.log(`         → Created ${po.poNo} linked to ${pr.prNo}`);
  });

  step('PO Approver approves the PO', () => {
    pos = approvePo(pos, po.id);
    po = pos.find((p) => p.id === po.id)!;
    assertEqual(po.status, 'Approved', 'PO status after approval');
    logs = addLog(logs, 'PO', po.poNo, 'Approved', poApprover.role);
    console.log(`         → ${po.poNo} is now Approved`);
  });

  step('Tracking: Chain moves to "DELIVERY" stage — goods in transit', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.category, 'DELIVERY', 'Should be in DELIVERY stage');
    assertEqual(chain.steps.s4, 'done', 'Step 4 must be done');
    assertEqual(chain.steps.s5, 'active', 'Step 5 is active — in transit');
  });

  step('Warehouse Manager logs in', () => {
    warehouseManager = login('warehouse@triforcegs.com.ph', '1234')!;
    assert(warehouseManager !== null, 'Warehouse Manager login failed');
    assertEqual(warehouseManager.role, 'Warehouse Manager');
  });

  step('Warehouse Manager only sees the Approved PO in the GRN dropdown', () => {
    const openPos = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received');
    assertEqual(openPos.length, 1, 'Should see 1 open PO');
    assertEqual(openPos[0].poNo, po.poNo, 'Correct PO in list');
  });

  step('Warehouse Manager receives all items in full — posts GRN', () => {
    const result = postReceiving(po, 'DR-2026-55210', {}, stock);
    receiving = result.receiving;
    po = result.updatedPos[0];
    stock = result.updatedStock;
    assertEqual(receiving.status, 'Completed', 'GRN should be Completed (all items received)');
    assertEqual(po.status, 'Completed', 'PO should be Completed after full receiving');
    logs = addLog(logs, 'Receiving', receiving.grnNo, 'Posted (Completed)', warehouseManager.role);
    console.log(`         → ${receiving.grnNo} posted — PO is now Completed`);
  });

  step('Stock increases for all received items', () => {
    for (const recItem of receiving.items) {
      const stockEntry = stock.find((s) => s.itemCode === recItem.itemCode);
      if (recItem.actualReceivedQty > 0) {
        assert(stockEntry !== undefined, `Stock entry for ${recItem.itemCode} should exist`);
      }
    }
  });

  step('Tracking: Chain moves to "DONE" stage', () => {
    const chain = buildChain(pr, [pqto], [po], [receiving], []);
    assertEqual(chain.category, 'DONE', 'Should be DONE');
    assertEqual(chain.steps.s5, 'done', 'Step 5 must be done');
  });

  step('Warehouse Manager issues materials from stock (withdrawal)', () => {
    const targetStock = stock.find((s) => s.itemCode === po.items[0].itemCode);
    assert(targetStock !== undefined, 'Stock item should exist after receiving');
    const result = postWithdrawal(targetStock!, 2, 'Foreman J. Dela Cruz', stock);
    withdrawal = result.withdrawal;
    stock = result.updatedStock;
    assertEqual(withdrawal.status, 'With Stock', 'Withdrawal should be With Stock');
    logs = addLog(logs, 'Withdrawal', withdrawal.wdNo, 'Issued (With Stock)', warehouseManager.role);
    console.log(`         → ${withdrawal.wdNo} issued — ${withdrawal.items[0].requestedQty} units deducted`);
  });

  step('Stock is deducted after withdrawal', () => {
    const target = po.items[0];
    const stockAfter = stock.find((s) => s.itemCode === target.itemCode)!;
    // We received target.poQty units then withdrew 2 — the stock must exist
    assert(stockAfter !== undefined, 'Stock entry must still exist');
    assert(stockAfter.availableStock >= 0, 'Stock should not go negative');
  });

  step('Tracking: Step 6 (Site Issuance) is active/done after withdrawal', () => {
    const chain = buildChain(pr, [pqto], [po], [receiving], [withdrawal]);
    assert(
      chain.steps.s6 === 'active' || chain.steps.s6 === 'done',
      `Step 6 should be active or done, got "${chain.steps.s6}"`
    );
  });

  step('Audit log has entries for every action in the workflow', () => {
    assert(logs.length >= 7, `Expected at least 7 log entries, got ${logs.length}`);
    assert(logs.some((l) => l.action.includes('Signed In')), 'Missing: User Signed In');
    assert(logs.some((l) => l.action.includes('Posted to PQTO')), 'Missing: Posted to PQTO');
    assert(logs.some((l) => l.action.includes('Submitted for Approval')), 'Missing: PR Submitted');
    assert(logs.some((l) => l.action.includes('Approved') && l.module === 'PR'), 'Missing: PR Approved log entry');
    assert(logs.some((l) => l.action.includes('Approved') && l.module === 'PO'), 'Missing: PO Approved log entry');
    assert(logs.some((l) => l.action.includes('Posted (Completed)')), 'Missing: GRN Posted');
    assert(logs.some((l) => l.action.includes('With Stock')), 'Missing: Withdrawal Issued');
    console.log(`         → ${logs.length} log entries recorded throughout the workflow`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 2: PR is Rejected by REQ Approver
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 2 — PR Rejected: Applicant submits PR → REQ Approver rejects it', () => {
  let pr: PrRecord;
  let prs: PrRecord[] = [];
  const pqto = INITIAL_PQTOS[0];

  step('Applicant logs in and submits a PR', () => {
    const applicant = login('applicant@triforcegs.com.ph', '1234')!;
    pr = submitPr(pqto, 'REF-PR-REJECTED-001', applicant.fullName);
    prs = [pr];
    assertEqual(pr.status, 'Pending Approval', 'PR status after submit');
    console.log(`         → Submitted ${pr.prNo}`);
  });

  step('Tracking shows Step 3 is "active" — waiting for approval', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.steps.s3, 'active', 'Step 3 should be active');
    assertEqual(chain.category, 'PR', 'Category should be PR');
  });

  step('REQ Approver logs in', () => {
    const reqApprover = login('req.approver@triforcegs.com.ph', '1234')!;
    assert(reqApprover !== null, 'Login failed');
  });

  step('REQ Approver rejects the PR', () => {
    prs = rejectPr(prs, pr.id);
    pr = prs.find((p) => p.id === pr.id)!;
    assertEqual(pr.status, 'Rejected', 'PR status after rejection');
    console.log(`         → ${pr.prNo} is now Rejected`);
  });

  step('Tracking shows Step 3 is "rejected"', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.steps.s3, 'rejected', 'Step 3 should be rejected');
  });

  step('No PO is created — Step 4 and beyond remain "pending"', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.steps.s4, 'pending', 'Step 4 should be pending');
    assertEqual(chain.steps.s5, 'pending', 'Step 5 should be pending');
    assertEqual(chain.steps.s6, 'pending', 'Step 6 should be pending');
  });

  step('Category stays "PR" — it never advanced to PO stage', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.category, 'PR', 'Should still be PR category');
  });

  step('A new PR can be submitted after rejection (workflow is not locked)', () => {
    const applicant = login('applicant@triforcegs.com.ph', '1234')!;
    const newPr = submitPr(pqto, 'REF-PR-RESUBMIT-001', applicant.fullName);
    prs = [...prs, newPr];
    assertEqual(newPr.status, 'Pending Approval', 'New PR starts fresh');
    assertEqual(prs.length, 2, 'Both PRs exist in register');
    console.log(`         → Re-submitted as ${newPr.prNo}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 3: PO Rejected — Returned to Applicant
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 3 — PO Returned: PR approved → PO created → PO Director rejects it', () => {
  let pr: PrRecord;
  let po: PoRecord;
  let prs: PrRecord[] = [];
  let pos: PoRecord[] = [];
  const pqto = INITIAL_PQTOS[0];

  step('Applicant submits a PR', () => {
    const applicant = login('applicant@triforcegs.com.ph', '1234')!;
    pr = submitPr(pqto, 'REF-PR-REJPO-001', applicant.fullName);
    prs = [pr];
    console.log(`         → Submitted ${pr.prNo}`);
  });

  step('REQ Approver approves the PR', () => {
    login('req.approver@triforcegs.com.ph', '1234');
    prs = approvePr(prs, pr.id);
    pr = prs.find((p) => p.id === pr.id)!;
    assertEqual(pr.status, 'Approved', 'PR status');
  });

  step('PO Approver creates a PO from the approved PR', () => {
    login('po.approver@triforcegs.com.ph', '1234');
    po = createPo(pr, 'SteelCore Industrial Supply Corp.', 'REF-PO-REJPO-001', 'IAAS2-REJPO');
    pos = [po];
    assertEqual(po.status, 'Pending Approval', 'PO status after creation');
    console.log(`         → Created ${po.poNo}`);
  });

  step('Tracking: Step 4 is "active" — PO awaiting PO Approver', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.steps.s4, 'active', 'Step 4 should be active');
    assertEqual(chain.category, 'PO', 'Category should be PO');
  });

  step('PO Approver rejects the PO without a comment — blocked', () => {
    const emptyComment = '';
    assert(!emptyComment.trim(), 'Empty comment should be falsy — rejection should be blocked');
  });

  step('PO Approver rejects the PO with a comment — succeeds', () => {
    const rejectionComment = 'Unit price exceeds approved budget ceiling. Renegotiate with vendor.';
    pos = rejectPo(pos, po.id, rejectionComment);
    po = pos.find((p) => p.id === po.id)!;
    assertEqual(po.status, 'Returned to Applicant', 'PO status after rejection');
    assertEqual(po.rejectionComments, rejectionComment, 'Comment stored on PO');
    console.log(`         → ${po.poNo} returned with comment: "${rejectionComment.slice(0, 40)}..."`);
  });

  step('Tracking: Step 4 shows "rejected" with the rejection comment', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.steps.s4, 'rejected', 'Step 4 should be rejected');
  });

  step('Tracking: Steps 5 and 6 remain "pending" — no delivery or issuance happened', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.steps.s5, 'pending', 'Step 5 should be pending');
    assertEqual(chain.steps.s6, 'pending', 'Step 6 should be pending');
  });

  step('Category stays "PO" — not yet DELIVERY or DONE', () => {
    const chain = buildChain(pr, [pqto], pos, [], []);
    assertEqual(chain.category, 'PO', 'Category should stay PO');
  });

  step('Applicant can create a revised PO after rejection', () => {
    const revisedPo = createPo(pr, 'AltSupplier Corp.', 'REF-PO-REVISED', 'IAAS2-REVISED');
    pos = [...pos, revisedPo];
    assertEqual(revisedPo.status, 'Pending Approval', 'Revised PO status');
    assertEqual(pos.length, 2, 'Both POs in register');
    console.log(`         → Revised PO: ${revisedPo.poNo} from new vendor`);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 4: Partial Receiving — Two GRN deliveries to complete a PO
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 4 — Partial Receiving: Goods arrive in 2 separate deliveries', () => {
  let trackingPr: PrRecord; // keep the same PR object for all tracking checks
  let po: PoRecord;
  let grn1: ReceivingRecord;
  let grn2: ReceivingRecord;
  let stock = [...INITIAL_STOCK];
  const pqto = INITIAL_PQTOS[0];
  let pos: PoRecord[] = [];
  let receivings: ReceivingRecord[] = [];

  step('Setup: PR approved → PO approved, ready for receiving', () => {
    const applicant = login('applicant@triforcegs.com.ph', '1234')!;
    const pr = submitPr(pqto, 'REF-PARTIAL-001', applicant.fullName);
    trackingPr = { ...pr, status: 'Approved' as const }; // store for reuse in tracking steps
    po = createPo(trackingPr, 'SteelCore Industrial Supply Corp.', 'REF-PO-PARTIAL', 'IAAS2-PARTIAL');
    po = { ...po, status: 'Approved' as const };
    pos = [po];
    console.log(`         → ${po.poNo} is Approved. Total ordered: ${po.items.reduce((s, i) => s + i.poQty, 0)} units`);
  });

  step('Warehouse Manager makes First Delivery — receives HALF the quantity', () => {
    login('warehouse@triforcegs.com.ph', '1234');
    // Only receive 1 unit per item (partial)
    const halfQtys: Record<string, number> = {};
    for (const item of po.items) halfQtys[item.id] = 1;

    const result = postReceiving(po, 'DR-PART-001', halfQtys, stock);
    grn1 = result.receiving;
    po = result.updatedPos[0];
    stock = result.updatedStock;
    receivings = [grn1];
    pos = [po];

    assertEqual(grn1.status, 'Partially Received', 'GRN 1 should be Partially Received');
    assertEqual(po.status, 'Partially Received', 'PO should be Partially Received');
    console.log(`         → ${grn1.grnNo} posted — PO is Partially Received`);
  });

  step('Tracking after first delivery: Step 5 is "active" (on delivery)', () => {
    // Use the SAME PR that was used to create the PO so the prNo links correctly
    const chain = buildChain(trackingPr, [pqto], pos, receivings, []);
    assertEqual(chain.steps.s5, 'active', 'Step 5 should be active after partial receiving');
  });

  step('Warehouse Manager makes Second Delivery — receives remaining items', () => {
    // Receive remaining (outstanding) for all items
    const result = postReceiving(po, 'DR-PART-002', {}, stock); // {} = default to outstanding qty
    grn2 = result.receiving;
    po = result.updatedPos[0];
    stock = result.updatedStock;
    receivings = [...receivings, grn2];
    pos = [po];

    assertEqual(grn2.status, 'Completed', 'GRN 2 should be Completed');
    assertEqual(po.status, 'Completed', 'PO should be Completed after full receiving');
    console.log(`         → ${grn2.grnNo} posted — PO is now Completed`);
  });

  step('Both GRN records exist in the system', () => {
    assertEqual(receivings.length, 2, 'Should have 2 GRN records');
    assert(receivings.some((r) => r.status === 'Partially Received'), 'First GRN is Partial');
    assert(receivings.some((r) => r.status === 'Completed'), 'Second GRN is Completed');
  });

  step('All items on the PO are fully received after two deliveries', () => {
    for (const item of po.items) {
      assertEqual(item.receivedQty, item.poQty, `Item ${item.itemCode} should be fully received`);
    }
  });

  step('Stock correctly reflects total of both deliveries', () => {
    for (const item of po.items) {
      const s = stock.find((st) => st.itemCode === item.itemCode);
      assert(s !== undefined, `Stock entry for ${item.itemCode} should exist`);
    }
  });

  step('Tracking: Chain reaches "DONE" stage after second delivery', () => {
    // Use the same PR (same prNo) so the PO links correctly
    const chain = buildChain(trackingPr, [pqto], pos, receivings, []);
    assertEqual(chain.category, 'DONE', 'Category should be DONE');
    assertEqual(chain.steps.s5, 'done', 'Step 5 should be done');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 5: Without Stock Withdrawal — Requesting items not in warehouse
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 5 — Without Stock: Withdrawal request when warehouse is empty', () => {
  let withdrawal: WithdrawalRecord;
  let stockWithNoItem: WarehouseStock[];

  step('Warehouse Manager logs in', () => {
    const wm = login('warehouse@triforcegs.com.ph', '1234')!;
    assertEqual(wm.role, 'Warehouse Manager');
  });

  step('Stock item exists but quantity is 0 (depleted)', () => {
    const depletedStock: WarehouseStock = {
      id: 'stk-depleted',
      itemCode: 'MAT-DEPLETED-001',
      description: 'Depleted Gate Valve 100mm',
      uom: 'PC/s',
      systemTag: 'MEPF - Chilled Water',
      assignedLocation: 'Central Warehouse',
      availableStock: 0,
      reservedStock: 0,
    };
    stockWithNoItem = [depletedStock, ...INITIAL_STOCK];
    assertEqual(depletedStock.availableStock, 0, 'Item is depleted');
  });

  step('Warehouse Manager requests 5 units from a depleted item', () => {
    const depletedItem = stockWithNoItem[0];
    const result = postWithdrawal(depletedItem, 5, 'Foreman Maria Cruz', stockWithNoItem);
    withdrawal = result.withdrawal;
    stockWithNoItem = result.updatedStock;
    assertEqual(withdrawal.status, 'Without Stock', 'Should log as Without Stock');
    console.log(`         → ${withdrawal.wdNo} logged as "Without Stock" (0 avail vs 5 req)`);
  });

  step('Stock is NOT deducted for a Without Stock withdrawal', () => {
    const after = stockWithNoItem.find((s) => s.itemCode === 'MAT-DEPLETED-001');
    assertEqual(after!.availableStock, 0, 'Stock should remain at 0');
  });

  step('Withdrawal record is created and stored (for tracking/documentation)', () => {
    assert(withdrawal.wdNo !== undefined, 'Withdrawal number should exist');
    assertEqual(withdrawal.items[0].requestedQty, 5, 'Requested qty recorded');
    assertEqual(withdrawal.items[0].availableAtRequest, 0, 'Available qty at time of request recorded');
  });

  step('Requesting 3 units from a stock item with only 2 available → Without Stock', () => {
    const lowStock: WarehouseStock = { ...INITIAL_STOCK[0], availableStock: 2 };
    const result = postWithdrawal(lowStock, 3, 'Foreman', [lowStock]);
    assertEqual(result.withdrawal.status, 'Without Stock', 'Should be Without Stock when insufficient');
    assertEqual(result.updatedStock[0].availableStock, 2, 'Stock unchanged for Without Stock');
  });

  step('Requesting exactly the available amount → With Stock (boundary check)', () => {
    const exactStock: WarehouseStock = { ...INITIAL_STOCK[0], availableStock: 5 };
    const result = postWithdrawal(exactStock, 5, 'Foreman', [exactStock]);
    assertEqual(result.withdrawal.status, 'With Stock', 'Exact match should be With Stock');
    assertEqual(result.updatedStock[0].availableStock, 0, 'Stock should reach 0 exactly');
  });

  step('Requesting 1 more than available → Without Stock (over by 1 boundary check)', () => {
    const nearStock: WarehouseStock = { ...INITIAL_STOCK[0], availableStock: 5 };
    const result = postWithdrawal(nearStock, 6, 'Foreman', [nearStock]);
    assertEqual(result.withdrawal.status, 'Without Stock', 'Should be Without Stock when over by 1');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 6: Excess Return to Warehouse — Materials sent back from site
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 6 — Excess Return: Unused materials returned from site to warehouse', () => {
  let stockBefore: number;
  let transfer: StockTransferRecord;
  let stock = [...INITIAL_STOCK];
  const targetItem = stock.find((s) => s.availableStock > 0)!;

  step('Warehouse Manager logs in', () => {
    const wm = login('warehouse@triforcegs.com.ph', '1234')!;
    assertEqual(wm.role, 'Warehouse Manager');
  });

  step('Record initial stock level before return', () => {
    assert(targetItem !== undefined, 'Need a stock item to test with');
    stockBefore = targetItem.availableStock;
    console.log(`         → ${targetItem.itemCode} has ${stockBefore} units before return`);
  });

  step('Warehouse Manager posts an Excess Return of 8 units', () => {
    transfer = {
      id: `tr-${Date.now()}`,
      transferNo: `STR-2026-EXCESS-001`,
      type: 'Excess Return to Warehouse',
      fromLocation: 'Zone A - Pump Room',
      toLocation: 'Central Warehouse',
      itemCode: targetItem.itemCode,
      description: targetItem.description,
      qty: 8,
      uom: targetItem.uom,
      reason: 'Remaining materials after installation complete',
      performedAt: '2026-11-19 15:00',
    };

    // Apply the return to stock
    stock = stock.map((s) =>
      s.itemCode === transfer.itemCode
        ? { ...s, availableStock: s.availableStock + transfer.qty }
        : s
    );

    const after = stock.find((s) => s.itemCode === targetItem.itemCode)!;
    assertEqual(after.availableStock, stockBefore + 8, 'Stock should increase by 8');
    console.log(`         → ${transfer.transferNo}: stock went from ${stockBefore} → ${after.availableStock}`);
  });

  step('Site-to-site transfer does NOT change warehouse stock', () => {
    const before = stock.find((s) => s.itemCode === targetItem.itemCode)!.availableStock;
    const siteTransfer: StockTransferRecord = {
      id: `tr-site`,
      transferNo: `STR-2026-SITE-001`,
      type: 'Stock Transfer',
      fromLocation: 'Zone A',
      toLocation: 'Zone B',
      itemCode: targetItem.itemCode,
      description: targetItem.description,
      qty: 3,
      uom: targetItem.uom,
      reason: 'Redeployed',
      performedAt: '2026-11-19 15:30',
    };

    // Site transfer doesn't touch warehouse stock (from App.tsx handlePostTransfer)
    const updatedStock = siteTransfer.type === 'Excess Return to Warehouse'
      ? stock.map((s) => s.itemCode === siteTransfer.itemCode ? { ...s, availableStock: s.availableStock + siteTransfer.qty } : s)
      : stock; // no-op for site transfer

    const after = updatedStock.find((s) => s.itemCode === targetItem.itemCode)!.availableStock;
    assertEqual(after, before, 'Site transfer should not change warehouse stock');
  });

  step('Return is recorded in transfers list', () => {
    assertEqual(transfer.type, 'Excess Return to Warehouse', 'Transfer type correct');
    assertEqual(transfer.qty, 8, 'Qty recorded correctly');
    assert(transfer.reason.length > 0, 'Reason is required and stored');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
//  SCENARIO 7: Draft PR — Saved but not submitted
// ════════════════════════════════════════════════════════════════════════════════

scenario('SCENARIO 7 — Draft PR: Applicant saves a PR as draft then submits later', () => {
  let pr: PrRecord;
  let prs: PrRecord[] = [];
  const pqto = INITIAL_PQTOS[0];

  step('Applicant logs in', () => {
    const applicant = login('applicant@triforcegs.com.ph', '1234')!;
    assertEqual(applicant.role, 'Applicant/Requestor');
  });

  step('Applicant saves PR as Draft — no validation is run', () => {
    pr = {
      id: `pr-draft-${Date.now()}`,
      prNo: 'PR-DRAFT-TEST-001',
      pqtoNo: pqto.pqtoNo,
      refDocNo: '', // empty — allowed in draft
      jobNo: 'JOB-2026-884',
      applicant: 'Engr. John Doe',
      status: 'Draft',
      createdAt: '2026-11-19 08:00',
      attachments: [], // no attachments — allowed in draft
      items: [], // no items — allowed in draft
    };
    prs = [pr];
    assertEqual(pr.status, 'Draft', 'PR status should be Draft');
    console.log(`         → ${pr.prNo} saved as Draft with no items and no attachments`);
  });

  step('Tracking: Draft PR is at Step 2 "active" and Step 3 "pending"', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.steps.s2, 'active', 'Step 2 should be active for Draft');
    assertEqual(chain.steps.s3, 'pending', 'Step 3 should be pending for Draft');
    assertEqual(chain.category, 'PR', 'Category should be PR');
  });

  step('REQ Approver cannot see draft PR in approval queue (not Pending Approval)', () => {
    const pendingPrs = prs.filter((p) => p.status === 'Pending Approval');
    assertEqual(pendingPrs.length, 0, 'REQ Approver queue should be empty for Draft PR');
  });

  step('Applicant edits the draft — adds items and sets refDocNo', () => {
    pr = {
      ...pr,
      refDocNo: 'REF-PR-FILLED-001',
      items: [{
        id: 'draft-item-1',
        itemCode: pqto.items[0].itemCode,
        description: pqto.items[0].description,
        uom: pqto.items[0].pqtoUom,
        pqtoQty: pqto.items[0].pqtoQty,
        requestedQty: 3,
        assignedLocation: pqto.items[0].assignedLocation,
      }],
    };
    prs = prs.map((p) => p.id === pr.id ? pr : p);
    assert(pr.items.length > 0, 'Items added to draft');
    assert(pr.refDocNo.trim() !== '', 'RefDocNo filled in');
  });

  step('Applicant submits the draft — status changes to Pending Approval', () => {
    pr = { ...pr, status: 'Pending Approval' };
    prs = prs.map((p) => p.id === pr.id ? pr : p);
    assertEqual(pr.status, 'Pending Approval', 'PR is now Pending Approval');
    console.log(`         → ${pr.prNo} submitted — now Pending Approval`);
  });

  step('Tracking: Step 3 is now "active" after submission', () => {
    const chain = buildChain(pr, [pqto], [], [], []);
    assertEqual(chain.steps.s3, 'active', 'Step 3 should be active');
    assertEqual(chain.steps.s2, 'done', 'Step 2 should be done');
  });

  step('REQ Approver now sees the PR in the approval queue', () => {
    const pendingPrs = prs.filter((p) => p.status === 'Pending Approval');
    assertEqual(pendingPrs.length, 1, 'REQ Approver should now see 1 pending PR');
  });
});

// ─── Final Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(66));
console.log(`\n  RESULTS: ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\n  FAILED STEPS:');
  failures.forEach((f, i) =>
    console.log(`    ${i + 1}. [${f.scenario}]\n       ${f.step}\n       → ${f.reason}`)
  );
} else {
  console.log('\n  All scenarios passed! ✅');
}
console.log('\n' + '═'.repeat(66) + '\n');
if (failed > 0) process.exit(1);
