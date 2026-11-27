import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  Plus,
} from 'lucide-react';
import type {
  InvoiceRecord,
  PoRecord,
  ReceivingRecord,
  UserRole,
} from '../types/erp';
import { StatusBadge } from './SharedUI';
import { TxnLink } from './QuickTrackContext';
import { exportRowsToCsv } from '../utils/exportCsv';

interface InvoicesModuleProps {
  invoices: InvoiceRecord[];
  setInvoices: React.Dispatch<React.SetStateAction<InvoiceRecord[]>>;
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  activeRole: UserRole;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function InvoicesModule({
  invoices,
  setInvoices,
  pos,
  receivings,
  activeRole,
  onAddLog,
}: InvoicesModuleProps) {
  const [selectedPoNo, setSelectedPoNo] = useState(pos[0]?.poNo || '');
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState('');
  const [vatRate, setVatRate] = useState(12);
  const [ewtRate, setEwtRate] = useState(2);
  const [invoicedQtyOverride, setInvoicedQtyOverride] = useState<string>('');
  const [subtotalOverride, setSubtotalOverride] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedPo = pos.find((p) => p.poNo === selectedPoNo) || pos[0];
  const linkedReceivings = selectedPo
    ? receivings.filter((r) => r.poNo === selectedPo.poNo)
    : [];
  const latestGrn = linkedReceivings[0];

  const poQty = selectedPo?.items.reduce((s, it) => s + it.poQty, 0) ?? 0;
  const grnQty = selectedPo?.items.reduce((s, it) => s + it.receivedQty, 0) ?? 0;
  const poSubtotal =
    selectedPo?.items.reduce((s, it) => s + it.receivedQty * it.unitPrice, 0) ?? 0;

  const effectiveQty =
    invoicedQtyOverride !== '' ? Number(invoicedQtyOverride) : grnQty || poQty;
  const effectiveSubtotal =
    subtotalOverride !== '' ? Number(subtotalOverride) : poSubtotal;

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handlePostInvoice = () => {
    setErrorMsg(null);
    if (!selectedPo) {
      setErrorMsg('Select a PO first.');
      return;
    }
    if (!vendorInvoiceRef.trim()) {
      setErrorMsg('Supplier Invoice / SI Reference No. is required.');
      return;
    }
    if (effectiveSubtotal <= 0) {
      setErrorMsg('Subtotal must be greater than 0.');
      return;
    }

    const vatAmount = Math.round(effectiveSubtotal * (vatRate / 100) * 100) / 100;
    const withholdingTax = Math.round(effectiveSubtotal * (ewtRate / 100) * 100) / 100;
    const totalPayable = Math.round((effectiveSubtotal + vatAmount - withholdingTax) * 100) / 100;

    let matchStatus: InvoiceRecord['matchStatus'] = '3-Way Matched';
    if (grnQty === 0) {
      matchStatus = 'Pending GRN';
    } else if (effectiveQty !== grnQty) {
      matchStatus = 'Qty Variance';
    } else if (Math.abs(effectiveSubtotal - poSubtotal) > 0.01) {
      matchStatus = 'Price Variance';
    }

    const invoiceNo = `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const rec: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      vendorInvoiceRef: vendorInvoiceRef.trim(),
      poNo: selectedPo.poNo,
      grnNo: latestGrn?.grnNo,
      vendorName: selectedPo.vendor,
      invoiceDate: today,
      dueDate: due,
      subtotal: effectiveSubtotal,
      vatRate,
      vatAmount,
      withholdingTax,
      totalPayable,
      invoicedQty: effectiveQty,
      poQty,
      grnQty,
      matchStatus,
      paymentStatus: 'Unpaid',
      remarks: remarks.trim() || undefined,
    };

    setInvoices((prev) => [rec, ...prev]);
    setVendorInvoiceRef('');
    setInvoicedQtyOverride('');
    setSubtotalOverride('');
    setRemarks('');
    onAddLog(
      'INVOICE',
      invoiceNo,
      `Posted (${matchStatus})`,
      `PO ${selectedPo.poNo} | SI: ${rec.vendorInvoiceRef} | Payable: ₱${totalPayable.toLocaleString()}`
    );
    notify(`Posted ${invoiceNo} — ${matchStatus}`);
  };

  const canApprovePay = activeRole === 'Admin' || activeRole === 'PO Approver';

  const handleUpdatePayment = (id: string, nextStatus: InvoiceRecord['paymentStatus']) => {
    const target = invoices.find((i) => i.id === id);
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, paymentStatus: nextStatus } : i))
    );
    if (target) {
      onAddLog('INVOICE', target.invoiceNo, nextStatus, `PO ${target.poNo} — ₱${target.totalPayable.toLocaleString()}`);
      notify(`${target.invoiceNo} marked as ${nextStatus}.`);
    }
  };

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {toast}
        </div>
      )}
      {errorMsg && (
        <div className="bg-[#fce8e6] border border-[#f5c2c0] text-[#c5221f] px-3 py-1.5 rounded-[2px] text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Post Invoice & 3-Way Match */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#0072ed]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              AP Invoices — 3-Way Match (PO ↔ GRN ↔ Vendor Invoice)
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(
                'ap-invoices-3way-match.csv',
                ['Invoice No', 'Vendor SI', 'PO No', 'GRN No', 'Vendor', 'Subtotal', 'VAT', 'WHT', 'Net Payable', 'Match Status', 'Payment Status'],
                invoices.map((i) => [
                  i.invoiceNo,
                  i.vendorInvoiceRef,
                  i.poNo,
                  i.grnNo || '',
                  i.vendorName,
                  i.subtotal,
                  i.vatAmount,
                  i.withholdingTax,
                  i.totalPayable,
                  i.matchStatus,
                  i.paymentStatus,
                ])
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-xs font-semibold text-[#1f2328] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#137333]" /> Export CSV
          </button>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs bg-[#fafbfd] border-b border-[#cfd5dc]">
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Purchase Order (PO)</label>
            <select
              value={selectedPo?.poNo || ''}
              onChange={(e) => setSelectedPoNo(e.target.value)}
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            >
              {pos.map((p) => (
                <option key={p.id} value={p.poNo}>
                  {p.poNo} — {p.vendor}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Supplier Invoice / SI No. *</label>
            <input
              value={vendorInvoiceRef}
              onChange={(e) => setVendorInvoiceRef(e.target.value)}
              placeholder="e.g. SI-88419"
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Invoiced Qty (PO: {poQty} | GRN: {grnQty})
            </label>
            <input
              type="number"
              value={invoicedQtyOverride}
              onChange={(e) => setInvoicedQtyOverride(e.target.value)}
              placeholder={String(grnQty || poQty)}
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Subtotal ₱ (GRN Value: ₱{poSubtotal.toLocaleString()})
            </label>
            <input
              type="number"
              value={subtotalOverride}
              onChange={(e) => setSubtotalOverride(e.target.value)}
              placeholder={String(poSubtotal)}
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">VAT Rate (%)</label>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Withholding Tax / EWT (%)</label>
            <input
              type="number"
              value={ewtRate}
              onChange={(e) => setEwtRate(Number(e.target.value))}
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Remarks</label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional matching notes..."
              className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handlePostInvoice}
              className="w-full h-7 px-3 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Post &amp; Run 3-Way Match
            </button>
          </div>
        </div>

        {/* Invoice Register */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Invoice No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PO / GRN</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Vendor</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Qty (Inv/GRN/PO)</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Net Payable</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">3-Way Match</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Payment</th>
                <th className="px-2.5 py-1.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="bg-white">
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <div className="font-mono font-bold text-[#1f2328]">{inv.invoiceNo}</div>
                    <div className="text-[10px] text-[#5c646d] font-mono">SI: {inv.vendorInvoiceRef}</div>
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <div><TxnLink docNo={inv.poNo} /></div>
                    {inv.grnNo && <div className="text-[11px]"><TxnLink docNo={inv.grnNo} /></div>}
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{inv.vendorName}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono border-r border-[#e5e8ec]">
                    {inv.invoicedQty} / {inv.grnQty} / {inv.poQty}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-mono border-r border-[#e5e8ec]">
                    <div className="font-bold">₱{inv.totalPayable.toLocaleString()}</div>
                    <div className="text-[10px] text-[#5c646d]">
                      Sub ₱{inv.subtotal.toLocaleString()} + VAT ₱{inv.vatAmount.toLocaleString()} − EWT ₱{inv.withholdingTax.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <StatusBadge status={inv.matchStatus} />
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                  <td className="px-2.5 py-1.5 text-right space-x-1 whitespace-nowrap">
                    {inv.paymentStatus === 'Unpaid' && canApprovePay && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePayment(inv.id, 'Approved for Payment')}
                        className="px-2 py-0.5 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      >
                        Approve Pay
                      </button>
                    )}
                    {inv.paymentStatus === 'Approved for Payment' && canApprovePay && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePayment(inv.id, 'Paid')}
                        className="px-2 py-0.5 bg-[#137333] hover:bg-[#0f5c29] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

