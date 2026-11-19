import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Columns,
  Copy,
  Layers,
  Plus,
  Printer,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { BoqItem } from '../types/erp';
import { ITEMIZED_FITTINGS_PRESET } from '../data/seedData';
import { StatusBadge } from './SharedUI';
import { BoqPrintModal } from './BoqPrintModal';

interface BoqModuleProps {
  items: BoqItem[];
  setItems: React.Dispatch<React.SetStateAction<BoqItem[]>>;
  boqStatus: 'Draft' | 'Posted';
  onSaveDraft: () => void;
  onPostToPqto: () => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function BoqModule({
  items,
  setItems,
  boqStatus,
  onSaveDraft,
  onPostToPqto,
  onAddLog,
}: BoqModuleProps) {
  const [arrangementMode, setArrangementMode] = useState<'boq-order' | 'master-code'>('boq-order');
  const [showCostCenter, setShowCostCenter] = useState(true);
  const [showRemarks, setShowRemarks] = useState(true);
  const [customHeaderName, setCustomHeaderName] = useState('Assigned Location');
  const [editingHeader, setEditingHeader] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const hasLegacyFittings = items.some((i) => i.isLegacyFittingsRow);

  const handleReplaceFittings = () => {
    const newItems: BoqItem[] = [];
    let lineCounter = 1;
    items.forEach((item) => {
      if (item.isLegacyFittingsRow) {
        newItems.push({
          id: `boq-ref-${Date.now()}`,
          lineNo: lineCounter++,
          itemCode: 'NOTE-FIT-00',
          description: 'Refer to the itemized fittings (Itemized below)',
          boqUom: 'lot',
          boqQty: 1,
          pqtoUom: 'PC/s',
          pqtoQty: 0,
          assignedLocation: item.assignedLocation,
          costCenter: item.costCenter,
          remarks: 'Section Header / Reference',
          isWorksRelated: true,
        });
        ITEMIZED_FITTINGS_PRESET.forEach((preset, idx) => {
          newItems.push({
            ...preset,
            id: `boq-fit-${Date.now()}-${idx}`,
            lineNo: lineCounter++,
          });
        });
      } else {
        newItems.push({ ...item, lineNo: lineCounter++ });
      }
    });
    setItems(newItems);
    onAddLog('BOQ', 'BOQ-2026-001', 'Replaced Legacy Fittings', 'Replaced "Fittings of the above" with Itemized Fittings.');
    notify('Replaced "Fittings of the above" with 5 itemized fittings rows.');
  };

  const handleCopySample = () => {
    const sampleRow: BoqItem = {
      id: `boq-${Date.now()}`,
      lineNo: items.length + 1,
      itemCode: `MAT-VLV-${Math.floor(Math.random() * 90 + 10)}`,
      description: 'Gate Valve, Flanged PN16 - 100mm',
      boqUom: 'lot',
      boqQty: 1,
      pqtoUom: 'PC/s',
      pqtoQty: 4,
      assignedLocation: 'Zone A - Pump Room',
      costCenter: 'CC-MECH-01',
      remarks: 'Copied from Sample BOQ',
    };
    setItems([...items, sampleRow]);
    notify('Copied sample BOQ line item.');
  };

  const handleUploadCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedRow: BoqItem = {
      id: `boq-up-${Date.now()}`,
      lineNo: items.length + 1,
      itemCode: 'MAT-UPL-200',
      description: `B.I. Flange Weld-Neck Sch-40 - 100mm (${file.name})`,
      boqUom: 'lot',
      boqQty: 1,
      pqtoUom: 'PC/s',
      pqtoQty: 8,
      assignedLocation: 'Zone B - Riser Shaft',
      costCenter: 'CC-MECH-02',
      remarks: 'Excel/CSV Upload',
    };
    setItems([...items, uploadedRow]);
    onAddLog('BOQ', 'BOQ-2026-001', 'BOQ Upload', `Uploaded ${file.name} into BOQ interphase.`);
    notify(`Uploaded "${file.name}".`);
    e.target.value = '';
  };

  const handleAddBlankRow = () => {
    setItems([
      ...items,
      {
        id: `boq-blank-${Date.now()}`,
        lineNo: items.length + 1,
        itemCode: '',
        description: '',
        boqUom: '',
        boqQty: 0,
        pqtoUom: '',
        pqtoQty: 0,
        assignedLocation: '',
        isBlankRow: true,
      },
    ]);
  };

