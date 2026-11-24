import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileBarChart2,
  Printer,
  Search,
  XCircle,
} from 'lucide-react';
import type {
  FileAttachment,
  PoRecord,
  PrRecord,
  RequiredFieldConfig,
  UserRole,
} from '../types/erp';
import { AttachmentCellButton, AttachmentUploader, AttachmentViewerModal, StatusBadge, SummaryReportModal, getPoStageLabel } from './SharedUI';
import { PoPrintModal } from './PoPrintModal';

interface PoModuleProps {
  prs: PrRecord[];
  pos: PoRecord[];
  setPos: React.Dispatch<React.SetStateAction<PoRecord[]>>;
  config: RequiredFieldConfig;
  activeRole: UserRole;
  initialPrNo?: string;
  onRejectPo: (poId: string, comments: string) => void;
  onApprovePo: (poId: string) => void;
  onNavigateToReceiving: (poNo: string) => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function PoModule({
  prs,
  pos,
  setPos,
  config,
  activeRole,
  initialPrNo,
  onRejectPo,
  onApprovePo,
  onNavigateToReceiving,
  onAddLog,
}: PoModuleProps) {
  const approvedPrs = prs.filter((p) => p.status === 'Approved' || p.status === 'Converted to PO');
  const [selectedPrNo, setSelectedPrNo] = useState(initialPrNo || approvedPrs[0]?.prNo || '');
  const [prSearch, setPrSearch] = useState('');
  const [refDocNo, setRefDocNo] = useState('REF-PO-884-12');
  const [iaas2RefNo, setIaas2RefNo] = useState('IAAS2-99210');
  const [vendor, setVendor] = useState('SteelCore Industrial Supply Corp.');
  const [spName, setSpName] = useState('SP-MECH-ALPHA');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rejectTargetPo, setRejectTargetPo] = useState<PoRecord | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [printPo, setPrintPo] = useState<PoRecord | null>(null);
  const [viewingAttachments, setViewingAttachments] = useState<{ docNo: string; attachments: FileAttachment[] } | null>(null);

  const selectedPr = prs.find((p) => p.prNo === selectedPrNo) || approvedPrs[0];

  const searchablePos = pos.filter(
    (p) =>
      p.poNo.toLowerCase().includes(prSearch.toLowerCase()) ||
      p.prNo.toLowerCase().includes(prSearch.toLowerCase()) ||
      p.refDocNo.toLowerCase().includes(prSearch.toLowerCase()) ||
      p.iaas2RefNo.toLowerCase().includes(prSearch.toLowerCase())
  );

