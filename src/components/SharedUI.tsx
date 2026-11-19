import React, { useRef, useState } from 'react';
import { Download, Eye, FileText, Image as ImageIcon, Paperclip, Printer, Trash2, Upload, X } from 'lucide-react';
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

export function getPoStageLabel(status: string): { label: string; colorClass: string } {
  switch (status) {
    case 'Pending Approval':
      return { label: 'Waiting for Project Manager Approval', colorClass: 'text-[#8d6e00]' };
    case 'Returned to Applicant':
      return { label: 'Returned to Applicant — Revision Needed', colorClass: 'text-[#c5221f]' };
    case 'Approved':
      return { label: 'Sent to Receiver (RCV) • In Transit / On Delivery', colorClass: 'text-[#005ec4]' };
    case 'Partially Received':
      return { label: 'On Delivery — Partially Received at Warehouse', colorClass: 'text-[#b06000]' };
    case 'Completed':
      return { label: 'Delivered & Received in Full', colorClass: 'text-[#137333]' };
    default:
      return { label: status, colorClass: 'text-[#495057]' };
  }
}

export function getPrStageLabel(
  status: string,
  linkedPo?: { poNo: string; status: string }
): { label: string; colorClass: string } {
  if (linkedPo) {
    const poStage = getPoStageLabel(linkedPo.status);
    return {
      label: `${linkedPo.poNo}: ${poStage.label}`,
      colorClass: poStage.colorClass,
    };
  }
  switch (status) {
    case 'Draft':
      return { label: 'Saved as Draft (Not Submitted)', colorClass: 'text-[#5c646d]' };
    case 'Pending Approval':
      return { label: 'Waiting for Project Manager Approval', colorClass: 'text-[#8d6e00]' };
    case 'Approved':
      return { label: 'Approved — Ready to Convert to PO', colorClass: 'text-[#137333]' };
    case 'Rejected':
      return { label: 'Rejected — Returned to Applicant', colorClass: 'text-[#c5221f]' };
    case 'Converted to PO':
      return { label: 'Converted to Purchase Order', colorClass: 'text-[#005ec4]' };
    default:
      return { label: status, colorClass: 'text-[#495057]' };
  }
}

export function getWithdrawalStageLabel(status: string): { label: string; colorClass: string } {
  if (status === 'With Stock') {
    return { label: 'Issued to Site (Stock Deducted)', colorClass: 'text-[#137333]' };
  }
  return { label: 'Backordered — Awaiting Warehouse Stock', colorClass: 'text-[#c5221f]' };
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

    const baseAttachment: FileAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      type,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedAt: new Date().toLocaleTimeString(),
    };

    if (file.size <= 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        onAdd({
          ...baseAttachment,
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        });
      };
      reader.readAsDataURL(file);
    } else {
      onAdd(baseAttachment);
    }
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

interface AttachmentViewerModalProps {
  docNo: string;
  attachments: FileAttachment[];
  onClose: () => void;
}

export function AttachmentViewerModal({ docNo, attachments, onClose }: AttachmentViewerModalProps) {
  const [selectedId, setSelectedId] = useState(attachments[0]?.id || '');
  const active = attachments.find((a) => a.id === selectedId) || attachments[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-[2px] shadow-xl border border-[#8d96a0] w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#23262b] text-white shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Paperclip className="w-3.5 h-3.5 text-[#4da3ff]" />
            <span>Uploaded Attachments — {docNo} ({attachments.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() => setSelectedId(att.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs border cursor-pointer ${
                active?.id === att.id
                  ? 'bg-[#e7f1ff] border-[#0072ed] text-[#004a99] font-semibold'
                  : 'bg-white border-[#cfd5dc] text-[#1f2328] hover:bg-[#eef0f3]'
              }`}
            >
              {att.type === 'JPG' || att.type === 'PNG' ? (
                <ImageIcon className="w-3.5 h-3.5 text-[#137333]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#0072ed]" />
              )}
              <span>{att.name}</span>
              <span className="text-[10px] text-[#5c646d]">({att.size})</span>
            </button>
          ))}
        </div>

        <div className="p-4 overflow-auto flex-1 bg-[#eef0f3] flex flex-col items-center justify-center min-h-[280px]">
          {!active ? (
            <p className="text-xs text-[#5c646d]">No attachments found for this document.</p>
          ) : active.dataUrl ? (
            <div className="w-full space-y-2 flex flex-col items-center">
              <div className="w-full flex items-center justify-between bg-white px-3 py-1.5 border border-[#cfd5dc] rounded-[2px] text-xs">
                <span className="font-medium text-[#1f2328]">
                  {active.name} ({active.type}, {active.size}) — Uploaded at {active.uploadedAt}
                </span>
                <a
                  href={active.dataUrl}
                  download={active.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-[11px] font-semibold rounded-[2px]"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
              {active.type === 'JPG' || active.type === 'PNG' ? (
                <img
                  src={active.dataUrl}
                  alt={active.name}
                  className="max-w-full max-h-[55vh] object-contain border border-[#cfd5dc] bg-white p-1"
                />
              ) : active.type === 'PDF' ? (
                <iframe
                  src={active.dataUrl}
                  title={active.name}
                  className="w-full h-[55vh] border border-[#cfd5dc] bg-white"
                />
              ) : (
                <div className="bg-white border border-[#cfd5dc] p-6 text-center rounded-[2px] text-xs text-[#495057]">
                  Preview not available for {active.type} files. Click <strong>Download</strong> above to open it.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#cfd5dc] p-6 rounded-[2px] max-w-md w-full text-center space-y-2">
              <FileText className="w-8 h-8 text-[#0072ed] mx-auto" />
              <div className="text-xs font-bold text-[#1f2328]">{active.name}</div>
              <div className="text-[11px] text-[#5c646d]">
                Type: {active.type} • Size: {active.size} • Uploaded: {active.uploadedAt}
              </div>
              <div className="text-[11px] text-[#5c646d] bg-[#f8f9fa] border border-[#e5e8ec] p-2 rounded-[2px]">
                Sample / Seed attachment metadata attached to {docNo}. Upload a real file via <strong>Browse</strong> to preview or download its contents.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AttachmentCellButtonProps {
  attachments: FileAttachment[];
  onOpen: () => void;
}

export function AttachmentCellButton({ attachments, onOpen }: AttachmentCellButtonProps) {
  if (!attachments || attachments.length === 0) {
    return <span className="text-[#6b7280] text-[11px]">0 files</span>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f4f8ff] hover:bg-[#e7f1ff] text-[#005ec4] border border-[#b6d4fe] rounded-[2px] text-[11px] font-semibold cursor-pointer"
      title={attachments.map((a) => a.name).join(', ')}
    >
      <Eye className="w-3 h-3" />
      <span>
        {attachments.length} {attachments.length === 1 ? 'File' : 'Files'}
      </span>
    </button>
  );
}
