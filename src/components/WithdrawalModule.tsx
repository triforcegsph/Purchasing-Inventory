import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileBarChart2,
  PackageMinus,
  Search,
} from 'lucide-react';
import type {
  FileAttachment,
  RequiredFieldConfig,
  WarehouseStock,
  WithdrawalRecord,
} from '../types/erp';
import { AttachmentUploader, StatusBadge, SummaryReportModal } from './SharedUI';

interface WithdrawalModuleProps {
  stock: WarehouseStock[];
  withdrawals: WithdrawalRecord[];
  config: RequiredFieldConfig;
  onPostWithdrawal: (wd: WithdrawalRecord) => void;
}

export function WithdrawalModule({
  stock,
  withdrawals,
  config,
  onPostWithdrawal,
}: WithdrawalModuleProps) {
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedStockId, setSelectedStockId] = useState(stock[0]?.id || '');
  const [requestQty, setRequestQty] = useState(2);
  const [requestedBy, setRequestedBy] = useState('Foreman J. Doe');
  const [jobNo, setJobNo] = useState('JOB-2026-884');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const systems = Array.from(new Set(stock.map((s) => s.systemTag)));

  const filteredStock = stock.filter((s) => {
    const matchesSystem = systemFilter === 'ALL' || s.systemTag === systemFilter;
    const matchesQuery =
      s.itemCode.toLowerCase().includes(itemSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(itemSearch.toLowerCase()) ||
      s.assignedLocation.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesSystem && matchesQuery;
  });

  const activeStock = stock.find((s) => s.id === selectedStockId) || filteredStock[0];

  const handleWithdraw = () => {
    setErrorMsg(null);
    if (!activeStock) {
      setErrorMsg('Select an item from stock.');
      return;
    }
    if (requestQty <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }
    if (config.attachments && attachments.length === 0) {
      setErrorMsg('At least 1 attachment (Issuance Slip PDF/JPG) is required.');
      return;
    }

    const hasStock = activeStock.availableStock >= requestQty;
    const wdNo = `WD-2026-${Math.floor(Math.random() * 500 + 310)}`;
    const newWd: WithdrawalRecord = {
      id: `wd-${Date.now()}`,
      wdNo,
      systemTag: activeStock.systemTag,
      jobNo,
      requestedBy,
      spName: 'SP-MECH-ALPHA',
      performedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: hasStock ? 'With Stock' : 'Without Stock',
      attachments,
      items: [
        {
          itemCode: activeStock.itemCode,
          description: activeStock.description,
          uom: activeStock.uom,
          availableAtRequest: activeStock.availableStock,
          requestedQty: requestQty,
          assignedLocation: activeStock.assignedLocation,
        },
      ],
    };

    onPostWithdrawal(newWd);
    setAttachments([]);
    setSuccessMsg(
      hasStock
        ? `${wdNo} issued (With Stock).`
        : `${wdNo} logged as "Without Stock" (${activeStock.availableStock} avail vs ${requestQty} req).`
    );
    setTimeout(() => setSuccessMsg(null), 3500);
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
            WD — Material Withdrawal & Stock Lookup
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSummary(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              <FileBarChart2 className="w-3.5 h-3.5" /> Summary Report
            </button>
            <button
              onClick={handleWithdraw}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              <PackageMinus className="w-3.5 h-3.5" /> Process Withdrawal
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#cfd5dc] flex flex-wrap items-center gap-2">
          <select
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-medium"
          >
            <option value="ALL">All Systems</option>
            {systems.map((sys) => (
              <option key={sys} value={sys}>
                {sys}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search item code, description, location..."
              className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto border-b border-[#cfd5dc]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2] w-10">Sel</th>
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2]">System</th>
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2]">Item Code</th>
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2]">Description</th>
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2]">Location</th>
                <th className="px-2.5 py-1.5 border-r border-[#d5dbe2] text-right">Available</th>
                <th className="px-2.5 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {filteredStock.map((s, idx) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedStockId(s.id)}
                  className={`cursor-pointer ${
                    activeStock?.id === s.id
                      ? 'bg-[#e7f1ff]'
                      : idx % 2 === 1
                      ? 'bg-[#fafbfd]'
                      : 'bg-white'
                  }`}
                >
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec] text-center">
                    <input
                      type="radio"
                      name="stockSelect"
                      checked={activeStock?.id === s.id}
                      onChange={() => setSelectedStockId(s.id)}
                    />
                  </td>
                  <td className="px-2.5 py-1.5 text-[#495057] border-r border-[#e5e8ec]">{s.systemTag}</td>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{s.itemCode}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{s.description}</td>
                  <td className="px-2.5 py-1.5 text-[#495057] border-r border-[#e5e8ec]">{s.assignedLocation}</td>
                  <td className="px-2.5 py-1.5 text-right font-bold border-r border-[#e5e8ec]">
                    {s.availableStock} {s.uom}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <StatusBadge status={s.availableStock > 0 ? 'With Stock' : 'Without Stock'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Requested By</label>
            <input
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Job No.</label>
            <input
              value={jobNo}
              onChange={(e) => setJobNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Qty to Withdraw ({activeStock?.uom || 'PC/s'})
            </label>
            <input
              type="number"
              min={1}
              value={requestQty}
              onChange={(e) => setRequestQty(Number(e.target.value))}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-semibold"
            />
          </div>
        </div>

        <div className="p-3">
          <AttachmentUploader
            attachments={attachments}
            required={config.attachments}
            label="Issuance / Withdrawal Slip (PDF, JPG, etc.)"
            onAdd={(f) => setAttachments((prev) => [...prev, f])}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
        </div>
      </div>

      {/* Withdrawal Register */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
          Withdrawal Register
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">WD No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">System</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Qty</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Requested By</th>
                <th className="px-2.5 py-1.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {withdrawals.map((w, idx) => (
                <tr key={w.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{w.wdNo}</td>
                  <td className="px-2.5 py-1.5 text-[#495057] border-r border-[#e5e8ec]">{w.systemTag}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    {w.items[0]?.itemCode} — {w.items[0]?.description}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-semibold border-r border-[#e5e8ec]">
                    {w.items[0]?.requestedQty} {w.items[0]?.uom}
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{w.requestedBy}</td>
                  <td className="px-2.5 py-1.5">
                    <StatusBadge status={w.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSummary && (
        <SummaryReportModal
          title="Withdrawal"
          headers={['WD No.', 'System', 'Item Code', 'Qty', 'Requested By', 'Performed At', 'Status']}
          rows={withdrawals.map((w) => [
            w.wdNo,
            w.systemTag,
            w.items[0]?.itemCode || '',
            `${w.items[0]?.requestedQty || 0} ${w.items[0]?.uom || ''}`,
            w.requestedBy,
            w.performedAt,
            w.status,
          ])}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
