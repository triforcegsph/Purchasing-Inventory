import { useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
} from 'lucide-react';
import type {
  PrRecord,
  RfqRecord,
  VendorRecord,
} from '../types/erp';
import { StatusBadge } from './SharedUI';
import { TxnLink } from './QuickTrackContext';
import { exportRowsToCsv } from '../utils/exportCsv';

interface VendorsRfqModuleProps {
  vendors: VendorRecord[];
  setVendors: React.Dispatch<React.SetStateAction<VendorRecord[]>>;
  rfqs: RfqRecord[];
  setRfqs: React.Dispatch<React.SetStateAction<RfqRecord[]>>;
  prs: PrRecord[];
  onAwardToPo: (prNo: string, vendorName: string) => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function VendorsRfqModule({
  vendors,
  setVendors,
  rfqs,
  setRfqs,
  prs,
  onAwardToPo,
  onAddLog,
}: VendorsRfqModuleProps) {
  const [activeTab, setActiveTab] = useState<'rfq' | 'vendors'>('rfq');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // New RFQ state
  const approvedPrs = prs.filter((p) => p.status === 'Approved' || p.status === 'Converted to PO');
  const [rfqPrNo, setRfqPrNo] = useState(approvedPrs[0]?.prNo || prs[0]?.prNo || '');
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqDueDate, setRfqDueDate] = useState('2026-12-05');

  // Add Quote state
  const [selectedRfqId, setSelectedRfqId] = useState(rfqs[0]?.id || '');
  const [quoteVendorId, setQuoteVendorId] = useState(vendors[0]?.id || '');
  const [quoteAmount, setQuoteAmount] = useState<number>(15000);
  const [quoteLeadDays, setQuoteLeadDays] = useState<number>(5);
  const [quoteNotes, setQuoteNotes] = useState('');

