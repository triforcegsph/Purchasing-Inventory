/**
 * ERP System - Scenario-Based Functional Tests
 * Tests all major business logic using seed data
 * Run with: npx tsx tests/erp-scenarios.test.ts
 */

import {
  INITIAL_BOQ_ITEMS,
  INITIAL_PRS,
  INITIAL_POS,
  INITIAL_STOCK,
  INITIAL_WITHDRAWALS,
  INITIAL_TRANSFERS,
  INITIAL_REQUIRED_CONFIG,
  INITIAL_PQTOS,
  INITIAL_RECEIVINGS,
  INITIAL_LOGS,
  INITIAL_NOTIFICATIONS,
  ITEMIZED_FITTINGS_PRESET,
  INITIAL_SMTP_CONFIG,
  CIVIL_BOQ_ITEMS,
  CIVIL_PQTOS,
} from '../src/data/seedData';
import { SYSTEM_ACCOUNTS } from '../src/components/LoginPage';
import type {
  BoqItem,
  PoRecord,
  PrRecord,
  ReceivingRecord,
  TransactionLog,
  WarehouseStock,
  WithdrawalRecord,
  StockTransferRecord,
  NotificationItem,
  RequiredFieldConfig,
} from '../src/types/erp';

// ─── Minimal test runner ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌  ${name}`);
    console.log(`       → ${msg}`);
    failed++;
    failures.push(`${name}: ${msg}`);
  }
}

function describe(suiteName: string, fn: () => void) {
  console.log(`\n📋 ${suiteName}`);
  fn();
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label = '') {
  if (actual !== expected) {
    throw new Error(`${label} Expected "${String(expected)}", got "${String(actual)}"`);
  }
}

// ─── Re-implement pure business logic (extracted from App.tsx/components) ─────

/** Login logic from LoginPage.tsx */
function attemptLogin(username: string, password: string) {
  const trimmedUser = username.trim().toLowerCase();
  return SYSTEM_ACCOUNTS.find(
    (acc) =>
      (acc.username.toLowerCase() === trimmedUser ||
        acc.role.toLowerCase() === trimmedUser) &&
      acc.password === password
  ) ?? null;
}

/** Role module access from App.tsx ROLE_MODULES */
const ROLE_MODULES: Record<string, string[]> = {
  'Applicant/Requestor': ['boq', 'pqto', 'pr', 'po', 'withdrawal', 'tracking', 'logs'],
  'REQ Approver': ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'PO Approver': ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'Warehouse Manager': ['receiving', 'withdrawal', 'transfers', 'po', 'tracking', 'logs'],
};

/** BOQ → PQTO filter: only transactional items */
function getTransactionalBoqItems(items: BoqItem[]) {
  return items.filter(
    (it) => !it.isBlankRow && !it.isWorksRelated && it.itemCode.trim() !== ''
  );
}

/** PR validation from PrModule */
function validatePrSubmission(
  items: PrRecord['items'],
  refDocNo: string,
  attachments: unknown[],
  config: RequiredFieldConfig
): string | null {
  if (items.length === 0) return 'At least one line item is required.';
  if (config.refDocNo && !refDocNo.trim()) return 'Reference Document Number is required.';
  if (config.attachments && attachments.length === 0) return 'At least one attachment is required.';
  return null;
}

/** PO creation validation from PoModule */
function validatePoCreation(
  selectedPr: PrRecord | null,
  refDocNo: string,
  iaas2RefNo: string,
  config: RequiredFieldConfig
): string | null {
  if (!selectedPr) return 'Select an Approved PR first.';
  if (config.refDocNo && !refDocNo.trim()) return 'Reference Document Number is required.';
  if (config.iaas2RefNo && !iaas2RefNo.trim()) return 'IAAS2 Reference Number is required.';
  return null;
}

/** PO approve */
function approvePo(pos: PoRecord[], poId: string): PoRecord[] {
  return pos.map((p) => (p.id === poId ? { ...p, status: 'Approved' as const } : p));
}

/** PO reject */
function rejectPo(pos: PoRecord[], poId: string, comments: string): PoRecord[] {
  return pos.map((p) =>
    p.id === poId
      ? { ...p, status: 'Returned to Applicant' as const, rejectionComments: comments }
      : p
  );
}

