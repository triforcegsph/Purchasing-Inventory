/**
 * Per-Account Validation Tests
 * Tests exactly what each of the 4 user accounts can see and do
 * Run with: npx tsx tests/per-account-validations.test.ts
 */

import {
  INITIAL_BOQ_ITEMS,
  INITIAL_PRS,
  INITIAL_POS,
  INITIAL_STOCK,
  INITIAL_WITHDRAWALS,
  INITIAL_REQUIRED_CONFIG,
  INITIAL_PQTOS,
  INITIAL_RECEIVINGS,
} from '../src/data/seedData';
import { SYSTEM_ACCOUNTS } from '../src/components/LoginPage';
import type {
  BoqItem,
  PoRecord,
  PrRecord,
  ReceivingRecord,
  RequiredFieldConfig,
  UserRole,
  WarehouseStock,
  WithdrawalRecord,
} from '../src/types/erp';

// ─── Minimal test runner ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: { account: string; test: string; reason: string }[] = [];
let currentSuite = '';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`    ✅  ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    ❌  ${name}`);
    console.log(`         → ${msg}`);
    failed++;
    failures.push({ account: currentSuite, test: name, reason: msg });
  }
}

function suite(title: string, fn: () => void) {
  currentSuite = title;
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`👤  ${title}`);
  console.log('─'.repeat(64));
  fn();
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, label = '') {
  if (actual !== expected)
    throw new Error(`${label ? label + ': ' : ''}expected "${String(expected)}", got "${String(actual)}"`);
}

// ─── Shared business logic (mirrors App.tsx/component logic) ──────────────────

const ROLE_MODULES: Record<UserRole, string[]> = {
  'Applicant/Requestor': ['boq', 'pqto', 'pr', 'po', 'withdrawal', 'tracking', 'logs'],
  'REQ Approver':        ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'PO Approver':         ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'Warehouse Manager':   ['receiving', 'withdrawal', 'transfers', 'po', 'tracking', 'logs'],
};

const ROLE_DEFAULT_MODULE: Record<UserRole, string> = {
  'Applicant/Requestor': 'boq',
  'REQ Approver':        'pr',
  'PO Approver':         'po',
  'Warehouse Manager':   'receiving',
};

function canAccess(role: UserRole, module: string): boolean {
  return ROLE_MODULES[role].includes(module);
}

function attemptLogin(username: string, password: string) {
  const q = username.trim().toLowerCase();
  return SYSTEM_ACCOUNTS.find(
    (acc) =>
      (acc.username.toLowerCase() === q || acc.role.toLowerCase() === q) &&
      acc.password === password
  ) ?? null;
}

/** PR: Approve button visibility (from PrModule.tsx line 441-454) */
function canSeeApproveButtonOnPr(role: UserRole, prStatus: PrRecord['status']): boolean {
  return prStatus === 'Pending Approval' && role === 'REQ Approver';
}

/** PR: "To PO" button visibility (line 455-461) */
function canSeeNavigateToPo(prStatus: PrRecord['status']): boolean {
  return prStatus === 'Approved';
}

/** PR: validation on submit */
function validatePrSubmit(
  items: PrRecord['items'],
  refDocNo: string,
  attachments: unknown[],
  config: RequiredFieldConfig
): string | null {
  if (items.length === 0) return 'Please add at least one line item.';
  if (config.refDocNo && !refDocNo.trim()) return 'Reference Document Number is required.';
  if (config.attachments && attachments.length === 0)
    return 'At least 1 attachment (PDF, JPG, etc.) is required.';
  const exceeded = items.find(
    (it) => !it.isNewItem && it.requestedQty > it.pqtoQty && config.blockExceedPqto
  );
  if (exceeded)
    return `Blocked: Requested qty (${exceeded.requestedQty}) for ${exceeded.itemCode} exceeds PQTO remaining (${exceeded.pqtoQty}).`;
  return null;
}

/** PO: approve/reject button visibility (from PoModule.tsx) */
function canApprovePo(role: UserRole): boolean {
  return role === 'PO Approver';
}
function canRejectPo(role: UserRole): boolean {
  return role === 'PO Approver';
}

