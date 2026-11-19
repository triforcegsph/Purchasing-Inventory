import { useState } from 'react';
import { Search } from 'lucide-react';
import type { TransactionLog } from '../types/erp';

export function LogsModule({ logs }: { logs: TransactionLog[] }) {
  const [query, setQuery] = useState('');

  const filtered = logs.filter(
    (l) =>
      l.docNo.toLowerCase().includes(query.toLowerCase()) ||
      l.spName.toLowerCase().includes(query.toLowerCase()) ||
      l.adminOrUser.toLowerCase().includes(query.toLowerCase()) ||
      l.comments.toLowerCase().includes(query.toLowerCase()) ||
      l.module.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
      <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
          LOG — Transaction Audit Logs
        </span>

        <div className="relative w-full sm:w-64">
          <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter SP Name, Doc No, User..."
            className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Date & Time</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Admin / User</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">SP Name</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Module</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Doc No.</th>
              <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Action</th>
              <th className="px-2.5 py-1.5 font-semibold">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d5dbe2]">
            {filtered.map((log, idx) => (
              <tr key={log.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                <td className="px-2.5 py-1.5 font-mono text-[#495057] border-r border-[#e5e8ec] whitespace-nowrap">{log.timestamp}</td>
                <td className="px-2.5 py-1.5 font-medium border-r border-[#e5e8ec]">{log.adminOrUser}</td>
                <td className="px-2.5 py-1.5 font-mono text-[#005ec4] border-r border-[#e5e8ec]">{log.spName || '—'}</td>
                <td className="px-2.5 py-1.5 font-semibold border-r border-[#e5e8ec]">{log.module}</td>
                <td className="px-2.5 py-1.5 font-mono text-[#005ec4] border-r border-[#e5e8ec]">{log.docNo}</td>
                <td className="px-2.5 py-1.5 font-medium border-r border-[#e5e8ec]">{log.action}</td>
                <td className="px-2.5 py-1.5 text-[#495057]">{log.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
