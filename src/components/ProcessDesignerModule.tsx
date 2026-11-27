import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Settings,
} from 'lucide-react';
import type {
  BoqItem,
  ModuleKey,
  PoRecord,
  PqtoRecord,
  PrRecord,
  ProcessPhaseConfig,
  ProcessRouteRule,
  ReceivingRecord,
  StockTransferRecord,
  UserAccount,
  UserGroup,
  WarehouseStock,
  WithdrawalRecord,
} from '../types/erp';
import { LiveTypeAhead, type TypeAheadOption } from './workflow/LiveTypeAhead';
import { WorkflowTimeline, type PhaseRuntimeInfo } from './workflow/WorkflowTimeline';
import { RoutingRuleModal } from './workflow/RoutingRuleModal';

type ProcessKey = ProcessPhaseConfig['processKey'];

export const PROCESS_CATALOG: { key: ProcessKey; label: string; module: ModuleKey }[] = [
  { key: 'BOQ', label: 'Bill of Quantities (BOQ)', module: 'boq' },
  { key: 'PQTO', label: 'Project Qty Take-Off (PQTO)', module: 'pqto' },
  { key: 'PR', label: 'Purchase Request (PR)', module: 'pr' },
  { key: 'PO', label: 'Purchase Order (PO)', module: 'po' },
  { key: 'RCV', label: 'Receiving (RCV)', module: 'receiving' },
  { key: 'WD', label: 'Material Withdrawal (WD)', module: 'withdrawal' },
  { key: 'OTH', label: 'Transfers & Rules (OTH)', module: 'transfers' },
];