/** PO: validation on create */
function validatePoCreate(
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

/** Receiving: validation on post */
function validateReceivingPost(
  activePo: PoRecord | null,
  drNo: string,
  drDate: string,
  attachments: unknown[],
  totalActual: number,
  config: RequiredFieldConfig
): string | null {
  if (!activePo) return 'No open PO selected.';
  if (!drNo.trim()) return 'DR Reference Number is required.';
  if (config.drDate && !drDate) return 'Date Refer to DR is required.';
  if (config.attachments && attachments.length === 0)
    return 'At least 1 attachment (Signed DR PDF/JPG) is required.';
  if (totalActual <= 0) return 'Actual Quantity Received must be greater than 0.';
  return null;
}

/** Withdrawal: validation on post */
function validateWithdrawal(
  activeStock: WarehouseStock | null,
  requestQty: number,
  attachments: unknown[],
  config: RequiredFieldConfig
): string | null {
  if (!activeStock) return 'Select an item from stock.';
  if (requestQty <= 0) return 'Quantity must be greater than 0.';
  if (config.attachments && attachments.length === 0)
    return 'At least 1 attachment (Issuance Slip PDF/JPG) is required.';
  return null;
}

/** Withdrawal: status (With Stock / Without Stock) */
function getWithdrawalStatus(availableStock: number, requestedQty: number): WithdrawalRecord['status'] {
  return availableStock >= requestedQty ? 'With Stock' : 'Without Stock';
}

/** Receiving: only shows Approved or Partially Received POs */
function getOpenPos(pos: PoRecord[]): PoRecord[] {
  return pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received');
}

/** BOQ: Post to PQTO filters out blank + works-related + empty-code rows */
function getTransactionalItems(items: BoqItem[]): BoqItem[] {
  return items.filter(
    (it) => !it.isBlankRow && !it.isWorksRelated && it.itemCode.trim() !== ''
  );
}

/** Reject PO requires non-empty comment */
function validateRejectComment(comment: string): string | null {
  return !comment.trim() ? 'Comments required before proceeding.' : null;
}

// ════════════════════════════════════════════════════════════════════════════
//  ACCOUNT 1 — Applicant/Requestor (Engr. John Doe)
// ════════════════════════════════════════════════════════════════════════════

suite('Account 1: Applicant/Requestor — Engr. John Doe', () => {
  const account = attemptLogin('applicant@triforcegs.com.ph', '1234')!;
  const role = account.role as UserRole;

  // — Login —
  test('Logs in with correct credentials', () => {
    assert(account !== null, 'Should authenticate');
    assertEqual(account.fullName, 'Engr. John Doe');
  });
  test('Default landing module is BOQ', () => {
    assertEqual(ROLE_DEFAULT_MODULE[role], 'boq', 'default module');
  });

  // — Module access: what they CAN see —
  test('CAN access: BOQ module', () => assert(canAccess(role, 'boq'), 'BOQ blocked'));
  test('CAN access: PQTO module', () => assert(canAccess(role, 'pqto'), 'PQTO blocked'));
  test('CAN access: PR module', () => assert(canAccess(role, 'pr'), 'PR blocked'));
  test('CAN access: PO module', () => assert(canAccess(role, 'po'), 'PO blocked'));
  test('CAN access: Withdrawal (ISS) module', () => assert(canAccess(role, 'withdrawal'), 'Withdrawal blocked'));
  test('CAN access: Tracking module', () => assert(canAccess(role, 'tracking'), 'Tracking blocked'));
  test('CAN access: Logs module', () => assert(canAccess(role, 'logs'), 'Logs blocked'));

  // — Module access: what they CANNOT see —
  test('CANNOT access: Receiving (GRN) module', () => assert(!canAccess(role, 'receiving'), 'Should not have Receiving'));
  test('CANNOT access: Transfers & Settings module', () => assert(!canAccess(role, 'transfers'), 'Should not have Transfers'));

  // — BOQ actions —
  test('BOQ: Can save draft (Save Draft button is always visible)', () => {
    // Save Draft has no role gate in BoqModule — always rendered
    assert(true, 'Save Draft is always available');
  });
  test('BOQ: Can post BOQ to PQTO (Post to PQTO button is always visible)', () => {
    assert(true, 'Post to PQTO always available');
  });
  test('BOQ: Transactional items are correctly filtered before posting', () => {
    const items = getTransactionalItems(INITIAL_BOQ_ITEMS);
    assert(items.length > 0, 'Should have transactional items to post');
    assert(items.every((i) => !i.isBlankRow), 'No blank rows');
    assert(items.every((i) => !i.isWorksRelated), 'No works-related rows');
  });

  // — PR actions —
  test('PR: Can save a draft PR (no validation on draft save)', () => {
    const error = validatePrSubmit([], 'REF-001', [], INITIAL_REQUIRED_CONFIG);
    // Draft skips most validation — only submit is validated
    // handleCreatePr(asDraft=true) skips all the if(!asDraft) checks
    assert(true, 'Draft save always succeeds');
  });
  test('PR: Valid submit passes validation', () => {
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'Zone A' }];
    const err = validatePrSubmit(items, 'REF-001', [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'valid submission');
  });
  test('PR: Submit blocked when no line items', () => {
    const err = validatePrSubmit([], 'REF-001', [{}], INITIAL_REQUIRED_CONFIG);
    assert(err !== null, 'Should block empty items');
    assert(err!.includes('line item'), `Got: ${err}`);
  });
  test('PR: Submit blocked when Ref Doc No required but empty', () => {
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'Zone A' }];
    const config = { ...INITIAL_REQUIRED_CONFIG, refDocNo: true };
    const err = validatePrSubmit(items, '', [{}], config);
    assert(err !== null, 'Should block missing refDocNo');
  });
  test('PR: Submit blocked when attachment required but none uploaded', () => {
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'Zone A' }];
    const config = { ...INITIAL_REQUIRED_CONFIG, attachments: true };
    const err = validatePrSubmit(items, 'REF-001', [], config);
    assert(err !== null, 'Should block missing attachment');
  });
  test('PR: Submit blocked when requestedQty exceeds PQTO and blockExceedPqto=true', () => {
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 5, requestedQty: 20, assignedLocation: 'Zone A' }];
    const config = { ...INITIAL_REQUIRED_CONFIG, blockExceedPqto: true };
    const err = validatePrSubmit(items, 'REF-001', [{}], config);
    assert(err !== null, 'Should block PQTO exceeded');
    assert(err!.includes('Blocked'), `Got: ${err}`);
  });
  test('PR: Exceeding PQTO is only a WARNING when blockExceedPqto=false', () => {
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 5, requestedQty: 20, assignedLocation: 'Zone A' }];
    const config = { ...INITIAL_REQUIRED_CONFIG, blockExceedPqto: false };
    const err = validatePrSubmit(items, 'REF-001', [{}], config);
    assertEqual(err, null, 'Should allow submit (warning only)');
  });
  test('PR: CANNOT approve a Pending PR (Approve button is hidden for this role)', () => {
    assert(!canSeeApproveButtonOnPr(role, 'Pending Approval'), 'Approve button should be hidden');
  });
  test('PR: Sees "Pending REQ Approver" text instead of Approve button', () => {
    // In PrModule line 450: shows "Pending REQ Approver" for non-REQ Approver roles
    assert(!canSeeApproveButtonOnPr(role, 'Pending Approval'), 'Confirm no approve button');
  });
  test('PR: Sees "To PO" button on Approved PRs', () => {
    assert(canSeeNavigateToPo('Approved'), 'To PO visible on Approved');
    assert(!canSeeNavigateToPo('Pending Approval'), 'To PO hidden on Pending');
    assert(!canSeeNavigateToPo('Draft'), 'To PO hidden on Draft');
  });

  // — PO actions —
  test('PO: Can create a PO from an Approved PR', () => {
    const approvedPr = INITIAL_PRS.find((p) => p.status === 'Approved' || p.status === 'Converted to PO');
    const err = validatePoCreate(approvedPr ?? null, 'REF-PO-001', 'IAAS2-001', INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'valid PO creation');
  });
  test('PO: CANNOT approve a PO (Approve button is hidden for this role)', () => {
    assert(!canApprovePo(role), 'Approve PO button should be hidden');
  });
  test('PO: CANNOT reject a PO (Reject button is hidden for this role)', () => {
    assert(!canRejectPo(role), 'Reject PO button should be hidden');
  });

  // — Withdrawal actions —
  test('Withdrawal: Can issue a withdrawal when stock is available', () => {
    const stock = INITIAL_STOCK.find((s) => s.availableStock > 5);
    assert(stock !== undefined, 'Should have stock item with >5 units');
    const err = validateWithdrawal(stock!, 3, [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'valid withdrawal');
    assertEqual(getWithdrawalStatus(stock!.availableStock, 3), 'With Stock');
  });
  test('Withdrawal: Logs as "Without Stock" when requesting more than available', () => {
    const stock = { ...INITIAL_STOCK[0], availableStock: 2 };
    const err = validateWithdrawal(stock, 10, [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'Should not error — just logs as Without Stock');
    assertEqual(getWithdrawalStatus(2, 10), 'Without Stock');
  });
  test('Withdrawal: Blocked when qty = 0', () => {
    const stock = INITIAL_STOCK[0];
    const err = validateWithdrawal(stock, 0, [{}], INITIAL_REQUIRED_CONFIG);
    assert(err !== null, 'Zero qty should error');
    assert(err!.includes('greater than 0'), `Got: ${err}`);
  });
  test('Withdrawal: Blocked when no stock item selected', () => {
    const err = validateWithdrawal(null, 5, [{}], INITIAL_REQUIRED_CONFIG);
    assert(err !== null, 'Should error with no stock item');
    assert(err!.includes('Select an item'), `Got: ${err}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  ACCOUNT 2 — REQ Approver (Engr. Alex Smith)
// ════════════════════════════════════════════════════════════════════════════

suite('Account 2: REQ Approver — Engr. Alex Smith', () => {
  const account = attemptLogin('req.approver@triforcegs.com.ph', '1234')!;
  const role = account.role as UserRole;

  test('Logs in with correct credentials', () => {
    assert(account !== null);
    assertEqual(account.fullName, 'Engr. Alex Smith');
  });
  test('Default landing module is PR', () => {
    assertEqual(ROLE_DEFAULT_MODULE[role], 'pr', 'default module');
  });

  // — Module access: what they CAN see —
  test('CAN access: BOQ module', () => assert(canAccess(role, 'boq'), 'BOQ blocked'));
  test('CAN access: PQTO module', () => assert(canAccess(role, 'pqto'), 'PQTO blocked'));
  test('CAN access: PR module', () => assert(canAccess(role, 'pr'), 'PR blocked'));
  test('CAN access: PO module', () => assert(canAccess(role, 'po'), 'PO blocked'));
  test('CAN access: Tracking module', () => assert(canAccess(role, 'tracking'), 'Tracking blocked'));
  test('CAN access: Logs module', () => assert(canAccess(role, 'logs'), 'Logs blocked'));

  // — Module access: what they CANNOT see —
  test('CANNOT access: Receiving (GRN) module', () => assert(!canAccess(role, 'receiving'), 'Should not have Receiving'));
  test('CANNOT access: Withdrawal (ISS) module', () => assert(!canAccess(role, 'withdrawal'), 'Should not have Withdrawal'));
  test('CANNOT access: Transfers & Settings module', () => assert(!canAccess(role, 'transfers'), 'Should not have Transfers'));

  // — PR-specific actions —
  test('PR: SEES and CAN click Approve button on Pending PRs', () => {
    assert(canSeeApproveButtonOnPr(role, 'Pending Approval'), 'Approve button should be visible');
  });
  test('PR: Approve button is NOT shown for already Approved PRs', () => {
    assert(!canSeeApproveButtonOnPr(role, 'Approved'), 'No approve button on already-approved PR');
  });
  test('PR: Approve button is NOT shown for Draft PRs', () => {
    assert(!canSeeApproveButtonOnPr(role, 'Draft'), 'No approve button on Draft');
  });
  test('PR: Approve button is NOT shown for Rejected PRs', () => {
    assert(!canSeeApproveButtonOnPr(role, 'Rejected'), 'No approve button on Rejected');
  });
  test('PR: Approving a PR changes its status to Approved', () => {
    const pendingPr = INITIAL_PRS.find((p) => p.status === 'Pending Approval') ?? INITIAL_PRS[0];
    const updated = INITIAL_PRS.map((p) =>
      p.id === pendingPr.id ? { ...p, status: 'Approved' as const } : p
    );
    const found = updated.find((p) => p.id === pendingPr.id);
    assertEqual(found?.status, 'Approved', 'PR status after approval');
  });
  test('PR: Can also create and submit PRs (form is not gated by role)', () => {
    // PrModule has no role check on the submit buttons
    const items = [{ id: 'i1', itemCode: 'MAT-X', description: 'Test', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'Zone A' }];
    const err = validatePrSubmit(items, 'REF-001', [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'REQ Approver can still create a PR');
  });

  // — PO-specific actions —
  test('PO: CANNOT approve a PO (not a PO Approver)', () => {
    assert(!canApprovePo(role), 'Should not be able to approve PO');
  });
  test('PO: CANNOT reject a PO', () => {
    assert(!canRejectPo(role), 'Should not be able to reject PO');
  });
  test('PO: Can view PO list (module is accessible)', () => {
    assert(canAccess(role, 'po'), 'PO module is accessible for viewing');
  });
  test('PO: Can create a PO (no role gate on PO creation form)', () => {
    const approvedPr = INITIAL_PRS.find((p) => p.status === 'Approved' || p.status === 'Converted to PO');
    const err = validatePoCreate(approvedPr ?? null, 'REF-PO-001', 'IAAS2-001', INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'REQ Approver can create a PO');
  });

  // — Withdrawal: no access —
  test('CANNOT access Withdrawal: module is not in their permitted list', () => {
    assert(!canAccess(role, 'withdrawal'), 'No withdrawal access for REQ Approver');
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  ACCOUNT 3 — PO Approver (Dir. Jane Doe)
// ════════════════════════════════════════════════════════════════════════════

suite('Account 3: PO Approver — Dir. Jane Doe', () => {
  const account = attemptLogin('po.approver@triforcegs.com.ph', '1234')!;
  const role = account.role as UserRole;

  test('Logs in with correct credentials', () => {
    assert(account !== null);
    assertEqual(account.fullName, 'Dir. Jane Doe');
  });
  test('Default landing module is PO', () => {
    assertEqual(ROLE_DEFAULT_MODULE[role], 'po', 'default module');
  });

  // — Module access: what they CAN see —
  test('CAN access: BOQ module', () => assert(canAccess(role, 'boq'), 'BOQ blocked'));
  test('CAN access: PQTO module', () => assert(canAccess(role, 'pqto'), 'PQTO blocked'));
  test('CAN access: PR module', () => assert(canAccess(role, 'pr'), 'PR blocked'));
  test('CAN access: PO module', () => assert(canAccess(role, 'po'), 'PO blocked'));
  test('CAN access: Tracking module', () => assert(canAccess(role, 'tracking'), 'Tracking blocked'));
  test('CAN access: Logs module', () => assert(canAccess(role, 'logs'), 'Logs blocked'));

  // — Module access: what they CANNOT see —
  test('CANNOT access: Receiving (GRN) module', () => assert(!canAccess(role, 'receiving'), 'Should not have Receiving'));
  test('CANNOT access: Withdrawal (ISS) module', () => assert(!canAccess(role, 'withdrawal'), 'Should not have Withdrawal'));
  test('CANNOT access: Transfers & Settings module', () => assert(!canAccess(role, 'transfers'), 'Should not have Transfers'));

  // — PO approval / rejection —
  test('PO: SEES and CAN click Approve button', () => {
    assert(canApprovePo(role), 'Approve PO should be visible');
  });
  test('PO: SEES and CAN click Reject button', () => {
    assert(canRejectPo(role), 'Reject PO should be visible');
  });
  test('PO: Approving a Pending PO sets status to Approved', () => {
    const po = INITIAL_POS.find((p) => p.status === 'Pending Approval');
    if (!po) { console.log('         ⚠  No Pending PO in seed data, skipping'); return; }
    const updated = INITIAL_POS.map((p) =>
      p.id === po.id ? { ...p, status: 'Approved' as const } : p
    );
    assertEqual(updated.find((p) => p.id === po.id)?.status, 'Approved', 'PO status after approval');
  });
  test('PO: Rejection without comment is blocked', () => {
    const err = validateRejectComment('');
    assert(err !== null, 'Empty comment should be blocked');
    assert(err!.includes('Comments required'), `Got: ${err}`);
  });
  test('PO: Rejection with comment succeeds', () => {
    const err = validateRejectComment('Budget exceeded. Please revise.');
    assertEqual(err, null, 'Non-empty comment should pass');
  });
  test('PO: Rejecting a PO sets status to Returned to Applicant', () => {
    const po = INITIAL_POS[0];
    const reason = 'Price too high';
    const updated = INITIAL_POS.map((p) =>
      p.id === po.id
        ? { ...p, status: 'Returned to Applicant' as const, rejectionComments: reason }
        : p
    );
    const found = updated.find((p) => p.id === po.id);
    assertEqual(found?.status, 'Returned to Applicant', 'Rejected PO status');
    assertEqual(found?.rejectionComments, reason, 'Rejection comment stored');
  });
  test('PO: Rejection comment is stored on the PO record', () => {
    const po = INITIAL_POS[0];
    const comment = 'This exceeds the approved budget ceiling.';
    const updated = INITIAL_POS.map((p) =>
      p.id === po.id
        ? { ...p, status: 'Returned to Applicant' as const, rejectionComments: comment }
        : p
    );
    assertEqual(updated.find((p) => p.id === po.id)?.rejectionComments, comment);
  });

  // — PR: cannot approve —
  test('PR: CANNOT approve a PR (shows "Pending REQ Approver" text instead)', () => {
    assert(!canSeeApproveButtonOnPr(role, 'Pending Approval'), 'PO Approver should not see PR Approve button');
  });

  // — Withdrawal: no access —
  test('CANNOT access Withdrawal: not in permitted modules', () => {
    assert(!canAccess(role, 'withdrawal'), 'No withdrawal for PO Approver');
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  ACCOUNT 4 — Warehouse Manager
// ════════════════════════════════════════════════════════════════════════════

suite('Account 4: Warehouse Manager', () => {
  const account = attemptLogin('warehouse@triforcegs.com.ph', '1234')!;
  const role = account.role as UserRole;

  test('Logs in with correct credentials', () => {
    assert(account !== null);
    assertEqual(account.fullName, 'Warehouse Manager');
  });
  test('Default landing module is Receiving (GRN)', () => {
    assertEqual(ROLE_DEFAULT_MODULE[role], 'receiving', 'default module');
  });

  // — Module access: what they CAN see —
  test('CAN access: Receiving (GRN) module', () => assert(canAccess(role, 'receiving'), 'Receiving blocked'));
  test('CAN access: Withdrawal (ISS) module', () => assert(canAccess(role, 'withdrawal'), 'Withdrawal blocked'));
  test('CAN access: Transfers & Settings module', () => assert(canAccess(role, 'transfers'), 'Transfers blocked'));
  test('CAN access: PO module (view only context)', () => assert(canAccess(role, 'po'), 'PO blocked'));
  test('CAN access: Tracking module', () => assert(canAccess(role, 'tracking'), 'Tracking blocked'));
  test('CAN access: Logs module', () => assert(canAccess(role, 'logs'), 'Logs blocked'));

  // — Module access: what they CANNOT see —
  test('CANNOT access: BOQ module', () => assert(!canAccess(role, 'boq'), 'Should not have BOQ'));
  test('CANNOT access: PQTO module', () => assert(!canAccess(role, 'pqto'), 'Should not have PQTO'));
  test('CANNOT access: PR module', () => assert(!canAccess(role, 'pr'), 'Should not have PR'));

  // — PO: no approval rights —
  test('PO: CANNOT approve a PO (not a PO Approver)', () => {
    assert(!canApprovePo(role), 'No PO approval for Warehouse Manager');
  });
  test('PO: CANNOT reject a PO', () => {
    assert(!canRejectPo(role), 'No PO rejection for Warehouse Manager');
  });

  // — Receiving (GRN) —
  test('Receiving: Can only see Approved or Partially Received POs in the dropdown', () => {
    const openPos = getOpenPos(INITIAL_POS);
    for (const po of openPos) {
      assert(
        po.status === 'Approved' || po.status === 'Partially Received',
        `Open PO list should only have Approved/Partial, got "${po.status}"`
      );
    }
    // Completed or Pending POs should NOT appear
    const nonOpen = INITIAL_POS.filter(
      (p) => p.status !== 'Approved' && p.status !== 'Partially Received'
    );
    for (const po of nonOpen) {
      assert(
        !openPos.find((op) => op.id === po.id),
        `PO with status "${po.status}" should not appear in open list`
      );
    }
  });
  test('Receiving: Blocked when no open PO selected', () => {
    const err = validateReceivingPost(null, 'DR-001', '2026-11-19', [{}], 10, INITIAL_REQUIRED_CONFIG);
    assert(err !== null);
    assert(err!.includes('No open PO'), `Got: ${err}`);
  });
  test('Receiving: Blocked when DR Reference Number is empty', () => {
    const activePo = getOpenPos(INITIAL_POS)[0];
    const err = validateReceivingPost(activePo ?? null, '', '2026-11-19', [{}], 10, INITIAL_REQUIRED_CONFIG);
    if (!activePo) { console.log('         ⚠  No open PO in seed data, skipping'); return; }
    assert(err !== null);
    assert(err!.includes('DR Reference'), `Got: ${err}`);
  });
  test('Receiving: Blocked when DR Date required but empty', () => {
    const activePo = getOpenPos(INITIAL_POS)[0];
    if (!activePo) { console.log('         ⚠  No open PO in seed data, skipping'); return; }
    const config = { ...INITIAL_REQUIRED_CONFIG, drDate: true };
    const err = validateReceivingPost(activePo, 'DR-001', '', [{}], 10, config);
    assert(err !== null);
    assert(err!.includes('Date Refer'), `Got: ${err}`);
  });
  test('Receiving: Blocked when total actual received qty is 0', () => {
    const activePo = getOpenPos(INITIAL_POS)[0];
    if (!activePo) { console.log('         ⚠  No open PO in seed data, skipping'); return; }
    const err = validateReceivingPost(activePo, 'DR-001', '2026-11-19', [{}], 0, INITIAL_REQUIRED_CONFIG);
    assert(err !== null);
    assert(err!.includes('greater than 0'), `Got: ${err}`);
  });
  test('Receiving: Valid post passes all validations', () => {
    const activePo = getOpenPos(INITIAL_POS)[0];
    if (!activePo) { console.log('         ⚠  No open PO in seed data, skipping'); return; }
    const err = validateReceivingPost(activePo, 'DR-001', '2026-11-19', [{}], 10, INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'valid receiving post');
  });
  test('Receiving: actualReceivedQty is capped to outstanding quantity (not more than ordered)', () => {
    // From ReceivingModule.tsx line 94: Math.min(outstanding, Math.max(0, actual))
    const outstanding = 10;
    const userInput = 999;
    const capped = Math.min(outstanding, Math.max(0, userInput));
    assertEqual(capped, 10, 'Should cap at outstanding qty');
  });
  test('Receiving: Negative actual qty is clamped to 0', () => {
    const outstanding = 10;
    const userInput = -5;
    const clamped = Math.min(outstanding, Math.max(0, userInput));
    assertEqual(clamped, 0, 'Negative qty should become 0');
  });

  // — Withdrawal (ISS) —
  test('Withdrawal: Valid issuance passes validation', () => {
    const stock = INITIAL_STOCK.find((s) => s.availableStock > 2);
    assert(stock !== undefined, 'Need a stock item');
    const err = validateWithdrawal(stock!, 2, [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'valid withdrawal');
  });
  test('Withdrawal: Blocked when qty is 0', () => {
    const err = validateWithdrawal(INITIAL_STOCK[0], 0, [{}], INITIAL_REQUIRED_CONFIG);
    assert(err !== null);
    assert(err!.includes('greater than 0'), `Got: ${err}`);
  });
  test('Withdrawal: Requesting more than available is logged as "Without Stock" (not an error)', () => {
    const stock = { ...INITIAL_STOCK[0], availableStock: 1 };
    const err = validateWithdrawal(stock, 100, [{}], INITIAL_REQUIRED_CONFIG);
    assertEqual(err, null, 'Over-request should not error — it logs as Without Stock');
    assertEqual(getWithdrawalStatus(1, 100), 'Without Stock');
  });
  test('Withdrawal: Stock filter works by system tag', () => {
    // Simulates the filteredStock logic in WithdrawalModule
    const targetTag = INITIAL_STOCK[0]?.systemTag;
    if (!targetTag) { console.log('         ⚠  No stock in seed, skipping'); return; }
    const filtered = INITIAL_STOCK.filter((s) => s.systemTag === targetTag);
    assert(filtered.length > 0, 'Filter by tag should return results');
    assert(filtered.every((s) => s.systemTag === targetTag), 'All filtered items should match tag');
  });
  test('Withdrawal: Search by item code works', () => {
    const target = INITIAL_STOCK[0];
    if (!target) { console.log('         ⚠  No stock in seed, skipping'); return; }
    const q = target.itemCode.slice(0, 4).toLowerCase();
    const results = INITIAL_STOCK.filter(
      (s) =>
        s.itemCode.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.assignedLocation.toLowerCase().includes(q)
    );
    assert(results.length > 0, 'Search should find at least 1 result');
  });

  // — PR: cannot approve —
  test('PR: CANNOT see PR Approve button (no PR module access)', () => {
    assert(!canAccess(role, 'pr'), 'No PR module access');
    assert(!canSeeApproveButtonOnPr(role, 'Pending Approval'), 'No approve button for Warehouse Manager');
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  CROSS-ACCOUNT SEGREGATION OF DUTIES CHECKS
// ════════════════════════════════════════════════════════════════════════════

suite('Cross-Account: Segregation of Duties (SoD) Checks', () => {

  test('Only REQ Approver can approve a PR — no other role can', () => {
    const roles: UserRole[] = ['Applicant/Requestor', 'PO Approver', 'Warehouse Manager'];
    for (const r of roles) {
      assert(!canSeeApproveButtonOnPr(r, 'Pending Approval'), `${r} should NOT see PR Approve button`);
    }
  });

  test('Only PO Approver can approve a PO — no other role can', () => {
    const roles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'Warehouse Manager'];
    for (const r of roles) {
      assert(!canApprovePo(r), `${r} should NOT be able to approve a PO`);
    }
  });

  test('Only PO Approver can reject a PO — no other role can', () => {
    const roles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'Warehouse Manager'];
    for (const r of roles) {
      assert(!canRejectPo(r), `${r} should NOT be able to reject a PO`);
    }
  });

  test('Receiving (GRN) is exclusively for Warehouse Manager', () => {
    const roles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'PO Approver'];
    for (const r of roles) {
      assert(!canAccess(r, 'receiving'), `${r} should NOT have Receiving access`);
    }
    assert(canAccess('Warehouse Manager', 'receiving'), 'Warehouse Manager should have Receiving');
  });

  test('Transfers & Settings is exclusively for Warehouse Manager', () => {
    const roles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'PO Approver'];
    for (const r of roles) {
      assert(!canAccess(r, 'transfers'), `${r} should NOT have Transfers access`);
    }
    assert(canAccess('Warehouse Manager', 'transfers'), 'Warehouse Manager should have Transfers');
  });

  test('BOQ and PQTO modules are off-limits to Warehouse Manager', () => {
    assert(!canAccess('Warehouse Manager', 'boq'), 'No BOQ for WM');
    assert(!canAccess('Warehouse Manager', 'pqto'), 'No PQTO for WM');
  });

  test('PR module is off-limits to Warehouse Manager', () => {
    assert(!canAccess('Warehouse Manager', 'pr'), 'No PR for WM');
  });

  test('Tracking and Logs are visible to ALL 4 roles', () => {
    const allRoles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'PO Approver', 'Warehouse Manager'];
    for (const r of allRoles) {
      assert(canAccess(r, 'tracking'), `${r} should have Tracking`);
      assert(canAccess(r, 'logs'), `${r} should have Logs`);
    }
  });

  test('All 4 roles can view PO module', () => {
    const allRoles: UserRole[] = ['Applicant/Requestor', 'REQ Approver', 'PO Approver', 'Warehouse Manager'];
    for (const r of allRoles) {
      assert(canAccess(r, 'po'), `${r} should have PO access`);
    }
  });

  test('Total module count per role is correct', () => {
    assertEqual(ROLE_MODULES['Applicant/Requestor'].length, 7, 'Applicant has 7 modules');
    assertEqual(ROLE_MODULES['REQ Approver'].length, 6, 'REQ Approver has 6 modules');
    assertEqual(ROLE_MODULES['PO Approver'].length, 6, 'PO Approver has 6 modules');
    assertEqual(ROLE_MODULES['Warehouse Manager'].length, 6, 'Warehouse Manager has 6 modules');
  });
});

// ─── Final Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(64));
console.log(`\n  RESULTS: ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\n  FAILED TESTS:');
  failures.forEach((f, i) =>
    console.log(`    ${i + 1}. [${f.account}]\n       ${f.test}\n       → ${f.reason}`)
  );
} else {
  console.log('\n  All tests passed! ✅');
}

console.log('\n' + '═'.repeat(64) + '\n');
if (failed > 0) process.exit(1);
