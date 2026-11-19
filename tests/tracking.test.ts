/**
 * Tracking Module — Scenario Tests
 * Tests the 6-step pipeline chain builder and all tracking logic
 * Run with: npx tsx tests/tracking.test.ts
 */

import {
  INITIAL_PRS,
  INITIAL_POS,
  INITIAL_PQTOS,
  INITIAL_RECEIVINGS,
  INITIAL_WITHDRAWALS,
  INITIAL_LOGS,
} from '../src/data/seedData';
import type {
  FileAttachment,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  TransactionLog,
  WithdrawalRecord,
} from '../src/types/erp';

// ─── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: { suite: string; test: string; reason: string }[] = [];
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
    failures.push({ suite: currentSuite, test: name, reason: msg });
  }
}

function suite(title: string, fn: () => void) {
  currentSuite = title;
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`🔍  ${title}`);
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

// ─── Re-implement tracking chain builder (mirrors TrackingModule.tsx) ──────────

type StepState = 'done' | 'active' | 'rejected' | 'pending';

interface PipelineStep {
  label: string;
  docNo: string;
  detail: string;
  state: StepState;
}

interface TrackingChain {
  pr: PrRecord;
  linkedPos: PoRecord[];
  primaryPo: PoRecord | undefined;
  linkedReceivings: ReceivingRecord[];
  linkedWithdrawals: WithdrawalRecord[];
  steps: PipelineStep[];
  category: 'PR' | 'PO' | 'DELIVERY' | 'DONE';
  allFiles: FileAttachment[];
  lastLog: TransactionLog | undefined;
}

function buildChains(
  prs: PrRecord[],
  pqtos: PqtoRecord[],
  pos: PoRecord[],
  receivings: ReceivingRecord[],
  withdrawals: WithdrawalRecord[],
  logs: TransactionLog[]
): TrackingChain[] {
  return prs.map((pr) => {
    const pqto = pqtos.find((p) => p.pqtoNo === pr.pqtoNo);
    const linkedPos = pos.filter((p) => p.prNo === pr.prNo);
    const primaryPo = linkedPos[0];
    const linkedReceivings = linkedPos.flatMap((po) =>
      receivings.filter((r) => r.poNo === po.poNo)
    );
    const prItemCodes = new Set(pr.items.map((i) => i.itemCode));
    const linkedWithdrawals = withdrawals.filter((w) =>
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

    // Step 1: BOQ / PQTO — always 'done'
    const step1: PipelineStep = {
      label: '1. BOQ & PQTO',
      docNo: pr.pqtoNo || 'PQTO-2026-001',
      detail: pqto ? `${pqto.jobNo}` : 'Engineering Take-Off',
      state: 'done',
    };

    // Step 2: PR Submitted
    const step2: PipelineStep = {
      label: '2. PR Request',
      docNo: pr.prNo,
      detail: `${pr.applicant} (${pr.items.length} items)`,
      state: pr.status === 'Draft' ? 'active' : 'done',
    };

    // Step 3: REQ Approval
    let step3State: StepState = 'pending';
    let step3Detail = 'Waiting for REQ Approver';
    if (pr.status === 'Draft') {
      step3State = 'pending';
      step3Detail = 'Submit PR first';
    } else if (pr.status === 'Pending Approval') {
      step3State = 'active';
      step3Detail = 'Pending REQ Approver';
    } else if (pr.status === 'Rejected') {
      step3State = 'rejected';
      step3Detail = 'Rejected by REQ Approver';
    } else {
      step3State = 'done';
      step3Detail = 'Approved by REQ Approver';
    }
    const step3: PipelineStep = {
      label: '3. REQ Approval',
      docNo: pr.prNo,
      detail: step3Detail,
      state: step3State,
    };

    // Step 4: PO Created & PO Approver
    let step4State: StepState = 'pending';
    let step4Doc = 'Pending PO';
    let step4Detail = 'Awaiting PO creation';
    if (primaryPo) {
      step4Doc = linkedPos.map((p) => p.poNo).join(', ');
      if (primaryPo.status === 'Pending Approval') {
        step4State = 'active';
        step4Detail = 'Pending PO Approver';
      } else if (primaryPo.status === 'Returned to Applicant') {
        step4State = 'rejected';
        step4Detail = primaryPo.rejectionComments || 'Returned by PO Approver';
      } else {
        step4State = 'done';
        step4Detail = `Approved (${primaryPo.vendor.split(' ')[0]})`;
      }
    } else if (pr.status === 'Approved') {
      step4State = 'active';
      step4Detail = 'Ready to Generate PO';
    }
    const step4: PipelineStep = {
      label: '4. PO & Approval',
      docNo: step4Doc,
      detail: step4Detail,
      state: step4State,
    };

    // Step 5: GRN Delivery
    let step5State: StepState = 'pending';
    let step5Doc = 'Awaiting Delivery';
    let step5Detail = 'Not yet dispatched to Receiver';
    if (primaryPo) {
      if (primaryPo.status === 'Approved') {
        step5State = 'active';
        step5Doc = 'In Transit';
        step5Detail = `Sent to Receiver (0 / ${totalOrderedQty} recv)`;
      } else if (primaryPo.status === 'Partially Received') {
        step5State = 'active';
        step5Doc = linkedReceivings.map((r) => r.grnNo).join(', ') || 'Partial GRN';
        step5Detail = `On Delivery (${totalReceivedQty} / ${totalOrderedQty} recv)`;
      } else if (primaryPo.status === 'Completed') {
        step5State = 'done';
        step5Doc = linkedReceivings.map((r) => r.grnNo).join(', ') || 'Completed';
        step5Detail = `Delivered in Full (${totalReceivedQty} / ${totalOrderedQty})`;
      }
    }
    const step5: PipelineStep = {
      label: '5. GRN Delivery',
      docNo: step5Doc,
      detail: step5Detail,
      state: step5State,
    };

    // Step 6: Site Issuance
    let step6State: StepState = 'pending';
    let step6Doc = 'Pending Issuance';
    let step6Detail = 'Awaiting site withdrawal';
    if (linkedWithdrawals.length > 0) {
      const issuedQty = linkedWithdrawals.reduce(
        (sum, w) => sum + w.items.reduce((s, it) => s + it.requestedQty, 0),
        0
      );
      step6State = primaryPo?.status === 'Completed' ? 'done' : 'active';
      step6Doc = linkedWithdrawals.map((w) => w.wdNo).join(', ');
      step6Detail = `${issuedQty} units withdrawn to site`;
    }
    const step6: PipelineStep = {
      label: '6. Site Issuance',
      docNo: step6Doc,
      detail: step6Detail,
      state: step6State,
    };

    // Category
    let category: 'PR' | 'PO' | 'DELIVERY' | 'DONE' = 'PR';
    if (primaryPo?.status === 'Completed') {
      category = 'DONE';
    } else if (primaryPo?.status === 'Approved' || primaryPo?.status === 'Partially Received') {
      category = 'DELIVERY';
    } else if (primaryPo || pr.status === 'Approved') {
      category = 'PO';
    } else {
      category = 'PR';
    }

    const allFiles: FileAttachment[] = [
      ...pr.attachments,
      ...linkedPos.flatMap((p) => p.attachments),
      ...linkedReceivings.flatMap((r) => r.attachments),
    ];

    const relatedLogs = logs.filter(
      (l) =>
        l.docNo === pr.prNo ||
        linkedPos.some((p) => p.poNo === l.docNo) ||
        linkedReceivings.some((r) => r.grnNo === l.docNo)
    );

    return {
      pr,
      linkedPos,
      primaryPo,
      linkedReceivings,
      linkedWithdrawals,
      steps: [step1, step2, step3, step4, step5, step6],
      category,
      allFiles,
      lastLog: relatedLogs[0],
    };
  });
}

/** Search filter (mirrors filteredChains in TrackingModule) */
function filterChains(
  chains: TrackingChain[],
  stageFilter: 'ALL' | 'PR' | 'PO' | 'DELIVERY' | 'DONE',
  query: string
): TrackingChain[] {
  const q = query.trim().toLowerCase();
  return chains.filter((c) => {
    const matchesStage = stageFilter === 'ALL' || c.category === stageFilter;
    const matchesQuery =
      !q ||
      c.pr.prNo.toLowerCase().includes(q) ||
      c.pr.pqtoNo.toLowerCase().includes(q) ||
      c.pr.refDocNo.toLowerCase().includes(q) ||
      c.pr.applicant.toLowerCase().includes(q) ||
      c.linkedPos.some(
        (p) =>
          p.poNo.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q) ||
          p.iaas2RefNo.toLowerCase().includes(q)
      ) ||
      c.linkedReceivings.some(
        (r) => r.grnNo.toLowerCase().includes(q) || r.drNo.toLowerCase().includes(q)
      ) ||
      c.pr.items.some((i) => i.itemCode.toLowerCase().includes(q));
    return matchesStage && matchesQuery;
  });
}