export const DEFAULT_PROCESS_PHASES: ProcessPhaseConfig[] = [
  // 1. BOQ
  {
    id: 'ph-boq-1',
    processKey: 'BOQ',
    phaseName: 'Upload / Enter BOQ',
    stepsCount: 1,
    actionLabel: 'Draft BOQ',
    gatewayTitle: 'Route (BOQ Entry)',
    routes: [
      {
        id: 'rt-boq-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Engineering Estimation',
        ignoreManualRecipient: false,
        recipients: ['GRP-PUR'],
        defaultRecipient: 'Purchaser',
      },
    ],
  },
  {
    id: 'ph-boq-2',
    processKey: 'BOQ',
    phaseName: 'Post to PQTO',
    stepsCount: 1,
    actionLabel: 'Post to PQTO',
    gatewayTitle: 'Route (BOQ Handoff)',
    routes: [
      {
        id: 'rt-boq-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'PQTO Take-Off',
        ignoreManualRecipient: false,
        recipients: ['GRP-PUR', 'GRP-REQ-APR'],
        defaultRecipient: 'Engr. Alex Smith',
      },
    ],
  },

  // 2. PQTO
  {
    id: 'ph-pqto-1',
    processKey: 'PQTO',
    phaseName: 'Unit Conversion & Ceiling',
    stepsCount: 1,
    actionLabel: 'Review PQTO',
    gatewayTitle: 'Route (Take-Off Control)',
    routes: [
      {
        id: 'rt-pqto-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'PQTO Take-Off',
        ignoreManualRecipient: false,
        recipients: ['GRP-REQ-APR'],
        defaultRecipient: 'Engr. Alex Smith',
      },
    ],
  },
  {
    id: 'ph-pqto-2',
    processKey: 'PQTO',
    phaseName: 'Initiate Requisition',
    stepsCount: 1,
    actionLabel: 'Create PR',
    gatewayTitle: 'Route (PR Creation)',
    routes: [
      {
        id: 'rt-pqto-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Create PR',
        ignoreManualRecipient: false,
        recipients: ['GRP-REQ'],
        defaultRecipient: 'Engr. John Doe',
      },
    ],
  },

  // 3. PR
  {
    id: 'ph-pr-1',
    processKey: 'PR',
    phaseName: 'Create PR',
    stepsCount: 1,
    actionLabel: 'Create',
    gatewayTitle: 'Route (Gateway before creation)',
    routes: [
      {
        id: 'rt-pr-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Create',
        ignoreManualRecipient: false,
        recipients: ['GRP-REQ'],
        defaultRecipient: 'Engr. John Doe',
      },
    ],
  },
  {
    id: 'ph-pr-2',
    processKey: 'PR',
    phaseName: 'REQ Review',
    stepsCount: 2,
    actionLabel: 'Review',
    gatewayTitle: 'Route (Before REQ Approval)',
    routes: [
      {
        id: 'rt-pr-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'REQ Approver Review',
        ignoreManualRecipient: false,
        recipients: ['Engr. Alex Smith'],
        defaultRecipient: 'Engr. Alex Smith',
      },
      {
        id: 'rt-pr-3',
        name: 'New Item (Non-BOQ) → Engineering Check',
        isDefault: false,
        conditions: 'New Item (Non-BOQ) : Equal to True',
        destination: 'REQ Approver Review',
        ignoreManualRecipient: false,
        recipients: ['Engr. Alex Smith', 'System Admin'],
        defaultRecipient: 'Engr. Alex Smith',
      },
    ],
  },
  {
    id: 'ph-pr-3',
    processKey: 'PR',
    phaseName: 'Convert to PO',
    stepsCount: 1,
    actionLabel: 'To PO',
    gatewayTitle: 'Route (Purchasing Handoff)',
    routes: [
      {
        id: 'rt-pr-4',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Purchaser PO Entry',
        ignoreManualRecipient: false,
        recipients: ['GRP-PUR'],
        defaultRecipient: 'Purchaser',
      },
    ],
  },

  // 4. PO
  {
    id: 'ph-po-1',
    processKey: 'PO',
    phaseName: 'Send PO',
    stepsCount: 1,
    actionLabel: 'Send PO',
    gatewayTitle: 'Route before Send PO',
    routes: [
      {
        id: 'rt-po-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Purchaser PO Entry',
        ignoreManualRecipient: false,
        recipients: ['Purchaser'],
        defaultRecipient: 'Purchaser',
      },
    ],
  },
  {
    id: 'ph-po-2',
    processKey: 'PO',
    phaseName: 'Order validation',
    stepsCount: 2,
    actionLabel: 'Approve PO',
    gatewayTitle: 'Routes before Approve',
    routes: [
      {
        id: 'rt-po-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'PO Approver',
        ignoreManualRecipient: false,
        recipients: ['Dir. Jane Doe'],
        defaultRecipient: 'Dir. Jane Doe',
      },
      {
        id: 'rt-po-3',
        name: 'Amount > 100,000 → Executive',
        isDefault: false,
        conditions: 'Total amount (incl. tax) : Greater than 100000',
        destination: 'PO Approver',
        ignoreManualRecipient: true,
        recipients: ['Dir. Jane Doe', 'System Admin'],
        defaultRecipient: 'Dir. Jane Doe',
      },
    ],
  },
  {
    id: 'ph-po-3',
    processKey: 'PO',
    phaseName: 'Receive PO goods',
    stepsCount: 1,
    actionLabel: 'Receive PO goods',
    gatewayTitle: 'Route (Receive PO goods)',
    routes: [
      {
        id: 'rt-po-4',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Warehouse Receiving',
        ignoreManualRecipient: false,
        recipients: ['Warehouse Manager'],
        defaultRecipient: 'Warehouse Manager',
      },
    ],
  },

  // 5. RCV
  {
    id: 'ph-rcv-1',
    processKey: 'RCV',
    phaseName: 'Verify Delivery Receipt (DR)',
    stepsCount: 1,
    actionLabel: 'Verify DR',
    gatewayTitle: 'Route (Delivery Check)',
    routes: [
      {
        id: 'rt-rcv-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Warehouse Receiving',
        ignoreManualRecipient: false,
        recipients: ['Warehouse Manager'],
        defaultRecipient: 'Warehouse Manager',
      },
    ],
  },
  {
    id: 'ph-rcv-2',
    processKey: 'RCV',
    phaseName: 'Post Stock Inflow',
    stepsCount: 1,
    actionLabel: 'Post DR',
    gatewayTitle: 'Route (Stock Update)',
    routes: [
      {
        id: 'rt-rcv-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Central Warehouse Stock',
        ignoreManualRecipient: false,
        recipients: ['GRP-WH'],
        defaultRecipient: 'Warehouse Manager',
      },
    ],
  },

  // 6. WD
  {
    id: 'ph-wd-1',
    processKey: 'WD',
    phaseName: 'Stock Lookup & Request',
    stepsCount: 1,
    actionLabel: 'Check Stock',
    gatewayTitle: 'Route (Stock Availability)',
    routes: [
      {
        id: 'rt-wd-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Site Withdrawal',
        ignoreManualRecipient: false,
        recipients: ['GRP-REQ', 'GRP-WH'],
        defaultRecipient: 'Warehouse Manager',
      },
    ],
  },
  {
    id: 'ph-wd-2',
    processKey: 'WD',
    phaseName: 'Site Issuance',
    stepsCount: 2,
    actionLabel: 'Issue Stock',
    gatewayTitle: 'Route (Issuance Action)',
    routes: [
      {
        id: 'rt-wd-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Site Withdrawal',
        ignoreManualRecipient: false,
        recipients: ['Warehouse Manager'],
        defaultRecipient: 'Warehouse Manager',
      },
      {
        id: 'rt-wd-3',
        name: 'Without Stock → Flag PR',
        isDefault: false,
        conditions: 'Without Stock : Equal to True',
        destination: 'Purchaser PO Entry',
        ignoreManualRecipient: false,
        recipients: ['Purchaser'],
        defaultRecipient: 'Purchaser',
      },
    ],
  },

  // 7. OTH
  {
    id: 'ph-oth-1',
    processKey: 'OTH',
    phaseName: 'Stock Transfers & Returns',
    stepsCount: 1,
    actionLabel: 'Stock Transfer',
    gatewayTitle: 'Route (Transfer / Excess Return)',
    routes: [
      {
        id: 'rt-oth-1',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Central Warehouse Stock',
        ignoreManualRecipient: false,
        recipients: ['GRP-WH'],
        defaultRecipient: 'Warehouse Manager',
      },
    ],
  },
  {
    id: 'ph-oth-2',
    processKey: 'OTH',
    phaseName: 'Rules & SMTP Controls',
    stepsCount: 1,
    actionLabel: 'System Rules',
    gatewayTitle: 'Route (Admin Configuration)',
    routes: [
      {
        id: 'rt-oth-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'System Administration',
        ignoreManualRecipient: false,
        recipients: ['GRP-ADM'],
        defaultRecipient: 'System Admin',
      },
    ],
  },
];

