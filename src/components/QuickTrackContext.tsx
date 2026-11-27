import React, { createContext, useContext, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  History,
  Layers,
  Package,
  Route,
  Search,
  X,
} from 'lucide-react';
import type {
  BoqItem,
  ModuleKey,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  StockTransferRecord,
  TransactionLog,
  WarehouseStock,
  WithdrawalRecord,
} from '../types/erp';
import { StatusBadge } from './SharedUI';

export type QuickTrackTarget =
  | { kind: 'item'; code: string }
  | { kind: 'txn'; docNo: string };

interface QuickTrackContextValue {
  openItem: (code: string) => void;
  openTxn: (docNo: string) => void;
}

const QuickTrackContext = createContext<QuickTrackContextValue>({
  openItem: () => {},
  openTxn: () => {},
});

export function useQuickTrack() {
  return useContext(QuickTrackContext);
}

export function ItemLink({
  code,
  className = '',
  children,
}: {
  code: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { openItem } = useQuickTrack();
  if (!code || code === '—') {
    return <span className={className}>{children || code || '—'}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openItem(code);
      }}
      title={`Click to inspect & track item ${code}`}
      className={`inline-flex items-center gap-1 font-mono text-left text-[#005ec4] hover:text-[#004494] hover:underline decoration-[#005ec4]/60 underline-offset-2 cursor-pointer ${className}`}
    >
      <span>{children ?? code}</span>
    </button>
  );
}

export function TxnLink({
  docNo,
  className = '',
  children,
}: {
  docNo: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { openTxn } = useQuickTrack();
  if (!docNo || docNo === '—') {
    return <span className={className}>{children || docNo || '—'}</span>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openTxn(docNo);
      }}
      title={`Click to inspect & track transaction ${docNo}`}
      className={`inline-flex items-center gap-1 font-mono text-left text-[#005ec4] hover:text-[#004494] hover:underline decoration-[#005ec4]/60 underline-offset-2 cursor-pointer ${className}`}
    >
      <span>{children ?? docNo}</span>
    </button>
  );
}

interface QuickTrackProviderProps {
  children: React.ReactNode;
  boqItems: BoqItem[];
  pqtos: PqtoRecord[];
  prs: PrRecord[];
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  withdrawals: WithdrawalRecord[];
  transfers: StockTransferRecord[];
  stock: WarehouseStock[];
  logs: TransactionLog[];
  allowedModules?: ModuleKey[];
  onNavigate: (module: ModuleKey, trackingQuery?: string) => void;
}

