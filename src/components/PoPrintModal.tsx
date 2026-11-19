import { useState } from 'react';
import {
  FileCheck,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import type { PoRecord } from '../types/erp';

interface PoPrintModalProps {
  po: PoRecord;
  allPos?: PoRecord[];
  onSelectPo?: (po: PoRecord) => void;
  onClose: () => void;
  initialTemplate?: DocTemplate;
}

type DocTemplate = 'po' | 'acknowledgement' | 'receipt';

const getStoredPrintCount = (key: string): number => {
  try {
    return Number(localStorage.getItem(key) || '0');
  } catch {
    return 0;
  }
};

export function PoPrintModal({ po, allPos, onSelectPo, onClose, initialTemplate = 'po' }: PoPrintModalProps) {
  const [docTemplate, setDocTemplate] = useState<DocTemplate>(initialTemplate);
  const [currency, setCurrency] = useState<'GBP' | 'PHP'>('GBP');
  const [printCounts, setPrintCounts] = useState<Record<string, number>>({});
  const [generatedDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  });

  const docKey = `erp_print_count_${po.poNo}_${docTemplate}`;
  const currentPrintCount = printCounts[docKey] ?? getStoredPrintCount(docKey);
  const isCopy = currentPrintCount >= 1;
  const copyLabel = isCopy ? `COPY` : 'ORIGINAL';
  const copyNumber = currentPrintCount + 1;

  const entryDate = po.createdAt ? po.createdAt.split(' ')[0] : '11/06/2026';

  const calculateSubtotal = () => {
    return po.items.reduce((sum, it) => sum + (it.poQty * (it.unitPrice || 0)), 0);
  };

  const subtotal = calculateSubtotal();
  const vat = subtotal * 0.12;
  const grandTotal = subtotal + vat;

  const formatAmount = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
    const nextCount = currentPrintCount + 1;
    try {
      localStorage.setItem(docKey, String(nextCount));
    } catch {
      // ignore storage errors
    }
    setPrintCounts((prev) => ({ ...prev, [docKey]: nextCount }));
  };

  const handleResetOriginal = () => {
    try {
      localStorage.removeItem(docKey);
    } catch {
      // ignore storage errors
    }
    setPrintCounts((prev) => ({ ...prev, [docKey]: 0 }));
  };

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="print-modal-container bg-[#f4f6f8] rounded-[2px] shadow-2xl border border-[#8d96a0] w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto">
        
        {/* Top Control Bar (Hidden when printed) */}
        <div className="no-print flex flex-wrap items-center justify-between px-4 py-2 bg-[#23262b] text-white shrink-0 gap-2 border-b border-[#3c414a]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Infor SunSystems Document Viewer
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono text-[#4da3ff] font-semibold">{po.poNo}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'GBP' | 'PHP')}
              className="bg-[#181a1e] text-white border border-[#495057] rounded-[2px] px-2 py-1 text-xs focus:outline-none focus:border-[#0072ed] cursor-pointer"
            >
              <option value="GBP">GBP (£)</option>
              <option value="PHP">PHP (₱)</option>
            </select>

            {/* PO switcher */}
            {allPos && allPos.length > 1 && onSelectPo && (
              <select
                value={po.id}
                onChange={(e) => {
                  const found = allPos.find((p) => p.id === e.target.value);
                  if (found) onSelectPo(found);
                }}
                className="bg-[#181a1e] text-white border border-[#495057] rounded-[2px] px-2 py-1 text-xs focus:outline-none focus:border-[#0072ed] cursor-pointer"
              >
                {allPos.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                    {p.poNo}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] shadow-sm transition-colors cursor-pointer"
              title="Print Document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-[2px] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Format Tabs Strip (Visually Prominent) */}
        <div className="no-print bg-[#1a1d21] px-4 py-2 flex flex-wrap items-center justify-between border-b border-[#32363e] text-xs shrink-0 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-1">
              Select Document Form:
            </span>
            <button
              type="button"
              onClick={() => setDocTemplate('po')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-semibold text-xs transition-all cursor-pointer ${
                docTemplate === 'po'
                  ? 'bg-[#0072ed] text-white shadow-xs'
                  : 'bg-[#2b2f36] text-slate-300 hover:text-white hover:bg-[#383d46]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> 1. Purchase Order Document
            </button>
            <button
              type="button"
              onClick={() => setDocTemplate('acknowledgement')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-semibold text-xs transition-all cursor-pointer ${
                docTemplate === 'acknowledgement'
                  ? 'bg-[#0072ed] text-white shadow-xs'
                  : 'bg-[#2b2f36] text-slate-300 hover:text-white hover:bg-[#383d46]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> 2. Order Acknowledgement
            </button>
            <button
              type="button"
              onClick={() => setDocTemplate('receipt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-semibold text-xs transition-all cursor-pointer ${
                docTemplate === 'receipt'
                  ? 'bg-[#0072ed] text-white shadow-xs'
                  : 'bg-[#2b2f36] text-slate-300 hover:text-white hover:bg-[#383d46]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" /> 3. Invoice / Order Receipt
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-[2px] font-bold uppercase border ${
                isCopy
                  ? 'bg-amber-900/50 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-900/50 text-emerald-300 border-emerald-500/50'
              }`}
            >
              {isCopy ? `Copy #${copyNumber}: COPY` : '1st Print: ORIGINAL'}
            </span>
            {isCopy && (
              <button
                type="button"
                onClick={handleResetOriginal}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2b2f36] hover:bg-[#383d46] text-slate-300 hover:text-white border border-[#495057] rounded-[2px] cursor-pointer"
                title="Reset copy counter back to 1st Original"
              >
                <RotateCcw className="w-3 h-3" /> Reset Original
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Printable Paper Container */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-[#cfd5dc]">
          <div
            id="printable-po-document"
            className="relative bg-white text-black font-sans p-8 sm:p-12 shadow-md border border-[#b9c0c8] max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between text-[11px] leading-normal overflow-hidden"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {/* Diagonal Sample Data Watermark (Visible on screen and on print/PDF) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0">
              <div className="text-[64px] sm:text-[88px] font-black uppercase text-gray-200/70 -rotate-30 tracking-[0.25em] border-6 sm:border-8 border-dashed border-gray-200/70 px-8 py-3 rounded-xl print:text-gray-300 print:border-gray-300">
                SAMPLE DATA
              </div>
            </div>

            {/* Prominent Sample Data Notice Banner */}
            <div className="relative z-10 border border-red-300 bg-red-50 text-red-800 text-[10px] font-bold uppercase tracking-wider text-center py-1 px-2 rounded-[2px] mb-3 print:border-black print:bg-gray-100 print:text-black">
              *** SAMPLE DATA — FOR DEMONSTRATION &amp; TESTING PURPOSES ONLY • NON-TRANSACTIONAL ***
            </div>

            {/* ============================================================== */}
            {/* TEMPLATE 1: PURCHASE ORDER DOCUMENT (Purchase Order.pdf)     */}
            {/* ============================================================== */}
            {docTemplate === 'po' && (
              <div className="space-y-4 relative z-10">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-bold tracking-tight">PK1 WORLDWIDE</div>
                      <div className="text-[13px] font-bold flex items-center gap-2">
                        <span>Purchase Order Document</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border ${
                            isCopy
                              ? 'border-black bg-black text-white'
                              : 'border-black text-black bg-white'
                          }`}
                        >
                          {copyLabel}
                        </span>
                      </div>
                    </div>
                    <div className="border-2 border-red-600 text-red-600 px-2.5 py-0.5 font-black text-[11px] uppercase tracking-widest rounded-xs rotate-[-3deg] print:border-black print:text-black">
                      SAMPLE DATA
                    </div>
                  </div>
                  <div className="border-b border-black mt-1" />
                </div>

                {/* Top Section: Supplier Box on Left, PO Reference on Right */}
                <div className="flex justify-between items-start pt-3">
                  {/* Supplier Box */}
                  <div className="border border-black p-3 w-64 min-h-[90px] text-[11px] space-y-0.5">
                    <div className="font-semibold">{po.vendor}</div>
                    <div>Viscount Tracking</div>
                    <div>Unit 12,</div>
                    <div>Stockley Park</div>
                    <div className="pt-2 font-mono">UB8 3TH</div>
                  </div>

                  {/* Purchase Order Reference */}
                  <div className="text-right text-[11px] space-y-1">
                    <div>
                      <span className="font-bold">Purchase Order Reference: </span>
                      <span>{po.poNo}</span>
                    </div>
                    <div>
                      <span className="font-bold">Entry Date: </span>
                      <span>{entryDate}</span>
                    </div>
                  </div>
                </div>

                {/* Addresses: Invoice To / Deliver To */}
                <div className="grid grid-cols-2 gap-8 pt-2 text-[11px]">
                  <div>
                    <div className="font-bold mb-0.5">Invoice To:</div>
                    <div>PK1 Worldwide Limited</div>
                    <div>Global House</div>
                    <div>Whitewater Lane</div>
                  </div>
                  <div>
                    <div className="font-bold mb-0.5">Deliver To:</div>
                    <div>PK1 Worldwide Limited</div>
                    <div>Global House</div>
                    <div>Whitewater Lane</div>
                  </div>
                </div>

                {/* Supplier Codes & Delivery Ref */}
                <div className="grid grid-cols-2 gap-8 pt-2 text-[11px]">
                  <div className="space-y-2">
                    <div>
                      <div className="font-bold">Supplier Name:</div>
                      <div>{po.vendor}</div>
                    </div>
                    <div>
                      <div className="font-bold">Supplier Address Code:</div>
                      <div>71004</div>
                    </div>
                    <div className="pt-1">
                      <span className="font-bold">Account Code: </span>
                      <span className="ml-6 font-mono">71004</span>
                      <span className="ml-12">{po.vendor}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="font-bold">Delivery:</div>
                      <div>Central Warehouse / Site Logistics</div>
                    </div>
                    <div>
                      <div className="font-bold">Your Ref:</div>
                      <div className="font-mono">{po.refDocNo} / {po.iaas2RefNo}</div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  {/* Header Rules */}
                  <div className="border-t border-b border-black py-1">
                    <div className="grid grid-cols-12 text-[11px] font-bold">
                      <div className="col-span-2">Purchase Order Line Number</div>
                      <div className="col-span-2">Item Code</div>
                      <div className="col-span-2 text-right pr-4">Quantity</div>
                      <div className="col-span-2">Unit of Purchase</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-2 text-right">Gross Value</div>
                    </div>
                    <div className="grid grid-cols-12 text-[11px] font-bold mt-0.5">
                      <div className="col-span-2" />
                      <div className="col-span-2">Supplier Item Code</div>
                      <div className="col-span-8">Description</div>
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-gray-100 py-1">
                    {po.items.map((it, idx) => {
                      const lineGross = it.poQty * (it.unitPrice || 0);
                      return (
                        <div key={it.id || idx} className="py-2.5 text-[11px] space-y-1">
                          {/* Row Line 1 */}
                          <div className="grid grid-cols-12">
                            <div className="col-span-2 font-mono">{idx + 1}</div>
                            <div className="col-span-2 font-mono">{it.itemCode}</div>
                            <div className="col-span-2 text-right pr-4 font-mono">{it.poQty.toFixed(2)}</div>
                            <div className="col-span-2">{it.uom === 'PC/s' ? 'EACH' : it.uom}</div>
                            <div className="col-span-2 text-right font-mono whitespace-nowrap">{formatAmount(it.unitPrice || 0)} {currency}</div>
                            <div className="col-span-2 text-right font-mono whitespace-nowrap">{formatAmount(lineGross)} {currency}</div>
                          </div>

                          {/* Row Line 2: Description */}
                          <div className="grid grid-cols-12">
                            <div className="col-span-2" />
                            <div className="col-span-2 text-gray-500 font-mono">{it.itemCode}</div>
                            <div className="col-span-8">{it.description}</div>
                          </div>

                          {/* Row Line 3: Project, Dept, Tax */}
                          <div className="grid grid-cols-12 text-[10px] text-gray-700 pt-0.5">
                            <div className="col-span-2" />
                            <div className="col-span-10 space-y-0.5">
                              <div><span className="font-bold">Project: </span>PROJ-TWRB</div>
                              <div><span className="font-bold">Department: </span>{po.spName || 'MEPF-01'}</div>
                              <div><span className="font-bold">Tax: </span>V</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Order Total */}
                  <div className="border-t border-black pt-2 flex justify-end">
                    <div className="flex gap-12 font-bold text-[11px]">
                      <span>Order Total:</span>
                      <span className="font-mono">{formatAmount(subtotal)} {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TEMPLATE 2: SALES ORDER ACKNOWLEDGEMENT (Order Acknowledgement.pdf) */}
            {/* ============================================================== */}
            {docTemplate === 'acknowledgement' && (
              <div className="space-y-4 relative z-10">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-bold tracking-tight">PK1 WORLDWIDE</div>
                      <div className="text-[13px] font-bold flex items-center gap-2">
                        <span>Sales Order Acknowledgement</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border ${
                            isCopy
                              ? 'border-black bg-black text-white'
                              : 'border-black text-black bg-white'
                          }`}
                        >
                          {copyLabel}
                        </span>
                      </div>
                    </div>
                    <div className="border-2 border-red-600 text-red-600 px-2.5 py-0.5 font-black text-[11px] uppercase tracking-widest rounded-xs rotate-[-3deg] print:border-black print:text-black">
                      SAMPLE DATA
                    </div>
                  </div>
                  <div className="border-b border-black mt-1" />
                </div>

                {/* Right Metadata */}
                <div className="flex justify-end pt-2 text-[11px]">
                  <div className="space-y-0.5 text-right">
                    <div><span className="font-bold">Sales Order Reference: </span><span className="font-mono">{po.poNo}</span></div>
                    <div><span className="font-bold">Customer Name: </span><span>{po.applicant}</span></div>
                    <div><span className="font-bold">Customer Reference: </span><span className="font-mono">{po.refDocNo}</span></div>
                    <div><span className="font-bold">Order Date: </span><span>{entryDate}</span></div>
                    <div><span className="font-bold">Account Code: </span><span className="font-mono">71004</span></div>
                    <div><span className="font-bold">Entry Date: </span><span>{entryDate}</span></div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 text-[11px] pt-2">
                  <div>
                    <div className="font-bold">Acknowledgement Address:</div>
                    <div>PK1 Worldwide Limited</div>
                    <div>Global House, Whitewater Lane</div>
                  </div>
                  <div>
                    <div className="font-bold">Delivery Address:</div>
                    <div>PK1 Worldwide Limited</div>
                    <div>Global House, Whitewater Lane</div>
                  </div>
                </div>

                {/* Acknowledgement Table */}
                <div className="pt-4">
                  <div className="border-t border-b border-black py-1 text-[10px] font-bold">
                    <div className="grid grid-cols-12 gap-1">
                      <div className="col-span-1">Line Number</div>
                      <div className="col-span-2">Item Code</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-1">Contract Number</div>
                      <div className="col-span-1 text-right">quantityvalue</div>
                      <div className="col-span-1">Unit of Sale</div>
                      <div className="col-span-1 text-right">Unit Price</div>
                      <div className="col-span-1 text-right">Net Value</div>
                      <div className="col-span-1 text-right">Line Total</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 py-1">
                    {po.items.map((it, idx) => {
                      const net = it.poQty * (it.unitPrice || 0);
                      return (
                        <div key={idx} className="py-2 text-[10px] grid grid-cols-12 gap-1">
                          <div className="col-span-1 font-mono">{idx + 1}</div>
                          <div className="col-span-2 font-mono">{it.itemCode}</div>
                          <div className="col-span-3">{it.description}</div>
                          <div className="col-span-1 font-mono">-</div>
                          <div className="col-span-1 text-right font-mono">{it.poQty.toFixed(2)}</div>
                          <div className="col-span-1">{it.uom}</div>
                          <div className="col-span-1 text-right font-mono">{formatAmount(it.unitPrice || 0)}</div>
                          <div className="col-span-1 text-right font-mono">{formatAmount(net)}</div>
                          <div className="col-span-1 text-right font-mono font-semibold">{formatAmount(net)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-black pt-2 flex justify-between font-bold text-[11px]">
                    <div>Payment Terms:: Net 30 Days</div>
                    <div className="flex gap-8">
                      <span>Order Total:</span>
                      <span className="font-mono">{formatAmount(subtotal)} {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TEMPLATE 3: ORDER RECEIPT / INVOICE (Order Receipt.pdf)        */}
            {/* ============================================================== */}
            {docTemplate === 'receipt' && (
              <div className="space-y-4 relative z-10">
                {/* Header */}
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-bold tracking-tight">PK1 WORLDWIDE</span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-widest border ${
                        isCopy
                          ? 'border-black bg-black text-white'
                          : 'border-black text-black bg-white'
                      }`}
                    >
                      {copyLabel}
                    </span>
                  </div>
                  <div className="border-2 border-red-600 text-red-600 px-2 py-0.5 font-black text-[10px] uppercase tracking-widest rounded-xs rotate-[-3deg] print:border-black print:text-black">
                    SAMPLE DATA
                  </div>
                  <div className="text-[16px] font-bold">Invoice</div>
                </div>
                <div className="border-b border-black mt-0.5" />

                {/* Company Address & Date */}
                <div className="flex justify-between items-start pt-2 text-[11px]">
                  <div className="space-y-0.5">
                    <div>PK1 Worldwide Limited</div>
                    <div>Global House</div>
                    <div>Whitewater Lane</div>
                    <div>Godalming</div>
                    <div>UK</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">Date: </span>
                    <span>{entryDate}</span>
                  </div>
                </div>

                <div className="text-center font-bold text-[11px] pt-1">
                  VAT Reg. No.: GB 123 4567 89
                </div>

                {/* References & Addresses */}
                <div className="grid grid-cols-2 gap-8 pt-2 text-[11px]">
                  <div className="space-y-1">
                    <div><span className="font-bold">Order Ref: </span><span className="font-mono">{po.poNo}</span></div>
                    <div><span className="font-bold">Customer Code: </span><span className="font-mono">71004</span></div>
                    <div className="pt-1">
                      <div className="font-bold">Invoice Address:</div>
                      <div>Central Accounts Dept.</div>
                      <div>Global House, Whitewater Lane</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div><span className="font-bold">Customer Reference: </span><span className="font-mono">{po.refDocNo}</span></div>
                    <div className="pt-4">
                      <div className="font-bold">Delivery Address:</div>
                      <div>Project Site Warehouse</div>
                      <div>Central Receiving Bay</div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="pt-2">
                  <div className="border-t border-b border-black py-1 text-[10px] font-bold">
                    <div className="grid grid-cols-12 gap-1">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">Item Code</div>
                      <div className="col-span-1 text-right">Quantity</div>
                      <div className="col-span-1">Unit of Sale</div>
                      <div className="col-span-2 text-right">Unit Price</div>
                      <div className="col-span-1 text-right">Discount</div>
                      <div className="col-span-1 text-right">Net Value</div>
                      <div className="col-span-1 text-right">Tax</div>
                      <div className="col-span-1 text-right">Gross</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 py-1">
                    {po.items.map((it, idx) => {
                      const net = it.poQty * (it.unitPrice || 0);
                      const tax = net * 0.12;
                      const gross = net + tax;
                      return (
                        <div key={idx} className="py-2 text-[10px] grid grid-cols-12 gap-1">
                          <div className="col-span-1 font-mono">{idx + 1}</div>
                          <div className="col-span-3 font-mono">{it.itemCode}</div>
                          <div className="col-span-1 text-right font-mono">{it.poQty.toFixed(2)}</div>
                          <div className="col-span-1">{it.uom}</div>
                          <div className="col-span-2 text-right font-mono">{formatAmount(it.unitPrice || 0)}</div>
                          <div className="col-span-1 text-right font-mono">0.00</div>
                          <div className="col-span-1 text-right font-mono">{formatAmount(net)}</div>
                          <div className="col-span-1 text-right font-mono">{formatAmount(tax)}</div>
                          <div className="col-span-1 text-right font-mono font-semibold">{formatAmount(gross)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-black pt-2 flex justify-between font-bold text-[11px]">
                    <div>Total for Invoice:</div>
                    <div className="flex gap-8 font-mono">
                      <span>{formatAmount(subtotal)}</span>
                      <span>{formatAmount(vat)}</span>
                      <span>{formatAmount(grandTotal)} {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Footer Section (Matches SunSystems reference exact footer) */}
            <div className="pt-8 mt-auto print-avoid-break relative z-10">
              <div className="border-b border-black mb-1" />
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span>Page Total:</span>
                <span className="font-mono">{formatAmount(subtotal)} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-700 pt-3">
                <span>{generatedDate} • DEMO SAMPLE DATA • {isCopy ? `COPY (#${copyNumber})` : 'ORIGINAL'}</span>
                <span>Page: 1/1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
