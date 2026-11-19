import { useState } from 'react';
import {
  AlertTriangle,
  FilePlus2,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type {
  FileAttachment,
  PqtoRecord,
  PrLineItem,
  PrRecord,
  RequiredFieldConfig,
  StockTransferRecord,
  WarehouseStock,
  WithdrawalRecord,
} from '../types/erp';
import { AttachmentUploader } from './SharedUI';

type UserRole = 'Applicant' | 'Approver' | 'Warehouse Admin';
type RequestType = 'PR' | 'ISS' | 'STR';

interface NewRequestModalProps {
  activeRole: UserRole;
  businessUnit: string;
  pqtos: PqtoRecord[];
  stock: WarehouseStock[];
  config: RequiredFieldConfig;
  onSubmitPr: (pr: PrRecord) => void;
  onSubmitWithdrawal: (wd: WithdrawalRecord) => void;
  onSubmitTransfer: (tr: StockTransferRecord) => void;
  onClose: () => void;
}

interface RequestDraftRow {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  qty: number;
  assignedLocation: string;
  pqtoQty: number;
  isNewItem: boolean;
}

const ROLE_FORM_CONFIG: Record<
  UserRole,
  {
    title: string;
    defaultRequester: string;
    defaultType: RequestType;
    allowedTypes: RequestType[];
    roleLabel: string;
  }
> = {
  Applicant: {
    title: 'Site Engineer (Applicant) — Material Request Form',
    defaultRequester: 'Engr. John Doe',
    defaultType: 'PR',
    allowedTypes: ['PR', 'ISS'],
    roleLabel: 'Site Engineer Form',
  },
  Approver: {
    title: 'Project Manager (Approver) — Direct Request Form',
    defaultRequester: 'Dir. Jane Doe',
    defaultType: 'PR',
    allowedTypes: ['PR', 'ISS'],
    roleLabel: 'Project Manager Form',
  },
  'Warehouse Admin': {
    title: 'Site Warehouseman — Warehouse & Stock Request Form',
    defaultRequester: 'Warehouse Admin',
    defaultType: 'ISS',
    allowedTypes: ['ISS', 'PR', 'STR'],
    roleLabel: 'Warehouse Admin Form',
  },
};

export function NewRequestModal({
  activeRole,
  businessUnit,
  pqtos,
  stock,
  config,
  onSubmitPr,
  onSubmitWithdrawal,
  onSubmitTransfer,
  onClose,
}: NewRequestModalProps) {
  const roleCfg = ROLE_FORM_CONFIG[activeRole];

  const [requestType, setRequestType] = useState<RequestType>(roleCfg.defaultType);
  const [requester, setRequester] = useState(roleCfg.defaultRequester);
  const [jobNo, setJobNo] = useState(businessUnit === 'PROJ-CIVIL1' ? 'JOB-CIV-2026-01' : 'JOB-2026-884');
  const [selectedPqtoNo, setSelectedPqtoNo] = useState(pqtos[0]?.pqtoNo || '');
  const [refDocNo, setRefDocNo] = useState(() => `REF-REQ-${Math.floor(Math.random() * 900 + 100)}`);
  const [spName, setSpName] = useState('SP-MECH-ALPHA');
  const [remarks, setRemarks] = useState('');
  const [autoApprove, setAutoApprove] = useState(activeRole === 'Approver');
  const [transferType, setTransferType] = useState<'Stock Transfer' | 'Excess Return to Warehouse'>('Excess Return to Warehouse');
  const [fromLocation, setFromLocation] = useState('Zone A - Pump Room');
  const [toLocation, setToLocation] = useState('Central Warehouse');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<RequestDraftRow[]>([
    {
      id: `req-row-1`,
      itemCode: stock[0]?.itemCode || 'MAT-PIP-100-40',
      description: stock[0]?.description || 'B.I. Pipe Sch-40, Seamless - 100mm (6m/length)',
      uom: stock[0]?.uom || 'PC/s',
      qty: 2,
      assignedLocation: stock[0]?.assignedLocation || 'Bldg B - B2 Pump Room',
      pqtoQty: 20,
      isNewItem: false,
    },
  ]);

  const activePqto = pqtos.find((p) => p.pqtoNo === selectedPqtoNo) || pqtos[0];

  const handleAddBlankRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `req-row-${Date.now()}`,
        itemCode: '',
        description: '',
        uom: 'PC/s',
        qty: 1,
        assignedLocation: 'Site-Wide',
        pqtoQty: 0,
        isNewItem: true,
      },
    ]);
  };

  const handlePickFromCatalog = (rowId: string, itemCode: string) => {
    const pqtoMatch = activePqto?.items.find((i) => i.itemCode === itemCode);
    const stockMatch = stock.find((s) => s.itemCode === itemCode);
    if (!pqtoMatch && !stockMatch) return;

    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              itemCode,
              description: pqtoMatch?.description || stockMatch?.description || '',
              uom: pqtoMatch?.pqtoUom || stockMatch?.uom || 'PC/s',
              assignedLocation: pqtoMatch?.assignedLocation || stockMatch?.assignedLocation || 'Site-Wide',
              pqtoQty: pqtoMatch ? Math.max(0, pqtoMatch.pqtoQty - pqtoMatch.prOrderedQty) : 0,
              isNewItem: !pqtoMatch,
            }
      )
    );
  };

  const updateRow = (rowId: string, patch: Partial<RequestDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleSubmit = (asDraft: boolean) => {
    setErrorMsg(null);
    if (!requester.trim()) {
      setErrorMsg('Requester name is required.');
      return;
    }
    if (rows.length === 0) {
      setErrorMsg('Please add at least one item row.');
      return;
    }
    const invalidRow = rows.find((r) => !r.itemCode.trim() || !r.description.trim() || r.qty <= 0);
    if (invalidRow) {
      setErrorMsg('All line items must have an Item Code, Description, and Quantity > 0.');
      return;
    }

    if (requestType !== 'STR' && !asDraft && config.attachments && attachments.length === 0) {
      setErrorMsg('At least 1 attachment is required (use + PDF or + JPG for quick testing).');
      return;
    }

    if (requestType === 'PR') {
      if (!asDraft && config.refDocNo && !refDocNo.trim()) {
        setErrorMsg('Reference Document No. is required.');
        return;
      }

      if (!asDraft && config.blockExceedPqto) {
        const exceeded = rows.find((r) => !r.isNewItem && r.pqtoQty > 0 && r.qty > r.pqtoQty);
        if (exceeded) {
          setErrorMsg(
            `Blocked: Requested qty (${exceeded.qty}) for ${exceeded.itemCode} exceeds PQTO remaining (${exceeded.pqtoQty}).`
          );
          return;
        }
      }

      const prNo = `PR-2026-${Math.floor(Math.random() * 800 + 200)}`;
      const items: PrLineItem[] = rows.map((r) => ({
        id: `pr-li-${Date.now()}-${r.id}`,
        itemCode: r.itemCode.trim(),
        description: r.description.trim(),
        uom: r.uom.trim() || 'PC/s',
        pqtoQty: r.pqtoQty,
        requestedQty: r.qty,
        assignedLocation: r.assignedLocation.trim() || 'Site-Wide',
        isNewItem: r.isNewItem,
        systemAssignedCode: r.isNewItem ? r.itemCode.trim() : undefined,
      }));

      const newPr: PrRecord = {
        id: `pr-${Date.now()}`,
        prNo,
        pqtoNo: activePqto?.pqtoNo || selectedPqtoNo || 'PQTO-2026-001',
        refDocNo: refDocNo.trim(),
        jobNo: jobNo.trim(),
        applicant: requester.trim(),
        spName: spName.trim(),
        status: asDraft ? 'Draft' : activeRole === 'Approver' && autoApprove ? 'Approved' : 'Pending Approval',
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        attachments,
        items,
        requiresBoqApproval: items.some((i) => i.isNewItem),
      };

      onSubmitPr(newPr);
      onClose();
      return;
    }

    if (requestType === 'STR') {
      const firstRow = rows[0];
      const tr: StockTransferRecord = {
        id: `tr-${Date.now()}`,
        transferNo: `TR-2026-${Math.floor(Math.random() * 800 + 100)}`,
        type: transferType,
        fromLocation: fromLocation.trim() || 'Zone A - Pump Room',
        toLocation: transferType === 'Excess Return to Warehouse' ? 'Central Warehouse' : toLocation.trim(),
        itemCode: firstRow.itemCode.trim(),
        description: firstRow.description.trim(),
        qty: firstRow.qty,
        uom: firstRow.uom.trim() || 'PC/s',
        reason: remarks.trim() || `${transferType} requested by ${requester}`,
        performedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      onSubmitTransfer(tr);
      onClose();
      return;
    }

    // Material Withdrawal / Issuance Request (ISS)
    const firstRow = rows[0];
    const matchedStock = stock.find((s) => s.itemCode === firstRow.itemCode);
    const availableAtRequest = matchedStock ? matchedStock.availableStock : 0;
    const hasStock = availableAtRequest >= firstRow.qty;
    const wdNo = `WD-2026-${Math.floor(Math.random() * 500 + 310)}`;

    const newWd: WithdrawalRecord = {
      id: `wd-${Date.now()}`,
      wdNo,
      systemTag: matchedStock?.systemTag || 'MEPF - Chilled Water',
      jobNo: jobNo.trim(),
      requestedBy: requester.trim(),
      spName: spName.trim(),
      performedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: hasStock ? 'With Stock' : 'Without Stock',
      attachments,
      items: rows.map((r) => {
        const st = stock.find((s) => s.itemCode === r.itemCode);
        return {
          itemCode: r.itemCode.trim(),
          description: r.description.trim(),
          uom: r.uom.trim() || 'PC/s',
          availableAtRequest: st ? st.availableStock : 0,
          requestedQty: r.qty,
          assignedLocation: r.assignedLocation.trim() || 'Site-Wide',
        };
      }),
    };

    onSubmitWithdrawal(newWd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2px] shadow-2xl border border-[#8d96a0] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#23262b] text-white shrink-0">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-4 h-4 text-[#4da3ff]" />
            <span className="text-xs font-bold uppercase tracking-wide">
              {roleCfg.title}
            </span>
            <span className="text-[10px] font-mono bg-[#181a1e] border border-[#3c414a] px-2 py-0.5 rounded-[2px] text-slate-300">
              {businessUnit}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {errorMsg && (
            <div className="bg-[#fce8e6] border border-[#f6aea9] text-[#c5221f] px-3 py-2 rounded-[2px] text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Role-Specific Request Type Switcher */}
          <div className="flex border border-[#b9c0c8] rounded-[2px] overflow-hidden">
            {roleCfg.allowedTypes.includes('PR') && (
              <button
                type="button"
                onClick={() => setRequestType('PR')}
                className={`flex-1 py-2 font-semibold text-xs cursor-pointer ${
                  requestType === 'PR'
                    ? 'bg-[#0072ed] text-white'
                    : 'bg-[#f8f9fa] text-[#1f2328] hover:bg-[#eef0f3]'
                }`}
              >
                {activeRole === 'Warehouse Admin'
                  ? 'Stock Replenishment Request (PRQ)'
                  : 'Purchase Requisition (PRQ)'}
              </button>
            )}
            {roleCfg.allowedTypes.includes('ISS') && (
              <button
                type="button"
                onClick={() => setRequestType('ISS')}
                className={`flex-1 py-2 font-semibold text-xs border-l border-[#b9c0c8] cursor-pointer ${
                  requestType === 'ISS'
                    ? 'bg-[#137333] text-white'
                    : 'bg-[#f8f9fa] text-[#1f2328] hover:bg-[#eef0f3]'
                }`}
              >
                Material Withdrawal / Issuance (ISS)
              </button>
            )}
            {roleCfg.allowedTypes.includes('STR') && (
              <button
                type="button"
                onClick={() => setRequestType('STR')}
                className={`flex-1 py-2 font-semibold text-xs border-l border-[#b9c0c8] cursor-pointer ${
                  requestType === 'STR'
                    ? 'bg-[#23262b] text-white'
                    : 'bg-[#f8f9fa] text-[#1f2328] hover:bg-[#eef0f3]'
                }`}
              >
                Stock Transfer / Excess Return (STR)
              </button>
            )}
          </div>

          {/* Form Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-[#fafbfd] p-3 border border-[#cfd5dc] rounded-[2px]">
            <div>
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                Requester ({activeRole}) <span className="text-[#d5002b]">*</span>
              </label>
              <input
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                Job / Project No. <span className="text-[#d5002b]">*</span>
              </label>
              <input
                value={jobNo}
                onChange={(e) => setJobNo(e.target.value)}
                className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                SP Name / Cost Code
              </label>
              <input
                value={spName}
                onChange={(e) => setSpName(e.target.value)}
                className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
              />
            </div>

            {requestType === 'PR' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Linked PQTO
                  </label>
                  <select
                    value={activePqto?.pqtoNo || ''}
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
                    Reference Doc No. {config.refDocNo && <span className="text-[#d5002b]">*</span>}
                  </label>
                  <input
                    value={refDocNo}
                    onChange={(e) => setRefDocNo(e.target.value)}
                    className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
                  />
                </div>
              </>
            )}

            {requestType === 'STR' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Transfer Type
                  </label>
                  <select
                    value={transferType}
                    onChange={(e) => {
                      const val = e.target.value as 'Stock Transfer' | 'Excess Return to Warehouse';
                      setTransferType(val);
                      if (val === 'Excess Return to Warehouse') setToLocation('Central Warehouse');
                    }}
                    className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
                  >
                    <option value="Excess Return to Warehouse">Excess Return to Warehouse</option>
                    <option value="Stock Transfer">Site-to-Site Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    From Location &rarr; To Location
                  </label>
                  <div className="flex gap-1">
                    <input
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="w-1/2 h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
                    />
                    <input
                      value={transferType === 'Excess Return to Warehouse' ? 'Central Warehouse' : toLocation}
                      disabled={transferType === 'Excess Return to Warehouse'}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="w-1/2 h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white disabled:bg-[#f1f3f5]"
                    />
                  </div>
                </div>
              </>
            )}

            <div className={requestType === 'ISS' ? 'sm:col-span-2 lg:col-span-3' : ''}>
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                Purpose / Remarks
              </label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional site notes or delivery urgency..."
                className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
              />
            </div>

            {activeRole === 'Approver' && requestType === 'PR' && (
              <div className="sm:col-span-2 lg:col-span-3 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#137333]">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#137333]"
                  />
                  Auto-Approve immediately as Project Manager (ready for PO conversion)
                </label>
              </div>
            )}
          </div>

          {/* Requested Items Table */}
          <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#2d3339]">
                Requested Items ({rows.length})
              </span>
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#005ec4] cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2] w-40">Quick Pick</th>
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2] w-32">Item Code</th>
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2] w-36">Location</th>
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2] w-20 text-right">Qty</th>
                    <th className="px-2 py-1.5 font-semibold border-r border-[#d5dbe2] w-20">UOM</th>
                    <th className="px-2 py-1.5 font-semibold text-center w-10">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5dbe2]">
                  {rows.map((r) => (
                    <tr key={r.id} className="bg-white">
                      <td className="p-1 border-r border-[#e5e8ec]">
                        <select
                          value=""
                          onChange={(e) => handlePickFromCatalog(r.id, e.target.value)}
                          className="w-full h-6 text-[11px] border border-[#cfd5dc] rounded-[2px] px-1 bg-[#fafbfd]"
                        >
                          <option value="">-- Pick Item --</option>
                          {stock.map((s) => (
                            <option key={s.id} value={s.itemCode}>
                              {s.itemCode} (Stock: {s.availableStock})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          value={r.itemCode}
                          onChange={(e) => updateRow(r.id, { itemCode: e.target.value })}
                          placeholder="MAT-..."
                          className="w-full px-2 py-1.5 font-mono text-xs bg-transparent focus:outline-none"
                        />
                      </td>
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          value={r.description}
                          onChange={(e) => updateRow(r.id, { description: e.target.value })}
                          placeholder="Item description..."
                          className="w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none"
                        />
                      </td>
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          value={r.assignedLocation}
                          onChange={(e) => updateRow(r.id, { assignedLocation: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none"
                        />
                      </td>
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          type="number"
                          min={1}
                          value={r.qty}
                          onChange={(e) => updateRow(r.id, { qty: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 text-right font-semibold text-xs bg-transparent focus:outline-none"
                        />
                      </td>
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          value={r.uom}
                          onChange={(e) => updateRow(r.id, { uom: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="text-[#6b7280] hover:text-[#d5002b] cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attachments */}
          {requestType !== 'STR' && (
            <AttachmentUploader
              attachments={attachments}
              required={config.attachments}
              label="Supporting Documents (PDF, JPG, etc.)"
              onAdd={(f) => setAttachments((prev) => [...prev, f])}
              onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            />
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-4 py-2.5 bg-[#f4f6f8] border-t border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-mono text-[#5c646d]">
            Active Form: {roleCfg.roleLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#1f2328] bg-white border border-[#b9c0c8] hover:bg-[#eef0f3] rounded-[2px] cursor-pointer"
            >
              Cancel
            </button>
            {requestType === 'PR' && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-3 py-1.5 text-xs font-semibold text-[#1f2328] bg-white border border-[#b9c0c8] hover:bg-[#eef0f3] rounded-[2px] cursor-pointer"
              >
                Save as Draft
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-[2px] cursor-pointer ${
                requestType === 'PR'
                  ? 'bg-[#0072ed] hover:bg-[#005ec4]'
                  : requestType === 'ISS'
                  ? 'bg-[#137333] hover:bg-[#0f5c29]'
                  : 'bg-[#23262b] hover:bg-[#181a1e]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {requestType === 'PR'
                ? activeRole === 'Approver' && autoApprove
                  ? 'Submit & Approve PR'
                  : 'Submit Purchase Request'
                : requestType === 'ISS'
                ? 'Submit Material Withdrawal'
                : 'Submit Stock Transfer / Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
