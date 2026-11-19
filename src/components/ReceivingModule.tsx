import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileBarChart2,
  Printer,
  Search,
} from 'lucide-react';
import type {
  FileAttachment,
  PoRecord,
  ReceivingRecord,
  RequiredFieldConfig,
  WarehouseStock,
} from '../types/erp';
import { AttachmentUploader, StatusBadge, SummaryReportModal } from './SharedUI';
import { PoPrintModal } from './PoPrintModal';

interface ReceivingModuleProps {
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  stock?: WarehouseStock[];
  config: RequiredFieldConfig;
  initialPoNo?: string;
  onPostReceiving: (rec: ReceivingRecord) => void;
}

export function ReceivingModule({
  pos,
  receivings,
  stock = [],
  config,
  initialPoNo,
  onPostReceiving,
}: ReceivingModuleProps) {
  const openPos = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received');
  const [selectedPoNo, setSelectedPoNo] = useState(initialPoNo || openPos[0]?.poNo || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [drNo, setDrNo] = useState('DR-55210');
  const [drDate, setDrDate] = useState(new Date().toISOString().slice(0, 10));
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleString());
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [actualQtys, setActualQtys] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [printPo, setPrintPo] = useState<PoRecord | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activePo = openPos.find((p) => p.poNo === selectedPoNo) || openPos[0];

  const handleSelectPo = (poNo: string) => {
    setSelectedPoNo(poNo);
    setActualQtys({});
  };

  const handlePost = () => {
    setErrorMsg(null);
    if (!activePo) {
      setErrorMsg('No open PO selected.');
      return;
    }
    if (!drNo.trim()) {
      setErrorMsg('DR Reference Number is required.');
      return;
    }
    if (config.drDate && !drDate) {
      setErrorMsg('Date Refer to DR is required.');
      return;
    }
    if (config.attachments && attachments.length === 0) {
      setErrorMsg('At least 1 attachment (Signed DR PDF/JPG) is required.');
      return;
    }

    const lineItems = activePo.items.map((it) => {
      const outstanding = Math.max(0, it.poQty - it.receivedQty);
      const actual = actualQtys[it.id] ?? outstanding;
      return {
        id: `grn-li-${Date.now()}-${it.id}`,
        itemCode: it.itemCode,
        description: it.description,
        uom: it.uom,
        orderedQty: it.poQty,
        previouslyReceivedQty: it.receivedQty,
        toReceiveQty: outstanding,
        actualReceivedQty: Math.min(outstanding, Math.max(0, actual)),
      };
    });

    const totalActual = lineItems.reduce((acc, i) => acc + i.actualReceivedQty, 0);
    if (totalActual <= 0) {
      setErrorMsg('Actual Quantity Received must be greater than 0.');
      return;
    }

    const stillHasOutstanding = lineItems.some((i) => i.actualReceivedQty < i.toReceiveQty);

    const grnNo = `GRN-2026-${Math.floor(Math.random() * 200 + 720)}`;
    const newRec: ReceivingRecord = {
      id: `grn-${Date.now()}`,
      grnNo,
      poNo: activePo.poNo,
      refDocNo: activePo.refDocNo,
      iaas2RefNo: activePo.iaas2RefNo,
      drNo,
      drDate,
      performedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      spName: activePo.spName,
      status: stillHasOutstanding ? 'Partially Received' : 'Completed',
      attachments,
      items: lineItems,
    };

    onPostReceiving(newRec);
    setAttachments([]);
    setActualQtys({});
    setSuccessMsg(`${grnNo} posted (${newRec.status}).`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const filteredReceivings = receivings.filter(
    (r) =>
      r.grnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.refDocNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.iaas2RefNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            GRN — Goods Receiving (DR)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSummary(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              <FileBarChart2 className="w-3.5 h-3.5" /> Summary Report
            </button>
            <button
              onClick={handlePost}
              disabled={!activePo}
              className="px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] disabled:bg-slate-300 text-white text-xs font-semibold rounded-[2px] cursor-pointer"
            >
              Post Receiving
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#fafbfd] border-b border-[#cfd5dc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Open PO</label>
            <select
              value={activePo?.poNo || ''}
              onChange={(e) => handleSelectPo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            >
              {openPos.length === 0 ? (
                <option value="">No open POs</option>
              ) : (
                openPos.map((po) => (
                  <option key={po.id} value={po.poNo}>
                    {po.poNo} — {po.status}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Ref Doc / IAAS2</label>
            <input
              readOnly
              value={activePo ? `${activePo.refDocNo} / ${activePo.iaas2RefNo}` : '—'}
              className="w-full h-7 text-xs border border-[#cfd5dc] rounded-[2px] px-2 bg-[#eef0f3] text-[#495057] font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              DR Reference <span className="text-[#d5002b]">*</span>
            </label>
            <input
              value={drNo}
              onChange={(e) => setDrNo(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
              Date Refer to DR {config.drDate && <span className="text-[#d5002b]">*</span>}
            </label>
            <input
              type="date"
              value={drDate}
              onChange={(e) => setDrDate(e.target.value)}
              className="w-full h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#495057] mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#0072ed]" /> Date Performed (Live)
            </label>
            <input
              readOnly
              value={liveTime}
              className="w-full h-7 text-xs border border-[#b6d4fe] rounded-[2px] px-2 bg-[#e7f1ff] text-[#004a99] font-mono"
            />
          </div>
        </div>

        {activePo && (
          <div className="overflow-x-auto border-b border-[#cfd5dc]">
            <div className="px-3 py-1.5 bg-[#f0f4f9] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between text-[11px] text-[#2d3339]">
              <span className="font-semibold uppercase tracking-wide">
                Delivery Inventory Inspection &amp; Stock Impact Verification
              </span>
              <span className="text-slate-500">
                Verifying incoming items against Central Warehouse stock
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Code</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">PO Qty</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Prev. Recv</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right bg-[#fff8e1] text-[#8d6e00]">
                    Outstanding
                  </th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right bg-[#e6f4ea] text-[#137333]">
                    Actual DR Received
                  </th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-center">UOM</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Current Stock</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right text-[#005ec4]">Projected Stock</th>
                  <th className="px-2.5 py-1.5 font-semibold">Delivery Check Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5dbe2]">
                {activePo.items.map((it, idx) => {
                  const outstanding = Math.max(0, it.poQty - it.receivedQty);
                  const val = actualQtys[it.id] ?? outstanding;
                  const itemStock = stock.find((s) => s.itemCode === it.itemCode);
                  const currentStock = itemStock ? itemStock.availableStock : 0;
                  const projectedStock = currentStock + val;

                  let checkStatus = 'Exact Match (100%)';
                  let statusColor = 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]';
                  if (outstanding === 0) {
                    checkStatus = 'Fully Received';
                    statusColor = 'bg-[#f1f3f5] text-[#5c646d] border-[#ced4da]';
                  } else if (val === 0) {
                    checkStatus = 'Zero Received (Pending)';
                    statusColor = 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]';
                  } else if (val < outstanding) {
                    checkStatus = `Partial (${outstanding - val} Backordered)`;
                    statusColor = 'bg-[#fff8e1] text-[#8d6e00] border-[#ffe082]';
                  }

                  return (
                    <tr key={it.id} className={outstanding === 0 ? 'bg-[#f8f9fa] text-[#9aa0a6]' : idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                      <td className="px-2.5 py-1.5 font-mono border-r border-[#e5e8ec]">{it.itemCode}</td>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{it.description}</td>
                      <td className="px-2.5 py-1.5 text-right border-r border-[#e5e8ec]">{it.poQty}</td>
                      <td className="px-2.5 py-1.5 text-right border-r border-[#e5e8ec]">{it.receivedQty}</td>
                      <td className="px-2.5 py-1.5 text-right font-bold bg-[#fffdf5] text-[#8d6e00] border-r border-[#e5e8ec]">
                        {outstanding}
                      </td>
                      <td className="p-0 excel-cell text-right bg-[#f4fbf6] border-r border-[#e5e8ec]">
                        <input
                          type="number"
                          min={0}
                          max={outstanding}
                          disabled={outstanding === 0}
                          value={val}
                          onChange={(e) =>
                            setActualQtys((prev) => ({
                              ...prev,
                              [it.id]: Number(e.target.value),
                            }))
                          }
                          className="w-20 ml-auto block text-right bg-transparent px-2.5 py-1.5 font-semibold text-[#137333] focus:outline-none disabled:text-[#9aa0a6]"
                        />
                      </td>
                      <td className="px-2.5 py-1.5 text-center text-[#5c646d] border-r border-[#e5e8ec]">{it.uom}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono text-[#5c646d] border-r border-[#e5e8ec]">{currentStock}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-semibold text-[#005ec4] border-r border-[#e5e8ec]">{projectedStock}</td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-wide border ${statusColor}`}>
                          {checkStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3">
          <AttachmentUploader
            attachments={attachments}
            required={config.attachments}
            label="Delivery Receipt (DR) Attachments (PDF, JPG, etc.)"
            onAdd={(f) => setAttachments((prev) => [...prev, f])}
            onRemove={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
        </div>
      </div>

      {/* Receiving Register */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
            Receiving Register
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GRN, PO, Ref Doc, IAAS2..."
              className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">GRN No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">PO No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Ref Doc / IAAS2</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">DR No. & Date</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Performed At</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Status</th>
                <th className="px-2.5 py-1.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {filteredReceivings.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{r.grnNo}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[#005ec4] border-r border-[#e5e8ec]">{r.poNo}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <div>{r.refDocNo}</div>
                    <div className="text-[11px] text-[#5c646d] font-mono">{r.iaas2RefNo}</div>
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    {r.drNo} ({r.drDate})
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-[#495057] border-r border-[#e5e8ec]">{r.performedAt}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        const matchPo = pos.find((p) => p.poNo === r.poNo) || pos[0];
                        if (matchPo) setPrintPo(matchPo);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] text-[#1f2328] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                      title="Print Order Receipt / Invoice (Order Receipt.pdf)"
                    >
                      <Printer className="w-3 h-3 text-[#0072ed]" /> Print Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSummary && (
        <SummaryReportModal
          title="Receiving (GRN)"
          headers={['GRN No.', 'PO No.', 'Ref Doc No.', 'IAAS2 Ref', 'DR No.', 'DR Date', 'Performed At', 'Status']}
          rows={receivings.map((r) => [
            r.grnNo,
            r.poNo,
            r.refDocNo,
            r.iaas2RefNo,
            r.drNo,
            r.drDate,
            r.performedAt,
            r.status,
          ])}
          onClose={() => setShowSummary(false)}
        />
      )}

      {printPo && (
        <PoPrintModal
          po={printPo}
          allPos={pos}
          onSelectPo={(newPo) => setPrintPo(newPo)}
          onClose={() => setPrintPo(null)}
          initialTemplate="receipt"
        />
      )}
    </div>
  );
}