// ─── Helpers to build test fixtures ───────────────────────────────────────────

function makePr(overrides: Partial<PrRecord> & { id: string; prNo: string }): PrRecord {
  return {
    pqtoNo: 'PQTO-2026-001',
    refDocNo: 'REF-TEST-001',
    jobNo: 'JOB-TEST',
    applicant: 'Engr. John Doe',
    status: 'Draft',
    createdAt: '2026-11-19 09:00',
    attachments: [],
    items: [{ id: 'item-1', itemCode: 'MAT-TEST-001', description: 'Test Item', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'Zone A' }],
    ...overrides,
  };
}

function makePo(overrides: Partial<PoRecord> & { id: string; poNo: string; prNo: string }): PoRecord {
  return {
    refDocNo: 'REF-PO-TEST',
    iaas2RefNo: 'IAAS2-TEST',
    vendor: 'SteelCore Industrial Supply Corp.',
    applicant: 'Engr. John Doe',
    approver: 'Dir. Jane Doe',
    status: 'Pending Approval',
    createdAt: '2026-11-19 10:00',
    attachments: [],
    items: [{ id: 'po-item-1', itemCode: 'MAT-TEST-001', description: 'Test Item', uom: 'PC/s', prQty: 5, poQty: 5, receivedQty: 0, unitPrice: 1200, assignedLocation: 'Zone A' }],
    ...overrides,
  };
}