  // New Vendor state
  const [vName, setVName] = useState('');
  const [vTin, setVTin] = useState('');
  const [vCategory, setVCategory] = useState('Pipes, Valves & Fittings');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vTerms, setVTerms] = useState<VendorRecord['paymentTerms']>('Net 30');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const activeRfq = rfqs.find((r) => r.id === selectedRfqId) || rfqs[0];

  const handleCreateRfq = () => {
    if (!rfqPrNo) return;
    const rfqNo = `RFQ-2026-${String(rfqs.length + 1).padStart(3, '0')}`;
    const pr = prs.find((p) => p.prNo === rfqPrNo);
    const created: RfqRecord = {
      id: `rfq-${Date.now()}`,
      rfqNo,
      prNo: rfqPrNo,
      title: rfqTitle.trim() || `Canvass for ${rfqPrNo} (${pr?.items.length ?? 0} items)`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      dueDate: rfqDueDate,
      status: 'Open',
      quotes: [],
    };
    setRfqs((prev) => [created, ...prev]);
    setSelectedRfqId(created.id);
    setRfqTitle('');
    onAddLog('RFQ', rfqNo, 'Created RFQ', `Opened quotation canvass for ${rfqPrNo}.`);
    notify(`Created ${rfqNo} for ${rfqPrNo}.`);
  };

  const handleAddQuote = () => {
    if (!activeRfq) return;
    const vendor = vendors.find((v) => v.id === quoteVendorId);
    if (!vendor) return;
    const pr = prs.find((p) => p.prNo === activeRfq.prNo);
    const totalQty = pr?.items.reduce((s, it) => s + it.requestedQty, 0) || 1;

    setRfqs((prev) =>
      prev.map((r) =>
        r.id !== activeRfq.id
          ? r
          : {
              ...r,
              status: r.status === 'Awarded' ? 'Awarded' : 'Quotes Received',
              quotes: [
                ...r.quotes.filter((q) => q.vendorId !== vendor.id),
                {
                  id: `q-${Date.now()}`,
                  vendorId: vendor.id,
                  vendorName: vendor.name,
                  unitPriceAvg: Math.round((quoteAmount / totalQty) * 100) / 100,
                  totalQuotedAmount: quoteAmount,
                  leadTimeDays: quoteLeadDays,
                  paymentTerms: vendor.paymentTerms,
                  notes: quoteNotes.trim() || undefined,
                },
              ],
            }
      )
    );
    setQuoteNotes('');
    onAddLog('RFQ', activeRfq.rfqNo, 'Added Vendor Quote', `${vendor.name} quoted ₱${quoteAmount.toLocaleString()}`);
    notify(`Added quote from ${vendor.name} to ${activeRfq.rfqNo}.`);
  };

  const handleAwardQuote = (rfq: RfqRecord, vendorId: string, vendorName: string) => {
    setRfqs((prev) =>
      prev.map((r) =>
        r.id === rfq.id ? { ...r, status: 'Awarded', awardedVendorId: vendorId } : r
      )
    );
    onAddLog('RFQ', rfq.rfqNo, 'Awarded Supplier', `Awarded ${rfq.rfqNo} (${rfq.prNo}) to ${vendorName}.`);
    notify(`Awarded ${rfq.rfqNo} to ${vendorName}.`);
    onAwardToPo(rfq.prNo, vendorName);
  };

  const handleAddVendor = () => {
    if (!vName.trim() || !vTin.trim()) {
      notify('Vendor Name and TIN are required.');
      return;
    }
    const vendorCode = `VND-${String(vendors.length + 1).padStart(3, '0')}`;
    const newVendor: VendorRecord = {
      id: `vnd-${Date.now()}`,
      vendorCode,
      name: vName.trim(),
      tin: vTin.trim(),
      category: vCategory,
      contactPerson: vContact.trim() || 'Sales Desk',
      email: vEmail.trim() || 'sales@vendor.ph',
      phone: vPhone.trim() || '—',
      paymentTerms: vTerms,
      status: 'Active',
    };
    setVendors((prev) => [newVendor, ...prev]);
    setVName('');
    setVTin('');
    setVContact('');
    setVEmail('');
    setVPhone('');
    onAddLog('VENDOR', vendorCode, 'Added Vendor', `${newVendor.name} (${newVendor.tin})`);
    notify(`Added vendor ${newVendor.name} (${vendorCode}).`);
  };

  const toggleVendorStatus = (id: string) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, status: v.status === 'Active' ? 'On Hold' : 'Active' } : v
      )
    );
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowestQuoteAmount =
    activeRfq && activeRfq.quotes.length > 0
      ? Math.min(...activeRfq.quotes.map((q) => q.totalQuotedAmount))
      : null;

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {toast}
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('rfq')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-semibold border cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-[#0072ed] text-white border-[#0072ed]'
                : 'bg-white text-[#1f2328] border-[#b9c0c8] hover:bg-[#eef0f3]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> RFQ &amp; Canvass Comparison ({rfqs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-xs font-semibold border cursor-pointer ${
              activeTab === 'vendors'
                ? 'bg-[#0072ed] text-white border-[#0072ed]'
                : 'bg-white text-[#1f2328] border-[#b9c0c8] hover:bg-[#eef0f3]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Vendor Master ({vendors.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeTab === 'vendors') {
              exportRowsToCsv(
                'vendors-master.csv',
                ['Code', 'Name', 'TIN', 'Category', 'Contact', 'Email', 'Phone', 'Terms', 'Status'],
                vendors.map((v) => [v.vendorCode, v.name, v.tin, v.category, v.contactPerson, v.email, v.phone, v.paymentTerms, v.status])
              );
            } else {
              exportRowsToCsv(
                'rfq-canvass.csv',
                ['RFQ No', 'PR No', 'Title', 'Due Date', 'Status', 'Quotes Count'],
                rfqs.map((r) => [r.rfqNo, r.prNo, r.title, r.dueDate, r.status, r.quotes.length])
              );
            }
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-xs font-semibold text-[#1f2328] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#137333]" /> Export CSV
        </button>
      </div>

      {activeTab === 'rfq' && (
        <div className="space-y-3">
          {/* Create RFQ */}
          <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-3 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Create Request for Quotation (RFQ)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Linked PR</label>
                <select
                  value={rfqPrNo}
                  onChange={(e) => setRfqPrNo(e.target.value)}
                  className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                >
                  {prs.map((p) => (
                    <option key={p.id} value={p.prNo}>
                      {p.prNo} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Canvass Title</label>
                <input
                  value={rfqTitle}
                  onChange={(e) => setRfqTitle(e.target.value)}
                  placeholder="e.g. Pipes & Fittings Canvass"
                  className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Due Date</label>
                  <input
                    type="date"
                    value={rfqDueDate}
                    onChange={(e) => setRfqDueDate(e.target.value)}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateRfq}
                  className="h-7 px-3 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> New RFQ
                </button>
              </div>
            </div>
          </div>

          {/* Active RFQ Canvass Comparison */}
          {activeRfq && (
            <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
              <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={activeRfq.id}
                    onChange={(e) => setSelectedRfqId(e.target.value)}
                    className="h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono font-bold"
                  >
                    {rfqs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rfqNo} — {r.prNo}
                      </option>
                    ))}
                  </select>
                  <span className="font-semibold text-[#1f2328]">{activeRfq.title}</span>
                  <TxnLink docNo={activeRfq.prNo} />
                  <StatusBadge status={activeRfq.status} />
                </div>
                <span className="text-[11px] text-[#5c646d]">Due: {activeRfq.dueDate}</span>
              </div>

              {/* Add Vendor Quote */}
              <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Vendor</label>
                  <select
                    value={quoteVendorId}
                    onChange={(e) => setQuoteVendorId(e.target.value)}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  >
                    {vendors.filter((v) => v.status === 'Active').map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Total Quote (₱)</label>
                  <input
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(Number(e.target.value))}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={quoteLeadDays}
                    onChange={(e) => setQuoteLeadDays(Number(e.target.value))}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Notes</label>
                  <input
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Delivery / warranty..."
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddQuote}
                    className="w-full h-7 px-3 bg-[#137333] hover:bg-[#0f5c29] text-white rounded-[2px] font-semibold cursor-pointer"
                  >
                    + Add Quote
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Supplier</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Total Quote (₱)</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Avg Unit Price</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Lead Time</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Terms</th>
                      <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Notes</th>
                      <th className="px-2.5 py-1.5 font-semibold text-right">Award</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5dbe2]">
                    {activeRfq.quotes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-[#6b7280]">
                          No vendor quotes added yet. Add 2+ quotes above to compare prices.
                        </td>
                      </tr>
                    ) : (
                      activeRfq.quotes.map((q) => {
                        const isLowest = lowestQuoteAmount !== null && q.totalQuotedAmount === lowestQuoteAmount;
                        const isAwarded = activeRfq.awardedVendorId === q.vendorId;
                        return (
                          <tr key={q.id} className={isAwarded ? 'bg-[#e6f4ea]/60' : 'bg-white'}>
                            <td className="px-2.5 py-1.5 font-semibold border-r border-[#e5e8ec]">
                              {q.vendorName}
                              {isLowest && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[#e6f4ea] text-[#137333] border border-[#a8dab5] rounded-[2px]">
                                  Lowest Price
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold border-r border-[#e5e8ec]">
                              ₱{q.totalQuotedAmount.toLocaleString()}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono border-r border-[#e5e8ec]">
                              ₱{q.unitPriceAvg.toLocaleString()}
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-mono border-r border-[#e5e8ec]">
                              {q.leadTimeDays} day(s)
                            </td>
                            <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{q.paymentTerms}</td>
                            <td className="px-2.5 py-1.5 text-[#5c646d] border-r border-[#e5e8ec]">{q.notes || '—'}</td>
                            <td className="px-2.5 py-1.5 text-right">
                              {isAwarded ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#137333]">
                                  <Award className="w-3.5 h-3.5" /> Awarded
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAwardQuote(activeRfq, q.vendorId, q.vendorName)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                                >
                                  <Award className="w-3 h-3" /> Award &amp; To PO
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-3">
          {/* Add Vendor */}
          <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-3 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Register New Supplier / Vendor
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              <input
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="Company Name *"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
              />
              <input
                value={vTin}
                onChange={(e) => setVTin(e.target.value)}
                placeholder="TIN * (e.g. 004-821-330-000)"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px] font-mono"
              />
              <input
                value={vCategory}
                onChange={(e) => setVCategory(e.target.value)}
                placeholder="Category"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
              />
              <select
                value={vTerms}
                onChange={(e) => setVTerms(e.target.value as VendorRecord['paymentTerms'])}
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
              >
                <option value="COD">COD</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
              <input
                value={vContact}
                onChange={(e) => setVContact(e.target.value)}
                placeholder="Contact Person"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
              />
              <input
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                placeholder="Email"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
              />
              <input
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                placeholder="Phone"
                className="h-7 px-2 border border-[#b9c0c8] rounded-[2px]"
              />
              <button
                type="button"
                onClick={handleAddVendor}
                className="h-7 px-3 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] font-semibold cursor-pointer"
              >
                + Add Vendor
              </button>
            </div>
          </div>

          {/* Vendor Directory */}
          <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
                Approved Vendor Directory
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendor, code, category..."
                  className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Code</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Vendor Name</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">TIN</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Category</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Contact</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Terms</th>
                    <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Status</th>
                    <th className="px-2.5 py-1.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5dbe2]">
                  {filteredVendors.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="px-2.5 py-1.5 font-mono font-semibold text-[#005ec4] border-r border-[#e5e8ec]">{v.vendorCode}</td>
                      <td className="px-2.5 py-1.5 font-semibold border-r border-[#e5e8ec]">{v.name}</td>
                      <td className="px-2.5 py-1.5 font-mono border-r border-[#e5e8ec]">{v.tin}</td>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{v.category}</td>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                        <div>{v.contactPerson}</div>
                        <div className="text-[10px] text-[#5c646d]">{v.email}</div>
                      </td>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{v.paymentTerms}</td>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-2.5 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggleVendorStatus(v.id)}
                          className="px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                        >
                          {v.status === 'Active' ? 'Put On Hold' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

