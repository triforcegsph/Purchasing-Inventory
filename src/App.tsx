import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  ChevronRight,
  ClipboardList,
  Database,
  FilePlus2,
  FileSpreadsheet,
  History,
  LogOut,
  Menu,
  PackageCheck,
  PackageMinus,
  RotateCcw,
  Route,
  Search,
  ShoppingCart,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  BoqItem,
  ModuleKey,
  NotificationItem,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ReceivingRecord,
  RequiredFieldConfig,
  SmtpConfig,
  StockTransferRecord,
  TransactionLog,
  UserAccount,
  UserRole,
  WarehouseStock,
  WithdrawalRecord,
} from './types/erp';
import {
  CIVIL_BOQ_ITEMS,
  CIVIL_PQTOS,
  INITIAL_BOQ_ITEMS,
  INITIAL_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_POS,
  INITIAL_PQTOS,
  INITIAL_PRS,
  INITIAL_RECEIVINGS,
  INITIAL_REQUIRED_CONFIG,
  INITIAL_SMTP_CONFIG,
  INITIAL_STOCK,
  INITIAL_TRANSFERS,
  INITIAL_WITHDRAWALS,
} from './data/seedData';
import { BoqModule } from './components/BoqModule';
import { PqtoModule } from './components/PqtoModule';
import { PrModule } from './components/PrModule';
import { PoModule } from './components/PoModule';
import { ReceivingModule } from './components/ReceivingModule';
import { WithdrawalModule } from './components/WithdrawalModule';
import { TransfersAndSettingsModule } from './components/TransfersAndSettingsModule';
import { LogsModule } from './components/LogsModule';
import { NewRequestModal } from './components/NewRequestModal';
import { MyRequestsModal } from './components/MyRequestsModal';
import { LoginPage } from './components/LoginPage';
import { TrackingModule } from './components/TrackingModule';