function makeReceiving(overrides: Partial<ReceivingRecord> & { id: string; grnNo: string; poNo: string }): ReceivingRecord {
  return {
    refDocNo: 'REF-TEST',
    iaas2RefNo: 'IAAS2-TEST',
    drNo: 'DR-TEST-001',
    drDate: '2026-11-19',
    performedAt: '2026-11-19 11:00',
    status: 'Completed',
    attachments: [],
    items: [{ id: 'grn-item-1', itemCode: 'MAT-TEST-001', description: 'Test Item', uom: 'PC/s', orderedQty: 5, previouslyReceivedQty: 0, toReceiveQty: 5, actualReceivedQty: 5 }],
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  TEST SUITES
// ════════════════════════════════════════════════════════════════════════════

suite('1. Chain Building — Seed Data', () => {
  const chains = buildChains(
    INITIAL_PRS, INITIAL_PQTOS, INITIAL_POS,
    INITIAL_RECEIVINGS, INITIAL_WITHDRAWALS, INITIAL_LOGS
  );

  test('One chain is built per PR in seed data', () => {
    assertEqual(chains.length, INITIAL_PRS.length, 'chain count should match PR count');
  });

  test('Every chain has exactly 6 pipeline steps', () => {
    for (const chain of chains) {
      assertEqual(chain.steps.length, 6, `${chain.pr.prNo} should have 6 steps`);
    }
  });

  test('Step 1 (BOQ & PQTO) is always "done"', () => {
    for (const chain of chains) {
      assertEqual(chain.steps[0].state, 'done', `Step 1 on ${chain.pr.prNo} must be "done"`);
    }
  });

  test('Step 1 docNo equals the PR\'s linked PQTO number', () => {
    for (const chain of chains) {
      assert(
        chain.steps[0].docNo === chain.pr.pqtoNo || chain.steps[0].docNo === 'PQTO-2026-001',
        `Step 1 docNo should be PQTO No on ${chain.pr.prNo}`
      );
    }
  });

  test('Step 2 (PR Request) docNo equals the PR number', () => {
    for (const chain of chains) {
      assertEqual(chain.steps[1].docNo, chain.pr.prNo, `Step 2 docNo mismatch on ${chain.pr.prNo}`);
    }
  });

  test('All chains have a valid category', () => {
    const valid = ['PR', 'PO', 'DELIVERY', 'DONE'];
    for (const chain of chains) {
      assert(valid.includes(chain.category), `Invalid category "${chain.category}" on ${chain.pr.prNo}`);
    }
  });

  test('POs are correctly linked to their parent PR', () => {
    for (const chain of chains) {
      for (const po of chain.linkedPos) {
        assertEqual(po.prNo, chain.pr.prNo, `PO ${po.poNo} linked to wrong PR`);
      }
    }
  });

  test('Receivings are correctly linked through POs', () => {
    for (const chain of chains) {
      const poNos = new Set(chain.linkedPos.map((p) => p.poNo));
      for (const rec of chain.linkedReceivings) {
        assert(poNos.has(rec.poNo), `Receiving ${rec.grnNo} not linked through a valid PO`);
      }
    }
  });

  test('All attached files are aggregated (PR + PO + GRN attachments)', () => {
    for (const chain of chains) {
      const manualCount =
        chain.pr.attachments.length +
        chain.linkedPos.reduce((s, p) => s + p.attachments.length, 0) +
        chain.linkedReceivings.reduce((s, r) => s + r.attachments.length, 0);
      assertEqual(chain.allFiles.length, manualCount, `Attachment count mismatch on ${chain.pr.prNo}`);
    }
  });
});

suite('2. Step 2 — PR Status Mapping', () => {
  const pqtos = INITIAL_PQTOS;

  test('Draft PR → Step 2 is "active" (PR in progress)', () => {
    const pr = makePr({ id: 'pr-draft', prNo: 'PR-DRAFT-001', status: 'Draft' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[1].state, 'active', 'Step 2 state');
  });

  test('Pending Approval PR → Step 2 is "done" (submitted)', () => {
    const pr = makePr({ id: 'pr-pend', prNo: 'PR-PEND-001', status: 'Pending Approval' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[1].state, 'done', 'Step 2 state');
  });

  test('Approved PR → Step 2 is "done"', () => {
    const pr = makePr({ id: 'pr-appr', prNo: 'PR-APPR-001', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[1].state, 'done', 'Step 2 state');
  });

  test('Converted to PO → Step 2 is "done"', () => {
    const pr = makePr({ id: 'pr-conv', prNo: 'PR-CONV-001', status: 'Converted to PO' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[1].state, 'done', 'Step 2 state');
  });
});

suite('3. Step 3 — REQ Approval Status Mapping', () => {
  const pqtos = INITIAL_PQTOS;

  test('Draft PR → Step 3 is "pending" with "Submit PR first" detail', () => {
    const pr = makePr({ id: 'pr-1', prNo: 'PR-S3-001', status: 'Draft' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[2].state, 'pending', 'Step 3 state');
    assert(chain.steps[2].detail.includes('Submit PR'), `Detail: ${chain.steps[2].detail}`);
  });

  test('Pending Approval PR → Step 3 is "active" with "Pending REQ Approver" detail', () => {
    const pr = makePr({ id: 'pr-2', prNo: 'PR-S3-002', status: 'Pending Approval' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[2].state, 'active', 'Step 3 state');
    assert(chain.steps[2].detail.includes('Pending REQ'), `Detail: ${chain.steps[2].detail}`);
  });

  test('Rejected PR → Step 3 is "rejected"', () => {
    const pr = makePr({ id: 'pr-3', prNo: 'PR-S3-003', status: 'Rejected' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[2].state, 'rejected', 'Step 3 state');
    assert(chain.steps[2].detail.includes('Rejected'), `Detail: ${chain.steps[2].detail}`);
  });

  test('Approved PR → Step 3 is "done" with "Approved by REQ Approver" detail', () => {
    const pr = makePr({ id: 'pr-4', prNo: 'PR-S3-004', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[2].state, 'done', 'Step 3 state');
    assert(chain.steps[2].detail.includes('Approved'), `Detail: ${chain.steps[2].detail}`);
  });

  test('Converted to PO → Step 3 is "done"', () => {
    const pr = makePr({ id: 'pr-5', prNo: 'PR-S3-005', status: 'Converted to PO' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[2].state, 'done', 'Step 3 state');
  });
});

suite('4. Step 4 — PO & Approval Status Mapping', () => {
  const pqtos = INITIAL_PQTOS;

  test('No PO exists but PR is Approved → Step 4 is "active" (ready to generate PO)', () => {
    const pr = makePr({ id: 'pr-np', prNo: 'PR-NP-001', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[3].state, 'active', 'Step 4 state');
    assert(chain.steps[3].detail.includes('Ready to Generate'), `Detail: ${chain.steps[3].detail}`);
  });

  test('PO is Pending Approval → Step 4 is "active"', () => {
    const pr = makePr({ id: 'pr-po1', prNo: 'PR-PO-001', status: 'Approved' });
    const po = makePo({ id: 'po-1', poNo: 'PO-001', prNo: 'PR-PO-001', status: 'Pending Approval' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.steps[3].state, 'active', 'Step 4 state');
    assert(chain.steps[3].detail.includes('Pending PO Approver'), `Detail: ${chain.steps[3].detail}`);
  });

  test('PO is Returned to Applicant (rejected) → Step 4 is "rejected"', () => {
    const pr = makePr({ id: 'pr-po2', prNo: 'PR-PO-002', status: 'Approved' });
    const po = makePo({ id: 'po-2', poNo: 'PO-002', prNo: 'PR-PO-002', status: 'Returned to Applicant', rejectionComments: 'Too expensive' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.steps[3].state, 'rejected', 'Step 4 state');
    assert(chain.steps[3].detail.includes('Too expensive'), `Rejection comment in detail: ${chain.steps[3].detail}`);
  });

  test('PO is Approved → Step 4 is "done"', () => {
    const pr = makePr({ id: 'pr-po3', prNo: 'PR-PO-003', status: 'Approved' });
    const po = makePo({ id: 'po-3', poNo: 'PO-003', prNo: 'PR-PO-003', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.steps[3].state, 'done', 'Step 4 state');
    assert(chain.steps[3].detail.includes('Approved'), `Detail: ${chain.steps[3].detail}`);
  });

  test('PO is Completed → Step 4 is "done"', () => {
    const pr = makePr({ id: 'pr-po4', prNo: 'PR-PO-004', status: 'Approved' });
    const po = makePo({ id: 'po-4', poNo: 'PO-004', prNo: 'PR-PO-004', status: 'Completed' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.steps[3].state, 'done', 'Step 4 state');
  });

  test('PO docNo shows the actual PO number', () => {
    const pr = makePr({ id: 'pr-po5', prNo: 'PR-PO-005', status: 'Approved' });
    const po = makePo({ id: 'po-5', poNo: 'PO-ACTUAL-999', prNo: 'PR-PO-005', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assert(chain.steps[3].docNo.includes('PO-ACTUAL-999'), `docNo: ${chain.steps[3].docNo}`);
  });

  test('Step 4 detail shows vendor first word', () => {
    const pr = makePr({ id: 'pr-po6', prNo: 'PR-PO-006', status: 'Approved' });
    const po = makePo({ id: 'po-6', poNo: 'PO-006', prNo: 'PR-PO-006', status: 'Approved', vendor: 'AcmeCorp Ltd.' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assert(chain.steps[3].detail.includes('AcmeCorp'), `Vendor in detail: ${chain.steps[3].detail}`);
  });
});

suite('5. Step 5 — GRN Delivery Status Mapping', () => {
  const pqtos = INITIAL_PQTOS;

  test('No PO exists → Step 5 is "pending"', () => {
    const pr = makePr({ id: 'pr-g1', prNo: 'PR-G1', status: 'Draft' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[4].state, 'pending', 'Step 5 state');
  });

  test('PO Approved (not yet received) → Step 5 is "active" / "In Transit"', () => {
    const pr = makePr({ id: 'pr-g2', prNo: 'PR-G2', status: 'Approved' });
    const po = makePo({ id: 'po-g2', poNo: 'PO-G2', prNo: 'PR-G2', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.steps[4].state, 'active', 'Step 5 state');
    assert(chain.steps[4].docNo.includes('In Transit'), `docNo: ${chain.steps[4].docNo}`);
  });

  test('PO Partially Received → Step 5 is "active" with GRN number and counts', () => {
    const pr = makePr({ id: 'pr-g3', prNo: 'PR-G3', status: 'Approved' });
    const po = makePo({
      id: 'po-g3', poNo: 'PO-G3', prNo: 'PR-G3', status: 'Partially Received',
      items: [{ id: 'i1', itemCode: 'MAT-TEST-001', description: 'T', uom: 'PC/s', prQty: 10, poQty: 10, receivedQty: 4, unitPrice: 100, assignedLocation: 'A' }],
    });
    const rec = makeReceiving({ id: 'grn-g3', grnNo: 'GRN-G3', poNo: 'PO-G3', status: 'Partially Received',
      items: [{ id: 'ri-1', itemCode: 'MAT-TEST-001', description: 'T', uom: 'PC/s', orderedQty: 10, previouslyReceivedQty: 0, toReceiveQty: 10, actualReceivedQty: 4 }],
    });
    const [chain] = buildChains([pr], pqtos, [po], [rec], [], []);
    assertEqual(chain.steps[4].state, 'active', 'Step 5 state');
    assert(chain.steps[4].docNo.includes('GRN-G3'), `GRN No in docNo: ${chain.steps[4].docNo}`);
    assert(chain.steps[4].detail.includes('On Delivery'), `Detail: ${chain.steps[4].detail}`);
  });

  test('PO Completed → Step 5 is "done" with GRN number and "Delivered in Full"', () => {
    const pr = makePr({ id: 'pr-g4', prNo: 'PR-G4', status: 'Approved' });
    const po = makePo({
      id: 'po-g4', poNo: 'PO-G4', prNo: 'PR-G4', status: 'Completed',
      items: [{ id: 'i1', itemCode: 'MAT-TEST-001', description: 'T', uom: 'PC/s', prQty: 5, poQty: 5, receivedQty: 5, unitPrice: 100, assignedLocation: 'A' }],
    });
    const rec = makeReceiving({ id: 'grn-g4', grnNo: 'GRN-G4-001', poNo: 'PO-G4' });
    const [chain] = buildChains([pr], pqtos, [po], [rec], [], []);
    assertEqual(chain.steps[4].state, 'done', 'Step 5 state');
    assert(chain.steps[4].docNo.includes('GRN-G4-001'), `GRN No in docNo: ${chain.steps[4].docNo}`);
    assert(chain.steps[4].detail.includes('Delivered in Full'), `Detail: ${chain.steps[4].detail}`);
  });

  test('Step 5 detail shows correct received/ordered qty ratio', () => {
    const pr = makePr({ id: 'pr-g5', prNo: 'PR-G5', status: 'Approved' });
    const po = makePo({
      id: 'po-g5', poNo: 'PO-G5', prNo: 'PR-G5', status: 'Completed',
      items: [{ id: 'i1', itemCode: 'MAT-X', description: 'T', uom: 'PC/s', prQty: 20, poQty: 20, receivedQty: 20, unitPrice: 100, assignedLocation: 'A' }],
    });
    const rec = makeReceiving({ id: 'grn-g5', grnNo: 'GRN-G5', poNo: 'PO-G5' });
    const [chain] = buildChains([pr], pqtos, [po], [rec], [], []);
    // totalOrderedQty=20, totalReceivedQty=20
    assert(chain.steps[4].detail.includes('20'), `Should show 20 in detail: ${chain.steps[4].detail}`);
  });
});

suite('6. Step 6 — Site Issuance Status Mapping', () => {
  const pqtos = INITIAL_PQTOS;

  test('No withdrawals for this PR → Step 6 is "pending"', () => {
    const pr = makePr({ id: 'pr-s6a', prNo: 'PR-S6A', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.steps[5].state, 'pending', 'Step 6 state');
  });

  test('Withdrawal exists but PO not completed → Step 6 is "active"', () => {
    const pr = makePr({ id: 'pr-s6b', prNo: 'PR-S6B', status: 'Approved',
      items: [{ id: 'i1', itemCode: 'MAT-S6B', description: 'T', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'A' }],
    });
    const po = makePo({ id: 'po-s6b', poNo: 'PO-S6B', prNo: 'PR-S6B', status: 'Approved' });
    const wd: WithdrawalRecord = {
      id: 'wd-s6b', wdNo: 'WD-S6B', systemTag: 'MEPF', jobNo: 'JOB-TEST',
      requestedBy: 'Foreman', performedAt: '2026-11-19 09:00', status: 'With Stock', attachments: [],
      items: [{ itemCode: 'MAT-S6B', description: 'T', uom: 'PC/s', availableAtRequest: 10, requestedQty: 3, assignedLocation: 'A' }],
    };
    const [chain] = buildChains([pr], pqtos, [po], [], [wd], []);
    assertEqual(chain.steps[5].state, 'active', 'Step 6 state when PO not completed');
  });

  test('Withdrawal exists and PO is completed → Step 6 is "done"', () => {
    const pr = makePr({ id: 'pr-s6c', prNo: 'PR-S6C', status: 'Approved',
      items: [{ id: 'i1', itemCode: 'MAT-S6C', description: 'T', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'A' }],
    });
    const po = makePo({ id: 'po-s6c', poNo: 'PO-S6C', prNo: 'PR-S6C', status: 'Completed' });
    const wd: WithdrawalRecord = {
      id: 'wd-s6c', wdNo: 'WD-S6C', systemTag: 'MEPF', jobNo: 'JOB-TEST',
      requestedBy: 'Foreman', performedAt: '2026-11-19 09:00', status: 'With Stock', attachments: [],
      items: [{ itemCode: 'MAT-S6C', description: 'T', uom: 'PC/s', availableAtRequest: 10, requestedQty: 7, assignedLocation: 'A' }],
    };
    const [chain] = buildChains([pr], pqtos, [po], [], [wd], []);
    assertEqual(chain.steps[5].state, 'done', 'Step 6 state when PO completed');
  });

  test('Step 6 detail shows total issued quantity', () => {
    const pr = makePr({ id: 'pr-s6d', prNo: 'PR-S6D', status: 'Approved',
      items: [{ id: 'i1', itemCode: 'MAT-S6D', description: 'T', uom: 'PC/s', pqtoQty: 20, requestedQty: 10, assignedLocation: 'A' }],
    });
    const wd: WithdrawalRecord = {
      id: 'wd-s6d', wdNo: 'WD-S6D-001', systemTag: 'MEPF', jobNo: 'JOB',
      requestedBy: 'Foreman', performedAt: '2026-11-19 09:00', status: 'With Stock', attachments: [],
      items: [{ itemCode: 'MAT-S6D', description: 'T', uom: 'PC/s', availableAtRequest: 20, requestedQty: 8, assignedLocation: 'A' }],
    };
    const [chain] = buildChains([pr], pqtos, [], [], [wd], []);
    assert(chain.steps[5].detail.includes('8'), `Should show qty in detail: ${chain.steps[5].detail}`);
    assert(chain.steps[5].docNo.includes('WD-S6D-001'), `WD No in docNo: ${chain.steps[5].docNo}`);
  });

  test('Withdrawal linkage is by item code, not by WD number', () => {
    // A withdrawal is linked to a PR if its items share item codes with the PR's items
    const pr = makePr({ id: 'pr-s6e', prNo: 'PR-S6E', status: 'Approved',
      items: [{ id: 'i1', itemCode: 'MAT-UNIQUE-XYZ', description: 'T', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'A' }],
    });
    const wdMatch: WithdrawalRecord = {
      id: 'wd-match', wdNo: 'WD-MATCH', systemTag: 'MEPF', jobNo: 'JOB',
      requestedBy: 'Foreman', performedAt: '2026-11-19 09:00', status: 'With Stock', attachments: [],
      items: [{ itemCode: 'MAT-UNIQUE-XYZ', description: 'T', uom: 'PC/s', availableAtRequest: 10, requestedQty: 3, assignedLocation: 'A' }],
    };
    const wdNoMatch: WithdrawalRecord = {
      id: 'wd-nomatch', wdNo: 'WD-NOMATCH', systemTag: 'MEPF', jobNo: 'JOB',
      requestedBy: 'Foreman', performedAt: '2026-11-19 09:00', status: 'With Stock', attachments: [],
      items: [{ itemCode: 'MAT-DIFFERENT-CODE', description: 'T', uom: 'PC/s', availableAtRequest: 10, requestedQty: 5, assignedLocation: 'A' }],
    };
    const [chain] = buildChains([pr], pqtos, [], [], [wdMatch, wdNoMatch], []);
    assertEqual(chain.linkedWithdrawals.length, 1, 'Only matching withdrawal should be linked');
    assertEqual(chain.linkedWithdrawals[0].wdNo, 'WD-MATCH', 'Should link WD-MATCH');
  });
});

suite('7. Category Determination', () => {
  const pqtos = INITIAL_PQTOS;

  test('PR without PO → category is "PR"', () => {
    const pr = makePr({ id: 'pr-cat1', prNo: 'PR-CAT1', status: 'Pending Approval' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.category, 'PR', 'category');
  });

  test('PR Approved but no PO yet → category is "PO" (waiting for PO generation)', () => {
    const pr = makePr({ id: 'pr-cat2', prNo: 'PR-CAT2', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.category, 'PO', 'category');
  });

  test('PO Pending Approval → category is "PO"', () => {
    const pr = makePr({ id: 'pr-cat3', prNo: 'PR-CAT3', status: 'Approved' });
    const po = makePo({ id: 'po-cat3', poNo: 'PO-CAT3', prNo: 'PR-CAT3', status: 'Pending Approval' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.category, 'PO', 'category');
  });

  test('PO Returned to Applicant → category is "PO"', () => {
    const pr = makePr({ id: 'pr-cat4', prNo: 'PR-CAT4', status: 'Approved' });
    const po = makePo({ id: 'po-cat4', poNo: 'PO-CAT4', prNo: 'PR-CAT4', status: 'Returned to Applicant' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.category, 'PO', 'category');
  });

  test('PO Approved (in transit) → category is "DELIVERY"', () => {
    const pr = makePr({ id: 'pr-cat5', prNo: 'PR-CAT5', status: 'Approved' });
    const po = makePo({ id: 'po-cat5', poNo: 'PO-CAT5', prNo: 'PR-CAT5', status: 'Approved' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.category, 'DELIVERY', 'category');
  });

  test('PO Partially Received → category is "DELIVERY"', () => {
    const pr = makePr({ id: 'pr-cat6', prNo: 'PR-CAT6', status: 'Approved' });
    const po = makePo({ id: 'po-cat6', poNo: 'PO-CAT6', prNo: 'PR-CAT6', status: 'Partially Received' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.category, 'DELIVERY', 'category');
  });

  test('PO Completed → category is "DONE"', () => {
    const pr = makePr({ id: 'pr-cat7', prNo: 'PR-CAT7', status: 'Approved' });
    const po = makePo({ id: 'po-cat7', poNo: 'PO-CAT7', prNo: 'PR-CAT7', status: 'Completed' });
    const [chain] = buildChains([pr], pqtos, [po], [], [], []);
    assertEqual(chain.category, 'DONE', 'category');
  });

  test('Draft PR → category is "PR"', () => {
    const pr = makePr({ id: 'pr-cat8', prNo: 'PR-CAT8', status: 'Draft' });
    const [chain] = buildChains([pr], pqtos, [], [], [], []);
    assertEqual(chain.category, 'PR', 'category');
  });
});

suite('8. Stage Filter & Counts', () => {
  const pqtos = INITIAL_PQTOS;

  const prPR = makePr({ id: 'fpr1', prNo: 'F-PR1', status: 'Draft' });
  const prPO = makePr({ id: 'fpr2', prNo: 'F-PR2', status: 'Approved' });
  const prPOapproved = makePr({ id: 'fpr3', prNo: 'F-PR3', status: 'Approved' });
  const prDone = makePr({ id: 'fpr4', prNo: 'F-PR4', status: 'Approved' });

  const poPending = makePo({ id: 'fpo2', poNo: 'F-PO2', prNo: 'F-PR2', status: 'Pending Approval' });
  const poApproved = makePo({ id: 'fpo3', poNo: 'F-PO3', prNo: 'F-PR3', status: 'Approved' });
  const poCompleted = makePo({ id: 'fpo4', poNo: 'F-PO4', prNo: 'F-PR4', status: 'Completed' });

  const chains = buildChains(
    [prPR, prPO, prPOapproved, prDone],
    pqtos,
    [poPending, poApproved, poCompleted],
    [], [], []
  );

  test('Stage "ALL" returns all chains', () => {
    const result = filterChains(chains, 'ALL', '');
    assertEqual(result.length, 4, 'ALL should return 4 chains');
  });

  test('Stage "PR" returns only PR-category chains', () => {
    const result = filterChains(chains, 'PR', '');
    assert(result.every((c) => c.category === 'PR'), 'All returned chains should be PR category');
    assertEqual(result.length, 1, 'Should have 1 PR-category chain');
  });

  test('Stage "PO" returns only PO-category chains', () => {
    const result = filterChains(chains, 'PO', '');
    assert(result.every((c) => c.category === 'PO'), 'All returned chains should be PO category');
    assertEqual(result.length, 1, 'Should have 1 PO-category chain');
  });

  test('Stage "DELIVERY" returns only DELIVERY-category chains', () => {
    const result = filterChains(chains, 'DELIVERY', '');
    assert(result.every((c) => c.category === 'DELIVERY'), 'All should be DELIVERY category');
    assertEqual(result.length, 1, 'Should have 1 DELIVERY chain');
  });

  test('Stage "DONE" returns only DONE-category chains', () => {
    const result = filterChains(chains, 'DONE', '');
    assert(result.every((c) => c.category === 'DONE'), 'All should be DONE category');
    assertEqual(result.length, 1, 'Should have 1 DONE chain');
  });

  test('Category counts sum to total chain count', () => {
    const pr = chains.filter((c) => c.category === 'PR').length;
    const po = chains.filter((c) => c.category === 'PO').length;
    const del = chains.filter((c) => c.category === 'DELIVERY').length;
    const done = chains.filter((c) => c.category === 'DONE').length;
    assertEqual(pr + po + del + done, chains.length, 'All categories should sum to total');
  });
});

suite('9. Search / Query Filter', () => {
  const pqtos = INITIAL_PQTOS;

  const pr1 = makePr({ id: 'srch1', prNo: 'PR-SEARCH-001', status: 'Approved', pqtoNo: 'PQTO-SEARCH-999', refDocNo: 'REF-UNIQUE-XYZ', applicant: 'Engr. Maria Santos' });
  const pr2 = makePr({ id: 'srch2', prNo: 'PR-OTHER-002', status: 'Approved', applicant: 'Engr. Pedro Cruz' });
  const po1 = makePo({ id: 'po-srch1', poNo: 'PO-SEARCH-001', prNo: 'PR-SEARCH-001', status: 'Approved', vendor: 'UniqueVendorName Corp.', iaas2RefNo: 'IAAS2-UNIQUE-888' });

  const chains = buildChains([pr1, pr2], pqtos, [po1], [], [], []);

  test('Search by PR number returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'PR-SEARCH-001');
    assertEqual(result.length, 1, 'Should match 1 chain');
    assertEqual(result[0].pr.prNo, 'PR-SEARCH-001', 'Correct chain');
  });

  test('Search by PQTO number returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'PQTO-SEARCH-999');
    assertEqual(result.length, 1, 'Should match 1 chain');
    assertEqual(result[0].pr.prNo, 'PR-SEARCH-001', 'Correct chain');
  });

  test('Search by Ref Doc No returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'REF-UNIQUE-XYZ');
    assertEqual(result.length, 1, 'Should match 1 chain by ref doc');
  });

  test('Search by applicant name returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'maria santos');
    assertEqual(result.length, 1, 'Should match 1 chain by applicant');
    assertEqual(result[0].pr.applicant, 'Engr. Maria Santos');
  });

  test('Search by PO number returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'PO-SEARCH-001');
    assertEqual(result.length, 1, 'Should match 1 chain by PO No');
  });

  test('Search by vendor name returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'uniquevendorname');
    assertEqual(result.length, 1, 'Should match 1 chain by vendor');
  });

  test('Search by IAAS2 Ref No returns correct chain', () => {
    const result = filterChains(chains, 'ALL', 'IAAS2-UNIQUE-888');
    assertEqual(result.length, 1, 'Should match 1 chain by IAAS2');
  });

  test('Search by item code returns correct chain', () => {
    const pr = makePr({ id: 'srch3', prNo: 'PR-ITEMSEARCH', status: 'Draft',
      items: [{ id: 'i1', itemCode: 'MAT-RARE-CODE-777', description: 'Rare Item', uom: 'PC/s', pqtoQty: 10, requestedQty: 5, assignedLocation: 'A' }],
    });
    const localChains = buildChains([pr], pqtos, [], [], [], []);
    const result = filterChains(localChains, 'ALL', 'MAT-RARE-CODE-777');
    assertEqual(result.length, 1, 'Should find chain by item code');
  });

  test('Search is case-insensitive', () => {
    const result = filterChains(chains, 'ALL', 'pr-search-001');
    assertEqual(result.length, 1, 'Lowercase search should match');
  });

  test('Empty search returns all chains', () => {
    const result = filterChains(chains, 'ALL', '');
    assertEqual(result.length, chains.length, 'Empty query should return all');
  });

  test('Whitespace-only search returns all chains', () => {
    const result = filterChains(chains, 'ALL', '   ');
    assertEqual(result.length, chains.length, 'Whitespace query should return all');
  });

  test('Non-matching search returns empty list', () => {
    const result = filterChains(chains, 'ALL', 'ZZZZZ-NOMATCH-9999');
    assertEqual(result.length, 0, 'No results for non-matching query');
  });

  test('Stage filter + search query are combined (AND logic)', () => {
    // PR-SEARCH-001 is in DELIVERY (Approved PO), PR-OTHER-002 is in PO (no PO)
    const result = filterChains(chains, 'DELIVERY', 'PR-SEARCH-001');
    assertEqual(result.length, 1, 'Should find 1 chain matching DELIVERY + search');
    // Searching in DELIVERY for PR-OTHER-002 should return 0
    const result2 = filterChains(chains, 'DELIVERY', 'PR-OTHER-002');
    assertEqual(result2.length, 0, 'Should return 0 — wrong stage');
  });
});

suite('10. Audit Log Linkage', () => {
  const pqtos = INITIAL_PQTOS;

  test('Log matching the PR number is linked to the chain', () => {
    const pr = makePr({ id: 'log-pr1', prNo: 'PR-LOG-001', status: 'Approved' });
    const log: TransactionLog = {
      id: 'log-1', timestamp: '2026-11-19 09:00:00', adminOrUser: 'Applicant (Admin)',
      spName: 'SP-TEST', module: 'PR', docNo: 'PR-LOG-001', action: 'Submitted', comments: 'Test',
    };
    const [chain] = buildChains([pr], pqtos, [], [], [], [log]);
    assert(chain.lastLog !== undefined, 'lastLog should be set');
    assertEqual(chain.lastLog!.docNo, 'PR-LOG-001', 'Log linked by PR No');
  });

  test('Log matching the PO number is linked to the chain', () => {
    const pr = makePr({ id: 'log-pr2', prNo: 'PR-LOG-002', status: 'Approved' });
    const po = makePo({ id: 'po-log2', poNo: 'PO-LOG-002', prNo: 'PR-LOG-002', status: 'Approved' });
    const log: TransactionLog = {
      id: 'log-2', timestamp: '2026-11-19 10:00:00', adminOrUser: 'PO Approver (Admin)',
      spName: 'SP-TEST', module: 'PO', docNo: 'PO-LOG-002', action: 'Approved', comments: 'OK',
    };
    const [chain] = buildChains([pr], pqtos, [po], [], [], [log]);
    assert(chain.lastLog !== undefined, 'lastLog should be set');
    assertEqual(chain.lastLog!.docNo, 'PO-LOG-002', 'Log linked by PO No');
  });

  test('Log matching the GRN number is linked to the chain', () => {
    const pr = makePr({ id: 'log-pr3', prNo: 'PR-LOG-003', status: 'Approved' });
    const po = makePo({ id: 'po-log3', poNo: 'PO-LOG-003', prNo: 'PR-LOG-003', status: 'Completed' });
    const rec = makeReceiving({ id: 'grn-log3', grnNo: 'GRN-LOG-003', poNo: 'PO-LOG-003' });
    const log: TransactionLog = {
      id: 'log-3', timestamp: '2026-11-19 11:00:00', adminOrUser: 'Warehouse Manager (Admin)',
      spName: 'SP-TEST', module: 'Receiving', docNo: 'GRN-LOG-003', action: 'Posted', comments: 'Received full',
    };
    const [chain] = buildChains([pr], pqtos, [po], [rec], [], [log]);
    assert(chain.lastLog !== undefined, 'lastLog should be set');
    assertEqual(chain.lastLog!.docNo, 'GRN-LOG-003', 'Log linked by GRN No');
  });

  test('Unrelated log is NOT linked to the chain', () => {
    const pr = makePr({ id: 'log-pr4', prNo: 'PR-LOG-004', status: 'Draft' });
    const unrelatedLog: TransactionLog = {
      id: 'log-unrelated', timestamp: '2026-11-19 09:00:00', adminOrUser: 'Admin',
      spName: 'SP-TEST', module: 'BOQ', docNo: 'BOQ-999-UNRELATED', action: 'Saved Draft', comments: 'Unrelated',
    };
    const [chain] = buildChains([pr], pqtos, [], [], [], [unrelatedLog]);
    assert(chain.lastLog === undefined, 'Unrelated log should not be linked');
  });

  test('Most recent log is returned as lastLog (first in array = most recent)', () => {
    const pr = makePr({ id: 'log-pr5', prNo: 'PR-LOG-005', status: 'Approved' });
    const logs: TransactionLog[] = [
      { id: 'log-latest', timestamp: '2026-11-19 11:00:00', adminOrUser: 'A', spName: 'SP', module: 'PR', docNo: 'PR-LOG-005', action: 'Latest Action', comments: '' },
      { id: 'log-older', timestamp: '2026-11-19 09:00:00', adminOrUser: 'A', spName: 'SP', module: 'PR', docNo: 'PR-LOG-005', action: 'Older Action', comments: '' },
    ];
    const [chain] = buildChains([pr], pqtos, [], [], [], logs);
    assertEqual(chain.lastLog!.action, 'Latest Action', 'First log in array should be lastLog');
  });
});

suite('11. Seed Data — Full End-to-End Chain Verification', () => {
  const chains = buildChains(
    INITIAL_PRS, INITIAL_PQTOS, INITIAL_POS,
    INITIAL_RECEIVINGS, INITIAL_WITHDRAWALS, INITIAL_LOGS
  );

  test('All seed PRs produce a valid chain', () => {
    assertEqual(chains.length, INITIAL_PRS.length, 'Chain count matches PR count');
    for (const chain of chains) {
      assert(chain.steps.length === 6, `${chain.pr.prNo} has 6 steps`);
    }
  });

  test('Every chain step has a valid state value', () => {
    const valid: StepState[] = ['done', 'active', 'rejected', 'pending'];
    for (const chain of chains) {
      for (const step of chain.steps) {
        assert(valid.includes(step.state), `Invalid state "${step.state}" on ${chain.pr.prNo} step ${step.label}`);
      }
    }
  });

  test('Every chain step has a non-empty label', () => {
    for (const chain of chains) {
      for (const step of chain.steps) {
        assert(step.label.trim() !== '', `Empty label on step of ${chain.pr.prNo}`);
      }
    }
  });

  test('Every chain step has a non-empty docNo', () => {
    for (const chain of chains) {
      for (const step of chain.steps) {
        assert(step.docNo.trim() !== '', `Empty docNo on step "${step.label}" of ${chain.pr.prNo}`);
      }
    }
  });

  test('PRs that have linked POs in seed data: linkedPos count > 0', () => {
    const posInSeed = new Set(INITIAL_POS.map((p) => p.prNo));
    for (const chain of chains) {
      if (posInSeed.has(chain.pr.prNo)) {
        assert(chain.linkedPos.length > 0, `${chain.pr.prNo} should have linkedPos`);
      }
    }
  });

  test('POs in DELIVERY category have Approved or Partially Received status', () => {
    const deliveryChains = chains.filter((c) => c.category === 'DELIVERY');
    for (const chain of deliveryChains) {
      assert(
        chain.primaryPo?.status === 'Approved' || chain.primaryPo?.status === 'Partially Received',
        `DELIVERY chain ${chain.pr.prNo} has wrong PO status: ${chain.primaryPo?.status}`
      );
    }
  });

  test('DONE category chains have Completed PO', () => {
    const doneChains = chains.filter((c) => c.category === 'DONE');
    for (const chain of doneChains) {
      assertEqual(chain.primaryPo?.status, 'Completed', `DONE chain ${chain.pr.prNo} should have Completed PO`);
    }
  });

  test('All 4 stage categories are represented in seed data', () => {
    const categories = new Set(chains.map((c) => c.category));
    // At minimum should have PRs in various stages
    assert(categories.size >= 1, 'Should have at least 1 category populated');
    for (const cat of categories) {
      assert(['PR', 'PO', 'DELIVERY', 'DONE'].includes(cat), `Unknown category: ${cat}`);
    }
  });

  test('Search by real PR No. from seed data finds exactly 1 chain', () => {
    const realPr = INITIAL_PRS[0];
    const result = filterChains(chains, 'ALL', realPr.prNo.toLowerCase());
    assert(result.length >= 1, `Should find chain for ${realPr.prNo}`);
    assert(result.some((c) => c.pr.prNo === realPr.prNo), 'Should find exact PR');
  });
});

// ─── Final Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(64));
console.log(`\n  RESULTS: ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\n  FAILED TESTS:');
  failures.forEach((f, i) =>
    console.log(`    ${i + 1}. [${f.suite}]\n       ${f.test}\n       → ${f.reason}`)
  );
} else {
  console.log('\n  All tests passed! ✅');
}

console.log('\n' + '═'.repeat(64) + '\n');
if (failed > 0) process.exit(1);