  const handleAddWorksRow = () => {
    setItems([
      ...items,
      {
        id: `boq-works-${Date.now()}`,
        lineNo: items.length + 1,
        itemCode: `MAT-WRK-${items.length + 1}`,
        description: 'BOQ Works-related matters: Testing & Commissioning',
        boqUom: 'lot',
        boqQty: 1,
        pqtoUom: 'lot',
        pqtoQty: 0,
        assignedLocation: 'Site-Wide',
        costCenter: 'CC-GEN-00',
        remarks: 'No transaction processed',
        isWorksRelated: true,
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<BoqItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const displayedItems =
    arrangementMode === 'boq-order'
      ? items
      : [...items].sort((a, b) => (a.itemCode || 'ZZZ').localeCompare(b.itemCode || 'ZZZ'));

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {toast}
        </div>
      )}

      {/* SunSystems Form Container */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        {/* Form Title & Primary Action Bar */}
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              BOQ — Bill of Quantities & Master File
            </span>
            <StatusBadge status={boqStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#005ec4] text-xs font-semibold rounded-[2px] border border-[#b9c0c8] cursor-pointer"
              title="Optional PDF Printable Report for BOQ"
            >
              <Printer className="w-3.5 h-3.5" /> Print BOQ (PDF)
            </button>
            <button
              onClick={onSaveDraft}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] text-xs font-semibold rounded-[2px] border border-[#b9c0c8] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#5c646d]" /> Save as Draft
            </button>
            <button
              onClick={onPostToPqto}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              Post to PQTO <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Toolbar */}
        <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#cfd5dc] flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleCopySample}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
          >
            <Copy className="w-3 h-3 text-[#0072ed]" /> Copy Sample BOQ
          </button>

          <label className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer">
            <Upload className="w-3 h-3 text-[#137333]" /> Upload Excel/CSV
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUploadCsv} className="hidden" />
          </label>

          {hasLegacyFittings && (
            <button
              onClick={handleReplaceFittings}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#fff8e1] hover:bg-[#ffecb3] text-[#8d6e00] border border-[#ffe082] rounded-[2px] text-[11px] font-semibold cursor-pointer"
            >
              <Layers className="w-3 h-3" /> Replace "Fittings of the above"
            </button>
          )}

          <button
            onClick={handleAddBlankRow}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Blank Row
          </button>

          <button
            onClick={handleAddWorksRow}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Works-Related (No Txn)
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <div className="flex items-center border border-[#b9c0c8] rounded-[2px] overflow-hidden text-[11px]">
              <button
                onClick={() => setArrangementMode('boq-order')}
                className={`px-2 py-1 font-medium cursor-pointer ${
                  arrangementMode === 'boq-order' ? 'bg-[#0072ed] text-white' : 'bg-white text-[#1f2328]'
                }`}
              >
                BOQ Order
              </button>
              <button
                onClick={() => setArrangementMode('master-code')}
                className={`px-2 py-1 font-medium border-l border-[#b9c0c8] cursor-pointer ${
                  arrangementMode === 'master-code' ? 'bg-[#0072ed] text-white' : 'bg-white text-[#1f2328]'
                }`}
              >
                Sort Master Code
              </button>
            </div>

            <button
              onClick={() => setShowCostCenter((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] text-[#1f2328] rounded-[2px] text-[11px] font-medium cursor-pointer"
            >
              <Columns className="w-3 h-3" /> {showCostCenter ? 'Hide' : 'Unhide'} CC
            </button>
            <button
              onClick={() => setShowRemarks((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] text-[#1f2328] rounded-[2px] text-[11px] font-medium cursor-pointer"
            >
              <Columns className="w-3 h-3" /> {showRemarks ? 'Hide' : 'Unhide'} Remarks
            </button>
          </div>
        </div>

        {/* High-Density SunSystems Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-9">#</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] min-w-[130px]">Item Code</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] min-w-[250px]">Item Description</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-20">BOQ UOM</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-20 text-right">BOQ Qty</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-22 bg-[#e7f1ff] text-[#004a99]">PQTO UOM</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-22 text-right bg-[#e7f1ff] text-[#004a99]">PQTO Qty</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] min-w-[140px]">
                  {editingHeader ? (
                    <input
                      value={customHeaderName}
                      onChange={(e) => setCustomHeaderName(e.target.value)}
                      onBlur={() => setEditingHeader(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(false)}
                      autoFocus
                      className="w-full bg-white border border-[#0072ed] px-1 py-0.5 text-xs"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingHeader(true)}
                      className="hover:underline text-left font-semibold cursor-pointer"
                      title="Edit header"
                    >
                      {customHeaderName} ✎
                    </button>
                  )}
                </th>
                {showCostCenter && <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] min-w-[100px]">Cost Center</th>}
                {showRemarks && <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] min-w-[160px]">Remarks</th>}
                <th className="px-2 py-1.5 font-semibold w-10 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {displayedItems.map((item, idx) => {
                if (item.isBlankRow) {
                  return (
                    <tr key={item.id} className="bg-[#f8f9fa]">
                      <td className="px-2.5 py-1.5 text-[#6b7280] border-r border-[#e5e8ec]">{idx + 1}</td>
                      <td colSpan={8 + (showCostCenter ? 1 : 0) + (showRemarks ? 1 : 0)} className="px-2.5 py-1.5 text-[#6b7280] italic border-r border-[#e5e8ec]">
                        [Blank Line Row]
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-[#6b7280] hover:text-[#d5002b] cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={item.id}
                    className={
                      item.isWorksRelated
                        ? 'bg-[#f4f6f8] text-[#495057]'
                        : item.isLegacyFittingsRow
                        ? 'bg-[#fffbeb]'
                        : idx % 2 === 1
                        ? 'bg-[#fafbfd]'
                        : 'bg-white'
                    }
                  >
                    <td className="px-2.5 py-1 text-[#6b7280] border-r border-[#e5e8ec]">{idx + 1}</td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        value={item.itemCode}
                        onChange={(e) => updateItem(item.id, { itemCode: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-transparent font-mono text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <select
                        value={item.boqUom}
                        onChange={(e) => updateItem(item.id, { boqUom: e.target.value })}
                        className="w-full px-1.5 py-1.5 bg-transparent text-xs focus:outline-none"
                      >
                        <option value="lot">lot</option>
                        <option value="m">m</option>
                        <option value="PC/s">PC/s</option>
                      </select>
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        type="number"
                        value={item.boqQty}
                        onChange={(e) => updateItem(item.id, { boqQty: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-transparent text-right text-xs focus:outline-none"
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec] bg-[#f4f8ff]">
                      <select
                        value={item.pqtoUom}
                        onChange={(e) => updateItem(item.id, { pqtoUom: e.target.value })}
                        className="w-full px-1.5 py-1.5 bg-transparent text-xs font-medium text-[#004a99] focus:outline-none"
                      >
                        <option value="PC/s">PC/s</option>
                        <option value="lot">lot</option>
                        <option value="m">m</option>
                      </select>
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec] bg-[#f4f8ff]">
                      <input
                        type="number"
                        disabled={item.isWorksRelated}
                        value={item.pqtoQty}
                        onChange={(e) => updateItem(item.id, { pqtoQty: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-transparent text-right text-xs font-semibold text-[#004a99] focus:outline-none disabled:text-slate-400"
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        value={item.assignedLocation}
                        onChange={(e) => updateItem(item.id, { assignedLocation: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none"
                      />
                    </td>
                    {showCostCenter && (
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          value={item.costCenter || ''}
                          onChange={(e) => updateItem(item.id, { costCenter: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none"
                        />
                      </td>
                    )}
                    {showRemarks && (
                      <td className="px-2.5 py-1.5 text-[11px] border-r border-[#e5e8ec]">
                        {item.isWorksRelated ? (
                          <span className="px-1.5 py-0.5 bg-[#e9ecef] text-[#495057] font-semibold border border-[#ced4da] rounded-[2px]">
                            NO TXN
                          </span>
                        ) : (
                          <span className="text-[#5c646d]">{item.remarks || 'Active'}</span>
                        )}
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
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
      </div>

      {showPrintModal && (
        <BoqPrintModal
          items={items}
          boqStatus={boqStatus}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
