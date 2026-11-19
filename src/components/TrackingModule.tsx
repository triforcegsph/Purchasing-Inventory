import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Route,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import type {
  FileAttachment,
  ModuleKey,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  TransactionLog,
  UserRole,
  WithdrawalRecord,
} from '../types/erp';
import {
  AttachmentCellButton,
  AttachmentViewerModal,
  StatusBadge,
} from './SharedUI';

interface TrackingModuleProps {
  activeRole: UserRole;
  pqtos: PqtoRecord[];
  prs: PrRecord[];
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  withdrawals: WithdrawalRecord[];
  logs: TransactionLog[];
  onNavigate: (module: ModuleKey) => void;
}

type StepState = 'done' | 'active' | 'rejected' | 'pending';

interface PipelineStep {
  label: string;
  docNo: string;
  detail: string;
  state: StepState;
}

export function TrackingModule({
  activeRole,
  pqtos,
  prs,
  pos,
  receivings,
  withdrawals,
  logs,
  onNavigate,
}: TrackingModuleProps) {
  const [stageFilter, setStageFilter] = useState<'ALL' | 'PR' | 'PO' | 'DELIVERY' | 'DONE'>('ALL');
  const [query, setQuery] = useState('');
  const [viewingAttachments, setViewingAttachments] = useState<{
    docNo: string;
    attachments: FileAttachment[];
  } | null>(null);

  const q = query.trim().toLowerCase();

  // Build end-to-end tracking chains anchored on every PR
  const chains = prs.map((pr) => {
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

    // Step 1: BOQ / PQTO
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

    // Step 3: REQ Approver
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

    // Step 5: GRN Delivery / Warehouse Receiving
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

    // Step 6: Site Issuance (ISS)
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

    // Determine overall category for filtering
    let category: 'PR' | 'PO' | 'DELIVERY' | 'DONE' = 'PR';
    if (primaryPo?.status === 'Completed') {
      category = 'DONE';
    } else if (
      primaryPo?.status === 'Approved' ||
      primaryPo?.status === 'Partially Received'
    ) {
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

  const filteredChains = chains.filter((c) => {
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

  const countByCategory = {
    ALL: chains.length,
    PR: chains.filter((c) => c.category === 'PR').length,
    PO: chains.filter((c) => c.category === 'PO').length,
    DELIVERY: chains.filter((c) => c.category === 'DELIVERY').length,
    DONE: chains.filter((c) => c.category === 'DONE').length,
  };

  return (
    <div className="space-y-3">
      {/* Header & Summary Strip */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e8ec] pb-2">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-[#0072ed]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              TRK — End-to-End Order &amp; Material Tracking (Start to Finish)
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#5c646d]">
            Signed in as: <strong className="text-[#1f2328]">{activeRole}</strong>
          </span>
        </div>

        {/* Filter Pills + Search */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'ALL', label: `All Requests (${countByCategory.ALL})` },
              { key: 'PR', label: `1. REQ Approval (${countByCategory.PR})` },
              { key: 'PO', label: `2. PO Approval (${countByCategory.PO})` },
              { key: 'DELIVERY', label: `3. On Delivery / GRN (${countByCategory.DELIVERY})` },
              { key: 'DONE', label: `4. Completed (${countByCategory.DONE})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key as typeof stageFilter)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold border cursor-pointer ${
                  stageFilter === tab.key
                    ? 'bg-[#0072ed] text-white border-[#0072ed]'
                    : 'bg-white text-[#1f2328] border-[#b9c0c8] hover:bg-[#eef0f3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#6b7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Track by PR, PO, GRN, DR, Item, Vendor..."
              className="w-full h-7 pl-8 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tracked Request Chains */}
      <div className="space-y-3">
        {filteredChains.length === 0 ? (
          <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-8 text-center text-xs text-[#5c646d]">
            No tracked orders match your filter.
          </div>
        ) : (
          filteredChains.map((chain) => (
            <div
              key={chain.pr.id}
              className="bg-white border border-[#cfd5dc] rounded-[2px] overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-[#1f2328]">{chain.pr.prNo}</span>
                  {chain.linkedPos.length > 0 && (
                    <>
                      <ArrowRight className="w-3 h-3 text-[#6b7280]" />
                      <span className="font-mono font-bold text-[#005ec4]">
                        {chain.linkedPos.map((p) => p.poNo).join(', ')}
                      </span>
                    </>
                  )}
                  {chain.linkedReceivings.length > 0 && (
                    <>
                      <ArrowRight className="w-3 h-3 text-[#6b7280]" />
                      <span className="font-mono font-bold text-[#137333]">
                        {chain.linkedReceivings.map((r) => r.grnNo).join(', ')}
                      </span>
                    </>
                  )}
                  <span className="text-[#5c646d]">•</span>
                  <span className="text-[#495057]">
                    Requester: <strong>{chain.pr.applicant}</strong>
                  </span>
                  <span className="text-[#5c646d]">•</span>
                  <StatusBadge status={chain.primaryPo ? chain.primaryPo.status : chain.pr.status} />
                </div>

                <div className="flex items-center gap-2">
                  <AttachmentCellButton
                    attachments={chain.allFiles}
                    onOpen={() =>
                      setViewingAttachments({
                        docNo: `${chain.pr.prNo}${chain.primaryPo ? ` / ${chain.primaryPo.poNo}` : ''}`,
                        attachments: chain.allFiles,
                      })
                    }
                  />
                  {chain.category === 'PR' && (
                    <button
                      type="button"
                      onClick={() => onNavigate('pr')}
                      className="px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#005ec4] cursor-pointer"
                    >
                      Open PRQ
                    </button>
                  )}
                  {chain.category === 'PO' && (
                    <button
                      type="button"
                      onClick={() => onNavigate('po')}
                      className="px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#005ec4] cursor-pointer"
                    >
                      Open POE
                    </button>
                  )}
                  {chain.category === 'DELIVERY' && (
                    <button
                      type="button"
                      onClick={() => onNavigate('receiving')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                    >
                      <Truck className="w-3 h-3" /> Track / Receive (GRN)
                    </button>
                  )}
                </div>
              </div>

              {/* 6-Stage Connected Dot-Line Stepper */}
              <div className="px-4 py-4 bg-[#fafbfd] overflow-x-auto">
                <div className="min-w-[680px] grid grid-cols-6 relative">
                  {chain.steps.map((step, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === chain.steps.length - 1;
                    const prevState = !isFirst ? chain.steps[idx - 1].state : 'pending';
                    const leftLineColor =
                      prevState === 'done'
                        ? 'bg-[#137333]'
                        : prevState === 'active'
                        ? 'bg-[#0072ed]'
                        : prevState === 'rejected'
                        ? 'bg-[#d5002b]'
                        : 'bg-[#cfd5dc]';

                    const rightLineColor =
                      step.state === 'done'
                        ? 'bg-[#137333]'
                        : step.state === 'active'
                        ? 'bg-[#84b8ff]'
                        : step.state === 'rejected'
                        ? 'bg-[#f6aea9]'
                        : 'bg-[#cfd5dc]';

                    const dotBg =
                      step.state === 'done'
                        ? 'bg-[#137333] border-[#137333] text-white'
                        : step.state === 'active'
                        ? 'bg-[#0072ed] border-[#0072ed] text-white ring-4 ring-[#0072ed]/20'
                        : step.state === 'rejected'
                        ? 'bg-[#d5002b] border-[#d5002b] text-white'
                        : 'bg-white border-[#b9c0c8] text-[#9aa0a6]';

                    return (
                      <div key={idx} className="flex flex-col items-center text-center px-1.5 relative">
                        {/* Dot + Connecting Lines Row */}
                        <div className="w-full flex items-center justify-center relative mb-2">
                          {/* Left connector */}
                          <div className={`h-[3px] flex-1 ${isFirst ? 'bg-transparent' : leftLineColor}`} />
                          {/* Step Dot */}
                          <div
                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${dotBg}`}
                          >
                            {step.state === 'done' ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : step.state === 'active' ? (
                              <Clock className="w-3.5 h-3.5 text-white" />
                            ) : step.state === 'rejected' ? (
                              <XCircle className="w-4 h-4 text-white" />
                            ) : (
                              <span className="text-[10px] font-bold">{idx + 1}</span>
                            )}
                          </div>
                          {/* Right connector */}
                          <div className={`h-[3px] flex-1 ${isLast ? 'bg-transparent' : rightLineColor}`} />
                        </div>

                        {/* Step Labels */}
                        <div className="text-[10px] font-bold uppercase text-[#2d3339]">
                          {step.label}
                        </div>
                        <div className="font-mono text-[11px] font-semibold text-[#1f2328] truncate max-w-full mt-0.5" title={step.docNo}>
                          {step.docNo}
                        </div>
                        <div className="text-[10px] text-[#5c646d] leading-tight mt-0.5">
                          {step.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Latest Audit Event */}
              {chain.lastLog && (
                <div className="px-3 py-1.5 bg-white border-t border-[#e5e8ec] text-[10.5px] text-[#5c646d] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Latest Update: <strong className="text-[#1f2328]">{chain.lastLog.action}</strong> — {chain.lastLog.comments}
                  </span>
                  <span className="font-mono">{chain.lastLog.timestamp}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {viewingAttachments && (
        <AttachmentViewerModal
          docNo={viewingAttachments.docNo}
          attachments={viewingAttachments.attachments}
          onClose={() => setViewingAttachments(null)}
        />
      )}
    </div>
  );
}
