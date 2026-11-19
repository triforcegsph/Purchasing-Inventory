import { useState } from 'react';
import {
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import type { BoqItem } from '../types/erp';

interface BoqPrintModalProps {
  items: BoqItem[];
  boqStatus: 'Draft' | 'Posted';
  onClose: () => void;
}

const BOQ_PRINT_KEY = 'erp_print_count_BOQ-2026-001';

const getStoredBoqPrintCount = (): number => {
  try {
    return Number(localStorage.getItem(BOQ_PRINT_KEY) || '0');
  } catch {
    return 0;
  }
};

export function BoqPrintModal({ items, boqStatus, onClose }: BoqPrintModalProps) {
  const [printCount, setPrintCount] = useState<number>(() => getStoredBoqPrintCount());
  const [generatedDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  });

  const isCopy = printCount >= 1;
  const copyLabel = isCopy ? 'COPY' : 'ORIGINAL';
  const copyNumber = printCount + 1;

  const transactionalItems = items.filter((i) => !i.isBlankRow && !i.isWorksRelated && i.itemCode.trim() !== '');
  const worksRelatedItems = items.filter((i) => i.isWorksRelated);

  const handlePrint = () => {
    window.print();
    const nextCount = printCount + 1;
    try {
      localStorage.setItem(BOQ_PRINT_KEY, String(nextCount));
    } catch {
      // ignore storage errors
    }
    setPrintCount(nextCount);
  };

  const handleResetOriginal = () => {
    try {
      localStorage.removeItem(BOQ_PRINT_KEY);
    } catch {
      // ignore storage errors
    }
    setPrintCount(0);
  };

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="print-modal-container bg-[#f4f6f8] rounded-[2px] shadow-2xl border border-[#8d96a0] w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto">
        
        {/* Top Control Bar (Hidden when printed) */}
        <div className="no-print flex flex-wrap items-center justify-between px-4 py-2 bg-[#23262b] text-white shrink-0 gap-2 border-b border-[#3c414a]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Bill of Quantities (BOQ) Document Viewer
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-mono text-[#4da3ff] font-semibold">BOQ-2026-001</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-[2px] text-[11px] font-mono font-bold uppercase border ${
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
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#2b2f36] hover:bg-[#383d46] text-slate-300 hover:text-white border border-[#495057] rounded-[2px] text-xs cursor-pointer"
                title="Reset copy counter back to 1st Original"
              >
                <RotateCcw className="w-3 h-3" /> Reset Original
              </button>
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

            {/* Document Content */}
            <div className="space-y-4 relative z-10">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-bold tracking-tight">TRIFORCE GLOBAL SOLUTIONS (TRIFORCEGS)</div>
                    <div className="text-[13px] font-bold flex items-center gap-2">
                      <span>Bill of Quantities (BOQ) Specification</span>
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

              {/* Project & Document References */}
              <div className="grid grid-cols-2 gap-8 text-[11px] pt-1">
                <div className="space-y-1">
                  <div><span className="font-bold">Project Name: </span><span>PROJ-TWRB (Tower B High-Rise Development)</span></div>
                  <div><span className="font-bold">Job Reference: </span><span className="font-mono">JOB-2026-884</span></div>
                  <div><span className="font-bold">Discipline: </span><span>Mechanical, Electrical &amp; Structural Works</span></div>
                </div>
                <div className="space-y-1 text-right">
                  <div><span className="font-bold">Document No: </span><span className="font-mono">BOQ-2026-001</span></div>
                  <div><span className="font-bold">Status: </span><span className="font-semibold uppercase">{boqStatus}</span></div>
                  <div><span className="font-bold">Date Generated: </span><span>{generatedDate.split(' ')[0]}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <div className="border-t border-b border-black py-1 text-[10px] font-bold">
                  <div className="grid grid-cols-12 gap-1">
                    <div className="col-span-1">Line #</div>
                    <div className="col-span-2">Item Code</div>
                    <div className="col-span-4">Description &amp; Specification</div>
                    <div className="col-span-1 text-right">BOQ Qty</div>
                    <div className="col-span-1">BOQ UOM</div>
                    <div className="col-span-1 text-right">PQTO Qty</div>
                    <div className="col-span-2">Assigned Location</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 py-1">
                  {items.map((it, idx) => {
                    if (it.isBlankRow) {
                      return (
                        <div key={it.id || idx} className="py-1 text-[10px] text-gray-400 italic">
                          [Empty Line - Structural Spacer]
                        </div>
                      );
                    }
                    return (
                      <div key={it.id || idx} className={`py-1.5 text-[10px] grid grid-cols-12 gap-1 ${it.isWorksRelated ? 'bg-amber-50/50' : ''}`}>
                        <div className="col-span-1 font-mono text-gray-600">{it.lineNo || idx + 1}</div>
                        <div className="col-span-2 font-mono font-semibold">{it.itemCode}</div>
                        <div className="col-span-4">
                          <div className="font-medium">{it.description}</div>
                          {it.remarks && <div className="text-[9px] text-gray-500 italic">• {it.remarks}</div>}
                          {it.isWorksRelated && <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-800 px-1 rounded-xs font-semibold">Works-related (Excluded from PO)</span>}
                        </div>
                        <div className="col-span-1 text-right font-mono">{it.boqQty}</div>
                        <div className="col-span-1 text-gray-600">{it.boqUom}</div>
                        <div className="col-span-1 text-right font-mono font-semibold">{it.pqtoQty}</div>
                        <div className="col-span-2 text-gray-700">{it.assignedLocation || 'Site-Wide'}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Summary Line */}
                <div className="border-t border-black pt-2 flex flex-wrap justify-between font-bold text-[11px]">
                  <div>Total BOQ Rows: {items.length}</div>
                  <div className="flex gap-6">
                    <span className="text-[#005ec4]">Transactional Items for PR/PO: {transactionalItems.length}</span>
                    <span className="text-gray-500">Non-Transactional (Works): {worksRelatedItems.length}</span>
                  </div>
                </div>
              </div>

              {/* Sign-Off Block */}
              <div className="pt-8 grid grid-cols-3 gap-6 border-t border-black text-xs print-avoid-break">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Prepared By</div>
                  <div className="border-b border-black pb-1">
                    <div className="font-bold">Engr. John Doe</div>
                    <div className="text-[10px] text-gray-600">Quantity Surveyor (QS)</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Checked By</div>
                  <div className="border-b border-black pb-1">
                    <div className="font-bold">Engr. Alex Smith</div>
                    <div className="text-[10px] text-gray-600">Senior Cost Engineer</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Approved By</div>
                  <div className="border-b border-black pb-1">
                    <div className="font-bold">Dir. Jane Doe</div>
                    <div className="text-[10px] text-gray-600">Project Director / Approver</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 mt-auto print-avoid-break relative z-10">
              <div className="border-b border-black mb-1" />
              <div className="flex justify-between items-center text-[10px] text-gray-700 pt-2">
                <span>{generatedDate} • SAMPLE DOCUMENT • {isCopy ? `COPY (#${copyNumber})` : 'ORIGINAL'}</span>
                <span>Page: 1/1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
