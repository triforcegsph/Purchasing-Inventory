import { useState } from 'react';
import { ArrowRight, Link2, Search } from 'lucide-react';
import type { PqtoRecord } from '../types/erp';
import { StatusBadge } from './SharedUI';
import { ItemLink } from './QuickTrackContext';

interface PqtoModuleProps {
  pqtos: PqtoRecord[];
  setPqtos: React.Dispatch<React.SetStateAction<PqtoRecord[]>>;
  onNavigateToPr: (pqtoNo: string) => void;
}

export function PqtoModule({ pqtos, setPqtos, onNavigateToPr }: PqtoModuleProps) {
  const [selectedPqtoId, setSelectedPqtoId] = useState<string>(pqtos[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const activePqto = pqtos.find((p) => p.id === selectedPqtoId) || pqtos[0];

  const handleQtyChange = (boqItemId: string, newQty: number) => {
    if (!activePqto) return;
    setPqtos((prev) =>
      prev.map((p) =>
        p.id !== activePqto.id
          ? p
          : {
              ...p,
              items: p.items.map((it) =>
                it.boqItemId === boqItemId ? { ...it, pqtoQty: Math.max(0, newQty) } : it
              ),
            }
      )
    );
  };

  const filteredItems =
    activePqto?.items.filter(
      (it) =>
        it.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.assignedLocation.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
      <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
            PQTO — Project Quantity Take-Off
          </span>
          {activePqto && <StatusBadge status={activePqto.status} />}
        </div>
        {activePqto && (
          <button
            onClick={() => onNavigateToPr(activePqto.pqtoNo)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
          >
            Create PR ({activePqto.pqtoNo}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter / Lookup Header */}
      <div className="px-3 py-2 bg-[#fafbfd] border-b border-[#cfd5dc] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#495057]">PQTO Doc:</span>
          <select
            value={activePqto?.id || ''}
            onChange={(e) => setSelectedPqtoId(e.target.value)}
            className="h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-medium"
          >
            {pqtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pqtoNo} — {p.jobNo} ({p.items.length})
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Lookup Item Code, Description, Location..."
            className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white focus:outline-none focus:border-[#0072ed]"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 text-[11px] text-[#005ec4] font-semibold">
          <Link2 className="w-3.5 h-3.5" />
          <span>PR Lookup Active</span>
        </div>
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Code</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Assigned Location</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">BOQ Qty</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] bg-[#e7f1ff] text-[#004a99]">PQTO UOM</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] bg-[#e7f1ff] text-[#004a99] text-right">PQTO Qty</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">PR Ordered</th>
              <th className="px-2.5 py-1.5 font-semibold text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d5dbe2]">
            {filteredItems.map((it, idx) => {
              const remaining = Math.max(0, it.pqtoQty - it.prOrderedQty);
              return (
                <tr key={it.boqItemId} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono border-r border-[#e5e8ec]">
                    <ItemLink code={it.itemCode} className="font-semibold" />
                  </td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{it.description}</td>
                  <td className="px-2.5 py-1.5 text-[#495057] border-r border-[#e5e8ec]">{it.assignedLocation}</td>
                  <td className="px-2.5 py-1.5 text-[#5c646d] border-r border-[#e5e8ec]">
                    {it.boqQty} {it.boqUom}
                  </td>
                  <td className="px-2.5 py-1.5 bg-[#f4f8ff] font-medium text-[#004a99] border-r border-[#e5e8ec]">{it.pqtoUom}</td>
                  <td className="p-0 excel-cell bg-[#f4f8ff] text-right border-r border-[#e5e8ec]">
                    <input
                      type="number"
                      value={it.pqtoQty}
                      onChange={(e) => handleQtyChange(it.boqItemId, Number(e.target.value))}
                      className="w-20 ml-auto block text-right bg-transparent px-2.5 py-1.5 font-semibold text-[#004a99] focus:outline-none"
                    />
                  </td>
                  <td className="px-2.5 py-1.5 text-right text-[#495057] border-r border-[#e5e8ec]">{it.prOrderedQty}</td>
                  <td className="px-2.5 py-1.5 text-right font-bold">
                    <span className={remaining > 0 ? 'text-[#137333]' : 'text-[#9aa0a6]'}>
                      {remaining} {it.pqtoUom}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