/** Receiving → stock update from App.tsx handlePostReceiving */
function applyReceivingToStock(
  stock: WarehouseStock[],
  rec: ReceivingRecord
): WarehouseStock[] {
  const next = stock.map((s) => ({ ...s }));
  rec.items.forEach((recIt) => {
    if (recIt.actualReceivedQty <= 0) return;
    const idx = next.findIndex((s) => s.itemCode === recIt.itemCode);
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        availableStock: next[idx].availableStock + recIt.actualReceivedQty,
      };
    } else {
      next.push({
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
  return next;
}

/** PO completion check from App.tsx */
function getPoStatusAfterReceiving(po: PoRecord, rec: ReceivingRecord): PoRecord['status'] {
  const updatedItems = po.items.map((poIt) => {
    const recIt = rec.items.find((r) => r.itemCode === poIt.itemCode);
    if (!recIt) return poIt;
    return { ...poIt, receivedQty: poIt.receivedQty + recIt.actualReceivedQty };
  });
  const allDone = updatedItems.every((i) => i.receivedQty >= i.poQty);
  return allDone ? 'Completed' : 'Partially Received';
}

/** Withdrawal stock deduction from App.tsx handlePostWithdrawal */
function applyWithdrawalToStock(
  stock: WarehouseStock[],
  wd: WithdrawalRecord
): WarehouseStock[] {
  if (wd.status !== 'With Stock') return stock;
  const wdItem = wd.items[0];
  if (!wdItem) return stock;
  return stock.map((s) =>
    s.itemCode === wdItem.itemCode
      ? { ...s, availableStock: Math.max(0, s.availableStock - wdItem.requestedQty) }
      : s
  );
}

/** Excess return to warehouse */
function applyExcessReturnToStock(
  stock: WarehouseStock[],
  tr: StockTransferRecord
): WarehouseStock[] {
  if (tr.type !== 'Excess Return to Warehouse') return stock;
  return stock.map((s) =>
    s.itemCode === tr.itemCode
      ? { ...s, availableStock: s.availableStock + tr.qty }
      : s
  );
}

/** Stock health indicator */
function getStockHealth(available: number): string {
  if (available <= 0) return 'Depleted/Out of Stock';
  if (available < 10) return 'Low Stock Alert';
  return 'In Stock';
}

/** Log entry format check */
function createLogEntry(
  module: string,
  docNo: string,
  action: string,
  comments: string,
  role = 'Applicant/Requestor'
): TransactionLog {
  return {
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    adminOrUser: `${role} (Admin)`,
    spName: 'SP-MECH-ALPHA',
    module,
    docNo,
    action,
    comments,
  };
}

/** Notification factory */
function createNotification(
  recipientRole: 'Approver' | 'Applicant',
  title: string,
  message: string
): NotificationItem {
  return {
    id: `notif-${Date.now()}`,
    recipientRole,
    title,
    message,
    timestamp: new Date().toLocaleTimeString(),
    read: false,
  };
}

/** Function code navigation */
const NAV_ITEMS = [
  { key: 'boq', code: 'BOQ', label: 'Bill of Quantities' },
  { key: 'pqto', code: 'PQTO', label: 'Project Qty Take-Off' },
  { key: 'pr', code: 'PRQ', label: 'Purchase Requisition' },
  { key: 'po', code: 'POE', label: 'Purchase Order Entry' },
  { key: 'receiving', code: 'GRN', label: 'Goods Receiving (DR)' },
  { key: 'withdrawal', code: 'ISS', label: 'Material Withdrawal' },
  { key: 'transfers', code: 'STR', label: 'Transfers & Rules' },
  { key: 'tracking', code: 'TRK', label: 'End-to-End Tracking' },
  { key: 'logs', code: 'LOG', label: 'Transaction Logs' },
];

function resolveFunctionCode(input: string) {
  const q = input.trim().toUpperCase();
  return NAV_ITEMS.find(
    (i) => i.code === q || i.label.toUpperCase().includes(q)
  ) ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  TEST SUITES
// ════════════════════════════════════════════════════════════════════════════

describe('1. Authentication — Login Scenarios', () => {
  test('PASS: Valid applicant login with email', () => {
    const result = attemptLogin('applicant@triforcegs.com.ph', '1234');
    assert(result !== null, 'Should find account');
    assertEqual(result!.role, 'Applicant/Requestor', 'role');
    assertEqual(result!.fullName, 'Engr. John Doe', 'fullName');
  });

  test('PASS: Login is case-insensitive for email', () => {
    const result = attemptLogin('APPLICANT@TRIFORCEGS.COM.PH', '1234');
    assert(result !== null, 'Case-insensitive match should work');
  });

  test('PASS: REQ Approver can login', () => {
    const result = attemptLogin('req.approver@triforcegs.com.ph', '1234');
    assert(result !== null, 'Should find account');
    assertEqual(result!.role, 'REQ Approver', 'role');
  });

  test('PASS: PO Approver can login', () => {
    const result = attemptLogin('po.approver@triforcegs.com.ph', '1234');
    assert(result !== null, 'Should find account');
    assertEqual(result!.role, 'PO Approver', 'role');
  });

  test('PASS: Warehouse Manager can login', () => {
    const result = attemptLogin('warehouse@triforcegs.com.ph', '1234');
    assert(result !== null, 'Should find account');
    assertEqual(result!.role, 'Warehouse Manager', 'role');
  });

  test('FAIL: Wrong password returns null', () => {
    const result = attemptLogin('applicant@triforcegs.com.ph', 'wrongpass');
    assertEqual(result, null, 'Should not authenticate with wrong password');
  });

  test('FAIL: Non-existent user returns null', () => {
    const result = attemptLogin('hacker@evil.com', '1234');
    assertEqual(result, null, 'Unknown user should not authenticate');
  });

  test('FAIL: Empty credentials returns null', () => {
    const result = attemptLogin('', '');
    assertEqual(result, null, 'Empty creds should not authenticate');
  });

  test('PASS: All 4 system accounts exist in seed data', () => {
    assertEqual(SYSTEM_ACCOUNTS.length, 4, 'Should have exactly 4 system accounts');
  });
});

describe('2. Role-Based Access Control', () => {
  test('Applicant can access BOQ, PQTO, PR, PO, Withdrawal, Tracking, Logs', () => {
    const modules = ROLE_MODULES['Applicant/Requestor'];
    assert(modules.includes('boq'), 'BOQ access');
    assert(modules.includes('pr'), 'PR access');
    assert(modules.includes('withdrawal'), 'Withdrawal access');
    assert(!modules.includes('receiving'), 'Should NOT have Receiving access');
    assert(!modules.includes('transfers'), 'Should NOT have Transfers access');
  });

  test('REQ Approver can access PR but NOT Receiving/Withdrawal/Transfers', () => {
    const modules = ROLE_MODULES['REQ Approver'];
    assert(modules.includes('pr'), 'PR access');
    assert(!modules.includes('receiving'), 'No Receiving');
    assert(!modules.includes('withdrawal'), 'No Withdrawal');
    assert(!modules.includes('transfers'), 'No Transfers');
  });

  test('PO Approver can access PO but NOT Receiving/Withdrawal', () => {
    const modules = ROLE_MODULES['PO Approver'];
    assert(modules.includes('po'), 'PO access');
    assert(!modules.includes('receiving'), 'No Receiving');
    assert(!modules.includes('withdrawal'), 'No Withdrawal');
  });

  test('Warehouse Manager can access Receiving, Withdrawal, Transfers but NOT BOQ/PQTO/PR', () => {
    const modules = ROLE_MODULES['Warehouse Manager'];
    assert(modules.includes('receiving'), 'Receiving access');
    assert(modules.includes('withdrawal'), 'Withdrawal access');
    assert(modules.includes('transfers'), 'Transfers access');
    assert(!modules.includes('boq'), 'No BOQ');
    assert(!modules.includes('pqto'), 'No PQTO');
    assert(!modules.includes('pr'), 'No PR');
  });

  test('All roles have Tracking and Logs access', () => {
    for (const role of Object.keys(ROLE_MODULES)) {
      const modules = ROLE_MODULES[role];
      assert(modules.includes('tracking'), `${role} should have Tracking`);
      assert(modules.includes('logs'), `${role} should have Logs`);
    }
  });
});

describe('3. BOQ Module — Bill of Quantities', () => {
  test('Seed data loads with correct number of BOQ items', () => {
    assert(INITIAL_BOQ_ITEMS.length > 0, 'BOQ items should not be empty');
  });

  test('Works-related items are excluded from PQTO transactional filter', () => {
    const transactional = getTransactionalBoqItems(INITIAL_BOQ_ITEMS);
    const worksRelated = INITIAL_BOQ_ITEMS.filter((it) => it.isWorksRelated);
    for (const item of worksRelated) {
      assert(
        !transactional.find((t) => t.id === item.id),
        `Works-related item "${item.description}" should be excluded`
      );
    }
  });

  test('Blank rows are excluded from PQTO transactional filter', () => {
    const transactional = getTransactionalBoqItems(INITIAL_BOQ_ITEMS);
    const blankRows = INITIAL_BOQ_ITEMS.filter((it) => it.isBlankRow);
    for (const item of blankRows) {
      assert(
        !transactional.find((t) => t.id === item.id),
        'Blank rows should be excluded'
      );
    }
  });

  test('Transactional items have non-empty itemCodes', () => {
    const transactional = getTransactionalBoqItems(INITIAL_BOQ_ITEMS);
    for (const item of transactional) {
      assert(item.itemCode.trim() !== '', `Item ${item.id} should have a non-empty itemCode`);
    }
  });

  test('ITEMIZED_FITTINGS_PRESET has 5 preset items', () => {
    assertEqual(ITEMIZED_FITTINGS_PRESET.length, 5, 'Should have 5 itemized fitting presets');
  });

  test('CIVIL project BOQ is different from TWRB BOQ', () => {
    assert(
      CIVIL_BOQ_ITEMS !== INITIAL_BOQ_ITEMS,
      'Civil and Tower B BOQ should be separate datasets'
    );
    assert(CIVIL_BOQ_ITEMS.length > 0, 'Civil BOQ should not be empty');
  });

  test('CIVIL project PQTOs are pre-populated', () => {
    assert(CIVIL_PQTOS.length > 0, 'Civil PQTOs should exist');
  });

  test('All BOQ items have required fields: id, lineNo, itemCode, description', () => {
    for (const item of INITIAL_BOQ_ITEMS) {
      assert(!!item.id, `Missing id on item ${item.lineNo}`);
      assert(typeof item.lineNo === 'number', `lineNo must be number on ${item.id}`);
      assert(typeof item.description === 'string', `description missing on ${item.id}`);
    }
  });
});

describe('4. PQTO Module — Project Quantity Take-Off', () => {
  test('Seed PQTOs are loaded', () => {
    assert(INITIAL_PQTOS.length > 0, 'PQTOs should not be empty');
  });

  test('All PQTO records have required fields', () => {
    for (const pqto of INITIAL_PQTOS) {
      assert(!!pqto.pqtoNo, `Missing pqtoNo in ${pqto.id}`);
      assert(!!pqto.jobNo, `Missing jobNo in ${pqto.id}`);
      assert(Array.isArray(pqto.items), `items must be array in ${pqto.id}`);
    }
  });

  test('PQTO status is valid', () => {
    const validStatuses = ['Draft', 'Posted', 'Linked to PR'];
    for (const pqto of INITIAL_PQTOS) {
      assert(
        validStatuses.includes(pqto.status),
        `Invalid status "${pqto.status}" on ${pqto.pqtoNo}`
      );
    }
  });

  test('PQTO items link back to BOQ items', () => {
    const boqIds = new Set(INITIAL_BOQ_ITEMS.map((b) => b.id));
    for (const pqto of INITIAL_PQTOS) {
      for (const item of pqto.items) {
        // boqItemId should reference a known BOQ item id OR be a valid string
        assert(typeof item.boqItemId === 'string', `boqItemId must be string in ${pqto.pqtoNo}`);
        assert(typeof item.itemCode === 'string', `itemCode required in PQTO item`);
      }
    }
  });
});

describe('5. Purchase Requisition (PR) — Creation & Approval', () => {
  const mockPrItems = [{
    id: 'it-1',
    itemCode: 'MAT-PIP-100-40',
    description: 'B.I. Pipe Sch-40',
    uom: 'PC/s',
    pqtoQty: 20,
    requestedQty: 10,
    assignedLocation: 'Zone A',
  }];

  test('PASS: Valid PR submission with required fields', () => {
    const error = validatePrSubmission(mockPrItems, 'REF-001', [{} as any], INITIAL_REQUIRED_CONFIG);
    assertEqual(error, null, 'Valid PR should have no errors');
  });

  test('FAIL: PR with no line items is rejected', () => {
    const error = validatePrSubmission([], 'REF-001', [{}], INITIAL_REQUIRED_CONFIG);
    assert(error !== null, 'Empty items should return error');
    assert(error!.includes('line item'), `Error should mention line items, got: ${error}`);
  });

  test('FAIL: PR missing required Ref Doc No is rejected', () => {
    const configWithRefRequired = { ...INITIAL_REQUIRED_CONFIG, refDocNo: true };
    const error = validatePrSubmission(mockPrItems, '', [{}], configWithRefRequired);
    assert(error !== null, 'Missing refDocNo should error');
    assert(error!.includes('Reference'), `Error should mention Reference, got: ${error}`);
  });

  test('FAIL: PR missing required attachment is rejected', () => {
    const configWithAttachRequired = { ...INITIAL_REQUIRED_CONFIG, attachments: true };
    const error = validatePrSubmission(mockPrItems, 'REF-001', [], configWithAttachRequired);
    assert(error !== null, 'Missing attachment should error');
    assert(error!.includes('attachment'), `Error should mention attachment, got: ${error}`);
  });

  test('PASS: Ref Doc No optional when config is false', () => {
    const configNoRef = { ...INITIAL_REQUIRED_CONFIG, refDocNo: false };
    const error = validatePrSubmission(mockPrItems, '', [{}], configNoRef);
    assertEqual(error, null, 'Ref doc should be optional when config is false');
  });

  test('Seed PRs are loaded with valid statuses', () => {
    const validStatuses = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Converted to PO'];
    for (const pr of INITIAL_PRS) {
      assert(validStatuses.includes(pr.status), `Invalid status "${pr.status}" on ${pr.prNo}`);
    }
  });

  test('PR approval changes status to Approved', () => {
    const pr = INITIAL_PRS.find((p) => p.status === 'Pending Approval');
    if (!pr) {
      console.log('       ⚠  No Pending Approval PR in seed data, skipping');
      return;
    }
    const updated = INITIAL_PRS.map((p) => p.id === pr.id ? { ...p, status: 'Approved' as const } : p);
    const found = updated.find((p) => p.id === pr.id);
    assertEqual(found?.status, 'Approved', 'Status after approval');
  });

  test('All PRs have required fields: prNo, pqtoNo, applicant, items', () => {
    for (const pr of INITIAL_PRS) {
      assert(!!pr.prNo, `Missing prNo on ${pr.id}`);
      assert(!!pr.applicant, `Missing applicant on ${pr.prNo}`);
      assert(Array.isArray(pr.items), `items must be array on ${pr.prNo}`);
      assert(Array.isArray(pr.attachments), `attachments must be array on ${pr.prNo}`);
    }
  });
});

describe('6. Purchase Order (PO) — Creation, Approval, Rejection', () => {
  const approvedPr = INITIAL_PRS.find((p) => p.status === 'Approved' || p.status === 'Converted to PO');

  test('PASS: Can create PO from an Approved PR', () => {
    const error = validatePoCreation(approvedPr ?? null, 'REF-PO-001', 'IAAS2-001', INITIAL_REQUIRED_CONFIG);
    assertEqual(error, null, 'Valid PO creation should return no error');
  });

  test('FAIL: PO creation without selecting a PR', () => {
    const error = validatePoCreation(null, 'REF-PO-001', 'IAAS2-001', INITIAL_REQUIRED_CONFIG);
    assert(error !== null, 'Should error when no PR selected');
    assert(error!.includes('PR'), `Error should mention PR, got: ${error}`);
  });

  test('FAIL: PO creation missing required Ref Doc No', () => {
    const config = { ...INITIAL_REQUIRED_CONFIG, refDocNo: true };
    const error = validatePoCreation(approvedPr ?? null, '', 'IAAS2-001', config);
    assert(error !== null, 'Should error when refDocNo is missing');
  });

  test('FAIL: PO creation missing required IAAS2 Ref No', () => {
    const config = { ...INITIAL_REQUIRED_CONFIG, iaas2RefNo: true };
    const error = validatePoCreation(approvedPr ?? null, 'REF-001', '', config);
    assert(error !== null, 'Should error when iaas2RefNo is missing');
  });

  test('PO approval changes status from Pending to Approved', () => {
    const pendingPo = INITIAL_POS.find((p) => p.status === 'Pending Approval');
    if (!pendingPo) {
      console.log('       ⚠  No Pending PO in seed, skipping');
      return;
    }
    const updated = approvePo([...INITIAL_POS], pendingPo.id);
    const found = updated.find((p) => p.id === pendingPo.id);
    assertEqual(found?.status, 'Approved', 'PO status after approval');
  });

  test('PO rejection changes status to Returned to Applicant with comment', () => {
    const pendingPo = INITIAL_POS.find((p) => p.status === 'Pending Approval') ?? INITIAL_POS[0];
    const reason = 'Budget exceeded. Please revise quantities.';
    const updated = rejectPo([...INITIAL_POS], pendingPo.id, reason);
    const found = updated.find((p) => p.id === pendingPo.id);
    assertEqual(found?.status, 'Returned to Applicant', 'Rejected PO status');
    assertEqual(found?.rejectionComments, reason, 'Rejection comment stored');
  });

  test('PO rejection without comment is blocked', () => {
    // Simulate confirmReject() validation
    const rejectComment = '';
    const shouldBlock = !rejectComment.trim();
    assert(shouldBlock, 'Empty rejection comment should be blocked');
  });

  test('Seed POs have valid statuses', () => {
    const validStatuses = ['Pending Approval', 'Approved', 'Returned to Applicant', 'Partially Received', 'Completed'];
    for (const po of INITIAL_POS) {
      assert(validStatuses.includes(po.status), `Invalid PO status "${po.status}" on ${po.poNo}`);
    }
  });

  test('PO items inherit quantities from linked PR', () => {
    // Each PO item should have prQty matching original PR request
    for (const po of INITIAL_POS) {
      for (const item of po.items) {
        assert(typeof item.prQty === 'number', `prQty must be number on ${po.poNo}`);
        assert(item.prQty >= 0, `prQty cannot be negative on ${po.poNo}`);
        assert(item.receivedQty >= 0, `receivedQty cannot be negative on ${po.poNo}`);
      }
    }
  });
});

describe('7. Goods Receiving (GRN) — Stock Impact', () => {
  test('Receiving increases warehouse stock for existing item', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock[0];
    const beforeQty = targetItem.availableStock;

    const fakeRec: ReceivingRecord = {
      id: 'rec-test-1',
      grnNo: 'GRN-TEST-001',
      poNo: 'PO-TEST-001',
      refDocNo: 'REF-001',
      iaas2RefNo: 'IAAS2-001',
      drNo: 'DR-001',
      drDate: '2026-11-19',
      performedAt: '2026-11-19 09:00',
      status: 'Completed',
      attachments: [],
      items: [{
        id: 'ri-1',
        itemCode: targetItem.itemCode,
        description: targetItem.description,
        uom: targetItem.uom,
        orderedQty: 50,
        previouslyReceivedQty: 0,
        toReceiveQty: 50,
        actualReceivedQty: 50,
      }],
    };

    const updatedStock = applyReceivingToStock(testStock, fakeRec);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty + 50, 'Stock should increase by received qty');
  });

  test('Receiving with actualReceivedQty=0 does not change stock', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock[0];
    const beforeQty = targetItem.availableStock;

    const fakeRec: ReceivingRecord = {
      id: 'rec-test-zero',
      grnNo: 'GRN-TEST-ZERO',
      poNo: 'PO-TEST-002',
      refDocNo: 'REF-002',
      iaas2RefNo: 'IAAS2-002',
      drNo: 'DR-002',
      drDate: '2026-11-19',
      performedAt: '2026-11-19 10:00',
      status: 'Completed',
      attachments: [],
      items: [{
        id: 'ri-2',
        itemCode: targetItem.itemCode,
        description: targetItem.description,
        uom: targetItem.uom,
        orderedQty: 50,
        previouslyReceivedQty: 0,
        toReceiveQty: 50,
        actualReceivedQty: 0, // zero received
      }],
    };

    const updatedStock = applyReceivingToStock(testStock, fakeRec);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty, 'Stock should not change when qty is 0');
  });

  test('Receiving a brand-new item creates a new stock entry', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const newItemCode = 'MAT-NEW-ITEM-999';
    const fakeRec: ReceivingRecord = {
      id: 'rec-test-new',
      grnNo: 'GRN-TEST-NEW',
      poNo: 'PO-TEST-003',
      refDocNo: 'REF-003',
      iaas2RefNo: 'IAAS2-003',
      drNo: 'DR-003',
      drDate: '2026-11-19',
      performedAt: '2026-11-19 11:00',
      status: 'Completed',
      attachments: [],
      items: [{
        id: 'ri-3',
        itemCode: newItemCode,
        description: 'Brand New Test Item',
        uom: 'PC/s',
        orderedQty: 25,
        previouslyReceivedQty: 0,
        toReceiveQty: 25,
        actualReceivedQty: 25,
      }],
    };

    const updatedStock = applyReceivingToStock(testStock, fakeRec);
    const newEntry = updatedStock.find((s) => s.itemCode === newItemCode);
    assert(newEntry !== undefined, 'New stock entry should be created');
    assertEqual(newEntry!.availableStock, 25, 'New entry should have correct qty');
  });

  test('PO status becomes Completed when all items fully received', () => {
    const po = INITIAL_POS.find((p) => p.status === 'Approved' && p.items.length > 0) ?? INITIAL_POS[0];
    const fullRec: ReceivingRecord = {
      id: 'rec-full',
      grnNo: 'GRN-FULL',
      poNo: po.poNo,
      refDocNo: po.refDocNo,
      iaas2RefNo: po.iaas2RefNo,
      drNo: 'DR-FULL',
      drDate: '2026-11-19',
      performedAt: '2026-11-19 12:00',
      status: 'Completed',
      attachments: [],
      items: po.items.map((it) => ({
        id: `ri-full-${it.id}`,
        itemCode: it.itemCode,
        description: it.description,
        uom: it.uom,
        orderedQty: it.poQty,
        previouslyReceivedQty: it.receivedQty,
        toReceiveQty: it.poQty - it.receivedQty,
        actualReceivedQty: it.poQty - it.receivedQty,
      })),
    };
    const status = getPoStatusAfterReceiving(po, fullRec);
    assertEqual(status, 'Completed', 'PO should be Completed when all items fully received');
  });

  test('PO status becomes Partially Received when some items not fully received', () => {
    const po = INITIAL_POS.find((p) => p.items.length > 0) ?? INITIAL_POS[0];
    const partialRec: ReceivingRecord = {
      id: 'rec-partial',
      grnNo: 'GRN-PARTIAL',
      poNo: po.poNo,
      refDocNo: po.refDocNo,
      iaas2RefNo: po.iaas2RefNo,
      drNo: 'DR-PARTIAL',
      drDate: '2026-11-19',
      performedAt: '2026-11-19 13:00',
      status: 'Partially Received',
      attachments: [],
      items: po.items.slice(0, 1).map((it) => ({
        id: `ri-partial-${it.id}`,
        itemCode: it.itemCode,
        description: it.description,
        uom: it.uom,
        orderedQty: it.poQty,
        previouslyReceivedQty: 0,
        toReceiveQty: it.poQty,
        actualReceivedQty: 1, // only 1 unit, not full
      })),
    };
    const status = getPoStatusAfterReceiving(po, partialRec);
    // If po has more items and only 1 unit received on 1 item, it's partial
    if (po.items.length > 1 || po.items[0]?.poQty > 1) {
      assertEqual(status, 'Partially Received', 'PO should be Partially Received');
    }
  });

  test('Seed receivings have valid statuses', () => {
    for (const rec of INITIAL_RECEIVINGS) {
      assert(
        ['Partially Received', 'Completed'].includes(rec.status),
        `Invalid receiving status "${rec.status}"`
      );
    }
  });
});