interface NavGroup {
  group: string;
  items: {
    key: ModuleKey;
    code: string;
    label: string;
    step?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Procurement & Inventory',
    items: [
      { key: 'boq', code: 'BOQ', step: 1, label: 'Bill of Quantities', icon: FileSpreadsheet },
      { key: 'pqto', code: 'PQTO', step: 2, label: 'Project Qty Take-Off', icon: Calculator },
      { key: 'pr', code: 'PR', step: 3, label: 'Purchase Requisition', icon: ClipboardList },
      { key: 'po', code: 'PO', step: 4, label: 'Purchase Order', icon: ShoppingCart },
      { key: 'receiving', code: 'RCV', step: 5, label: 'Receiving (DR)', icon: PackageCheck },
      { key: 'withdrawal', code: 'WD', step: 6, label: 'Withdrawal', icon: PackageMinus },
    ],
  },
  {
    group: 'Inventory & Controls',
    items: [
      { key: 'transfers', code: 'OTH', label: 'Transfers & Rules', icon: ArrowLeftRight },
    ],
  },
  {
    group: 'Tracking & Audit',
    items: [
      { key: 'tracking', code: 'TRK', label: 'End-to-End Tracking', icon: Route },
      { key: 'logs', code: 'LOG', label: 'Transaction Logs', icon: History },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const ROLE_MODULES: Record<UserRole, ModuleKey[]> = {
  'Applicant/Requestor': ['boq', 'pqto', 'pr', 'po', 'withdrawal', 'tracking', 'logs'],
  'REQ Approver': ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'PO Approver': ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
  'Warehouse Manager': ['receiving', 'withdrawal', 'transfers', 'po', 'tracking', 'logs'],
  'Purchaser': ['boq', 'pqto', 'pr', 'po', 'transfers', 'tracking', 'logs'],
  'Admin': ['boq', 'pqto', 'pr', 'po', 'receiving', 'withdrawal', 'transfers', 'tracking', 'logs'],
};

const ROLE_DEFAULT_MODULE: Record<UserRole, ModuleKey> = {
  'Applicant/Requestor': 'boq',
  'REQ Approver': 'pr',
  'PO Approver': 'po',
  'Warehouse Manager': 'receiving',
  'Purchaser': 'po',
  'Admin': 'transfers',
};

function useCachedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `erp_cache_${key}`;
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [storageKey, state]);

  return [state, setState];
}

export function App() {
  const [currentUser, setCurrentUser] = useCachedState<UserAccount | null>('currentUser', null);
  const [activeModule, setActiveModule] = useCachedState<ModuleKey>('activeModule', 'boq');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [funcJump, setFuncJump] = useState('');
  const [businessUnit, setBusinessUnit] = useCachedState<string>('businessUnit', 'PROJ-TWRB');
  const [showNotifs, setShowNotifs] = useState(false);

  const activeRole: UserRole = currentUser?.role || 'Applicant/Requestor';

  // Core ERP State (Persisted to Browser Cache DB)
  const [boqItems, setBoqItems] = useCachedState<BoqItem[]>('boqItems', INITIAL_BOQ_ITEMS);
  const [boqStatus, setBoqStatus] = useCachedState<'Draft' | 'Posted'>('boqStatus', 'Draft');
  const [pqtos, setPqtos] = useCachedState<PqtoRecord[]>('pqtos', INITIAL_PQTOS);
  const [prs, setPrs] = useCachedState<PrRecord[]>('prs', INITIAL_PRS);
  const [pos, setPos] = useCachedState<PoRecord[]>('pos', INITIAL_POS);
  const [receivings, setReceivings] = useCachedState<ReceivingRecord[]>('receivings', INITIAL_RECEIVINGS);
  const [stock, setStock] = useCachedState<WarehouseStock[]>('stock', INITIAL_STOCK);
  const [withdrawals, setWithdrawals] = useCachedState<WithdrawalRecord[]>('withdrawals', INITIAL_WITHDRAWALS);
  const [transfers, setTransfers] = useCachedState<StockTransferRecord[]>('transfers', INITIAL_TRANSFERS);
  const [logs, setLogs] = useCachedState<TransactionLog[]>('logs', INITIAL_LOGS);
  const [notifications, setNotifications] = useCachedState<NotificationItem[]>('notifications', INITIAL_NOTIFICATIONS);
  const [config, setConfig] = useCachedState<RequiredFieldConfig>('config', INITIAL_REQUIRED_CONFIG);
  const [smtpConfig, setSmtpConfig] = useCachedState<SmtpConfig>('smtpConfig', INITIAL_SMTP_CONFIG);

  const handleResetDemoDb = () => {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('erp_cache_')) localStorage.removeItem(k);
      });
    } catch {
      // ignore storage errors
    }
    setBusinessUnit('PROJ-TWRB');
    setActiveModule(currentUser ? ROLE_DEFAULT_MODULE[currentUser.role] : 'boq');
    setBoqItems(INITIAL_BOQ_ITEMS);
    setBoqStatus('Draft');
    setPqtos(INITIAL_PQTOS);
    setPrs(INITIAL_PRS);
    setPos(INITIAL_POS);
    setReceivings(INITIAL_RECEIVINGS);
    setStock(INITIAL_STOCK);
    setWithdrawals(INITIAL_WITHDRAWALS);
    setTransfers(INITIAL_TRANSFERS);
    setLogs(INITIAL_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setConfig(INITIAL_REQUIRED_CONFIG);
    setSmtpConfig(INITIAL_SMTP_CONFIG);
  };

  // Navigation context
  const [selectedPqtoForPr, setSelectedPqtoForPr] = useState<string | undefined>(undefined);
  const [selectedPrForPo, setSelectedPrForPo] = useState<string | undefined>(undefined);
  const [selectedPoForReceiving, setSelectedPoForReceiving] = useState<string | undefined>(undefined);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);

  const handleProjectChange = (newProj: string) => {
    setBusinessUnit(newProj);
    if (newProj === 'PROJ-CIVIL1') {
      setBoqItems(CIVIL_BOQ_ITEMS);
      setPqtos(CIVIL_PQTOS);
      setBoqStatus('Posted');
    } else {
      setBoqItems(INITIAL_BOQ_ITEMS);
      setPqtos(INITIAL_PQTOS);
      setBoqStatus('Draft');
    }
    addLog('System', newProj, 'Switched Project', `Active workspace switched to ${newProj}`);
  };

  const handleLogin = (account: UserAccount) => {
    setCurrentUser(account);
    setActiveModule(ROLE_DEFAULT_MODULE[account.role]);
    addLog('System', account.role, 'User Signed In', `${account.fullName} (${account.username}) logged in.`);
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog('System', currentUser.role, 'User Signed Out', `${currentUser.fullName} signed out.`);
    }
    setCurrentUser(null);
  };

  const allowedModules = ROLE_MODULES[activeRole];
  const visibleNavGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items
      .filter((it) => allowedModules.includes(it.key))
      .map((it) =>
        activeRole === 'Purchaser' && it.key === 'transfers'
          ? { ...it, code: 'INV', label: 'Inventory & Cost' }
          : it
      ),
  })).filter((g) => g.items.length > 0);

  const visibleNavItems = visibleNavGroups.flatMap((g) => g.items);
  const activeNavItem = visibleNavItems.find((i) => i.key === activeModule) || ALL_NAV_ITEMS[0];

  const handleFunctionJump = (e: React.FormEvent) => {
    e.preventDefault();
    const q = funcJump.trim().toUpperCase();
    if (!q) return;
    const aliasMap: Record<string, ModuleKey> = {
      PRQ: 'pr',
      POE: 'po',
      GRN: 'receiving',
      ISS: 'withdrawal',
      STR: 'transfers',
    };
    const match =
      ALL_NAV_ITEMS.find((i) => i.key === aliasMap[q]) ||
      ALL_NAV_ITEMS.find((i) => i.code === q || i.label.toUpperCase().includes(q));
    if (match) {
      setActiveModule(match.key);
      setFuncJump('');
    }
  };

  const addLog = (module: string, docNo: string, action: string, comments: string, spName = 'SP-MECH-ALPHA') => {
    const entry: TransactionLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      adminOrUser: `${activeRole} (Admin)`,
      spName,
      module,
      docNo,
      action,
      comments,
    };
    setLogs((prev) => [entry, ...prev]);
  };

  const pushNotification = (recipientRole: 'Approver' | 'Applicant', title: string, message: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        recipientRole,
        title,
        message,
        timestamp: new Date().toLocaleTimeString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const handleSaveBoqDraft = () => {
    setBoqStatus('Draft');
    addLog('BOQ', 'BOQ-2026-001', 'Saved as Draft', `${boqItems.length} rows saved in BOQ draft.`);
  };

  const handlePostBoqToPqto = () => {
    setBoqStatus('Posted');
    const transactionalItems = boqItems.filter(
      (it) => !it.isBlankRow && !it.isWorksRelated && it.itemCode.trim() !== ''
    );
    const newPqtoNo = `PQTO-2026-00${pqtos.length + 1}`;
    const newPqto: PqtoRecord = {
      id: `pqto-${Date.now()}`,
      pqtoNo: newPqtoNo,
      jobNo: 'JOB-2026-884',
      projectTitle: 'Posted from BOQ Workspace',
      status: 'Posted',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      items: transactionalItems.map((it) => ({
        boqItemId: it.id,
        itemCode: it.itemCode,
        description: it.description,
        boqUom: it.boqUom || 'lot',
        boqQty: it.boqQty,
        pqtoUom: it.pqtoUom || 'PC/s',
        pqtoQty: it.pqtoQty || it.boqQty,
        prOrderedQty: 0,
        assignedLocation: it.assignedLocation || 'Site-Wide',
      })),
    };
    setPqtos((prev) => [newPqto, ...prev]);
    addLog(
      'BOQ',
      'BOQ-2026-001',
      'Posted to PQTO',
      `Created ${newPqtoNo} with ${transactionalItems.length} transactional items (excluded blank & works-related rows).`
    );

    if (smtpConfig.notifyOnBoqToPr) {
      pushNotification(
        'Applicant',
        'SMTP Alert: BOQ Posted to PQTO/PR',
        `Automated notification sent via ${smtpConfig.host} to ${smtpConfig.recipientBoqToPr} for ${newPqtoNo}.`
      );
      addLog(
        'SMTP',
        newPqtoNo,
        'Email Dispatched (BOQ -> PR)',
        `Sent notification to ${smtpConfig.recipientBoqToPr} via ${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.encryption}).`
      );
    }

    setActiveModule('pqto');
  };

  const handleApprovePr = (prId: string) => {
    setPrs((prev) =>
      prev.map((p) => (p.id === prId ? { ...p, status: 'Approved' } : p))
    );
    const pr = prs.find((p) => p.id === prId);
    if (pr) {
      addLog('PR', pr.prNo, 'Approved', 'PR approved for PO conversion.', pr.spName);
      pushNotification('Applicant', 'PR Approved', `${pr.prNo} has been approved and is ready for PO.`);
    }
  };

  const handleApprovePo = (poId: string) => {
    setPos((prev) =>
      prev.map((p) => (p.id === poId ? { ...p, status: 'Approved' } : p))
    );
    const po = pos.find((p) => p.id === poId);
    if (po) {
      addLog('PO', po.poNo, 'Approved', `IAAS2: ${po.iaas2RefNo} approved.`, po.spName);
      pushNotification('Applicant', 'PO Approved', `${po.poNo} (${po.iaas2RefNo}) is approved for Receiving.`);
    }
  };

  const handleRejectPo = (poId: string, comments: string) => {
    setPos((prev) =>
      prev.map((p) =>
        p.id === poId
          ? { ...p, status: 'Returned to Applicant', rejectionComments: comments }
          : p
      )
    );
    const po = pos.find((p) => p.id === poId);
    if (po) {
      addLog('PO', po.poNo, 'REJECTED → Returned to Applicant', comments, po.spName);
      pushNotification(
        'Applicant',
        `PO Rejected: ${po.poNo}`,
        `Returned to ${po.applicant}. Comment: "${comments}"`
      );
    }
  };

  const handlePostReceiving = (rec: ReceivingRecord) => {
    setReceivings((prev) => [rec, ...prev]);

    setPos((prev) =>
      prev.map((po) => {
        if (po.poNo !== rec.poNo) return po;
        const updatedItems = po.items.map((poIt) => {
          const recIt = rec.items.find((r) => r.itemCode === poIt.itemCode);
          if (!recIt) return poIt;
          return { ...poIt, receivedQty: poIt.receivedQty + recIt.actualReceivedQty };
        });
        const allDone = updatedItems.every((i) => i.receivedQty >= i.poQty);
        return {
          ...po,
          items: updatedItems,
          status: allDone ? 'Completed' : 'Partially Received',
        };
      })
    );

    setStock((prev) => {
      const next = prev.map((s) => ({ ...s }));
      rec.items.forEach((recIt) => {
        if (recIt.actualReceivedQty <= 0) return;
        const idx = next.findIndex((s) => s.itemCode === recIt.itemCode);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            availableStock: next[idx].availableStock + recIt.actualReceivedQty,
          };
        } else {
          next.push({
            id: `stk-${Date.now()}-${recIt.itemCode}`,
            itemCode: recIt.itemCode,
            description: recIt.description,
            uom: recIt.uom,
            systemTag: 'MEPF - Chilled Water',
            assignedLocation: 'Central Warehouse',
            availableStock: recIt.actualReceivedQty,
            reservedStock: 0,
          });
        }
      });
      return next;
    });

    addLog(
      'Receiving',
      rec.grnNo,
      `Posted (${rec.status})`,
      `PO: ${rec.poNo} | DR: ${rec.drNo} (${rec.drDate})`,
      rec.spName
    );
  };

  const handlePostWithdrawal = (wd: WithdrawalRecord) => {
    setWithdrawals((prev) => [wd, ...prev]);
    if (wd.status === 'With Stock') {
      const wdItem = wd.items[0];
      if (wdItem) {
        setStock((prev) =>
          prev.map((s) =>
            s.itemCode === wdItem.itemCode
              ? { ...s, availableStock: Math.max(0, s.availableStock - wdItem.requestedQty) }
              : s
          )
        );
      }
    }
    addLog(
      'Withdrawal',
      wd.wdNo,
      `Processed (${wd.status})`,
      `System: ${wd.systemTag} | Item: ${wd.items[0]?.itemCode}`,
      wd.spName
    );
  };

  const handlePostTransfer = (tr: StockTransferRecord) => {
    setTransfers((prev) => [tr, ...prev]);
    if (tr.type === 'Excess Return to Warehouse') {
      setStock((prev) =>
        prev.map((s) =>
          s.itemCode === tr.itemCode
            ? { ...s, availableStock: s.availableStock + tr.qty }
            : s
        )
      );
    }
    addLog('Transfers', tr.transferNo, tr.type, `${tr.qty} ${tr.uom} of ${tr.itemCode}: ${tr.reason}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eef0f3] text-[#1f2328]">
      {/* Infor SunSystems Top Masthead */}
      <header className="bg-[#23262b] text-white h-12 flex items-center justify-between px-3 border-b border-[#16181c] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Desktop sidebar toggle / Mobile drawer toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden lg:flex p-1.5 rounded hover:bg-[#32363e] text-slate-300 cursor-pointer"
            title="Toggle Navigation Panel"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded hover:bg-[#32363e] text-slate-300 cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Brand Title */}
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-200">
            Purchasing &amp; Inventory System
          </span>

          {/* SunSystems Function Code Quick-Launch */}
          <form onSubmit={handleFunctionJump} className="hidden md:flex items-center ml-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={funcJump}
                onChange={(e) => setFuncJump(e.target.value)}
                placeholder="Function code (BOQ, PR, PO, RCV)..."
                className="w-60 pl-8 pr-2.5 py-1 text-xs bg-[#181a1e] border border-[#3c414a] rounded-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0072ed]"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2">
          {/* View All My Requests Button */}
          <button
            type="button"
            onClick={() => setShowMyRequestsModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#181a1e] hover:bg-[#32363e] text-slate-100 border border-[#3c414a] text-xs font-semibold rounded-xs cursor-pointer"
            title="View all submitted requests (PR, WD, PO) in one place"
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#4da3ff]" />
            <span>My Requests ({prs.length + withdrawals.length + pos.length})</span>
          </button>

          {/* Quick New Request Form Button */}
          <button
            type="button"
            onClick={() => setShowNewRequestModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-xs cursor-pointer shadow-xs"
            title="Open New Request Form (Purchase Requisition or Material Withdrawal)"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>

          {/* Project / Business Unit Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#181a1e] px-2.5 py-1 border border-[#3c414a] rounded-xs text-xs">
            <span className="text-slate-400">Project:</span>
            <select
              value={businessUnit}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="PROJ-TWRB" className="text-slate-900">PROJ-TWRB (Tower B)</option>
              <option value="PROJ-CIVIL1" className="text-slate-900">PROJ-CIVIL1 (Site Infra)</option>
            </select>
          </div>

          {/* Logged-In User & Sign Out */}
          <div className="flex items-center gap-1.5 bg-[#181a1e] px-2.5 py-1 border border-[#3c414a] rounded-xs text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#4da3ff]" />
            <span className="font-medium text-white hidden md:inline">{currentUser.fullName}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-[#0072ed]/25 text-[#7ebbff] border border-[#0072ed]/40 rounded-[2px]">
              {activeRole}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 px-2 py-1 bg-[#181a1e] hover:bg-[#32363e] text-slate-200 border border-[#3c414a] rounded-xs text-xs font-medium cursor-pointer"
            title="Sign Out / Switch Account"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs((v) => !v);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
              className="relative p-1.5 rounded-xs bg-[#32363e] hover:bg-[#3f444e] border border-[#454b56] cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d5002b] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-xs shadow-xl border border-[#cfd5dc] z-50 overflow-hidden">
                <div className="px-3.5 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Infor OS Alerts
                  </span>
                  <button
                    onClick={() => setShowNotifs(false)}
                    className="text-xs text-[#0072ed] hover:underline cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 text-xs hover:bg-slate-50">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-600">{n.message}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-[#0072ed] border border-blue-200">
                        To: {n.recipientRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Left SunSystems Sidebar + Content Workspace */}
      <div className="flex-1 flex relative">
        {/* Desktop Left Navigation Rail */}
        {sidebarOpen && (
          <aside className="hidden lg:flex flex-col w-60 bg-[#2b2f36] text-slate-200 border-r border-[#1f2228] shrink-0">
            <div className="px-3 py-2.5 border-b border-[#3a3f48] flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Functions
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1c1f24] text-[#4da3ff] border border-[#3c414a] rounded-xs">
                {activeRole === 'Applicant/Requestor'
                  ? 'APPLICANT'
                  : activeRole === 'REQ Approver'
                  ? 'REQ APPR'
                  : activeRole === 'PO Approver'
                  ? 'PO APPR'
                  : 'WAREHOUSE'}
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 space-y-4">
              {visibleNavGroups.map((group) => (
                <div key={group.group}>
                  <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.group}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setActiveModule(item.key)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer border-l-3 ${
                            isActive
                              ? 'bg-[#1f2328] text-white border-[#0072ed] font-semibold'
                              : 'text-slate-300 border-transparent hover:bg-[#343942] hover:text-white'
                          }`}
                        >
                          {item.step ? (
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-[#0072ed] text-white'
                                  : 'bg-[#1c1f24] text-slate-300 border border-[#3c414a]'
                              }`}
                            >
                              {item.step}
                            </span>
                          ) : (
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#4da3ff]' : 'text-slate-400'}`} />
                          )}
                          <span className="truncate flex-1">{item.label}</span>
                          <span className="font-mono text-[10px] px-1 py-0.2 bg-[#1c1f24] text-slate-400 rounded-xs border border-[#3c414a] shrink-0">
                            {item.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="w-64 bg-[#2b2f36] text-slate-200 h-full flex flex-col shadow-2xl">
              <div className="px-3 py-3 border-b border-[#3a3f48] flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SunSystems Menu
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 space-y-4">
                {visibleNavGroups.map((group) => (
                  <div key={group.group}>
                    <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {group.group}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setActiveModule(item.key);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left border-l-3 ${
                            isActive
                              ? 'bg-[#1f2328] text-white border-[#0072ed] font-semibold'
                              : 'text-slate-300 border-transparent hover:bg-[#343942]'
                          }`}
                        >
                          {item.step ? (
                            <span
                              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-[#0072ed] text-white'
                                  : 'bg-[#1c1f24] text-slate-300 border border-[#3c414a]'
                              }`}
                            >
                              {item.step}
                            </span>
                          ) : (
                            <Icon className="w-4 h-4 shrink-0" />
                          )}
                          <span className="truncate flex-1">{item.label}</span>
                          <span className="font-mono text-[10px] px-1 bg-[#1c1f24] text-slate-400 rounded-xs border border-[#3c414a] shrink-0">
                            {item.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
            <div className="flex-1 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Right Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* SunSystems Context Breadcrumb & Process Bar */}
          <div className="bg-white border-b border-[#cfd5dc] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{businessUnit}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span>Procurement & Material Control</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-[#0072ed]">{activeNavItem.code}</span>
              <span className="font-semibold text-slate-900">— {activeNavItem.label}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Period: 2026/011 • Ledger: ACTUALS • Role: {activeRole}
            </div>
          </div>

          {/* Plain-English Module Quick Guide */}
          <div className="bg-[#f7f9fc] border-b border-[#dfe4ea] px-4 py-1.5 text-[11px] text-[#495057]">
            {activeModule === 'boq' &&
              'Step 1: Upload a CSV or enter project items manually, then click "Post to PQTO" to lock quantities for purchasing.'}
            {activeModule === 'pqto' &&
              'Step 2: Review converted purchasing units and remaining project budget, then click "Create PR" to start a requisition.'}
            {activeModule === 'pr' &&
              'Step 3: Submit Purchase Requisitions (checked against PQTO balance). REQ Approver can Approve or Reject, then click "To PO".'}
            {activeModule === 'po' &&
              'Step 4: Generate Purchase Orders from approved PRs. PO Approver authorizes orders before they move to Receiving.'}
            {activeModule === 'receiving' &&
              'Step 5: Select an approved PO, enter the Delivery Receipt (DR) details and actual received quantities, then post to add stock.'}
            {activeModule === 'withdrawal' &&
              'Step 6: Search warehouse stock by system or item and process site material withdrawals (automatically checks available stock).'}
            {activeModule === 'transfers' &&
              (activeRole === 'Purchaser'
                ? 'View live warehouse inventory stock, add new inventory items, and monitor PO vs. issuance cost.'
                : 'Manage inventory stock, site-to-site transfers, excess returns to warehouse, cost completion, and system rules.')}
            {activeModule === 'tracking' &&
              'Track any order from start to finish (BOQ → PQTO → PR → PO → Receiving → Site Withdrawal) with live status steps.'}
            {activeModule === 'logs' &&
              'Audit trail of all actions, approvals, rejections, stock updates, and notifications across modules.'}
          </div>

          {/* Active Form Canvas */}
          <main className="flex-1 p-3 sm:p-4 overflow-x-hidden">
            {activeModule === 'boq' && (
              <BoqModule
                items={boqItems}
                setItems={setBoqItems}
                boqStatus={boqStatus}
                onSaveDraft={handleSaveBoqDraft}
                onPostToPqto={handlePostBoqToPqto}
                onAddLog={addLog}
                activeRole={activeRole}
              />
            )}

            {activeModule === 'pqto' && (
              <PqtoModule
                pqtos={pqtos}
                setPqtos={setPqtos}
                onNavigateToPr={(pqtoNo) => {
                  setSelectedPqtoForPr(pqtoNo);
                  setActiveModule('pr');
                }}
              />
            )}

            {activeModule === 'pr' && (
              <PrModule
                pqtos={pqtos}
                prs={prs}
                setPrs={setPrs}
                config={config}
                activeRole={activeRole}
                initialPqtoNo={selectedPqtoForPr}
                onApprovePr={handleApprovePr}
                onNavigateToPo={(prNo) => {
                  setSelectedPrForPo(prNo);
                  setActiveModule('po');
                }}
                onAddLog={addLog}
              />
            )}

            {activeModule === 'po' && (
              <PoModule
                prs={prs}
                pos={pos}
                setPos={setPos}
                config={config}
                activeRole={activeRole}
                initialPrNo={selectedPrForPo}
                onRejectPo={handleRejectPo}
                onApprovePo={handleApprovePo}
                onNavigateToReceiving={(poNo) => {
                  setSelectedPoForReceiving(poNo);
                  setActiveModule('receiving');
                }}
                onAddLog={addLog}
              />
            )}

            {activeModule === 'receiving' && (
              <ReceivingModule
                pos={pos}
                receivings={receivings}
                stock={stock}
                config={config}
                initialPoNo={selectedPoForReceiving}
                onPostReceiving={handlePostReceiving}
              />
            )}

            {activeModule === 'withdrawal' && (
              <WithdrawalModule
                stock={stock}
                withdrawals={withdrawals}
                config={config}
                onPostWithdrawal={handlePostWithdrawal}
              />
            )}

            {activeModule === 'transfers' && (
              <TransfersAndSettingsModule
                stock={stock}
                setStock={setStock}
                transfers={transfers}
                config={config}
                setConfig={setConfig}
                onPostTransfer={handlePostTransfer}
                pos={pos}
                withdrawals={withdrawals}
                receivings={receivings}
                smtpConfig={smtpConfig}
                setSmtpConfig={setSmtpConfig}
                onAddLog={addLog}
                businessUnit={businessUnit}
                activeRole={activeRole}
              />
            )}

            {activeModule === 'tracking' && (
              <TrackingModule
                activeRole={activeRole}
                pqtos={pqtos}
                prs={prs}
                pos={pos}
                receivings={receivings}
                withdrawals={withdrawals}
                logs={logs}
                onNavigate={(mod) => {
                  if (ROLE_MODULES[activeRole].includes(mod)) {
                    setActiveModule(mod);
                  }
                }}
              />
            )}

            {activeModule === 'logs' && <LogsModule logs={logs} activeRole={activeRole} />}
          </main>

          {/* Footer Status Bar */}
          <footer className="bg-[#dfe3e8] border-t border-[#cfd5dc] px-4 py-1.5 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Database className="w-3 h-3 text-emerald-600" />
                Session Storage Active (Auto-Saved)
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Business Unit: {businessUnit}</span>
              <button
                type="button"
                onClick={handleResetDemoDb}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#f1f3f5] border border-[#b9c0c8] rounded-[2px] text-[10px] font-semibold text-slate-700 cursor-pointer"
                title="Clear browser session storage and restore default test data"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset Test Data
              </button>
            </div>
            <div className="font-mono">
              1 License : 1 User • Mobile Ready
            </div>
          </footer>
        </div>
      </div>
      {showNewRequestModal && (
        <NewRequestModal
          key={activeRole}
          activeRole={activeRole}
          businessUnit={businessUnit}
          pqtos={pqtos}
          stock={stock}
          config={config}
          onSubmitPr={(newPr) => {
            setPrs((prev) => [newPr, ...prev]);
            addLog(
              'PR',
              newPr.prNo,
              newPr.status === 'Draft' ? 'Saved as Draft' : 'Submitted via New Request Form',
              `Ref: ${newPr.refDocNo} | Items: ${newPr.items.length}`,
              newPr.spName
            );
            if (newPr.status === 'Pending Approval') {
              pushNotification(
                'Approver',
                'New PR Submitted',
                `${newPr.prNo} from ${newPr.applicant} requires your approval.`
              );
            }
            if (ROLE_MODULES[activeRole].includes('pr')) {
              setActiveModule('pr');
            }
          }}
          onSubmitWithdrawal={(newWd) => {
            handlePostWithdrawal(newWd);
            if (ROLE_MODULES[activeRole].includes('withdrawal')) {
              setActiveModule('withdrawal');
            }
          }}
          onSubmitTransfer={(newTr) => {
            handlePostTransfer(newTr);
            if (ROLE_MODULES[activeRole].includes('transfers')) {
              setActiveModule('transfers');
            }
          }}
          onClose={() => setShowNewRequestModal(false)}
        />
      )}

      {showMyRequestsModal && (
        <MyRequestsModal
          activeRole={activeRole}
          prs={prs}
          pos={pos}
          withdrawals={withdrawals}
          onNavigate={(mod) => {
            if (ROLE_MODULES[activeRole].includes(mod)) {
              setActiveModule(mod);
            }
          }}
          onOpenNewRequest={() => setShowNewRequestModal(true)}
          onClose={() => setShowMyRequestsModal(false)}
        />
      )}
    </div>
  );
}

export default App;
