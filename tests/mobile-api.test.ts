/**
 * Backend API & RBAC Integration Test Suite for Android Mobile Companion
 * Starts against running server at http://127.0.0.1:4000
 */

const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name} -> ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function run() {
  console.log('\n🧪 Running Mobile Companion Backend API & RBAC Tests...\n');

  let applicantToken = '';
  let approverToken = '';
  let uploadedAttachment: any = null;
  let draftPrId = '';
  let submittedPrId = '';

  await test('Health endpoint responds OK', async () => {
    const r = await api('GET', '/api/health');
    assert(r.status === 200 && r.data.status === 'ok', `Unexpected health: ${JSON.stringify(r)}`);
  });

  await test('Protected endpoints reject unauthenticated requests (401)', async () => {
    const r = await api('GET', '/api/dashboard');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
  });

  await test('Mobile login REJECTS unauthorized web roles (PO Approver, Warehouse, Purchaser, Admin -> 403)', async () => {
    for (const email of [
      'po.approver@triforcegs.com.ph',
      'warehouse@triforcegs.com.ph',
      'purchaser@triforcegs.com.ph',
      'admin@triforcegs.com.ph',
    ]) {
      const r = await api('POST', '/api/auth/login', undefined, {
        email,
        password: '1234',
        client: 'mobile',
      });
      assert(r.status === 403, `Expected 403 for ${email}, got ${r.status}`);
    }
  });

  await test('Applicant/Requestor logs in successfully on mobile', async () => {
    const r = await api('POST', '/api/auth/login', undefined, {
      email: 'applicant@triforcegs.com.ph',
      password: '1234',
      client: 'mobile',
    });
    assert(r.status === 200 && Boolean(r.data.token), 'Expected 200 + token');
    assert(r.data.user.role === 'Applicant/Requestor', 'Expected Applicant role');
    assert(r.data.permissions.canApprovePr === false, 'Applicant cannot approve PR');
    assert(r.data.permissions.canAccessWithdrawal === true, 'Applicant can access Withdrawal');
    applicantToken = r.data.token;
  });

  await test('REQ Approver logs in successfully on mobile', async () => {
    const r = await api('POST', '/api/auth/login', undefined, {
      email: 'req.approver@triforcegs.com.ph',
      password: '1234',
      client: 'mobile',
    });
    assert(r.status === 200 && Boolean(r.data.token), 'Expected 200 + token');
    assert(r.data.user.role === 'REQ Approver', 'Expected REQ Approver role');
    assert(r.data.permissions.canApprovePr === true, 'REQ Approver can approve PR');
    assert(r.data.permissions.canApprovePo === false, 'REQ Approver cannot approve PO');
    assert(r.data.permissions.canAccessWithdrawal === false, 'REQ Approver cannot access Withdrawal');
    approverToken = r.data.token;
  });

  await test('Role-adaptive Dashboards return tailored metrics for Applicant & REQ Approver', async () => {
    const d1 = await api('GET', '/api/dashboard?project=PROJ-TWRB', applicantToken);
    assert(d1.status === 200 && d1.data.role === 'Applicant/Requestor', 'Applicant dashboard ok');
    assert(typeof d1.data.metrics.totalPrs === 'number', 'Has totalPrs');

    const d2 = await api('GET', '/api/dashboard?project=PROJ-TWRB', approverToken);
    assert(d2.status === 200 && d2.data.role === 'REQ Approver', 'Approver dashboard ok');
    assert(typeof d2.data.metrics.pendingApproval === 'number', 'Has pendingApproval');
  });

  await test('BOQ edit endpoints BLOCK Applicant (403) and ALLOW REQ Approver', async () => {
    const blocked = await api('POST', '/api/boq/items', applicantToken, {
      projectCode: 'PROJ-TWRB',
      itemCode: 'MAT-TEST-01',
      description: 'Unauthorized item',
    });
    assert(blocked.status === 403, `Expected 403 for Applicant BOQ edit, got ${blocked.status}`);

    const ok = await api('POST', '/api/boq/items', approverToken, {
      projectCode: 'PROJ-TWRB',
      itemCode: 'MAT-VLV-99',
      description: 'Gate Valve 100mm PN16',
      boqUom: 'PC/s',
      boqQty: 5,
      pqtoUom: 'PC/s',
      pqtoQty: 5,
      assignedLocation: 'Zone A - Pump Room',
    });
    assert(ok.status === 201 && ok.data.item.itemCode === 'MAT-VLV-99', `Expected 201, got ${ok.status}`);
  });

  await test('Attachment upload validates file type and stores valid PDF', async () => {
    const bad = await api('POST', '/api/attachments', applicantToken, {
      fileName: 'malware.exe',
      base64Data: Buffer.from('MZ').toString('base64'),
    });
    assert(bad.status === 400, `Expected 400 for .exe, got ${bad.status}`);

    const good = await api('POST', '/api/attachments', applicantToken, {
      fileName: 'Supporting_Spec.pdf',
      base64Data: Buffer.from('%PDF-1.4 sample content').toString('base64'),
      mimeType: 'application/pdf',
    });
    assert(good.status === 201 && good.data.attachment.id, `Expected 201, got ${good.status}`);
    uploadedAttachment = good.data.attachment;
  });

  await test('PR validation blocks over-ordering beyond PQTO remaining balance', async () => {
    const over = await api('POST', '/api/prs', applicantToken, {
      pqtoNo: 'PQTO-2026-001',
      refDocNo: 'REF-OVER-01',
      jobNo: 'JOB-2026-884',
      asDraft: false,
      attachments: [uploadedAttachment],
      items: [
        {
          itemCode: 'MAT-PIP-100-40',
          description: 'B.I. Pipe Sch-40, Seamless - 100mm',
          uom: 'PC/s',
          requestedQty: 999,
          assignedLocation: 'Zone A',
          isNewItem: false,
        },
      ],
    });
    assert(over.status === 400 && String(over.data.error).includes('Blocked'), `Expected PQTO block, got ${JSON.stringify(over)}`);
  });

  await test('Applicant saves Draft PR, edits it, and submits it for Approval', async () => {
    const draft = await api('POST', '/api/prs', applicantToken, {
      pqtoNo: 'PQTO-2026-001',
      refDocNo: '',
      jobNo: 'JOB-2026-884',
      asDraft: true,
      attachments: [],
      items: [
        {
          itemCode: 'MAT-PIP-100-40',
          description: 'B.I. Pipe Sch-40, Seamless - 100mm',
          uom: 'PC/s',
          requestedQty: 2,
          assignedLocation: 'Zone A - Pump Room',
          isNewItem: false,
        },
      ],
    });
    assert(draft.status === 201 && draft.data.pr.status === 'Draft', `Expected Draft PR, got ${JSON.stringify(draft)}`);
    draftPrId = draft.data.pr.id;

    const submitted = await api('PUT', `/api/prs/${draftPrId}`, applicantToken, {
      refDocNo: 'REF-MOB-001',
      jobNo: 'JOB-2026-884',
      spName: 'SP-MECH-ALPHA',
      asDraft: false,
      attachments: [uploadedAttachment],
      items: draft.data.pr.items,
    });
    assert(submitted.status === 200 && submitted.data.pr.status === 'Pending Approval', `Expected Pending Approval, got ${JSON.stringify(submitted)}`);
    submittedPrId = submitted.data.pr.id;
  });

  await test('Applicant CANNOT approve or reject PR (403)', async () => {
    const r1 = await api('POST', `/api/prs/${submittedPrId}/approve`, applicantToken);
    assert(r1.status === 403, `Expected 403 approve by Applicant, got ${r1.status}`);
    const r2 = await api('POST', `/api/prs/${submittedPrId}/reject`, applicantToken, { comments: 'hack' });
    assert(r2.status === 403, `Expected 403 reject by Applicant, got ${r2.status}`);
  });

  await test('REQ Approver rejection requires mandatory reason (400 if empty), then returns PR to Applicant', async () => {
    const empty = await api('POST', `/api/prs/${submittedPrId}/reject`, approverToken, { comments: '   ' });
    assert(empty.status === 400, `Expected 400 empty reject reason, got ${empty.status}`);

    const rejected = await api('POST', `/api/prs/${submittedPrId}/reject`, approverToken, {
      comments: 'Please attach updated isometric drawing.',
    });
    assert(
      rejected.status === 200 && rejected.data.pr.status === 'Returned to Applicant',
      `Expected Returned to Applicant, got ${JSON.stringify(rejected)}`
    );
  });

  await test('Applicant edits Returned PR, resubmits, and REQ Approver approves (duplicate approval blocked 409)', async () => {
    const resubmit = await api('PUT', `/api/prs/${submittedPrId}`, applicantToken, {
      refDocNo: 'REF-MOB-001-REV2',
      jobNo: 'JOB-2026-884',
      spName: 'SP-MECH-ALPHA',
      asDraft: false,
      attachments: [uploadedAttachment],
      items: [
        {
          itemCode: 'MAT-PIP-100-40',
          description: 'B.I. Pipe Sch-40, Seamless - 100mm',
          uom: 'PC/s',
          requestedQty: 2,
          assignedLocation: 'Zone A - Pump Room',
          isNewItem: false,
        },
      ],
    });
    assert(resubmit.status === 200 && resubmit.data.pr.status === 'Pending Approval', 'Resubmit ok');

    const approved = await api('POST', `/api/prs/${submittedPrId}/approve`, approverToken);
    assert(approved.status === 200 && approved.data.pr.status === 'Approved', 'Approve ok');

    const dup = await api('POST', `/api/prs/${submittedPrId}/approve`, approverToken);
    assert(dup.status === 409, `Expected 409 duplicate approval, got ${dup.status}`);
  });

  await test('Material Withdrawal: Applicant allowed (no negative stock), REQ Approver blocked (403)', async () => {
    const blocked = await api('GET', '/api/withdrawals', approverToken);
    assert(blocked.status === 403, `Expected 403 for REQ Approver withdrawals, got ${blocked.status}`);

    const wd = await api('POST', '/api/withdrawals', applicantToken, {
      stockId: 'stk-1',
      requestedQty: 2,
      requestedBy: 'Engr. John Doe',
      jobNo: 'JOB-2026-884',
      attachments: [uploadedAttachment],
    });
    assert(wd.status === 201 && wd.data.withdrawal.status === 'Pending Issuance', `Expected Pending Issuance, got ${JSON.stringify(wd)}`);
    assert(wd.data.stockItem.availableStock >= 0, 'Stock never negative');
  });

  await test('PO, End-to-End Tracking, Logs, and Notifications return real backend data', async () => {
    const pos = await api('GET', '/api/pos', applicantToken);
    assert(pos.status === 200 && pos.data.pos.length > 0, 'POs loaded');

    const trk = await api('GET', '/api/tracking', applicantToken);
    assert(trk.status === 200 && trk.data.chains.length > 0 && trk.data.chains[0].steps.length === 6, '6-stage tracking loaded');

    const logs = await api('GET', '/api/logs', approverToken);
    assert(logs.status === 200 && !logs.data.allowedModules.includes('WITHDRAWAL'), 'REQ Approver logs scoped');

    const notifs = await api('GET', '/api/notifications', applicantToken);
    assert(notifs.status === 200 && notifs.data.notifications.length > 0, 'Notifications loaded');
  });

  await test('Logout revokes token immediately (401 on subsequent request)', async () => {
    const out = await api('POST', '/api/auth/logout', applicantToken);
    assert(out.status === 200, 'Logout ok');
    const after = await api('GET', '/api/auth/me', applicantToken);
    assert(after.status === 401, `Expected 401 after logout, got ${after.status}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