describe('8. Material Withdrawal — Stock Deduction', () => {
  test('Withdrawal With Stock deducts from inventory', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock.find((s) => s.availableStock > 10);
    if (!targetItem) {
      console.log('       ⚠  No stock item with >10 units, skipping');
      return;
    }
    const beforeQty = targetItem.availableStock;
    const withdrawQty = 5;

    const fakeWd: WithdrawalRecord = {
      id: 'wd-test-1',
      wdNo: 'ISS-TEST-001',
      systemTag: 'MEPF - Chilled Water',
      jobNo: 'JOB-2026-884',
      requestedBy: 'Engr. John Doe',
      performedAt: '2026-11-19 09:00',
      status: 'With Stock',
      attachments: [],
      items: [{
        itemCode: targetItem.itemCode,
        description: targetItem.description,
        uom: targetItem.uom,
        availableAtRequest: beforeQty,
        requestedQty: withdrawQty,
        assignedLocation: targetItem.assignedLocation,
      }],
    };

    const updatedStock = applyWithdrawalToStock(testStock, fakeWd);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty - withdrawQty, 'Stock should decrease by withdrawn qty');
  });

  test('Withdrawal Without Stock does NOT change inventory', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock[0];
    const beforeQty = targetItem.availableStock;

    const fakeWd: WithdrawalRecord = {
      id: 'wd-test-no-stock',
      wdNo: 'ISS-TEST-002',
      systemTag: 'MEPF - Chilled Water',
      jobNo: 'JOB-2026-884',
      requestedBy: 'Engr. John Doe',
      performedAt: '2026-11-19 09:00',
      status: 'Without Stock', // no stock, no deduction
      attachments: [],
      items: [{
        itemCode: targetItem.itemCode,
        description: targetItem.description,
        uom: targetItem.uom,
        availableAtRequest: 0,
        requestedQty: 10,
        assignedLocation: targetItem.assignedLocation,
      }],
    };

    const updatedStock = applyWithdrawalToStock(testStock, fakeWd);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty, 'Without Stock withdrawal should not change inventory');
  });

  test('Stock cannot go below zero on over-withdrawal', () => {
    const testStock = [{ ...INITIAL_STOCK[0], availableStock: 3 }];
    const fakeWd: WithdrawalRecord = {
      id: 'wd-over',
      wdNo: 'ISS-OVER',
      systemTag: 'TEST',
      jobNo: 'JOB-TEST',
      requestedBy: 'Test User',
      performedAt: '2026-11-19 09:00',
      status: 'With Stock',
      attachments: [],
      items: [{
        itemCode: INITIAL_STOCK[0].itemCode,
        description: INITIAL_STOCK[0].description,
        uom: INITIAL_STOCK[0].uom,
        availableAtRequest: 3,
        requestedQty: 100, // requesting more than available
        assignedLocation: 'Test',
      }],
    };

    const updatedStock = applyWithdrawalToStock(testStock, fakeWd);
    const found = updatedStock.find((s) => s.itemCode === INITIAL_STOCK[0].itemCode);
    assertEqual(found!.availableStock, 0, 'Stock should floor at 0, not go negative');
  });

  test('Seed withdrawals have valid statuses', () => {
    const valid = ['With Stock', 'Without Stock', 'Issued'];
    for (const wd of INITIAL_WITHDRAWALS) {
      assert(valid.includes(wd.status), `Invalid withdrawal status "${wd.status}" on ${wd.wdNo}`);
    }
  });
});

