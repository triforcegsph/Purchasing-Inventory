import React, { useRef } from 'react';
import { Download, FileText, Image as ImageIcon, Paperclip, Printer, Trash2, Upload, X } from 'lucide-react';
import type { FileAttachment } from '../types/erp';

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-[#f1f3f5] text-[#495057] border-[#ced4da]',
    Posted: 'bg-[#e7f1ff] text-[#005ec4] border-[#b6d4fe]',
    'Linked to PR': 'bg-[#e8eaf6] text-[#283593] border-[#c5cae9]',
    'Pending Approval': 'bg-[#fff8e1] text-[#8d6e00] border-[#ffe082]',
    Approved: 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]',
    Rejected: 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]',
    'Returned to Applicant': 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]',
    'Partially Received': 'bg-[#fef3e2] text-[#b06000] border-[#fdd69b]',
    Completed: 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]',
    'Converted to PO': 'bg-[#e0f2f1] text-[#00695c] border-[#80cbc4]',
    'With Stock': 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]',
    'Without Stock': 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]',
    Issued: 'bg-[#e7f1ff] text-[#005ec4] border-[#b6d4fe]',
  };

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-wide border ${
        styles[status] || 'bg-[#f1f3f5] text-[#495057] border-[#ced4da]'
      }`}
    >
      {status}
    </span>
  );
}

interface AttachmentUploaderProps {
  attachments: FileAttachment[];
  onAdd: (file: FileAttachment) => void;
  onRemove: (id: string) => void;
  required?: boolean;
  label?: string;
}

export function AttachmentUploader({
  attachments,
  onAdd,
  onRemove,
  required = true,
  label = 'Attachments (PDF, JPG, PNG, XLSX)',
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'OTHER';
    const type: FileAttachment['type'] =
      ext === 'PDF' || ext === 'JPG' || ext === 'PNG' || ext === 'XLSX'
        ? ext
        : ext === 'JPEG'
        ? 'JPG'
        : 'OTHER';
    onAdd({
      id: `att-${Date.now()}`,
      name: file.name,
      type,
      size: `${Math.max(12, Math.round(file.size / 1024))} KB`,
      uploadedAt: new Date().toLocaleTimeString(),
    });
    e.target.value = '';
  };

  const addQuickSample = (type: 'PDF' | 'JPG') => {
    onAdd({
      id: `att-${Date.now()}`,
      name:
        type === 'PDF'
          ? `Supporting_Doc_${Math.floor(Math.random() * 900 + 100)}.pdf`
          : `Signed_Scan_${Math.floor(Math.random() * 900 + 100)}.jpg`,
      type,
      size: type === 'PDF' ? '640 KB' : '480 KB',
      uploadedAt: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="bg-[#f8f9fa] border border-[#cfd5dc] rounded-[2px] p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <label className="text-[11px] font-semibold text-[#2d3339] flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-[#5c646d]" />
          {label}
          {required && <span className="text-[#d5002b] font-bold">*</span>}
        </label>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-[#b9c0c8] rounded-[2px] hover:bg-[#eef0f3] text-[#1f2328] cursor-pointer"
          >
            <Upload className="w-3 h-3" /> Browse
          </button>
          <button
            type="button"
            onClick={() => addQuickSample('PDF')}
            className="px-2 py-1 text-[11px] font-medium bg-white border border-[#b9c0c8] rounded-[2px] hover:bg-[#eef0f3] text-[#005ec4] cursor-pointer"
          >
            + PDF
          </button>
          <button
            type="button"
            onClick={() => addQuickSample('JPG')}
            className="px-2 py-1 text-[11px] font-medium bg-white border border-[#b9c0c8] rounded-[2px] hover:bg-[#eef0f3] text-[#137333] cursor-pointer"
          >
            + JPG
          </button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <p className="text-[11px] text-[#6b7280]">
          No file attached.{required ? ' Attachment required.' : ''}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 bg-white border border-[#cfd5dc] rounded-[2px] px-2 py-1 text-[11px]"
            >
              {att.type === 'JPG' || att.type === 'PNG' ? (
                <ImageIcon className="w-3 h-3 text-[#137333]" />
              ) : (
                <FileText className="w-3 h-3 text-[#0072ed]" />
              )}
              <span className="font-medium text-[#1f2328]">{att.name}</span>
              <span className="text-[#6b7280]">({att.type}, {att.size})</span>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="text-[#6b7280] hover:text-[#d5002b] ml-1 cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SummaryReportModalProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  onClose: () => void;
}

export function SummaryReportModal({ title, headers, rows, onClose }: SummaryReportModalProps) {
  const [generatedAt] = React.useState(() => new Date().toLocaleString());
  const downloadCsv = () => {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <div className="print-modal-container bg-white rounded-[2px] shadow-xl border border-[#8d96a0] w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="no-print flex items-center justify-between px-4 py-2.5 bg-[#23262b] text-white">
          <div className="text-xs font-semibold uppercase tracking-wide">
            {title} — Summary Report Extract
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-[#1f2328] text-[11px] font-semibold rounded-[2px] cursor-pointer"
              title="Print Summary Report or Save as PDF"
            >
              <Printer className="w-3 h-3 text-[#0072ed]" /> Print / PDF
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-[11px] font-semibold rounded-[2px] cursor-pointer"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div id="printable-summary-document" className="p-3 overflow-auto">
          <div className="hidden print:block mb-3 border-b pb-2">
            <h2 className="text-base font-bold uppercase">{title} — Official Summary Report</h2>
            <p className="text-[10px] text-gray-500">Date Generated: {generatedAt} • Project: PROJ-TWRB</p>
          </div>
          <table className="w-full text-left border-collapse text-xs border border-[#cfd5dc]">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                {headers.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 font-semibold text-[#2d3339] border-r border-[#d5dbe2] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-[#1f2328] border-r border-[#e5e8ec] whitespace-nowrap">
                      {cIdx === row.length - 1 && typeof cell === 'string' ? (
                        <StatusBadge status={cell} />
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