interface ProcessDesignerModuleProps {
  phases: ProcessPhaseConfig[];
  setPhases: React.Dispatch<React.SetStateAction<ProcessPhaseConfig[]>>;
  accounts: UserAccount[];
  groups: UserGroup[];
  boqItems?: BoqItem[];
  pqtos?: PqtoRecord[];
  prs?: PrRecord[];
  pos?: PoRecord[];
  receivings?: ReceivingRecord[];
  withdrawals?: WithdrawalRecord[];
  stock?: WarehouseStock[];
  transfers?: StockTransferRecord[];
  onOpenNewRequest?: () => void;
  onNavigate: (mod: ModuleKey) => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

/**
 * Unified Process Workflow Builder across ALL 7 ERP processes (BOQ, PQTO, PR, PO, RCV, WD, OTH)
 * powered by reusable WorkflowTimeline, RoutingRuleModal, and LiveTypeAhead components.
 */
export function ProcessDesignerModule({
  phases,
  setPhases,
  accounts,
  groups,
  boqItems = [],
  pqtos = [],
  prs = [],
  pos = [],
  receivings = [],
  withdrawals = [],
  stock = [],
  onOpenNewRequest,
  onNavigate,
  onAddLog,
}: ProcessDesignerModuleProps) {
  const [processKey, setProcessKey] = useState<ProcessKey>('PR');
  const [processSearch, setProcessSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const [editingModal, setEditingModal] = useState<{
    phaseId: string;
    route: ProcessRouteRule | null;
  } | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Ensure new processes have phases even if user had older cached processPhases
  const visiblePhases = useMemo(() => {
    const existing = phases.filter((p) => p.processKey === processKey);
    if (existing.length > 0) return existing;
    return DEFAULT_PROCESS_PHASES.filter((p) => p.processKey === processKey);
  }, [phases, processKey]);

  // Dynamic Live Type-Ahead data sources wired to actual ERP records
  const processOptions: TypeAheadOption[] = useMemo(
    () =>
      PROCESS_CATALOG.map((p) => ({
        value: p.key,
        label: p.label,
        sublabel: p.key,
        category: 'Processes',
        keywords: [p.key, p.label],
      })),
    []
  );

  const phaseNameOptions: TypeAheadOption[] = useMemo(() => {
    const uniqueNames = Array.from(new Set(DEFAULT_PROCESS_PHASES.map((p) => p.phaseName)));
    return uniqueNames.map((name) => ({
      value: name,
      label: name,
      category: 'Standard Workflow Phases',
    }));
  }, []);

  const conditionOptions: TypeAheadOption[] = useMemo(() => {
    const vendors = Array.from(new Set(pos.map((p) => p.vendor).filter(Boolean)));
    const costCenters = Array.from(
      new Set([
        ...boqItems.map((b) => b.costCenter).filter(Boolean) as string[],
        ...prs.map((p) => p.spName).filter(Boolean),
        ...pos.map((p) => p.spName).filter(Boolean),
      ])
    );
    const departments = Array.from(new Set(accounts.map((a) => a.department).filter(Boolean)));
    const itemTags = Array.from(new Set(stock.map((s) => s.systemTag).filter(Boolean)));

    return [
      { value: 'Net amount (excl. tax)', label: 'Net amount (excl. tax)', category: 'Frequently used' },
      { value: 'Total amount (incl. tax)', label: 'Total amount (incl. tax)', category: 'Frequently used' },
      { value: 'Third party (vendor)', label: 'Third party (vendor)', category: 'Frequently used' },
      { value: 'Project / Business Unit', label: 'Project / Business Unit', category: 'Frequently used' },
      { value: 'Exceeds PQTO', label: 'Exceeds PQTO', category: 'Frequently used' },
      { value: 'New Item (Non-BOQ)', label: 'New Item (Non-BOQ)', category: 'Frequently used' },
      { value: 'Without Stock', label: 'Without Stock', category: 'Other suggestions' },
      { value: 'Discrepancy amount in percentage', label: 'Discrepancy amount in percentage', category: 'Other suggestions' },
      { value: 'Price discrepancy', label: 'Price discrepancy', category: 'Other suggestions' },
      ...vendors.map((v) => ({ value: `Vendor = ${v}`, label: `Vendor : ${v}`, category: 'Active Vendors (PO)' })),
      ...costCenters.map((cc) => ({ value: `Cost Code = ${cc}`, label: `Cost Code / SP : ${cc}`, category: 'Cost Centers / SP Names' })),
      ...departments.map((d) => ({ value: `Department = ${d}`, label: `Department : ${d}`, category: 'Departments' })),
      ...itemTags.map((t) => ({ value: `System Tag = ${t}`, label: `System Tag : ${t}`, category: 'Warehouse Systems' })),
    ];
  }, [pos, boqItems, prs, accounts, stock]);

  const destinationOptions: TypeAheadOption[] = useMemo(
    () => [
      { value: 'Engineering Estimation', label: 'Engineering Estimation', category: 'BOQ / PQTO' },
      { value: 'PQTO Take-Off', label: 'PQTO Take-Off', category: 'BOQ / PQTO' },
      { value: 'Create', label: 'Create PR', category: 'Purchasing' },
      { value: 'REQ Approver Review', label: 'REQ Approver Review', category: 'Purchasing' },
      { value: 'Purchaser PO Entry', label: 'Purchaser PO Entry', category: 'Purchasing' },
      { value: 'PO Approver', label: 'PO Approver', category: 'Purchasing' },
      { value: 'Send PO to Vendor', label: 'Send PO to Vendor', category: 'Purchasing' },
      { value: 'Warehouse Receiving', label: 'Warehouse Receiving (DR)', category: 'Warehousing' },
      { value: 'Central Warehouse Stock', label: 'Central Warehouse Stock', category: 'Warehousing' },
      { value: 'Site Withdrawal', label: 'Site Withdrawal (WD)', category: 'Warehousing' },
      { value: 'System Administration', label: 'System Administration', category: 'Admin' },
    ],
    []
  );

  const recipientOptions: TypeAheadOption[] = useMemo(() => {
    const depts = Array.from(new Set(accounts.map((a) => a.department).filter(Boolean)));
    return [
      ...groups.map((g) => ({
        value: g.code,
        label: g.code,
        sublabel: g.name,
        category: 'User Groups',
        keywords: [g.code, g.name, g.description],
      })),
      ...accounts.map((a) => ({
        value: a.fullName,
        label: a.fullName,
        sublabel: `${a.role} • ${a.department}`,
        category: 'Users & Approvers',
        keywords: [a.username, a.role, a.department],
      })),
      ...depts.map((d) => ({
        value: d,
        label: d,
        sublabel: 'Department',
        category: 'Departments',
      })),
    ];
  }, [groups, accounts]);

  const defaultRecipientOptions: TypeAheadOption[] = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.fullName,
        label: a.fullName,
        sublabel: `${a.role} • ${a.username}`,
        category: 'Users',
      })),
    [accounts]
  );

  const getPhaseRuntime = (phase: ProcessPhaseConfig): PhaseRuntimeInfo => {
    const pendingPrs = prs.filter((p) => p.status === 'Pending Approval').length;
    const approvedPrs = prs.filter((p) => p.status === 'Approved').length;
    const pendingPos = pos.filter((p) => p.status === 'Pending Approval').length;
    const openPos = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received').length;

    switch (phase.id) {
      case 'ph-boq-1':
      case 'ph-boq-2':
        return {
          status: pqtos.length > 0 ? 'done' : 'active',
          badgeCount: boqItems.length,
          actionTitle: 'Open BOQ — Bill of Quantities',
          onActionClick: () => onNavigate('boq'),
        };
      case 'ph-pqto-1':
        return {
          status: pqtos.length > 0 ? 'done' : 'pending',
          badgeCount: pqtos.length,
          actionTitle: 'Open PQTO — Project Qty Take-Off',
          onActionClick: () => onNavigate('pqto'),
        };
      case 'ph-pqto-2':
      case 'ph-pr-1':
        return {
          status: 'done',
          badgeCount: prs.length,
          actionTitle: 'Open New Request Form',
          onActionClick: () => (onOpenNewRequest ? onOpenNewRequest() : onNavigate('pr')),
        };
      case 'ph-pr-2':
        return {
          status: pendingPrs > 0 ? 'active' : 'done',
          badgeCount: pendingPrs,
          actionTitle: 'Open PR for REQ Approval',
          onActionClick: () => onNavigate('pr'),
        };
      case 'ph-pr-3':
      case 'ph-po-1':
        return {
          status: approvedPrs > 0 ? 'active' : 'done',
          badgeCount: approvedPrs,
          actionTitle: 'Open PO Entry',
          onActionClick: () => onNavigate('po'),
        };
      case 'ph-po-2':
        return {
          status: pendingPos > 0 ? 'active' : 'done',
          badgeCount: pendingPos,
          actionTitle: 'Open PO for Approval',
          onActionClick: () => onNavigate('po'),
        };
      case 'ph-po-3':
      case 'ph-rcv-1':
      case 'ph-rcv-2':
        return {
          status: openPos > 0 ? 'active' : 'done',
          badgeCount: phase.processKey === 'PO' ? openPos : receivings.length,
          actionTitle: 'Open Receiving (DR)',
          onActionClick: () => onNavigate('receiving'),
        };
      case 'ph-wd-1':
      case 'ph-wd-2':
        return {
          status: 'done',
          badgeCount: withdrawals.length,
          actionTitle: 'Open Material Withdrawal (WD)',
          onActionClick: () => onNavigate('withdrawal'),
        };
      case 'ph-oth-1':
      case 'ph-oth-2':
        return {
          status: 'done',
          badgeCount: stock.length,
          actionTitle: 'Open Transfers, Inventory & Rules',
          onActionClick: () => onNavigate('transfers'),
        };
      default:
        return {
          status: 'pending',
          actionTitle: `Open ${phase.actionLabel}`,
          onActionClick: () => onNavigate(PROCESS_CATALOG.find((c) => c.key === processKey)?.module || 'tracking'),
        };
    }
  };

  const handleUpdatePhaseName = (phaseId: string, name: string) => {
    setPhases((prev) => {
      const hasPhase = prev.some((p) => p.id === phaseId);
      const base = hasPhase ? prev : [...prev, ...DEFAULT_PROCESS_PHASES.filter((d) => d.processKey === processKey)];
      return base.map((p) => (p.id === phaseId ? { ...p, phaseName: name } : p));
    });
  };

  const handleAddPhase = () => {
    const newPhase: ProcessPhaseConfig = {
      id: `ph-${processKey.toLowerCase()}-${Date.now()}`,
      processKey,
      phaseName: `New ${processKey} Phase`,
      stepsCount: 1,
      actionLabel: `Step ${visiblePhases.length + 1}`,
      gatewayTitle: `Route (${processKey} Step ${visiblePhases.length + 1})`,
      routes: [
        {
          id: `rt-${Date.now()}`,
          name: '(Default)',
          isDefault: true,
          conditions: '',
          destination: 'REQ Approver Review',
          ignoreManualRecipient: false,
          recipients: [],
          defaultRecipient: accounts[0]?.fullName || '',
        },
      ],
    };
    setPhases((prev) => [...prev, newPhase]);
    onAddLog('System', processKey, 'Workflow Phase Added', `Added phase "${newPhase.phaseName}" to ${processKey}`);
    notify(`Added phase to ${processKey}.`);
  };

  const handleDeletePhase = (phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
    onAddLog('System', processKey, 'Workflow Phase Removed', `Removed phase ${phaseId} from ${processKey}`);
    notify('Phase removed.');
  };

  const handleSaveRoute = (rule: ProcessRouteRule) => {
    if (!editingModal) return;
    setPhases((prev) => {
      const hasPhase = prev.some((p) => p.id === editingModal.phaseId);
      const base = hasPhase ? prev : [...prev, ...DEFAULT_PROCESS_PHASES.filter((d) => d.processKey === processKey)];
      return base.map((ph) => {
        if (ph.id !== editingModal.phaseId) return ph;
        const exists = ph.routes.some((r) => r.id === rule.id);
        const nextRoutes = exists
          ? ph.routes.map((r) => (r.id === rule.id ? rule : r))
          : [...ph.routes, rule];
        return { ...ph, routes: nextRoutes, stepsCount: nextRoutes.length };
      });
    });
    onAddLog('System', processKey, 'Workflow Route Saved', `Saved route "${rule.name}" → ${rule.destination}`);
    notify(`Saved route "${rule.name}".`);
    setEditingModal(null);
  };

  const handleDeleteRoute = (routeId: string) => {
    if (!editingModal) return;
    setPhases((prev) =>
      prev.map((ph) => {
        if (ph.id !== editingModal.phaseId) return ph;
        const nextRoutes = ph.routes.filter((r) => r.id !== routeId);
        return { ...ph, routes: nextRoutes, stepsCount: nextRoutes.length };
      })
    );
    notify('Route deleted.');
    setEditingModal(null);
  };

  const handleReorderRoute = (phaseId: string, routeId: string, dir: 'up' | 'down') => {
    setPhases((prev) =>
      prev.map((ph) => {
        if (ph.id !== phaseId) return ph;
        const idx = ph.routes.findIndex((r) => r.id === routeId);
        if (idx === -1) return ph;
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= ph.routes.length) return ph;
        const next = [...ph.routes];
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        return { ...ph, routes: next };
      })
    );
  };

  const activeCatalog = PROCESS_CATALOG.find((c) => c.key === processKey) || PROCESS_CATALOG[2];

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* Unified Process Header Bar */}
      <div className="bg-[#2c3e96] text-white rounded-t-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigate(activeCatalog.module)}
            className="inline-flex items-center gap-1 text-blue-200 hover:text-white font-medium cursor-pointer"
          >
            &lt; Process
          </button>
          <span className="font-bold text-sm tracking-tight">{activeCatalog.label}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52 text-[#1e293b]">
            <LiveTypeAhead
              options={processOptions}
              value={processSearch}
              onChange={setProcessSearch}
              onSelectOption={(opt) => {
                setProcessKey(opt.value as ProcessKey);
                setProcessSearch('');
              }}
              placeholder="Jump to process (BOQ, PR, PO...)"
              inputClassName="h-7 text-xs bg-white/95 border-0 rounded-md"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setPhases(DEFAULT_PROCESS_PHASES);
              notify('Restored default workflow phases across all 7 processes.');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3b4fa8] hover:bg-[#495ec0] text-blue-100 text-xs font-semibold rounded-md cursor-pointer"
            title="Reset workflow templates to defaults"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* All-Process Switcher Strip */}
      <div className="bg-white border-x border-[#dce2ec] px-3 py-2 flex flex-wrap items-center gap-1.5">
        {PROCESS_CATALOG.map((proc) => (
          <button
            key={proc.key}
            type="button"
            onClick={() => setProcessKey(proc.key)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
              processKey === proc.key
                ? 'bg-[#1976d2] text-white shadow-xs'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            {proc.key}
          </button>
        ))}
      </div>

      {/* Horizontal Scrollable Yooz-Inspired Timeline */}
      <div className="bg-[#f5f7fb] border border-[#dce2ec] rounded-b-md p-4">
        <WorkflowTimeline
          phases={visiblePhases}
          phaseNameOptions={phaseNameOptions}
          getPhaseRuntime={getPhaseRuntime}
          onUpdatePhaseName={handleUpdatePhaseName}
          onAddPhase={handleAddPhase}
          onDeletePhase={handleDeletePhase}
          onAddRoute={(phaseId) => setEditingModal({ phaseId, route: null })}
          onEditRoute={(phaseId, route) => setEditingModal({ phaseId, route })}
          onReorderRoute={handleReorderRoute}
        />

        {/* Bottom Settings Bar */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => onNavigate('transfers')}
            className="w-full max-w-2xl bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#1e293b] shadow-xs cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#2c3e96]" />
              Settings (Validation Rules, SMTP &amp; Inventory Controls)
            </span>
            <ChevronRight className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>
      </div>

      {/* Reusable Route Gateway Modal */}
      {editingModal && (
        <RoutingRuleModal
          gatewayTitle={
            visiblePhases.find((p) => p.id === editingModal.phaseId)?.gatewayTitle || 'Route Gateway'
          }
          initialRoute={editingModal.route}
          defaultDestination={
            visiblePhases.find((p) => p.id === editingModal.phaseId)?.routes[0]?.destination || 'Create'
          }
          conditionOptions={conditionOptions}
          destinationOptions={destinationOptions}
          recipientOptions={recipientOptions}
          defaultRecipientOptions={defaultRecipientOptions}
          onSave={handleSaveRoute}
          onDelete={handleDeleteRoute}
          onClose={() => setEditingModal(null)}
        />
      )}
    </div>
  );
}