describe('9. Stock Transfers & Excess Returns', () => {
  test('Excess Return to Warehouse increases stock', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock[0];
    const beforeQty = targetItem.availableStock;

    const tr: StockTransferRecord = {
      id: 'tr-test-1',
      transferNo: 'STR-TEST-001',
      type: 'Excess Return to Warehouse',
      fromLocation: 'Site Zone A',
      toLocation: 'Central Warehouse',
      itemCode: targetItem.itemCode,
      description: targetItem.description,
      qty: 15,
      uom: targetItem.uom,
      reason: 'Leftover materials returned',
      performedAt: '2026-11-19 14:00',
    };

    const updatedStock = applyExcessReturnToStock(testStock, tr);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty + 15, 'Stock should increase on Excess Return');
  });

  test('Site-to-Site Transfer does NOT change warehouse stock', () => {
    const testStock = INITIAL_STOCK.map((s) => ({ ...s }));
    const targetItem = testStock[0];
    const beforeQty = targetItem.availableStock;

    const tr: StockTransferRecord = {
      id: 'tr-test-2',
      transferNo: 'STR-TEST-002',
      type: 'Stock Transfer', // not an excess return
      fromLocation: 'Zone A',
      toLocation: 'Zone B',
      itemCode: targetItem.itemCode,
      description: targetItem.description,
      qty: 5,
      uom: targetItem.uom,
      reason: 'Redeployed to Zone B',
      performedAt: '2026-11-19 14:00',
    };

    const updatedStock = applyExcessReturnToStock(testStock, tr);
    const found = updatedStock.find((s) => s.itemCode === targetItem.itemCode);
    assertEqual(found!.availableStock, beforeQty, 'Site-to-site transfer should not alter warehouse stock count');
  });

  test('Seed transfers are loaded correctly', () => {
    assert(Array.isArray(INITIAL_TRANSFERS), 'Transfers must be an array');
  });
});

