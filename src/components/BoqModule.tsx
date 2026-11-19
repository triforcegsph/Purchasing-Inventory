import React, { useState } from 'react';
import type { UserRole } from '../types/erp';
import {
  ArrowRight,
  CheckCircle2,
  Columns,
  Copy,
  Download,
  FileText,
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
  activeRole?: UserRole;
}

export function BoqModule({
  items,
  setItems,
  boqStatus,
  onSaveDraft,
  onPostToPqto,
  onAddLog,
  activeRole,
}: BoqModuleProps) {
  const canEdit = activeRole !== 'Applicant/Requestor' && activeRole !== undefined;
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

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      notify('Excel files must be saved as CSV first. In Excel: File → Save As → CSV (Comma delimited).');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        notify('CSV file is empty or has only a header row.');
        e.target.value = '';
        return;
      }

      const parseRow = (row: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const col = (candidates: string[]) => {
        for (const c of candidates) {
          const idx = headers.indexOf(c);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const ci = col(['itemcode', 'code', 'item']);
      const cd = col(['description', 'desc', 'itemdescription']);
      const cbu = col(['boquom', 'boqunit', 'uom']);
      const cbq = col(['boqqty', 'boqquantity', 'qty']);
      const cpu = col(['pqtouom', 'pqtounit', 'pquom']);
      const cpq = col(['pqtoqty', 'pqtoquantity']);
      const cl = col(['assignedlocation', 'location', 'zone', 'area']);
      const cc = col(['costcenter', 'cost', 'cc']);
      const cr = col(['remarks', 'notes', 'note']);

      const newItems: BoqItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseRow(lines[i]);
        if (cells.every((c) => !c)) continue;

        const itemCode = ci >= 0 ? cells[ci] || '' : cells[0] || '';
        const description = cd >= 0 ? cells[cd] || '' : cells[1] || '';
        if (!itemCode && !description) continue;

        const boqUomRaw = cbu >= 0 ? cells[cbu] : cells[2] || '';
        const boqUom = ['lot', 'm', 'PC/s'].includes(boqUomRaw) ? boqUomRaw : 'lot';
        const boqQty = Number(cbq >= 0 ? cells[cbq] : cells[3]) || 1;
        const pqtoUomRaw = cpu >= 0 ? cells[cpu] : cells[4] || '';
        const pqtoUom = ['PC/s', 'lot', 'm'].includes(pqtoUomRaw) ? pqtoUomRaw : 'PC/s';
        const pqtoQty = Number(cpq >= 0 ? cells[cpq] : cells[5]) || 0;
        const assignedLocation = cl >= 0 ? cells[cl] || '' : cells[6] || '';
        const costCenter = cc >= 0 ? cells[cc] || '' : cells[7] || '';
        const remarks = cr >= 0 ? cells[cr] || '' : cells[8] || '';

        newItems.push({
          id: `boq-csv-${Date.now()}-${i}`,
          lineNo: items.length + newItems.length + 1,
          itemCode,
          description,
          boqUom,
          boqQty,
          pqtoUom,
          pqtoQty,
          assignedLocation,
          ...(costCenter ? { costCenter } : {}),
          ...(remarks ? { remarks } : {}),
        });
      }

      if (newItems.length === 0) {
        notify('No valid rows found in the CSV. Download the template to check the format.');
        e.target.value = '';
        return;
      }

      setItems((prev) => [...prev, ...newItems]);
      onAddLog('BOQ', 'BOQ-2026-001', 'BOQ Upload', `Imported ${newItems.length} item(s) from ${file.name}.`);
      notify(`Imported ${newItems.length} item(s) from "${file.name}".`);
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleAddMaterialRow = () => {
    setItems([
      ...items,
      {
        id: `boq-mat-${Date.now()}`,
        lineNo: items.length + 1,
        itemCode: '',
        description: '',
        boqUom: 'PC/s',
        boqQty: 1,
        pqtoUom: 'PC/s',
        pqtoQty: 1,
        assignedLocation: '',
      },
    ]);
  };

  const handleDownloadTemplate = () => {
    const header = 'itemCode,description,boqUom,boqQty,pqtoUom,pqtoQty,assignedLocation,costCenter,remarks';
    const sample = 'MAT-VLV-01,"Gate Valve, Flanged PN16 - 100mm",PC/s,4,PC/s,4,Zone A - Pump Room,CC-MECH-01,Sample Item';
    const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BOQ_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
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
            {canEdit && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Secondary Toolbar */}
        <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#cfd5dc] flex flex-wrap items-center gap-1.5">
          {canEdit && (
            <>
              <button
                onClick={handleCopySample}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
              >
                <Copy className="w-3 h-3 text-[#0072ed]" /> Insert Sample Item
              </button>

              <label className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer">
                <Upload className="w-3 h-3 text-[#137333]" /> Upload CSV
                <input type="file" accept=".csv" onChange={handleUploadCsv} className="hidden" />
              </label>

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
                title="Download a sample CSV template to fill in your materials list"
              >
                <Download className="w-3 h-3 text-[#137333]" /> Download CSV Template
              </button>

              <button
                onClick={handleAddMaterialRow}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#e7f1ff] hover:bg-[#d0e6ff] text-[#004a99] border border-[#b3d1ff] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                title="Add a blank material row to fill in manually"
              >
                <FileText className="w-3 h-3" /> Add Material Item
              </button>
            </>
          )}

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
            <Plus className="w-3 h-3" /> Spacer Row
          </button>

          <button
            onClick={handleAddWorksRow}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-medium cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Non-Transactional Item
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
                Sort by Item Code
              </button>
            </div>

            <button
              onClick={() => setShowCostCenter((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] text-[#1f2328] rounded-[2px] text-[11px] font-medium cursor-pointer"
            >
              <Columns className="w-3 h-3" /> {showCostCenter ? 'Hide' : 'Show'} Cost Center
            </button>
            <button
              onClick={() => setShowRemarks((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] text-[#1f2328] rounded-[2px] text-[11px] font-medium cursor-pointer"
            >
              <Columns className="w-3 h-3" /> {showRemarks ? 'Hide' : 'Show'} Remarks
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
                <th className="px-2 py-1.5 font-semibold w-12 text-center">Action</th>
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
                        {canEdit && (
                          <button onClick={() => removeItem(item.id)} className="text-[#6b7280] hover:text-[#d5002b] cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                        readOnly={!canEdit}
                        value={item.itemCode}
                        onChange={(e) => canEdit && updateItem(item.id, { itemCode: e.target.value })}
                        className={`w-full px-2.5 py-1.5 bg-transparent font-mono text-xs focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        readOnly={!canEdit}
                        value={item.description}
                        onChange={(e) => canEdit && updateItem(item.id, { description: e.target.value })}
                        className={`w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <select
                        disabled={!canEdit}
                        value={item.boqUom}
                        onChange={(e) => updateItem(item.id, { boqUom: e.target.value })}
                        className="w-full px-1.5 py-1.5 bg-transparent text-xs focus:outline-none disabled:cursor-default disabled:appearance-none"
                      >
                        <option value="lot">lot</option>
                        <option value="m">m</option>
                        <option value="PC/s">PC/s</option>
                      </select>
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        type="number"
                        readOnly={!canEdit}
                        value={item.boqQty}
                        onChange={(e) => canEdit && updateItem(item.id, { boqQty: Number(e.target.value) })}
                        className={`w-full px-2.5 py-1.5 bg-transparent text-right text-xs focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec] bg-[#f4f8ff]">
                      <select
                        disabled={!canEdit}
                        value={item.pqtoUom}
                        onChange={(e) => updateItem(item.id, { pqtoUom: e.target.value })}
                        className="w-full px-1.5 py-1.5 bg-transparent text-xs font-medium text-[#004a99] focus:outline-none disabled:cursor-default disabled:appearance-none"
                      >
                        <option value="PC/s">PC/s</option>
                        <option value="lot">lot</option>
                        <option value="m">m</option>
                      </select>
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec] bg-[#f4f8ff]">
                      <input
                        type="number"
                        disabled={!canEdit || item.isWorksRelated}
                        value={item.pqtoQty}
                        onChange={(e) => updateItem(item.id, { pqtoQty: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-transparent text-right text-xs font-semibold text-[#004a99] focus:outline-none disabled:text-slate-400 disabled:cursor-default"
                      />
                    </td>
                    <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                      <input
                        readOnly={!canEdit}
                        value={item.assignedLocation}
                        onChange={(e) => canEdit && updateItem(item.id, { assignedLocation: e.target.value })}
                        className={`w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
                      />
                    </td>
                    {showCostCenter && (
                      <td className="p-0 excel-cell border-r border-[#e5e8ec]">
                        <input
                          readOnly={!canEdit}
                          value={item.costCenter || ''}
                          onChange={(e) => canEdit && updateItem(item.id, { costCenter: e.target.value })}
                          className={`w-full px-2.5 py-1.5 bg-transparent text-xs focus:outline-none ${!canEdit ? 'cursor-default' : ''}`}
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
                      {canEdit && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-[#6b7280] hover:text-[#d5002b] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
