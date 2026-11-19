import { useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  PackageMinus,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import type {
  FileAttachment,
  ModuleKey,
  PoRecord,
  PrRecord,
  WithdrawalRecord,
} from '../types/erp';
import {
  AttachmentCellButton,
  AttachmentViewerModal,
  StatusBadge,
  getPoStageLabel,
  getPrStageLabel,
  getWithdrawalStageLabel,
} from './SharedUI';

type UserRole = 'Applicant' | 'Approver' | 'Warehouse Admin';

interface MyRequestsModalProps {
  activeRole: UserRole;
  prs: PrRecord[];
  pos: PoRecord[];
  withdrawals: WithdrawalRecord[];
  onNavigate: (module: ModuleKey) => void;
  onOpenNewRequest: () => void;
  onClose: () => void;
}

export function MyRequestsModal({
  activeRole,
  prs,
  pos,
  withdrawals,
  onNavigate,
  onOpenNewRequest,
  onClose,
}: MyRequestsModalProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'PR' | 'ISS' | 'PO'>('ALL');
  const [query, setQuery] = useState('');
  const [viewingAttachments, setViewingAttachments] = useState<{
    docNo: string;
    attachments: FileAttachment[];
  } | null>(null);

  const q = query.trim().toLowerCase();

  const filteredPrs =
    filterType === 'ALL' || filterType === 'PR'
      ? prs.filter(
          (p) =>
            p.prNo.toLowerCase().includes(q) ||
            p.refDocNo.toLowerCase().includes(q) ||
            p.applicant.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q)
        )
      : [];

  const filteredWithdrawals =
    filterType === 'ALL' || filterType === 'ISS'
      ? withdrawals.filter(
          (w) =>
            w.wdNo.toLowerCase().includes(q) ||
            w.requestedBy.toLowerCase().includes(q) ||
            w.jobNo.toLowerCase().includes(q) ||
            w.status.toLowerCase().includes(q) ||
            w.items.some((it) => it.itemCode.toLowerCase().includes(q))
        )
      : [];

  const filteredPos =
    filterType === 'ALL' || filterType === 'PO'
      ? pos.filter(
          (p) =>
            p.poNo.toLowerCase().includes(q) ||
            p.prNo.toLowerCase().includes(q) ||
            p.vendor.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q)
        )
      : [];

  const totalCount = prs.length + withdrawals.length + pos.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2px] shadow-2xl border border-[#8d96a0] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#23262b] text-white shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#4da3ff]" />
            <span className="text-xs font-bold uppercase tracking-wide">
              All Requests Overview — {activeRole} ({totalCount} Total)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewRequest();
              }}
              className="px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-[11px] font-semibold rounded-[2px] cursor-pointer"
            >
              + New Request
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { key: 'ALL', label: `All (${totalCount})` },
              { key: 'PR', label: `Purchase Requisitions (${prs.length})` },
              { key: 'ISS', label: `Material Withdrawals (${withdrawals.length})` },
              { key: 'PO', label: `Purchase Orders (${pos.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key as typeof filterType)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold border cursor-pointer ${
                  filterType === tab.key
                    ? 'bg-[#0072ed] text-white border-[#0072ed]'
                    : 'bg-white text-[#1f2328] border-[#b9c0c8] hover:bg-[#eef0f3]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doc no., user, status..."
              className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Purchase Requisitions */}
          {filteredPrs.length > 0 && (
            <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#f4f8ff] border-b border-[#cfd5dc] flex items-center justify-between">
                <span className="font-bold text-[#004a99] flex items-center gap-1.5 uppercase text-[11px]">
                  <ClipboardList className="w-3.5 h-3.5" /> Purchase Requisitions (PRQ)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('pr');
                    onClose();
                  }}
                  className="text-[11px] font-semibold text-[#005ec4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Open PRQ Module <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PR No.</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Requester</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Ref Doc / PQTO</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Items</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Files</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Created</th>
                      <th className="px-2.5 py-1.5 font-semibold">Status &amp; Delivery Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5dbe2]">
                    {filteredPrs.map((pr, idx) => {
                      const linkedPo = pos.find((p) => p.prNo === pr.prNo);
                      const stage = getPrStageLabel(pr.status, linkedPo);
                      return (
                        <tr key={pr.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                          <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{pr.prNo}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{pr.applicant}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                            <span className="font-mono">{pr.refDocNo}</span>
                            <span className="text-[#5c646d] ml-1.5 text-[11px]">({pr.pqtoNo})</span>
                          </td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{pr.items.length} line(s)</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                            <AttachmentCellButton
                              attachments={pr.attachments}
                              onOpen={() => setViewingAttachments({ docNo: pr.prNo, attachments: pr.attachments })}
                            />
                          </td>
                          <td className="px-2.5 py-1.5 font-mono text-[#5c646d] border-r border-[#e5e8ec]">{pr.createdAt}</td>
                          <td className="px-2.5 py-1.5 space-y-0.5">
                            <StatusBadge status={pr.status} />
                            <div className={`text-[10.5px] font-medium ${stage.colorClass}`}>
                              {stage.label}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Material Withdrawals */}
          {filteredWithdrawals.length > 0 && (
            <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#f4fbf6] border-b border-[#cfd5dc] flex items-center justify-between">
                <span className="font-bold text-[#137333] flex items-center gap-1.5 uppercase text-[11px]">
                  <PackageMinus className="w-3.5 h-3.5" /> Material Withdrawals (ISS)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('withdrawal');
                    onClose();
                  }}
                  className="text-[11px] font-semibold text-[#137333] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Open ISS Module <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Slip No.</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Requester</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Qty</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Files</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Date</th>
                      <th className="px-2.5 py-1.5 font-semibold">Status &amp; Issuance Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5dbe2]">
                    {filteredWithdrawals.map((w, idx) => {
                      const stage = getWithdrawalStageLabel(w.status);
                      return (
                        <tr key={w.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                          <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{w.wdNo}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{w.requestedBy}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                            <span className="font-mono font-semibold">{w.items[0]?.itemCode}</span>
                            {w.items[0]?.description && (
                              <span className="text-[#5c646d] ml-1.5 text-[11px]">{w.items[0].description}</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-semibold border-r border-[#e5e8ec]">
                            {w.items[0]?.requestedQty} {w.items[0]?.uom}
                          </td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                            <AttachmentCellButton
                              attachments={w.attachments}
                              onOpen={() => setViewingAttachments({ docNo: w.wdNo, attachments: w.attachments })}
                            />
                          </td>
                          <td className="px-2.5 py-1.5 font-mono text-[#5c646d] border-r border-[#e5e8ec]">{w.performedAt}</td>
                          <td className="px-2.5 py-1.5 space-y-0.5">
                            <StatusBadge status={w.status} />
                            <div className={`text-[10.5px] font-medium ${stage.colorClass}`}>
                              {stage.label}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase Orders */}
          {filteredPos.length > 0 && (
            <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between">
                <span className="font-bold text-[#1f2328] flex items-center gap-1.5 uppercase text-[11px]">
                  <ShoppingCart className="w-3.5 h-3.5" /> Purchase Orders (POE)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('po');
                    onClose();
                  }}
                  className="text-[11px] font-semibold text-[#005ec4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Open POE Module <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PO No.</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Applicant</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Vendor</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Files</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Comments</th>
                      <th className="px-2.5 py-1.5 font-semibold">Status &amp; Delivery Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5dbe2]">
                    {filteredPos.map((po, idx) => {
                      const stage = getPoStageLabel(po.status);
                      return (
                        <tr key={po.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                          <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{po.poNo}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{po.applicant}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{po.vendor}</td>
                          <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                            <AttachmentCellButton
                              attachments={po.attachments}
                              onOpen={() => setViewingAttachments({ docNo: po.poNo, attachments: po.attachments })}
                            />
                          </td>
                          <td className="px-2.5 py-1.5 text-[#c5221f] border-r border-[#e5e8ec]">
                            {po.rejectionComments || '—'}
                          </td>
                          <td className="px-2.5 py-1.5 space-y-0.5">
                            <StatusBadge status={po.status} />
                            <div className={`text-[10.5px] font-medium ${stage.colorClass}`}>
                              {stage.label}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredPrs.length === 0 && filteredWithdrawals.length === 0 && filteredPos.length === 0 && (
            <div className="text-center py-8 text-[#5c646d]">
              No requests match your search filter.
            </div>
          )}
        </div>
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