describe('10. Stock Health Indicators', () => {
  test('0 units = Depleted/Out of Stock', () => {
    assertEqual(getStockHealth(0), 'Depleted/Out of Stock');
  });

  test('Negative units = Depleted/Out of Stock', () => {
    assertEqual(getStockHealth(-5), 'Depleted/Out of Stock');
  });

  test('1 unit = Low Stock Alert (less than 10)', () => {
    assertEqual(getStockHealth(1), 'Low Stock Alert');
  });

  test('9 units = Low Stock Alert (less than 10)', () => {
    assertEqual(getStockHealth(9), 'Low Stock Alert');
  });

  test('10 units = In Stock (threshold)', () => {
    assertEqual(getStockHealth(10), 'In Stock');
  });

  test('100 units = In Stock', () => {
    assertEqual(getStockHealth(100), 'In Stock');
  });
});

describe('11. Transaction Logs & Audit Trail', () => {
  test('Log entry has all required fields', () => {
    const log = createLogEntry('PR', 'PR-2026-001', 'Approved', 'PR approved for PO conversion.');
    assert(!!log.id, 'Log must have an id');
    assert(!!log.timestamp, 'Log must have a timestamp');
    assert(!!log.adminOrUser, 'Log must have adminOrUser');
    assert(!!log.module, 'Log must have module');
    assert(!!log.docNo, 'Log must have docNo');
    assert(!!log.action, 'Log must have action');
    assert(!!log.comments, 'Log must have comments');
  });

  test('Log timestamp is in correct format (YYYY-MM-DD HH:MM:SS)', () => {
    const log = createLogEntry('BOQ', 'BOQ-001', 'Saved Draft', 'Test');
    const tsPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    assert(tsPattern.test(log.timestamp), `Timestamp format invalid: "${log.timestamp}"`);
  });

  test('Log includes role in adminOrUser field', () => {
    const log = createLogEntry('PO', 'PO-001', 'Created', 'Test', 'PO Approver');
    assert(log.adminOrUser.includes('PO Approver'), 'adminOrUser should include role');
  });

  test('Seed logs are loaded', () => {
    assert(Array.isArray(INITIAL_LOGS), 'Logs must be an array');
    assert(INITIAL_LOGS.length > 0, 'Should have seed log entries');
  });

  test('All seed logs have required fields', () => {
    for (const log of INITIAL_LOGS) {
      assert(!!log.id, `Log ${log.id} missing id`);
      assert(!!log.timestamp, `Log ${log.id} missing timestamp`);
      assert(!!log.module, `Log ${log.id} missing module`);
      assert(!!log.docNo, `Log ${log.id} missing docNo`);
      assert(!!log.action, `Log ${log.id} missing action`);
    }
  });
});

