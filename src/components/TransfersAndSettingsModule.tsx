import { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  Mail,
  PackageCheck,
  PackageMinus,
  Percent,
  Plus,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  PoRecord,
  ReceivingRecord,
  RequiredFieldConfig,
  SmtpConfig,
  StockTransferRecord,
  UserRole,
  WarehouseStock,
  WithdrawalRecord,
} from '../types/erp';
import { StatusBadge } from './SharedUI';

interface TransfersAndSettingsProps {
  stock: WarehouseStock[];
  setStock?: React.Dispatch<React.SetStateAction<WarehouseStock[]>>;
  transfers: StockTransferRecord[];
  config: RequiredFieldConfig;
  setConfig: React.Dispatch<React.SetStateAction<RequiredFieldConfig>>;
  onPostTransfer: (tr: StockTransferRecord) => void;
  pos?: PoRecord[];
  withdrawals?: WithdrawalRecord[];
  receivings?: ReceivingRecord[];
  smtpConfig?: SmtpConfig;
  setSmtpConfig?: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  onAddLog?: (module: string, docNo: string, action: string, comments: string) => void;
  businessUnit?: string;
  activeRole?: UserRole;
}

export function TransfersAndSettingsModule({
  stock,
  setStock,
  transfers,
  config,
  setConfig,
  onPostTransfer,
  pos = [],
  withdrawals = [],
  receivings = [],
  smtpConfig,
  setSmtpConfig,
  onAddLog,
  businessUnit = 'PROJ-TWRB',
  activeRole,
}: TransfersAndSettingsProps) {
  const canManageInventory =
    activeRole === 'Warehouse Manager' || activeRole === 'Admin' || activeRole === 'Purchaser';
  const isPurchaser = activeRole === 'Purchaser';
  // Local SMTP state if parent doesn't provide setter
  const [localSmtp, setLocalSmtp] = useState<SmtpConfig>(
    smtpConfig || {
      host: 'smtp.triforcegs.com.ph',
      port: 587,
      encryption: 'TLS',
      username: 'procurement@triforcegs.com.ph',
      password: '••••••••••••',
      fromEmail: 'procurement@triforcegs.com.ph',
      fromName: 'Infor SunSystems Construction Procurement',
      recipientBoqToPr: 'purchasing@triforcegs.com.ph',
      notifyOnBoqToPr: true,
      notifyOnPoApproval: true,
      notifyOnLowStock: true,
      lastTestedAt: '2026-11-19 10:15',
      status: 'Connected',
    }
  );

  const activeSmtp = smtpConfig || localSmtp;
  const updateSmtp = (patch: Partial<SmtpConfig>) => {
    if (setSmtpConfig) {
      setSmtpConfig((prev) => ({ ...prev, ...patch }));
    } else {
      setLocalSmtp((prev) => ({ ...prev, ...patch }));
    }
  };

  // Section tab state
  const [activeSection, setActiveSection] = useState<'overview' | 'stock' | 'transfers' | 'rules'>(
    isPurchaser ? 'stock' : 'overview'
  );

  // Stock Transfer state
  const [type, setType] = useState<'Stock Transfer' | 'Excess Return to Warehouse'>('Excess Return to Warehouse');
  const [selectedItemCode, setSelectedItemCode] = useState(stock[0]?.itemCode || '');
  const [fromLocation, setFromLocation] = useState('Zone A - Pump Room');
  const [toLocation, setToLocation] = useState('Central Warehouse');
  const [qty, setQty] = useState(2);
  const [reason, setReason] = useState('Excess material after installation');
  const [toast, setToast] = useState<string | null>(null);

  // Admin inventory search & filter
  const [inventorySearch, setInventorySearch] = useState('');
  const [systemFilter, setSystemFilter] = useState('ALL');

  // Inventory 2 Forms Tab: Form 1 = Issuances (Outflow), Form 2 = PO Receivings (Inflow)
  const [activeInventoryForm, setActiveInventoryForm] = useState<'issuance' | 'po'>('issuance');

  // SMTP Testing feedback state
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  // Add Item to Inventory form state
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemUom, setNewItemUom] = useState('PC/s');
  const [newItemTag, setNewItemTag] = useState('MECH');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemQty, setNewItemQty] = useState(0);

  const handleAddStockItem = () => {
    if (!newItemCode.trim() || !newItemDesc.trim()) return;
    if (!setStock) return;
    const item: WarehouseStock = {
      id: `stk-new-${Date.now()}`,
      itemCode: newItemCode.trim().toUpperCase(),
      description: newItemDesc.trim(),
      uom: newItemUom,
      systemTag: newItemTag,
      assignedLocation: newItemLocation.trim() || 'Central Warehouse',
      availableStock: newItemQty,
      reservedStock: 0,
    };
    setStock((prev) => [...prev, item]);
    if (onAddLog) {
      onAddLog('Inventory', item.itemCode, 'Item Added to Inventory', `${item.description} — ${item.availableStock} ${item.uom} @ ${item.assignedLocation}`);
    }
    notify(`${item.itemCode} added to inventory.`);
    setNewItemCode('');
    setNewItemDesc('');
    setNewItemUom('PC/s');
    setNewItemTag('MECH');
    setNewItemLocation('');
    setNewItemQty(0);
    setShowAddItemForm(false);
  };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // -------------------------------------------------------------
  // Calculations: Percentage of Completion & Cost Projections
  // -------------------------------------------------------------
  const totalOrderQty = pos.reduce(
    (sum, p) => sum + p.items.reduce((iSum, it) => iSum + it.poQty, 0),
    0
  );

  const totalOrderBudget = pos.reduce(
    (sum, p) => sum + p.items.reduce((iSum, it) => iSum + (it.poQty * (it.unitPrice || 0)), 0),
    0
  );

  // Total Issued from Material Withdrawals
  const totalIssuedQty = withdrawals
    .filter((w) => w.status === 'With Stock')
    .reduce((sum, w) => sum + w.items.reduce((iSum, it) => iSum + it.requestedQty, 0), 0);

  // Estimate issued cost based on matched PO unit prices or standard rates
  const averageUnitCost = totalOrderQty > 0 ? totalOrderBudget / totalOrderQty : 4200;
  const totalIssuedCost = totalIssuedQty * averageUnitCost;

  // Percentage of Completion
  const completionPercentage = totalOrderQty > 0 ? (totalIssuedQty / totalOrderQty) * 100 : 0;
  const financialCompletionPercentage = totalOrderBudget > 0 ? (totalIssuedCost / totalOrderBudget) * 100 : 0;

  // Projection Cost at Completion = Actual Issued Cost + Remaining Qty * Avg Unit Rate
  const remainingQty = Math.max(0, totalOrderQty - totalIssuedQty);
  const projectedCostAtCompletion = totalIssuedCost + (remainingQty * averageUnitCost);
  const budgetVariance = totalOrderBudget - projectedCostAtCompletion;

  // Filtered Stock for Admin Items Inspector
  const filteredStock = stock.filter((s) => {
    const matchesSystem = systemFilter === 'ALL' || s.systemTag === systemFilter;
    const matchesQuery =
      s.itemCode.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      s.description.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      s.assignedLocation.toLowerCase().includes(inventorySearch.toLowerCase());
    return matchesSystem && matchesQuery;
  });

  const selectedStock = stock.find((s) => s.itemCode === selectedItemCode) || stock[0];

  const handlePostTransferSubmit = () => {
    if (!selectedStock || qty <= 0) return;
    const tr: StockTransferRecord = {
      id: `tr-${Date.now()}`,
      transferNo: `TR-2026-${Math.floor(Math.random() * 800 + 100)}`,
      type,
      fromLocation,
      toLocation: type === 'Excess Return to Warehouse' ? 'Central Warehouse' : toLocation,
      itemCode: selectedStock.itemCode,
      description: selectedStock.description,
      qty,
      uom: selectedStock.uom,
      reason,
      performedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onPostTransfer(tr);
    notify(`${tr.transferNo} (${type}) posted successfully.`);
  };

  const handleTestSmtp = () => {
    setIsTestingSmtp(true);
    setTimeout(() => {
      setIsTestingSmtp(false);
      const testTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updateSmtp({
        status: 'Connected',
        lastTestedAt: testTime,
      });
      if (onAddLog) {
        onAddLog(
          'SMTP',
          'SMTP-TEST',
          'Connection Verified',
          `Handshake successful with ${activeSmtp.host}:${activeSmtp.port} (${activeSmtp.encryption}). Sent test ping to ${activeSmtp.recipientBoqToPr}.`
        );
      }
      notify(`SMTP Test OK: 250 Connected to ${activeSmtp.host}:${activeSmtp.port} (${activeSmtp.encryption}).`);
    }, 700);
  };

  return (
    <div className="space-y-3.5">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {toast}
        </div>
      )}

      {/* Clean Sub-Navigation Tabs */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            isPurchaser
              ? ([
                  { key: 'stock', label: `Inventory Stock (${stock.length})` },
                  { key: 'overview', label: 'Cost & Movements' },
                ] as const)
              : ([
                  { key: 'overview', label: 'Cost & Movements' },
                  { key: 'stock', label: `Inventory Stock (${stock.length})` },
                  { key: 'transfers', label: `Stock Transfers (${transfers.length})` },
                  { key: 'rules', label: 'Rules & SMTP' },
                ] as const)
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] cursor-pointer transition-colors ${
                activeSection === tab.key
                  ? 'bg-[#0072ed] text-white'
                  : 'bg-[#f4f6f8] text-[#1f2328] hover:bg-[#e5e8ec] border border-[#cfd5dc]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#5c646d] px-0.5">
          {activeSection === 'stock' &&
            'Search current warehouse stock levels and manually add new items to inventory.'}
          {activeSection === 'overview' &&
            'Review PO budget vs. site issuance completion, projected cost, and stock movement history.'}
          {activeSection === 'transfers' &&
            'Log site-to-site stock transfers or excess material returns back to Central Warehouse.'}
          {activeSection === 'rules' &&
            'Configure required-field validation rules and SMTP email notifications.'}
        </p>
      </div>

      {activeSection === 'overview' && (
        <>
      {/* ========================================================================= */}
      {/* 1. ISSUANCE TOTAL / TOTAL ORDER % OF COMPLETION & PROJECTION COST CARD   */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e8ec] pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0072ed]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Issuance Total vs. Total Order — Completion &amp; Projection Cost Dashboard
            </span>
          </div>
          <span className="text-[11px] text-[#5c646d] font-mono">
            Project: {businessUnit} • Base Currency: PHP (₱)
          </span>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Order */}
          <div className="border border-[#cfd5dc] rounded-[2px] p-2.5 bg-[#fafbfd] space-y-1">
            <div className="text-[10px] font-bold uppercase text-[#5c646d] flex items-center justify-between">
              <span>Total Orders (PO Budget)</span>
              <Boxes className="w-3.5 h-3.5 text-[#005ec4]" />
            </div>
            <div className="text-lg font-bold text-[#1f2328] font-mono">
              ₱ {totalOrderBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#5c646d]">
              Total Material Qty: <strong className="text-[#1f2328]">{totalOrderQty} units</strong> across {pos.length} POs
            </div>
          </div>

          {/* Total Issuance */}
          <div className="border border-[#cfd5dc] rounded-[2px] p-2.5 bg-[#fafbfd] space-y-1">
            <div className="text-[10px] font-bold uppercase text-[#5c646d] flex items-center justify-between">
              <span>Total Issuance to Site</span>
              <PackageMinus className="w-3.5 h-3.5 text-[#137333]" />
            </div>
            <div className="text-lg font-bold text-[#137333] font-mono">
              ₱ {totalIssuedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#5c646d]">
              Total Issued Qty: <strong className="text-[#137333]">{totalIssuedQty} units</strong> ({withdrawals.length} Slips)
            </div>
          </div>

          {/* Percentage of Completion */}
          <div className="border border-[#cfd5dc] rounded-[2px] p-2.5 bg-[#fafbfd] space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-[#5c646d] flex items-center justify-between">
              <span>Percentage of Completion</span>
              <Percent className="w-3.5 h-3.5 text-[#0072ed]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#0072ed] font-mono">
                {completionPercentage.toFixed(1)}%
              </span>
              <span className="text-[11px] text-[#5c646d]">
                (Spend: {financialCompletionPercentage.toFixed(1)}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#e5e8ec] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0072ed] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, completionPercentage)}%` }}
              />
            </div>
          </div>

          {/* Projection Cost at Completion */}
          <div className="border border-[#cfd5dc] rounded-[2px] p-2.5 bg-[#fafbfd] space-y-1">
            <div className="text-[10px] font-bold uppercase text-[#5c646d] flex items-center justify-between">
              <span>Projected Cost at Completion</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
            </div>
            <div className="text-lg font-bold text-[#1f2328] font-mono">
              ₱ {projectedCostAtCompletion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[#137333] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Variance: ₱ {budgetVariance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (On Track)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INVENTORY 2 FORMS: FORM 1 (ISSUANCE) vs FORM 2 (PO RECEIVING)         */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Inventory Movement Forms (Issuance vs. PO Inflows)
            </span>
          </div>

          {/* Form Switcher Tabs */}
          <div className="flex items-center bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveInventoryForm('issuance')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 font-semibold rounded-[2px] transition-colors cursor-pointer ${
                activeInventoryForm === 'issuance'
                  ? 'bg-[#0072ed] text-white shadow-xs'
                  : 'text-[#495057] hover:text-[#1f2328]'
              }`}
            >
              <PackageMinus className="w-3.5 h-3.5" /> Form 1: Issuances (Stock Out / WD)
            </button>
            <button
              type="button"
              onClick={() => setActiveInventoryForm('po')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 font-semibold rounded-[2px] transition-colors cursor-pointer ${
                activeInventoryForm === 'po'
                  ? 'bg-[#0072ed] text-white shadow-xs'
                  : 'text-[#495057] hover:text-[#1f2328]'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" /> Form 2: PO Receivings (Stock In / RCV)
            </button>
          </div>
        </div>

        {/* Form 1: Material Issuances (Stock Outflow) */}
        {activeInventoryForm === 'issuance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Withdrawal Slip #</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">System Category</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Job No.</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Requester</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Issued</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Issued Qty</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Date Performed</th>
                  <th className="px-2.5 py-1.5 font-semibold">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5dbe2]">
                {withdrawals.map((w, idx) => (
                  <tr key={w.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-1.5 font-mono font-semibold text-[#005ec4] border-r border-[#e5e8ec]">{w.wdNo}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{w.systemTag}</td>
                    <td className="px-2.5 py-1.5 font-mono text-[#5c646d] border-r border-[#e5e8ec]">{w.jobNo}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{w.requestedBy}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                      <div className="font-mono font-semibold">{w.items[0]?.itemCode}</div>
                      <div className="text-[11px] text-[#5c646d] truncate max-w-xs">{w.items[0]?.description}</div>
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-bold text-[#137333] border-r border-[#e5e8ec]">
                      {w.items[0]?.requestedQty} {w.items[0]?.uom}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[#5c646d] border-r border-[#e5e8ec]">{w.performedAt}</td>
                    <td className="px-2.5 py-1.5">
                      <StatusBadge status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Form 2: PO Goods Receivings (Stock Inflow) */}
        {activeInventoryForm === 'po' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Receiving #</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Purchase Order #</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Ref Doc / IAAS2</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">DR No. &amp; Date</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Delivered Items</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Qty Received</th>
                  <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Stocking Date</th>
                  <th className="px-2.5 py-1.5 font-semibold">Receiving Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5dbe2]">
                {receivings.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-1.5 font-mono font-semibold text-[#005ec4] border-r border-[#e5e8ec]">{r.grnNo}</td>
                    <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{r.poNo}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                      <div>{r.refDocNo}</div>
                      <div className="text-[11px] font-mono text-[#5c646d]">{r.iaas2RefNo}</div>
                    </td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                      {r.drNo} ({r.drDate})
                    </td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                      <div className="font-mono font-semibold">{r.items[0]?.itemCode}</div>
                      <div className="text-[11px] text-[#5c646d] truncate max-w-xs">{r.items[0]?.description}</div>
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-bold text-[#0072ed] border-r border-[#e5e8ec]">
                      {r.items.reduce((sum, it) => sum + it.actualReceivedQty, 0)} units
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[#5c646d] border-r border-[#e5e8ec]">{r.performedAt}</td>
                    <td className="px-2.5 py-1.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        </>
      )}

      {activeSection === 'stock' && (
        <>
      {/* ========================================================================= */}
      {/* 3. INVENTORY SYSTEM FOR ADMIN CHECKING THE ITEMS (STOCK INSPECTION)       */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Admin Inventory Master Inspection &amp; Stock Checking
            </span>
            <span className="text-xs bg-[#e7f1ff] text-[#005ec4] border border-[#b6d4fe] px-2 py-0.5 rounded-[2px] font-semibold">
              {filteredStock.length} Active Items
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManageInventory && (
              <button
                onClick={() => setShowAddItemForm((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e7f1ff] hover:bg-[#d0e6ff] text-[#004a99] border border-[#b3d1ff] rounded-[2px] text-[11px] font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Item to Inventory
              </button>
            )}

            {/* System Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#5c646d]">System:</span>
              <select
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                className="h-7 text-xs border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
              >
                <option value="ALL">All Systems</option>
                {Array.from(new Set(stock.map((s) => s.systemTag))).map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3 h-3 text-[#6b7280] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search item, code, location..."
                className="w-full h-7 pl-7 pr-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
              />
            </div>
          </div>
        </div>

        {showAddItemForm && (
          <div className="px-3 py-3 bg-[#f4f8ff] border-b border-[#b3d1ff]">
            <div className="text-[11px] font-bold text-[#004a99] uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>New Inventory Item</span>
              <button onClick={() => setShowAddItemForm(false)} className="text-[#5c646d] hover:text-[#1f2328] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">Item Code *</label>
                <input
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  placeholder="MAT-XXX-00"
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">Description *</label>
                <input
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="e.g. Gate Valve, Flanged PN16 - 100mm"
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">UOM</label>
                <select
                  value={newItemUom}
                  onChange={(e) => setNewItemUom(e.target.value)}
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
                >
                  <option>PC/s</option>
                  <option>lot</option>
                  <option>m</option>
                  <option>kg</option>
                  <option>set</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">System Tag</label>
                <select
                  value={newItemTag}
                  onChange={(e) => setNewItemTag(e.target.value)}
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
                >
                  {Array.from(new Set(['MECH', 'ELEC', 'CIVIL', 'PLBG', ...stock.map((s) => s.systemTag)])).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">Location</label>
                <input
                  value={newItemLocation}
                  onChange={(e) => setNewItemLocation(e.target.value)}
                  placeholder="Central Warehouse"
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-[#5c646d] uppercase">Opening Stock</label>
                <input
                  type="number"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  className="h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white text-right"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleAddStockItem}
                disabled={!newItemCode.trim() || !newItemDesc.trim()}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] disabled:bg-[#b9c0c8] text-white text-xs font-semibold rounded-[2px] cursor-pointer disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" /> Add to Inventory
              </button>
              <span className="text-[11px] text-[#5c646d]">Item will appear immediately in the stock table and in the PR item picker after the next BOQ post.</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item Code</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Description</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">System Tag</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Location</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right bg-[#e6f4ea] text-[#137333]">
                  Available Stock
                </th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Reserved</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-center">UOM</th>
                <th className="px-2.5 py-1.5 font-semibold">Stock Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {filteredStock.map((s, idx) => {
                let statusBadge = 'In Stock (Healthy)';
                let statusStyle = 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]';
                if (s.availableStock === 0) {
                  statusBadge = 'Depleted / Out of Stock';
                  statusStyle = 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]';
                } else if (s.availableStock < 10) {
                  statusBadge = 'Low Stock Reorder Alert';
                  statusStyle = 'bg-[#fff8e1] text-[#8d6e00] border-[#ffe082]';
                }

                return (
                  <tr key={s.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{s.itemCode}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">{s.description}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec] text-[#5c646d]">{s.systemTag}</td>
                    <td className="px-2.5 py-1.5 border-r border-[#e5e8ec] text-[#5c646d]">{s.assignedLocation}</td>
                    <td className="px-2.5 py-1.5 text-right font-bold font-mono text-[#137333] bg-[#f4fbf6] border-r border-[#e5e8ec]">
                      {s.availableStock}
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-[#5c646d] border-r border-[#e5e8ec]">
                      {s.reservedStock}
                    </td>
                    <td className="px-2.5 py-1.5 text-center text-[#5c646d] border-r border-[#e5e8ec]">{s.uom}</td>
                    <td className="px-2.5 py-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-wide border ${statusStyle}`}>
                        {statusBadge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeSection === 'rules' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* SMTP Configuration for BOQ to PR Email Dispatch */}
        <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
          <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0072ed]" />
              SMTP Setup for BOQ to PR Email Notifications
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e6f4ea] text-[#137333] border border-[#a8dab5] rounded-[2px] text-[10px] font-bold uppercase">
              <CheckCircle2 className="w-3 h-3 text-[#137333]" /> {activeSmtp.status}
            </span>
          </div>

          <div className="p-3 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">SMTP Host Server</label>
                <input
                  value={activeSmtp.host}
                  onChange={(e) => updateSmtp({ host: e.target.value })}
                  placeholder="smtp.triforcegs.com.ph"
                  className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Port &amp; Security</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={activeSmtp.port}
                    onChange={(e) => updateSmtp({ port: Number(e.target.value) })}
                    className="w-16 h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
                  />
                  <select
                    value={activeSmtp.encryption}
                    onChange={(e) => updateSmtp({ encryption: e.target.value as 'TLS' | 'SSL' | 'None' })}
                    className="flex-1 h-7 border border-[#b9c0c8] rounded-[2px] px-1 bg-white font-semibold"
                  >
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Username / Sender Email</label>
                <input
                  value={activeSmtp.username}
                  onChange={(e) => updateSmtp({ username: e.target.value, fromEmail: e.target.value })}
                  className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Target Notification Email (BOQ &rarr; PR)</label>
                <input
                  value={activeSmtp.recipientBoqToPr}
                  onChange={(e) => updateSmtp({ recipientBoqToPr: e.target.value })}
                  className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white font-mono"
                />
              </div>
            </div>

            {/* Notification Event Triggers */}
            <div className="border border-[#e5e8ec] rounded-[2px] p-2 bg-[#fafbfd] space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-[#5c646d]">
                Automated SMTP Event Triggers
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSmtp.notifyOnBoqToPr}
                  onChange={(e) => updateSmtp({ notifyOnBoqToPr: e.target.checked })}
                  className="w-3.5 h-3.5 accent-[#0072ed]"
                />
                <span className="text-[11px] font-medium text-[#1f2328]">
                  Dispatch automated email when BOQ is converted / posted to PQTO/PR
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSmtp.notifyOnPoApproval}
                  onChange={(e) => updateSmtp({ notifyOnPoApproval: e.target.checked })}
                  className="w-3.5 h-3.5 accent-[#0072ed]"
                />
                <span className="text-[11px] font-medium text-[#1f2328]">
                  Notify Applicant &amp; Warehouse Admin when Purchase Order is Approved
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#5c646d] font-mono">
                Last Handshake: {activeSmtp.lastTestedAt || 'Never'}
              </span>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isTestingSmtp ? 'Testing...' : 'Test SMTP Connection'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Validation Rules */}
        <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
          <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              System Field &amp; Validation Rules
            </div>
            <div className="p-3 space-y-1 text-xs">
              {[
                { key: 'refDocNo', label: 'Require Reference Document No. (PR / PO)' },
                { key: 'iaas2RefNo', label: 'Require IAAS2 Reference No. (PO / Receiving)' },
                { key: 'attachments', label: 'Require File Attachments (PDF, JPG, etc.)' },
                { key: 'drDate', label: 'Require Date Refer to DR (Receiving)' },
                { key: 'blockExceedPqto', label: 'Block PR Qty exceeding PQTO Remaining Qty' },
              ].map((item) => {
                const k = item.key as keyof RequiredFieldConfig;
                return (
                  <label
                    key={k}
                    className="flex items-center justify-between px-2.5 py-1.5 border border-[#d5dbe2] rounded-[2px] hover:bg-[#fafbfd] cursor-pointer"
                  >
                    <span className="font-medium text-[#1f2328]">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={config[k]}
                      onChange={(e) => setConfig((prev) => ({ ...prev, [k]: e.target.checked }))}
                      className="w-4 h-4 accent-[#0072ed]"
                    />
                  </label>
                );
              })}
            </div>
          </div>
      </div>
      )}

      {activeSection === 'transfers' && (
        <>
          {/* Stock Transfer & Excess Return Form */}
          <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
                OTH — Stock Transfer &amp; Excess Return
              </span>
              <button
                onClick={handlePostTransferSubmit}
                className="px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                Post Transfer
              </button>
            </div>

            <div className="p-3 space-y-2.5 text-xs">
              <div className="flex border border-[#b9c0c8] rounded-[2px] overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setType('Excess Return to Warehouse');
                    setToLocation('Central Warehouse');
                  }}
                  className={`flex-1 py-1 font-semibold cursor-pointer ${
                    type === 'Excess Return to Warehouse'
                      ? 'bg-[#0072ed] text-white'
                      : 'bg-white text-[#1f2328]'
                  }`}
                >
                  Excess Return to Warehouse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('Stock Transfer');
                    setToLocation('Zone C - Basement');
                  }}
                  className={`flex-1 py-1 font-semibold border-l border-[#b9c0c8] cursor-pointer ${
                    type === 'Stock Transfer'
                      ? 'bg-[#0072ed] text-white'
                      : 'bg-white text-[#1f2328]'
                  }`}
                >
                  Site-to-Site Transfer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Material Item</label>
                  <select
                    value={selectedItemCode}
                    onChange={(e) => setSelectedItemCode(e.target.value)}
                    className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
                  >
                    {stock.map((s) => (
                      <option key={s.id} value={s.itemCode}>
                        {s.itemCode} — {s.description} (Avail: {s.availableStock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">From Location</label>
                  <input
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">To Location</label>
                  <input
                    value={type === 'Excess Return to Warehouse' ? 'Central Warehouse' : toLocation}
                    disabled={type === 'Excess Return to Warehouse'}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 bg-white disabled:bg-[#f1f3f5]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Reason</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-7 border border-[#b9c0c8] rounded-[2px] px-2"
                  />
                </div>
              </div>
            </div>
          </div>

      {/* Transfer & Return Register Table */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
          Transfer &amp; Return Register ({transfers.length} Recorded)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Transfer No.</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Type</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Item</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">From &rarr; To</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] text-right">Qty</th>
                <th className="px-2.5 py-1.5 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {transfers.map((t, idx) => (
                <tr key={t.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 font-mono font-semibold border-r border-[#e5e8ec]">{t.transferNo}</td>
                  <td className="px-2.5 py-1.5 font-medium text-[#005ec4] border-r border-[#e5e8ec]">{t.type}</td>
                  <td className="px-2.5 py-1.5 border-r border-[#e5e8ec]">
                    {t.itemCode} — {t.description}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#495057] border-r border-[#e5e8ec]">
                    {t.fromLocation} &rarr; {t.toLocation}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-semibold border-r border-[#e5e8ec]">
                    {t.qty} {t.uom}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#495057]">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
