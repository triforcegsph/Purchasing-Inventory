import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FilePlus2,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  FileAttachment,
  PqtoRecord,
  PrLineItem,
  PrRecord,
  RequiredFieldConfig,
} from '../types/erp';
import { AttachmentCellButton, AttachmentUploader, AttachmentViewerModal, StatusBadge } from './SharedUI';

interface PrModuleProps {
  pqtos: PqtoRecord[];
  prs: PrRecord[];
  setPrs: React.Dispatch<React.SetStateAction<PrRecord[]>>;
  config: RequiredFieldConfig;
  activeRole: 'Applicant' | 'Approver' | 'Warehouse Admin';
  initialPqtoNo?: string;
  onApprovePr: (prId: string) => void;
  onNavigateToPo: (prNo: string) => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function PrModule({
  pqtos,
  prs,
  setPrs,
  config,
  activeRole,
  initialPqtoNo,
  onApprovePr,
  onNavigateToPo,
  onAddLog,
}: PrModuleProps) {
  const [selectedPqtoNo, setSelectedPqtoNo] = useState(initialPqtoNo || pqtos[0]?.pqtoNo || '');
  const [pqtoSearch, setPqtoSearch] = useState('');
  const [refDocNo, setRefDocNo] = useState('REF-PR-884-09');
  const [jobNo, setJobNo] = useState('JOB-2026-884');
  const [spName, setSpName] = useState('SP-MECH-ALPHA');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [draftItems, setDraftItems] = useState<PrLineItem[]>(() => {
    const pq = pqtos.find((p) => p.pqtoNo === (initialPqtoNo || pqtos[0]?.pqtoNo));
    if (!pq) return [];
    return pq.items.slice(0, 2).map((it, idx) => ({
      id: `draft-pr-${idx}`,
      itemCode: it.itemCode,
      description: it.description,
      uom: it.pqtoUom,
      pqtoQty: Math.max(0, it.pqtoQty - it.prOrderedQty),
      requestedQty: Math.min(4, Math.max(1, it.pqtoQty - it.prOrderedQty)),
      assignedLocation: it.assignedLocation,
    }));
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewingAttachments, setViewingAttachments] = useState<{ docNo: string; attachments: FileAttachment[] } | null>(null);

  const activePqto = pqtos.find((p) => p.pqtoNo === selectedPqtoNo) || pqtos[0];

  const filteredPqtoLookup =
    activePqto?.items.filter(
      (it) =>
        it.itemCode.toLowerCase().includes(pqtoSearch.toLowerCase()) ||
        it.description.toLowerCase().includes(pqtoSearch.toLowerCase())
    ) || [];

  const copyFromPqtoItem = (it: PqtoRecord['items'][number]) => {
    const remaining = Math.max(0, it.pqtoQty - it.prOrderedQty);
    setDraftItems((prev) => [
      ...prev,
      {
        id: `pr-line-${Date.now()}-${Math.random()}`,
        itemCode: it.itemCode,
        description: it.description,
        uom: it.pqtoUom,
        pqtoQty: remaining,
        requestedQty: remaining > 0 ? Math.min(2, remaining) : 1,
        assignedLocation: it.assignedLocation,
      },
    ]);
  };

  const addNewItemNotInBoq = () => {
    const sysCode = `SYS-NEW-${Math.floor(Math.random() * 900 + 100)}`;
    setDraftItems((prev) => [
      ...prev,
      {
        id: `pr-new-${Date.now()}`,
        itemCode: sysCode,
        description: 'Gasket Ring, EPDM Full-Face - 100mm (New Item)',
        uom: 'PC/s',
        pqtoQty: 0,
        requestedQty: 10,
        assignedLocation: 'Zone D - Rooftop',
        isNewItem: true,
        systemAssignedCode: sysCode,
      },
    ]);
    setSuccessMsg(`Added ${sysCode}. Requires approval before permanent BOQ/PQTO posting.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleActivityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraftItems((prev) => [
      ...prev,
      {
        id: `pr-upl-${Date.now()}`,
        itemCode: 'MAT-TEE-100-050',
        description: `B.I. Tee Reducer Sch-40, Welded - 100mm x 50mm (${file.name})`,
        uom: 'PC/s',
        pqtoQty: 10,
        requestedQty: 5,
        assignedLocation: 'Zone B - Riser Shaft',
      },
    ]);
    setSuccessMsg(`Uploaded "${file.name}".`);
    setTimeout(() => setSuccessMsg(null), 3000);
    e.target.value = '';
  };

  const handleCreatePr = (asDraft: boolean) => {
    setErrorMsg(null);
    if (!asDraft) {
      if (config.refDocNo && !refDocNo.trim()) {
        setErrorMsg('Reference Document Number is required.');
        return;
      }
      if (config.attachments && attachments.length === 0) {
        setErrorMsg('At least 1 attachment (PDF, JPG, etc.) is required.');
        return;
      }
      if (draftItems.length === 0) {
        setErrorMsg('Please add at least one line item.');
        return;
      }
      const exceeded = draftItems.find((it) => !it.isNewItem && it.requestedQty > it.pqtoQty);
      if (exceeded && config.blockExceedPqto) {
        setErrorMsg(
          `Blocked: Requested qty (${exceeded.requestedQty}) for ${exceeded.itemCode} exceeds PQTO remaining (${exceeded.pqtoQty}).`
        );
        return;
      }
    }

    const hasNewItem = draftItems.some((i) => i.isNewItem);
    const prNo = `PR-2026-${Math.floor(Math.random() * 800 + 200)}`;
    const newPr: PrRecord = {
      id: `pr-${Date.now()}`,
      prNo,
      pqtoNo: activePqto?.pqtoNo || selectedPqtoNo,
      refDocNo,
      jobNo,
      applicant: 'Engr. John Doe',
      spName,
      status: asDraft ? 'Draft' : 'Pending Approval',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      attachments,
      items: draftItems,
      requiresBoqApproval: hasNewItem,
    };

    setPrs((prev) => [newPr, ...prev]);
    onAddLog(
      'PR',
      prNo,
      asDraft ? 'Saved as Draft' : 'Submitted for Approval',
      `Ref: ${refDocNo}${hasNewItem ? ' | New Item Requires Approval' : ''}`
    );
    setSuccessMsg(`${prNo} ${asDraft ? 'saved as Draft' : 'submitted for Approval'}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
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
            PRQ — Purchase Requisition Entry
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer">
              <Upload className="w-3 h-3 text-[#137333]" /> Activity Upload
              <input type="file" accept=".csv,.xlsx" onChange={handleActivityUpload} className="hidden" />
            </label>
            <button
              onClick={addNewItemNotInBoq}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#005ec4] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold cursor-pointer"
            >
              <FilePlus2 className="w-3 h-3" /> + New Item (Non-BOQ)
            </button>
            <button
              onClick={() => handleCreatePr(true)}
              className="px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-xs font-semibold cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleCreatePr(false)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-xs font-semibold cursor-pointer"
            >
              <Copy className="w-3 h-3" /> Submit PR
            </button>
          </div>
        </div>

        {/* Header Fields */}
        <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Linked PQTO
            </label>
            <select
              value={selectedPqtoNo}
              onChange={(e) => setSelectedPqtoNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            >
              {pqtos.map((p) => (
                <option key={p.id} value={p.pqtoNo}>
                  {p.pqtoNo} ({p.jobNo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Reference Document No. {config.refDocNo && <span className="text-[#d5002b]">*</span>}
            </label>
            <input
              value={refDocNo}
              onChange={(e) => setRefDocNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Job / Project No. <span className="text-[#d5002b]">*</span>
            </label>
            <input
              value={jobNo}
              onChange={(e) => setJobNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              SP Name (Addtl Header)
            </label>
            <input
              value={spName}
              onChange={(e) => setSpName(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
        </div>

        {/* PQTO Lookup Picker */}
        <div className="px-3 py-2 bg-[#f4f8ff] border-b border-[#cfd5dc]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-[#004a99]">
              PQTO Lookup ({selectedPqtoNo}):
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={pqtoSearch}
                onChange={(e) => setPqtoSearch(e.target.value)}
                placeholder="Search item code..."
                className="w-full h-6 pl-6 pr-2 text-[11px] border border-[#b9c0c8] rounded-[2px] bg-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {filteredPqtoLookup.map((it) => {
              const rem = Math.max(0, it.pqtoQty - it.prOrderedQty);
              return (
                <button
                  key={it.boqItemId}
                  type="button"
                  onClick={() => copyFromPqtoItem(it)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#e7f1ff] border border-[#b9c0c8] rounded-[2px] text-[11px] text-[#1f2328] cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#0072ed]" />
                  <span className="font-mono font-semibold">{it.itemCode}</span>
                  <span className="text-[#5c646d]">({rem} {it.pqtoUom})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Code</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Assigned Location</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Remaining Qty</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Requested Qty</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">UOM</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Validation</th>
                <th className="px-2 py-1.5 font-semibold text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {draftItems.map((it, idx) => {
                const exceeds = !it.isNewItem && it.requestedQty > it.pqtoQty;
                return (
                  <tr key={it.id} className={exceeds ? 'bg-[#fce8e6]' : idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-1.5 font-mono border-r border-[#e5e8ec]">{it.itemCode}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{it.description}</td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        value={it.assignedLocation}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((row) =>
                              row.id === it.id ? { ...row, assignedLocation: e.target.value } : row
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none"
                      />
                    </td>
                    <td className="px-2.5 py-1.5 text-right text-[#5c646d] border-r border-[#e5e8ec]">
                      {it.isNewItem ? '—' : it.pqtoQty}
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        type="number"
                        value={it.requestedQty}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((row) =>
                              row.id === it.id ? { ...row, requestedQty: Number(e.target.value) } : row
                            )
                          )
                        }
                        className="w-20 ml-auto block px-2.5 py-1.5 bg-transparent text-right font-semibold text-xs focus:outline-none"
                      />
                    </td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{it.uom}</td>
                    <td className="px-2.5 py-1.5 text-[11px] border-r border-[#e5e8ec]">
                      {it.isNewItem ? (
                        <span className="font-semibold text-[#005ec4]">New Item (Approval Req)</span>
                      ) : exceeds ? (
                        <span className="font-semibold text-[#c5221f]">
                          Exceeds PQTO ({config.blockExceedPqto ? 'Blocked' : 'Warn'})
                        </span>
                      ) : (
                        <span className="text-[#137333] font-medium">OK</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => setDraftItems((prev) => prev.filter((r) => r.id !== it.id))}
                        className="text-[#6b7280] hover:text-[#d5002b] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-[#cfd5dc]">
          <AttachmentUploader
            attachments={attachments}
            required={config.attachments}
            onAdd={(file) => setAttachments((prev) => [...prev, file])}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
        </div>
      </div>

      {/* PR Register */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
          PR Register & Approval Queue
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PR No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PQTO</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Ref Doc No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Lines</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Files</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Status</th>
                <th className="px-2.5 py-1.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {prs.map((pr, idx) => (
                <tr key={pr.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{pr.prNo}</td>
                  <td className="px-2.5 py-1.5 text-[#005ec4] font-mono border-r border-[#e5e8ec]">{pr.pqtoNo}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{pr.refDocNo}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{pr.items.length}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <AttachmentCellButton
                      attachments={pr.attachments}
                      onOpen={() => setViewingAttachments({ docNo: pr.prNo, attachments: pr.attachments })}
                    />
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <StatusBadge status={pr.status} />
                  </td>
                  <td className="px-2.5 py-1.5 text-right space-x-1">
                    {pr.status === 'Pending Approval' && (
                      activeRole === 'Approver' ? (
                        <button
                          onClick={() => onApprovePr(pr.id)}
                          className="px-2 py-0.5 bg-[#137333] hover:bg-[#0f5c29] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#6b7280] font-medium">
                          Pending Approver
                        </span>
                      )
                    )}
                    {pr.status === 'Approved' && (
                      <button
                        onClick={() => onNavigateToPo(pr.prNo)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      >
                        To PO <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