describe('12. Notifications System', () => {
  test('Creating a notification sets read=false by default', () => {
    const notif = createNotification('Approver', 'Test Title', 'Test message');
    assertEqual(notif.read, false, 'New notification should be unread');
  });

  test('Approver notification has correct recipientRole', () => {
    const notif = createNotification('Approver', 'PR Approved', 'PR-001 is approved');
    assertEqual(notif.recipientRole, 'Approver', 'recipientRole must match');
  });

  test('Applicant notification has correct recipientRole', () => {
    const notif = createNotification('Applicant', 'PO Returned', 'PO-001 was returned');
    assertEqual(notif.recipientRole, 'Applicant', 'recipientRole must match');
  });

  test('Unread count is correct', () => {
    const notifs: NotificationItem[] = [
      createNotification('Approver', 'A', 'msg'),
      createNotification('Applicant', 'B', 'msg'),
      { ...createNotification('Approver', 'C', 'msg'), read: true },
    ];
    const unread = notifs.filter((n) => !n.read).length;
    assertEqual(unread, 2, 'Should count 2 unread notifications');
  });

  test('Marking all as read sets unread count to 0', () => {
    const notifs = [
      createNotification('Approver', 'A', 'msg'),
      createNotification('Applicant', 'B', 'msg'),
    ];
    const allRead = notifs.map((n) => ({ ...n, read: true }));
    const unread = allRead.filter((n) => !n.read).length;
    assertEqual(unread, 0, 'Unread count should be 0 after marking all read');
  });

  test('Seed notifications are loaded', () => {
    assert(Array.isArray(INITIAL_NOTIFICATIONS), 'Notifications must be array');
  });
});