export function QuickTrackProvider({
  children,
  boqItems,
  pqtos,
  prs,
  pos,
  receivings,
  withdrawals,
  transfers,
  stock,
  logs,
  allowedModules,
  onNavigate,
}: QuickTrackProviderProps) {
  const canOpenModule = (mod: ModuleKey) => !allowedModules || allowedModules.includes(mod);
  const [history, setHistory] = useState<QuickTrackTarget[]>([]);

  const current = history[history.length - 1] || null;

  const openItem = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setHistory((prev) => [...prev, { kind: 'item', code: trimmed }]);
  };

  const openTxn = (docNo: string) => {
    const trimmed = docNo.trim();
    if (!trimmed) return;
    setHistory((prev) => [...prev, { kind: 'txn', docNo: trimmed }]);
  };

  const goBack = () => {
    setHistory((prev) => prev.slice(0, -1));
  };

  const closeAll = () => {
    setHistory([]);
  };

  const jumpToTracking = (query: string) => {
    closeAll();
    onNavigate('tracking', query);
  };

  const jumpToModule = (mod: ModuleKey) => {
    closeAll();
    onNavigate(mod);
  };

  return (
    <QuickTrackContext.Provider value={{ openItem, openTxn }}>
      {children}

      {current && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
          onClick={closeAll}
        >
          <div
            className="bg-white border border-[#cfd5dc] rounded-[4px] shadow-xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-2.5 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {history.length > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#1f2328] cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                )}
                {current.kind === 'item' ? (
                  <Package className="w-4 h-4 text-[#0072ed] shrink-0" />
                ) : (
                  <Layers className="w-4 h-4 text-[#0072ed] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#5c646d]">
                    {current.kind === 'item' ? 'Item Quick-Track' : 'Transaction Quick-Track'}
                  </div>
                  <div className="text-sm font-mono font-bold text-[#1f2328] truncate">
                    {current.kind === 'item' ? current.code : current.docNo}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canOpenModule('tracking') && (
                  <button
                    type="button"
                    onClick={() =>
                      jumpToTracking(current.kind === 'item' ? current.code : current.docNo)
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white rounded-[2px] text-[11px] font-semibold cursor-pointer"
                  >
                    <Route className="w-3.5 h-3.5" /> Track in TRK
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeAll}
                  className="p-1 text-[#5c646d] hover:text-[#1f2328] rounded-[2px] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {current.kind === 'item' ? (
                <ItemInspector
                  code={current.code}
                  boqItems={boqItems}
                  pqtos={pqtos}
                  prs={prs}
                  pos={pos}
                  receivings={receivings}
                  withdrawals={withdrawals}
                  transfers={transfers}
                  stock={stock}
                  onSelectTxn={openTxn}
                  onOpenModule={jumpToModule}
                  canOpenModule={canOpenModule}
                />
              ) : (
                <TxnInspector
                  docNo={current.docNo}
                  pqtos={pqtos}
                  prs={prs}
                  pos={pos}
                  receivings={receivings}
                  withdrawals={withdrawals}
                  transfers={transfers}
                  logs={logs}
                  onSelectItem={openItem}
                  onSelectTxn={openTxn}
                  onOpenModule={jumpToModule}
                  canOpenModule={canOpenModule}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </QuickTrackContext.Provider>
  );
}

function ItemInspector({
  code,
  boqItems,
  pqtos,
  prs,
  pos,
  receivings,
  withdrawals,
  transfers,
  stock,
  onSelectTxn,
  onOpenModule,
  canOpenModule,
}: {
  code: string;
  boqItems: BoqItem[];
  pqtos: PqtoRecord[];
  prs: PrRecord[];
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  withdrawals: WithdrawalRecord[];
  transfers: StockTransferRecord[];
  stock: WarehouseStock[];
  onSelectTxn: (docNo: string) => void;
  onOpenModule: (mod: ModuleKey) => void;
  canOpenModule: (mod: ModuleKey) => boolean;
}) {
  const norm = code.toLowerCase();
  const boqMatches = boqItems.filter((b) => b.itemCode.toLowerCase() === norm);
  const pqtoMatches = pqtos.flatMap((p) =>
    p.items
      .filter((it) => it.itemCode.toLowerCase() === norm)
      .map((it) => ({ pqtoNo: p.pqtoNo, jobNo: p.jobNo, status: p.status, item: it }))
  );
  const prMatches = prs.filter((p) => p.items.some((it) => it.itemCode.toLowerCase() === norm));
  const poMatches = pos.filter((p) => p.items.some((it) => it.itemCode.toLowerCase() === norm));
  const rcvMatches = receivings.filter((r) => r.items.some((it) => it.itemCode.toLowerCase() === norm));
  const wdMatches = withdrawals.filter((w) => w.items.some((it) => it.itemCode.toLowerCase() === norm));
  const trMatches = transfers.filter((t) => t.itemCode.toLowerCase() === norm);
  const stockMatches = stock.filter((s) => s.itemCode.toLowerCase() === norm);

  const description =
    boqMatches[0]?.description ||
    pqtoMatches[0]?.item.description ||
    stockMatches[0]?.description ||
    prMatches[0]?.items.find((i) => i.itemCode.toLowerCase() === norm)?.description ||
    'Item details';

  const totalAvailable = stockMatches.reduce((s, st) => s + st.availableStock, 0);
  const totalPqto = pqtoMatches.reduce((s, m) => s + m.item.pqtoQty, 0);
  const totalPrOrdered = pqtoMatches.reduce((s, m) => s + m.item.prOrderedQty, 0);

  return (
    <>
      <div className="bg-[#fafbfd] border border-[#cfd5dc] rounded-[2px] p-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-[#1f2328] text-sm">{description}</div>
            <div className="text-[11px] text-[#5c646d] mt-0.5">
              BOQ Lines: <strong>{boqMatches.length}</strong> • PQTO Budget:{' '}
              <strong>{totalPqto}</strong> • PR Ordered: <strong>{totalPrOrdered}</strong> •
              Warehouse Available: <strong className="text-[#137333]">{totalAvailable}</strong>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {canOpenModule('boq') && (
              <button
                type="button"
                onClick={() => onOpenModule('boq')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#1f2328] cursor-pointer"
              >
                Open BOQ <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {canOpenModule('pqto') && (
              <button
                type="button"
                onClick={() => onOpenModule('pqto')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#1f2328] cursor-pointer"
              >
                Open PQTO <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Stock */}
      {stockMatches.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#495057] mb-1.5">
            Warehouse Stock ({stockMatches.length})
          </div>
          <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                  <th className="px-2.5 py-1.5 font-semibold">Location</th>
                  <th className="px-2.5 py-1.5 font-semibold">System</th>
                  <th className="px-2.5 py-1.5 font-semibold text-right">Available</th>
                  <th className="px-2.5 py-1.5 font-semibold text-right">Reserved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ec]">
                {stockMatches.map((st) => (
                  <tr key={st.id}>
                    <td className="px-2.5 py-1.5">{st.assignedLocation}</td>
                    <td className="px-2.5 py-1.5 font-mono text-[#5c646d]">{st.systemTag}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-bold text-[#137333]">
                      {st.availableStock} {st.uom}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono">{st.reservedStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Linked Transactions */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#495057] mb-1.5">
          Linked Transactions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TxnGroupCard
            title={`PQTO (${pqtoMatches.length})`}
            items={pqtoMatches.map((m) => ({
              docNo: m.pqtoNo,
              meta: `${m.jobNo} • Qty ${m.item.pqtoQty} ${m.item.pqtoUom}`,
              status: m.status,
            }))}
            onSelectTxn={onSelectTxn}
          />
          <TxnGroupCard
            title={`Purchase Requisitions (${prMatches.length})`}
            items={prMatches.map((p) => {
              const line = p.items.find((i) => i.itemCode.toLowerCase() === norm);
              return {
                docNo: p.prNo,
                meta: `${p.applicant} • Qty ${line?.requestedQty ?? 0} ${line?.uom ?? ''}`,
                status: p.status,
              };
            })}
            onSelectTxn={onSelectTxn}
          />
          <TxnGroupCard
            title={`Purchase Orders (${poMatches.length})`}
            items={poMatches.map((p) => {
              const line = p.items.find((i) => i.itemCode.toLowerCase() === norm);
              return {
                docNo: p.poNo,
                meta: `${p.vendor} • PO Qty ${line?.poQty ?? 0} (Rcv ${line?.receivedQty ?? 0})`,
                status: p.status,
              };
            })}
            onSelectTxn={onSelectTxn}
          />
          <TxnGroupCard
            title={`Receivings / Withdrawals / Transfers (${
              rcvMatches.length + wdMatches.length + trMatches.length
            })`}
            items={[
              ...rcvMatches.map((r) => ({
                docNo: r.grnNo,
                meta: `DR ${r.drNo} • ${r.performedAt}`,
                status: r.status,
              })),
              ...wdMatches.map((w) => ({
                docNo: w.wdNo,
                meta: `By ${w.requestedBy} • ${w.performedAt}`,
                status: w.status,
              })),
              ...trMatches.map((t) => ({
                docNo: t.transferNo,
                meta: `${t.fromLocation} -> ${t.toLocation} (${t.qty} ${t.uom})`,
                status: t.type,
              })),
            ]}
            onSelectTxn={onSelectTxn}
          />
        </div>
      </div>
    </>
  );
}

function TxnGroupCard({
  title,
  items,
  onSelectTxn,
}: {
  title: string;
  items: { docNo: string; meta: string; status: string }[];
  onSelectTxn: (docNo: string) => void;
}) {
  return (
    <div className="border border-[#cfd5dc] rounded-[2px] bg-white">
      <div className="px-2.5 py-1.5 bg-[#f4f6f8] border-b border-[#cfd5dc] text-[11px] font-semibold text-[#1f2328]">
        {title}
      </div>
      <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-[11px] text-[#6b7280] italic">None</div>
        ) : (
          items.map((it, idx) => (
            <div
              key={`${it.docNo}-${idx}`}
              className="flex items-center justify-between gap-2 text-[11px] border-b border-[#f1f3f5] last:border-b-0 pb-1 last:pb-0"
            >
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectTxn(it.docNo)}
                  className="font-mono font-bold text-[#005ec4] hover:underline cursor-pointer"
                >
                  {it.docNo}
                </button>
                <div className="text-[10px] text-[#5c646d] truncate">{it.meta}</div>
              </div>
              <StatusBadge status={it.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TxnInspector({
  docNo,
  pqtos,
  prs,
  pos,
  receivings,
  withdrawals,
  transfers,
  logs,
  onSelectItem,
  onSelectTxn,
  onOpenModule,
  canOpenModule,
}: {
  docNo: string;
  pqtos: PqtoRecord[];
  prs: PrRecord[];
  pos: PoRecord[];
  receivings: ReceivingRecord[];
  withdrawals: WithdrawalRecord[];
  transfers: StockTransferRecord[];
  logs: TransactionLog[];
  onSelectItem: (code: string) => void;
  onSelectTxn: (docNo: string) => void;
  onOpenModule: (mod: ModuleKey) => void;
  canOpenModule: (mod: ModuleKey) => boolean;
}) {
  const norm = docNo.toLowerCase();
  const pqto = pqtos.find((p) => p.pqtoNo.toLowerCase() === norm);
  const pr = prs.find((p) => p.prNo.toLowerCase() === norm);
  const po = pos.find((p) => p.poNo.toLowerCase() === norm);
  const rcv = receivings.find(
    (r) => r.grnNo.toLowerCase() === norm || r.drNo.toLowerCase() === norm
  );
  const wd = withdrawals.find((w) => w.wdNo.toLowerCase() === norm);
  const tr = transfers.find((t) => t.transferNo.toLowerCase() === norm);
  const relatedLogs = logs.filter((l) => l.docNo.toLowerCase() === norm);

  const targetModule: ModuleKey | null = pqto
    ? 'pqto'
    : pr
    ? 'pr'
    : po
    ? 'po'
    : rcv
    ? 'receiving'
    : wd
    ? 'withdrawal'
    : tr
    ? 'transfers'
    : docNo.toUpperCase().startsWith('BOQ')
    ? 'boq'
    : null;

  const lineItems: {
    itemCode: string;
    description: string;
    qty: string;
    location?: string;
  }[] = pqto
    ? pqto.items.map((i) => ({
        itemCode: i.itemCode,
        description: i.description,
        qty: `${i.pqtoQty} ${i.pqtoUom} (PR: ${i.prOrderedQty})`,
        location: i.assignedLocation,
      }))
    : pr
    ? pr.items.map((i) => ({
        itemCode: i.itemCode,
        description: i.description,
        qty: `${i.requestedQty} ${i.uom}`,
        location: i.assignedLocation,
      }))
    : po
    ? po.items.map((i) => ({
        itemCode: i.itemCode,
        description: i.description,
        qty: `${i.poQty} ${i.uom} (Rcv: ${i.receivedQty})`,
        location: i.assignedLocation,
      }))
    : rcv
    ? rcv.items.map((i) => ({
        itemCode: i.itemCode,
        description: i.description,
        qty: `${i.actualReceivedQty} / ${i.orderedQty} ${i.uom}`,
      }))
    : wd
    ? wd.items.map((i) => ({
        itemCode: i.itemCode,
        description: i.description,
        qty: `${i.requestedQty} ${i.uom}`,
        location: i.assignedLocation,
      }))
    : tr
    ? [
        {
          itemCode: tr.itemCode,
          description: tr.description,
          qty: `${tr.qty} ${tr.uom}`,
          location: `${tr.fromLocation} -> ${tr.toLocation}`,
        },
      ]
    : [];

  // Build chain links
  const linkedDocs: { label: string; docNo: string }[] = [];
  if (pr) {
    if (pr.pqtoNo) linkedDocs.push({ label: 'PQTO', docNo: pr.pqtoNo });
    pos.filter((p) => p.prNo === pr.prNo).forEach((p) => linkedDocs.push({ label: 'PO', docNo: p.poNo }));
  }
  if (po) {
    if (po.prNo) linkedDocs.push({ label: 'PR', docNo: po.prNo });
    receivings
      .filter((r) => r.poNo === po.poNo)
      .forEach((r) => linkedDocs.push({ label: 'GRN', docNo: r.grnNo }));
  }
  if (rcv && rcv.poNo) {
    linkedDocs.push({ label: 'PO', docNo: rcv.poNo });
  }
  if (pqto) {
    prs
      .filter((p) => p.pqtoNo === pqto.pqtoNo)
      .forEach((p) => linkedDocs.push({ label: 'PR', docNo: p.prNo }));
  }

  return (
    <>
      <div className="bg-[#fafbfd] border border-[#cfd5dc] rounded-[2px] p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-[#1f2328]">{docNo}</span>
            {pqto && <StatusBadge status={pqto.status} />}
            {pr && <StatusBadge status={pr.status} />}
            {po && <StatusBadge status={po.status} />}
            {rcv && <StatusBadge status={rcv.status} />}
            {wd && <StatusBadge status={wd.status} />}
            {tr && <StatusBadge status={tr.type} />}
          </div>
          <div className="text-[11px] text-[#5c646d]">
            {pqto && `Job: ${pqto.jobNo} • Lines: ${pqto.items.length}`}
            {pr && `Requester: ${pr.applicant} • Ref: ${pr.refDocNo} • ${pr.createdAt}`}
            {po && `Vendor: ${po.vendor} • IAAS2: ${po.iaas2RefNo} • ${po.createdAt}`}
            {rcv && `DR: ${rcv.drNo} (${rcv.drDate}) • ${rcv.performedAt}`}
            {wd && `By: ${wd.requestedBy} • Job: ${wd.jobNo} • ${wd.performedAt}`}
            {tr && `${tr.fromLocation} -> ${tr.toLocation} • ${tr.performedAt}`}
            {!pqto && !pr && !po && !rcv && !wd && !tr && 'Audit Log Reference'}
          </div>
        </div>

        {targetModule && canOpenModule(targetModule) && (
          <button
            type="button"
            onClick={() => onOpenModule(targetModule)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold text-[#1f2328] cursor-pointer"
          >
            Open in {targetModule.toUpperCase()} <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Connected Chain Links */}
      {linkedDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#495057]">
            Connected Docs:
          </span>
          {linkedDocs.map((ld, idx) => (
            <button
              key={`${ld.docNo}-${idx}`}
              type="button"
              onClick={() => onSelectTxn(ld.docNo)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e7f1ff] hover:bg-[#d0e6ff] text-[#004a99] border border-[#b3d1ff] rounded-[2px] text-[11px] font-mono font-semibold cursor-pointer"
            >
              <span className="text-[10px] uppercase opacity-75">{ld.label}:</span>
              {ld.docNo}
              <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#495057] mb-1.5">
            Line Items ({lineItems.length}) — click any Item Code to inspect
          </div>
          <div className="border border-[#cfd5dc] rounded-[2px] overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc]">
                  <th className="px-2.5 py-1.5 font-semibold">Item Code</th>
                  <th className="px-2.5 py-1.5 font-semibold">Description</th>
                  <th className="px-2.5 py-1.5 font-semibold">Qty</th>
                  <th className="px-2.5 py-1.5 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e8ec]">
                {lineItems.map((li, idx) => (
                  <tr key={`${li.itemCode}-${idx}`}>
                    <td className="px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectItem(li.itemCode)}
                        className="font-mono font-semibold text-[#005ec4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3 h-3 opacity-70" />
                        {li.itemCode}
                      </button>
                    </td>
                    <td className="px-2.5 py-1.5">{li.description}</td>
                    <td className="px-2.5 py-1.5 font-mono">{li.qty}</td>
                    <td className="px-2.5 py-1.5 text-[#5c646d]">{li.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#495057] mb-1.5 flex items-center gap-1">
          <History className="w-3.5 h-3.5" /> Audit Trail ({relatedLogs.length})
        </div>
        {relatedLogs.length === 0 ? (
          <div className="text-[11px] text-[#6b7280] italic border border-[#e5e8ec] rounded-[2px] p-2.5">
            No audit log entries recorded for {docNo}.
          </div>
        ) : (
          <div className="border border-[#cfd5dc] rounded-[2px] divide-y divide-[#e5e8ec]">
            {relatedLogs.map((l) => (
              <div key={l.id} className="px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div>
                  <span className="font-semibold text-[#1f2328]">{l.action}</span>{' '}
                  <span className="text-[#5c646d]">by {l.adminOrUser}</span>
                  {l.comments && <div className="text-[#495057] mt-0.5">{l.comments}</div>}
                </div>
                <span className="font-mono text-[10px] text-[#6b7280]">{l.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