  const handleCreatePo = () => {
    setErrorMsg(null);
    if (!selectedPr) {
      setErrorMsg('Select an Approved PR first.');
      return;
    }
    if (config.refDocNo && !refDocNo.trim()) {
      setErrorMsg('Reference Document Number is required.');
      return;
    }
    if (config.iaas2RefNo && !iaas2RefNo.trim()) {
      setErrorMsg('IAAS2 Reference Number is required.');
      return;
    }

    const carriedAttachments = [
      ...selectedPr.attachments,
      ...attachments.filter((a) => !selectedPr.attachments.some((pa) => pa.id === a.id)),
    ];

    const poNo = `PO-2026-${Math.floor(Math.random() * 500 + 460)}`;
    const newPo: PoRecord = {
      id: `po-${Date.now()}`,
      poNo,
      prNo: selectedPr.prNo,
      refDocNo,
      iaas2RefNo,
      vendor,
      applicant: selectedPr.applicant,
      approver: 'Dir. Jane Doe',
      spName,
      status: 'Pending Approval',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      attachments: carriedAttachments,
      items: selectedPr.items.map((it, idx) => ({
        id: `po-it-${Date.now()}-${idx}`,
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

    setPos((prev) => [newPo, ...prev]);
    onAddLog('PO', poNo, 'Created PO from PR', `Linked ${selectedPr.prNo} | Ref: ${refDocNo} | IAAS2: ${iaas2RefNo}`);
    setSuccessMsg(`${poNo} created and routed for Approval.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const confirmReject = () => {
    if (!rejectComment.trim()) {
      setRejectError('Comments required before proceeding.');
      return;
    }
    if (rejectTargetPo) {
      onRejectPo(rejectTargetPo.id, rejectComment.trim());
      setRejectTargetPo(null);
      setRejectComment('');
      setRejectError(null);
    }
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="bg-[#fce8e6] border border-[#f6aea9] text-[#c5221f] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
            PO — Purchase Order Entry
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPrintPo(searchablePos[0] || pos[0] || null)}
              disabled={pos.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#005ec4] border border-[#b9c0c8] text-xs font-semibold rounded-[2px] cursor-pointer disabled:opacity-50"
              title="Print Official PO PDF Report"
            >
              <Printer className="w-3.5 h-3.5" /> Print PO (PDF)
            </button>
            <button
              onClick={() => setShowSummary(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              <FileBarChart2 className="w-3.5 h-3.5" /> Summary Report
            </button>
            <button
              onClick={handleCreatePo}
              className="px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              Generate PO
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Approved PR</label>
            <select
              value={selectedPrNo}
              onChange={(e) => setSelectedPrNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            >
              {approvedPrs.map((pr) => (
                <option key={pr.id} value={pr.prNo}>
                  {pr.prNo} ({pr.refDocNo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Reference Doc No. {config.refDocNo && <span className="text-[#d5002b]">*</span>}
            </label>
            <input
              value={refDocNo}
              onChange={(e) => setRefDocNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              IAAS2 Reference No. {config.iaas2RefNo && <span className="text-[#d5002b]">*</span>}
            </label>
            <input
              value={iaas2RefNo}
              onChange={(e) => setIaas2RefNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">SP Name (Addtl Header)</label>
            <input
              value={spName}
              onChange={(e) => setSpName(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
        </div>

        {selectedPr && (
          <div className="overflow-x-auto border-b border-[#cfd5dc]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Code</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Location</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">PR Qty</th>
                  <th className="px-2.5 py-1.5 font-semibold">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5dbe2]">
                {selectedPr.items.map((it, idx) => (
                  <tr key={it.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-1.5 font-mono border-r border-[#e5e8ec]">{it.itemCode}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{it.description}</td>
                    <td className="px-2.5 py-1.5 text-[#5c646d] border-r border-[#e5e8ec]">{it.assignedLocation}</td>
                    <td className="px-2.5 py-1.5 text-right font-semibold border-r border-[#e5e8ec]">{it.requestedQty}</td>
                    <td className="px-2.5 py-1.5">{it.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 space-y-2.5">
          {selectedPr && selectedPr.attachments.length > 0 && (
            <div className="bg-[#f4f8ff] border border-[#b3d1ff] rounded-[2px] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#004a99] font-medium">
                Requestor ({selectedPr.applicant}) attached <strong>{selectedPr.attachments.length}</strong> file(s) on {selectedPr.prNo}.
              </span>
              <AttachmentCellButton
                attachments={selectedPr.attachments}
                onOpen={() =>
                  setViewingAttachments({
                    docNo: `${selectedPr.prNo} (Requestor Attachments)`,
                    attachments: selectedPr.attachments,
                  })
                }
              />
            </div>
          )}
          <AttachmentUploader
            attachments={attachments}
            required={false}
            label="Additional PO Attachments (PDF, JPG, PNG, XLSX) — Optional"
            onAdd={(f) => setAttachments((prev) => [...prev, f])}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
        </div>
      </div>

      {/* PO Register */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
            PO Register
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={prSearch}
              onChange={(e) => setPrSearch(e.target.value)}
              placeholder="Search PO, PR, Ref Doc, IAAS2..."
              className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PO No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PR No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Ref Doc / IAAS2</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Vendor</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Files</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Status</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Comments</th>
                <th className="px-2.5 py-1.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {searchablePos.map((po, idx) => (
                <tr key={po.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{po.poNo}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[#005ec4] border-r border-[#e5e8ec]">{po.prNo}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <div>{po.refDocNo}</div>
                    <div className="text-[11px] text-[#5c646d] font-mono">{po.iaas2RefNo}</div>
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{po.vendor}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    {(() => {
                      const linkedPr = prs.find((p) => p.prNo === po.prNo);
                      const prFiles = linkedPr?.attachments || [];
                      const merged = [
                        ...po.attachments,
                        ...prFiles.filter((pf) => !po.attachments.some((a) => a.id === pf.id)),
                      ];
                      return (
                        <AttachmentCellButton
                          attachments={merged}
                          onOpen={() =>
                            setViewingAttachments({
                              docNo: `${po.poNo} / ${po.prNo} Files`,
                              attachments: merged,
                            })
                          }
                        />
                      );
                    })()}
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec] space-y-0.5">
                    <StatusBadge status={po.status} />
                    <div className={`text-[10px] font-medium ${getPoStageLabel(po.status).colorClass}`}>
                      {getPoStageLabel(po.status).label}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-[#c5221f] max-w-[180px] truncate border-r border-[#e5e8ec]" title={po.rejectionComments}>
                    {po.rejectionComments || '—'}
                  </td>
                  <td className="px-2.5 py-1.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => setPrintPo(po)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      title="Print Official PO Report or Save as PDF"
                    >
                      <Printer className="w-3 h-3 text-[#0072ed]" /> Print / PDF
                    </button>
                    {po.status === 'Pending Approval' && (
                      activeRole === 'PO Approver' ? (
                        <>
                          <button
                            onClick={() => onApprovePo(po.id)}
                            className="px-2 py-0.5 bg-[#137333] hover:bg-[#0f5c29] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectTargetPo(po);
                              setRejectComment('');
                              setRejectError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#d5002b] hover:bg-[#b00023] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-[#6b7280] font-medium">
                          Pending PO Approver
                        </span>
                      )
                    )}
                    {(po.status === 'Approved' || po.status === 'Partially Received') && (
                      <button
                        onClick={() => onNavigateToReceiving(po.poNo)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      >
                        Receive <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectTargetPo && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2px] shadow-xl border border-[#8d96a0] w-full max-w-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#23262b] text-white text-xs font-bold uppercase tracking-wide">
              REJECT {rejectTargetPo.poNo} — Return to Applicant ({rejectTargetPo.applicant})
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2d3339] mb-1">
                  Rejection Comments <span className="text-[#d5002b]">* Required</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full text-xs border border-[#b9c0c8] rounded-[2px] p-2 focus:outline-none focus:border-[#d5002b]"
                />
                {rejectError && <p className="text-xs text-[#d5002b] mt-1 font-medium">{rejectError}</p>}
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setRejectTargetPo(null)}
                  className="px-3 py-1 text-xs font-semibold text-[#1f2328] bg-white border border-[#b9c0c8] hover:bg-[#eef0f3] rounded-[2px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="px-3 py-1 text-xs font-semibold text-white bg-[#d5002b] hover:bg-[#b00023] rounded-[2px] cursor-pointer"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSummary && (
        <SummaryReportModal
          title="Purchase Order (PO)"
          headers={['PO No.', 'PR No.', 'Ref Doc No.', 'IAAS2 Ref', 'Vendor', 'Applicant', 'Status']}
          rows={pos.map((p) => [p.poNo, p.prNo, p.refDocNo, p.iaas2RefNo, p.vendor, p.applicant, p.status])}
          onClose={() => setShowSummary(false)}
        />
      )}

      {printPo && (
        <PoPrintModal
          po={printPo}
          allPos={pos}
          onSelectPo={(newPo) => setPrintPo(newPo)}
          onClose={() => setPrintPo(null)}
        />
      )}

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