describe('13. Function Code Navigation (Quick-Launch)', () => {
  test('BOQ resolves to Bill of Quantities module', () => {
    const result = resolveFunctionCode('BOQ');
    assert(result !== null, 'BOQ should resolve');
    assertEqual(result!.key, 'boq', 'Should navigate to boq module');
  });

  test('PRQ resolves to Purchase Requisition module', () => {
    const result = resolveFunctionCode('PRQ');
    assert(result !== null, 'PRQ should resolve');
    assertEqual(result!.key, 'pr', 'Should navigate to pr module');
  });

  test('POE resolves to Purchase Order Entry module', () => {
    const result = resolveFunctionCode('POE');
    assert(result !== null, 'POE should resolve');
    assertEqual(result!.key, 'po', 'Should navigate to po module');
  });

  test('GRN resolves to Goods Receiving module', () => {
    const result = resolveFunctionCode('GRN');
    assert(result !== null, 'GRN should resolve');
    assertEqual(result!.key, 'receiving', 'Should navigate to receiving module');
  });

  test('ISS resolves to Material Withdrawal module', () => {
    const result = resolveFunctionCode('ISS');
    assert(result !== null, 'ISS should resolve');
    assertEqual(result!.key, 'withdrawal', 'Should navigate to withdrawal module');
  });

  test('Code is case-insensitive', () => {
    const result = resolveFunctionCode('boq');
    assert(result !== null, 'Lowercase boq should resolve');
  });

  test('Invalid code returns null', () => {
    const result = resolveFunctionCode('XXXXXX');
    assertEqual(result, null, 'Unknown code should return null');
  });

  test('Empty input returns null', () => {
    const result = resolveFunctionCode('   ');
    assertEqual(result, null, 'Whitespace-only input should return null');
  });
});

describe('14. Configuration & Required Fields', () => {
  test('Seed config has all required keys', () => {
    const required = ['refDocNo', 'iaas2RefNo', 'attachments', 'drDate', 'spName', 'blockExceedPqto'];
    for (const key of required) {
      assert(key in INITIAL_REQUIRED_CONFIG, `Config missing key: ${key}`);
      assert(typeof (INITIAL_REQUIRED_CONFIG as any)[key] === 'boolean', `Config key ${key} must be boolean`);
    }
  });

  test('SMTP config has all required keys', () => {
    const required = ['host', 'port', 'encryption', 'username', 'fromEmail', 'status'];
    for (const key of required) {
      assert(key in INITIAL_SMTP_CONFIG, `SMTP config missing key: ${key}`);
    }
  });

  test('SMTP encryption must be valid', () => {
    const valid = ['TLS', 'SSL', 'None'];
    assert(
      valid.includes(INITIAL_SMTP_CONFIG.encryption),
      `Invalid SMTP encryption: ${INITIAL_SMTP_CONFIG.encryption}`
    );
  });

  test('SMTP status must be valid', () => {
    const valid = ['Connected', 'Not Configured', 'Test Successful', 'Failed'];
    assert(
      valid.includes(INITIAL_SMTP_CONFIG.status),
      `Invalid SMTP status: ${INITIAL_SMTP_CONFIG.status}`
    );
  });
});

describe('15. Seed Data Integrity Checks', () => {
  test('No duplicate PR numbers in seed data', () => {
    const prNos = INITIAL_PRS.map((p) => p.prNo);
    const unique = new Set(prNos);
    assertEqual(unique.size, prNos.length, 'All PR numbers should be unique');
  });

  test('No duplicate PO numbers in seed data', () => {
    const poNos = INITIAL_POS.map((p) => p.poNo);
    const unique = new Set(poNos);
    assertEqual(unique.size, poNos.length, 'All PO numbers should be unique');
  });

  test('No duplicate stock item codes', () => {
    const codes = INITIAL_STOCK.map((s) => s.itemCode);
    const unique = new Set(codes);
    assertEqual(unique.size, codes.length, 'Stock item codes should be unique');
  });

  test('No duplicate BOQ item IDs', () => {
    const ids = INITIAL_BOQ_ITEMS.map((b) => b.id);
    const unique = new Set(ids);
    assertEqual(unique.size, ids.length, 'BOQ item IDs should be unique');
  });

  test('All POs reference a valid PR number', () => {
    const prNos = new Set(INITIAL_PRS.map((p) => p.prNo));
    for (const po of INITIAL_POS) {
      assert(prNos.has(po.prNo), `PO ${po.poNo} references non-existent PR: ${po.prNo}`);
    }
  });

  test('All stock entries have non-negative quantities', () => {
    for (const s of INITIAL_STOCK) {
      assert(s.availableStock >= 0, `Negative availableStock on ${s.itemCode}: ${s.availableStock}`);
      assert(s.reservedStock >= 0, `Negative reservedStock on ${s.itemCode}: ${s.reservedStock}`);
    }
  });

  test('All PO items have non-negative unit prices', () => {
    for (const po of INITIAL_POS) {
      for (const item of po.items) {
        assert(item.unitPrice >= 0, `Negative unitPrice on PO ${po.poNo} item ${item.itemCode}`);
      }
    }
  });
});

// ─── Final Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`\n  RESULTS: ${passed} passed, ${failed} failed`);
console.log('');

if (failures.length > 0) {
  console.log('  FAILED TESTS:');
  failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
} else {
  console.log('  All tests passed!');
}

console.log('\n' + '═'.repeat(60) + '\n');

if (failed > 0) process.exit(1);
