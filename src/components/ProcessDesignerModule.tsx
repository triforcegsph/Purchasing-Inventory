import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  GitFork,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type {
  ModuleKey,
  PoRecord,
  PrRecord,
  ProcessPhaseConfig,
  ProcessRouteRule,
  ReceivingRecord,
  UserAccount,
  UserGroup,
  WithdrawalRecord,
} from '../types/erp';

export const DEFAULT_PROCESS_PHASES: ProcessPhaseConfig[] = [
  // Purchase Request (PR) Process
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
    stepsCount: 1,
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
        conditions: 'New Item (Non-BOQ) = True',
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

  // Purchase Order (PO) Process
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
    stepsCount: 1,
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
        conditions: 'Total amount (incl. tax) > 100000',
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

  // Receiving & Withdrawal (RCV) Process
  {
    id: 'ph-rcv-1',
    processKey: 'RCV',
    phaseName: 'Goods Receiving (DR)',
    stepsCount: 1,
    actionLabel: 'Post DR',
    gatewayTitle: 'Route (Warehouse Stock In)',
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
    phaseName: 'Material Withdrawal',
    stepsCount: 1,
    actionLabel: 'Issue Stock',
    gatewayTitle: 'Route (Site Issuance)',
    routes: [
      {
        id: 'rt-rcv-2',
        name: '(Default)',
        isDefault: true,
        conditions: '',
        destination: 'Site Withdrawal',
        ignoreManualRecipient: false,
        recipients: ['GRP-WH', 'GRP-REQ'],
        defaultRecipient: 'Warehouse Manager',
      },
      {
        id: 'rt-rcv-3',
        name: 'Without Stock → Flag PR',
        isDefault: false,
        conditions: 'Without Stock = True',
        destination: 'Purchaser PO Entry',
        ignoreManualRecipient: false,
        recipients: ['Purchaser'],
        defaultRecipient: 'Purchaser',
      },
    ],
  },
];

const FREQUENT_CONDITIONS = [
  'Net amount (excl. tax)',
  'Total amount (incl. tax)',
  'Third party (vendor, customer...)',
  'Project / Business Unit',
  'Exceeds PQTO',
  'New Item (Non-BOQ)',
];

const OTHER_CONDITIONS = [
  'Without Stock',
  'Discrepancy amount in percentage',
  'Price discrepancy',
  'Account / Cost Code (SP Name)',
  'Refusal / Rejection comments',
];

const DESTINATIONS = [
  'Create',
  'REQ Approver Review',
  'Purchaser PO Entry',
  'PO Approver',
  'Send PO to Vendor',
  'Warehouse Receiving',
  'Site Withdrawal',
];

interface ProcessDesignerModuleProps {
  phases: ProcessPhaseConfig[];
  setPhases: React.Dispatch<React.SetStateAction<ProcessPhaseConfig[]>>;
  accounts: UserAccount[];
  groups: UserGroup[];
  prs?: PrRecord[];
  pos?: PoRecord[];
  receivings?: ReceivingRecord[];
  withdrawals?: WithdrawalRecord[];
  onOpenNewRequest?: () => void;
  onNavigate: (mod: ModuleKey) => void;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function ProcessDesignerModule({
  phases,
  setPhases,
  accounts,
  groups,
  prs = [],
  pos = [],
  receivings = [],
  withdrawals = [],
  onOpenNewRequest,
  onNavigate,
  onAddLog,
}: ProcessDesignerModuleProps) {
  const [processKey, setProcessKey] = useState<'PR' | 'PO' | 'RCV'>('PR');
  const [toast, setToast] = useState<string | null>(null);

  // Route Modal state
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [conditions, setConditions] = useState('');
  const [destination, setDestination] = useState('Create');
  const [ignoreManual, setIgnoreManual] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState('');

  // Popups inside Route Modal (Yooz-style)
  const [showConditionSuggest, setShowConditionSuggest] = useState(false);
  const [conditionQuery, setConditionQuery] = useState('');
  const [activeConditionChip, setActiveConditionChip] = useState<string | null>(null);
  const [condMode, setCondMode] = useState<'values' | 'between'>('values');
  const [condOperator, setCondOperator] = useState('Equal to');
  const [condValue1, setCondValue1] = useState('');
  const [condValue2, setCondValue2] = useState('');

  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const visiblePhases = phases.filter((p) => p.processKey === processKey);

  const openNewRouteModal = (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    setEditingPhaseId(phaseId);
    setEditingRouteId(null);
    setRouteName('');
    setIsDefault(false);
    setConditions('');
    setDestination(phase?.routes[0]?.destination || 'Create');
    setIgnoreManual(false);
    setRecipients([]);
    setDefaultRecipient('');
    setShowConditionSuggest(false);
    setConditionQuery('');
    setActiveConditionChip(null);
    setShowRecipientPicker(false);
  };

  const openEditRouteModal = (phaseId: string, route: ProcessRouteRule) => {
    setEditingPhaseId(phaseId);
    setEditingRouteId(route.id);
    setRouteName(route.name);
    setIsDefault(route.isDefault);
    setConditions(route.conditions);
    setDestination(route.destination);
    setIgnoreManual(route.ignoreManualRecipient);
    setRecipients([...route.recipients]);
    setDefaultRecipient(route.defaultRecipient);
    setShowConditionSuggest(false);
    setConditionQuery('');
    setActiveConditionChip(null);
    setShowRecipientPicker(false);
  };

  const saveRoute = () => {
    if (!editingPhaseId || !routeName.trim()) return;
    const newRule: ProcessRouteRule = {
      id: editingRouteId || `rt-${Date.now()}`,
      name: routeName.trim(),
      isDefault,
      conditions: conditions.trim(),
      destination,
      ignoreManualRecipient: ignoreManual,
      recipients,
      defaultRecipient,
    };

    setPhases((prev) =>
      prev.map((ph) => {
        if (ph.id !== editingPhaseId) return ph;
        const exists = ph.routes.some((r) => r.id === newRule.id);
        const nextRoutes = exists
          ? ph.routes.map((r) => (r.id === newRule.id ? newRule : r))
          : [...ph.routes, newRule];
        return { ...ph, routes: nextRoutes };
      })
    );
    onAddLog('System', processKey, 'Workflow Route Saved', `Updated route "${newRule.name}" → ${newRule.destination}`);
    notify(`Saved route "${newRule.name}".`);
    setEditingPhaseId(null);
  };

  const deleteRoute = () => {
    if (!editingPhaseId || !editingRouteId) return;
    setPhases((prev) =>
      prev.map((ph) =>
        ph.id === editingPhaseId
          ? { ...ph, routes: ph.routes.filter((r) => r.id !== editingRouteId) }
          : ph
      )
    );
    notify('Route deleted.');
    setEditingPhaseId(null);
  };

  const applyConditionBuilder = () => {
    if (!activeConditionChip) return;
    let expr = '';
    if (condMode === 'between') {
      expr = `${activeConditionChip} Between ${condValue1 || '0'} and ${condValue2 || '0'}`;
    } else {
      const opSymbol =
        condOperator === 'Equal to'
          ? '='
          : condOperator === 'Greater than'
          ? '>'
          : condOperator === 'Less than'
          ? '<'
          : condOperator;
      expr = `${activeConditionChip} ${opSymbol} ${condValue1 || '0'}`;
    }
    setConditions((prev) => (prev ? `${prev} AND ${expr}` : expr));
    setActiveConditionChip(null);
    setConditionQuery('');
    setCondValue1('');
    setCondValue2('');
  };

  const toggleRecipient = (label: string) => {
    setRecipients((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const allRecipientOptions = [
    ...groups.map((g) => ({ id: g.id, label: g.code, sub: `Group • ${g.name}` })),
    ...accounts.map((a) => ({ id: a.id, label: a.fullName, sub: `${a.role} • ${a.username}` })),
  ].filter(
    (o) =>
      o.label.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      o.sub.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* Yooz-Style Process Sub-Header Bar */}
      <div className="bg-[#2c3e96] text-white rounded-t-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => onNavigate('tracking')}
            className="inline-flex items-center gap-1 text-blue-200 hover:text-white font-medium cursor-pointer"
          >
            &lt; Process
          </button>
          <span className="font-bold text-sm tracking-tight">
            {processKey === 'PR' && 'Purchase request (PR)'}
            {processKey === 'PO' && 'Purchase order (PO)'}
            {processKey === 'RCV' && 'Receiving & Withdrawal (RCV)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { key: 'PR', label: 'Purchase Request (PR)' },
              { key: 'PO', label: 'Purchase Order (PO)' },
              { key: 'RCV', label: 'Receiving & Withdrawal' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setProcessKey(tab.key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                processKey === tab.key
                  ? 'bg-white text-[#2c3e96] shadow-xs'
                  : 'bg-[#3b4fa8] text-blue-100 hover:bg-[#495ec0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Phase-by-Phase Canvas (Yooz-inspired) */}
      <div className="bg-[#f5f7fb] border border-[#dce2ec] rounded-b-md p-4 overflow-x-auto">
        <div className="min-w-[820px] grid grid-cols-1 md:grid-cols-3 gap-0 divide-x divide-dashed divide-[#cbd5e1]">
          {visiblePhases.map((phase, idx) => (
            <div key={phase.id} className="px-4 py-2 flex flex-col">
              {/* Phase Name & Steps */}
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-[#64748b] mb-1">Phase:</label>
                  <input
                    value={phase.phaseName}
                    onChange={(e) =>
                      setPhases((prev) =>
                        prev.map((p) => (p.id === phase.id ? { ...p, phaseName: e.target.value } : p))
                      )
                    }
                    className="w-full h-8 px-2.5 text-xs font-medium text-[#1e293b] bg-white border border-[#cbd5e1] rounded-md focus:outline-none focus:border-[#1976d2]"
                  />
                </div>
                <div className="w-16">
                  <label className="block text-[11px] font-medium text-[#64748b] mb-1">Steps:</label>
                  <div className="h-8 px-2.5 flex items-center justify-center text-xs font-semibold text-[#1e293b] bg-white border border-[#cbd5e1] rounded-md">
                    {phase.routes.length}
                  </div>
                </div>
              </div>

              {/* Horizontal Flow Line: >>> [Gateway] >>> [Action Pill] >>> (Check) */}
              <div className="relative flex items-center gap-2 py-2 mb-3">
                <div className="flex-1 border-t-2 border-dotted border-[#7dd3fc]" />
                <button
                  type="button"
                  onClick={() => openNewRouteModal(phase.id)}
                  title="Add route rule"
                  className="w-9 h-9 rounded-lg bg-white border border-[#cbd5e1] shadow-xs flex items-center justify-center text-[#1e40af] hover:border-[#1976d2] cursor-pointer shrink-0"
                >
                  <GitFork className="w-4 h-4" />
                </button>
                <div className="w-4 border-t-2 border-dotted border-[#7dd3fc]" />
                {(() => {
                  const pendingPrs = prs.filter((p) => p.status === 'Pending Approval').length;
                  const approvedPrs = prs.filter((p) => p.status === 'Approved').length;
                  const pendingPos = pos.filter((p) => p.status === 'Pending Approval').length;
                  const openPos = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received').length;

                  let badgeCount: number | null = null;
                  let title = `Open ${phase.actionLabel}`;
                  const handleActionClick = () => {
                    if (phase.id === 'ph-pr-1') {
                      if (onOpenNewRequest) {
                        onOpenNewRequest();
                      } else {
                        onNavigate('pr');
                      }
                      return;
                    }
                    if (phase.id === 'ph-pr-2') {
                      onNavigate('pr');
                      return;
                    }
                    if (phase.id === 'ph-pr-3' || phase.id === 'ph-po-1' || phase.id === 'ph-po-2') {
                      onNavigate('po');
                      return;
                    }
                    if (phase.id === 'ph-po-3' || phase.id === 'ph-rcv-1') {
                      onNavigate('receiving');
                      return;
                    }
                    if (phase.id === 'ph-rcv-2') {
                      onNavigate('withdrawal');
                      return;
                    }
                    onNavigate('tracking');
                  };

                  if (phase.id === 'ph-pr-1') title = 'Click to open New Request Form';
                  if (phase.id === 'ph-pr-2') {
                    badgeCount = pendingPrs;
                    title = 'Click to open PR for REQ Approval';
                  } else if (phase.id === 'ph-pr-3' || phase.id === 'ph-po-1') {
                    badgeCount = approvedPrs;
                    title = 'Click to open PO Entry';
                  } else if (phase.id === 'ph-po-2') {
                    badgeCount = pendingPos;
                    title = 'Click to open PO for Approval';
                  } else if (phase.id === 'ph-po-3') {
                    badgeCount = openPos;
                    title = 'Click to open Receiving (DR)';
                  } else if (phase.id === 'ph-rcv-1') {
                    badgeCount = receivings.length;
                    title = 'Click to open Receiving (DR)';
                  } else if (phase.id === 'ph-rcv-2') {
                    badgeCount = withdrawals.length;
                    title = 'Click to open Material Withdrawal (WD)';
                  }

                  return (
                    <button
                      type="button"
                      onClick={handleActionClick}
                      title={title}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-[#1976d2] border-2 border-[#1976d2] text-[#1976d2] hover:text-white text-xs font-semibold shadow-xs whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <span>{phase.actionLabel}</span>
                      {badgeCount !== null && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#eff6ff] text-[#1e3a8a] text-[10px] font-bold">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })()}
                <div className="flex-1 border-t-2 border-dotted border-[#7dd3fc]" />
                {idx < visiblePhases.length - 1 && (
                  <span className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Routes Card */}
              <div className="bg-white border border-[#dce2ec] rounded-lg shadow-xs overflow-hidden flex-1 min-h-[210px] flex flex-col">
                <div className="px-3 py-2 bg-[#eff4fb] border-b border-[#dce2ec] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e293b]">
                    {phase.routes.length} {phase.routes.length === 1 ? 'Route' : 'Routes'} ({phase.gatewayTitle})
                  </span>
                  <button
                    type="button"
                    onClick={() => openNewRouteModal(phase.id)}
                    className="w-6 h-6 rounded hover:bg-[#dbeafe] text-[#1e293b] flex items-center justify-center cursor-pointer"
                    title="Add new route"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-[#eef2f6] flex-1">
                  {phase.routes.map((rt, rIdx) => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => openEditRouteModal(phase.id, rt)}
                      className="w-full px-3 py-2 text-left hover:bg-[#f8fafc] flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-[#64748b] w-4 shrink-0">
                          {rt.isDefault ? '✓' : rIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-[#1e293b] truncate">{rt.name}</div>
                          {rt.conditions && (
                            <div className="text-[10.5px] text-[#0284c7] font-mono truncate">
                              {rt.conditions}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10.5px] text-[#64748b] shrink-0">
                        {rt.defaultRecipient || rt.destination}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Settings Pill (Yooz-inspired) */}
        <div className="mt-5 flex justify-center">
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

      {/* ========================================================= */}
      {/* ROUTE GATEWAY MODAL (Yooz Screenshots 2, 5, 6, 7, 8)      */}
      {/* ========================================================= */}
      {editingPhaseId && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-[#cbd5e1] w-full max-w-xl p-5 space-y-4 my-auto relative">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1e3a8a]">
                {phases.find((p) => p.id === editingPhaseId)?.gatewayTitle || 'Route Gateway'}
              </h3>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
                  <span>Default</span>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 accent-[#1976d2]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setEditingPhaseId(null)}
                  className="text-[#64748b] hover:text-[#1e293b] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                Name <span className="text-[#d5002b]">*</span>
              </label>
              <input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g. Amount > 100,000 → Executive"
                className="w-full h-9 px-3 text-xs border border-[#cbd5e1] rounded-md focus:outline-none focus:border-[#1976d2]"
              />
            </div>

            {/* Conditions with Live Type-Ahead Suggestion Dropdown + Blue Chips */}
            <div className="relative">
              <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Conditions</label>
              <div className="min-h-[64px] p-2 border border-[#1976d2] rounded-md bg-white flex flex-wrap items-start gap-1.5 relative pr-7">
                {conditions
                  .split(' AND ')
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .map((chip, idx, arr) => (
                    <span
                      key={`${chip}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#7dd3fc]/55 text-[#0c4a6e] text-xs font-medium"
                    >
                      <span>{chip}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = arr.filter((_, i) => i !== idx).join(' AND ');
                          setConditions(next);
                        }}
                        className="text-[#0369a1] hover:text-[#0c4a6e] cursor-pointer"
                        title="Remove condition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                <input
                  value={conditionQuery}
                  onFocus={() => setShowConditionSuggest(true)}
                  onChange={(e) => {
                    setConditionQuery(e.target.value);
                    setShowConditionSuggest(true);
                    setActiveConditionChip(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && conditionQuery.trim()) {
                      e.preventDefault();
                      setActiveConditionChip(conditionQuery.trim());
                      setShowConditionSuggest(false);
                    }
                  }}
                  placeholder={
                    conditions
                      ? 'Type to filter suggestions...'
                      : 'If empty, no condition (always true) — start typing to see suggestions'
                  }
                  className="flex-1 min-w-[180px] h-7 px-1 text-xs focus:outline-none bg-transparent text-[#1e293b]"
                />
                {conditions && (
                  <button
                    type="button"
                    onClick={() => {
                      setConditions('');
                      setConditionQuery('');
                    }}
                    className="absolute right-2 top-2 text-[#64748b] hover:text-[#1e293b] cursor-pointer"
                    title="Clear all conditions"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {showConditionSuggest && !activeConditionChip && (() => {
                const q = conditionQuery.trim().toLowerCase();
                const freq = FREQUENT_CONDITIONS.filter((c) => c.toLowerCase().includes(q));
                const other = OTHER_CONDITIONS.filter((c) => c.toLowerCase().includes(q));
                return (
                  <div className="mt-1 bg-white border border-[#cbd5e1] rounded-lg shadow-xl p-2 space-y-1 z-30 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-0.5 text-[10.5px] font-bold text-[#475569]">
                      <span>Frequently used</span>
                      <button
                        type="button"
                        onClick={() => setShowConditionSuggest(false)}
                        className="text-[#1976d2] hover:underline cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    {freq.length === 0 && other.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-[#64748b]">
                        No matching suggestions. Press <kbd className="px-1 py-0.5 bg-[#f1f5f9] rounded border text-[10px]">Enter</kbd> to use &ldquo;{conditionQuery}&rdquo;.
                      </div>
                    ) : (
                      <>
                        {freq.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setActiveConditionChip(c);
                              setShowConditionSuggest(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#e0f2fe] text-[#1e293b] cursor-pointer"
                          >
                            {c}
                          </button>
                        ))}
                        {other.length > 0 && (
                          <>
                            <div className="px-2 pt-1.5 pb-0.5 text-[10.5px] font-bold text-[#475569] border-t border-[#f1f5f9]">
                              Other suggestions
                            </div>
                            {other.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setActiveConditionChip(c);
                                  setShowConditionSuggest(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#e0f2fe] text-[#1e293b] cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              {activeConditionChip && (
                <div className="mt-2 bg-white border border-[#93c5fd] rounded-lg shadow-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-[#bae6fd] text-[#0369a1] rounded text-xs font-semibold">
                      {activeConditionChip}:
                    </span>
                    <div className="flex gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setCondMode('values')}
                        className={`pb-0.5 border-b-2 cursor-pointer ${
                          condMode === 'values' ? 'border-[#1976d2] text-[#1976d2]' : 'border-transparent text-[#64748b]'
                        }`}
                      >
                        Values
                      </button>
                      <button
                        type="button"
                        onClick={() => setCondMode('between')}
                        className={`pb-0.5 border-b-2 cursor-pointer ${
                          condMode === 'between' ? 'border-[#1976d2] text-[#1976d2]' : 'border-transparent text-[#64748b]'
                        }`}
                      >
                        Between...and...
                      </button>
                    </div>
                  </div>

                  {condMode === 'values' ? (
                    <div className="flex gap-2">
                      <select
                        value={condOperator}
                        onChange={(e) => setCondOperator(e.target.value)}
                        className="h-8 px-2 text-xs border border-[#cbd5e1] rounded-md bg-white"
                      >
                        <option>Equal to</option>
                        <option>Greater than</option>
                        <option>Less than</option>
                      </select>
                      <input
                        value={condValue1}
                        onChange={(e) => setCondValue1(e.target.value)}
                        placeholder="Value..."
                        className="flex-1 h-8 px-2.5 text-xs border border-[#1976d2] rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        value={condValue1}
                        onChange={(e) => setCondValue1(e.target.value)}
                        placeholder="Min"
                        className="flex-1 h-8 px-2.5 border border-[#cbd5e1] rounded-md"
                      />
                      <span className="text-[#64748b]">and</span>
                      <input
                        value={condValue2}
                        onChange={(e) => setCondValue2(e.target.value)}
                        placeholder="Max"
                        className="flex-1 h-8 px-2.5 border border-[#cbd5e1] rounded-md"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveConditionChip(null)}
                      className="px-3 py-1 text-xs font-semibold text-[#1976d2] border border-[#cbd5e1] rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyConditionBuilder}
                      className="px-3 py-1 text-xs font-semibold bg-[#1976d2] text-white rounded-md cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">
                Destination <span className="text-[#d5002b]">*</span>
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-9 px-3 text-xs border border-[#cbd5e1] rounded-md bg-white font-medium"
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Ignore manual recipient selection */}
            <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
              <span>Ignore manual recipient selection</span>
              <input
                type="checkbox"
                checked={ignoreManual}
                onChange={(e) => setIgnoreManual(e.target.checked)}
                className="w-4 h-4 accent-[#1976d2]"
              />
            </label>

            {/* Recipients (Users & Groups) */}
            <div className="relative">
              <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Recipients</label>
              <div
                onClick={() => setShowRecipientPicker((v) => !v)}
                className="min-h-[44px] p-2 border border-[#cbd5e1] rounded-md cursor-pointer flex flex-wrap gap-1.5 items-center bg-white"
              >
                {recipients.length === 0 ? (
                  <span className="text-xs text-[#94a3b8]">
                    Click to select Users or Groups (if empty, uses step default)...
                  </span>
                ) : (
                  recipients.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e0f2fe] text-[#0369a1] rounded text-xs font-semibold"
                    >
                      <User className="w-3 h-3" />
                      {r}
                    </span>
                  ))
                )}
              </div>

              {showRecipientPicker && (
                <div className="mt-1 bg-white border border-[#cbd5e1] rounded-lg shadow-lg p-2 space-y-1.5 z-20 max-h-52 overflow-y-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search users or groups..."
                      className="w-full h-8 pl-8 pr-2 text-xs border border-[#cbd5e1] rounded-md"
                    />
                  </div>
                  {allRecipientOptions.map((o) => {
                    const checked = recipients.includes(o.label);
                    return (
                      <label
                        key={o.id}
                        className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-[#eff6ff] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(o.label)}
                          className="accent-[#1976d2]"
                        />
                        <span className="font-semibold text-[#1e293b]">{o.label}</span>
                        <span className="text-[11px] text-[#64748b]">{o.sub}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Default recipient */}
            <div>
              <label className="block text-xs font-semibold text-[#1e3a8a] mb-1">Default recipient</label>
              <select
                value={defaultRecipient}
                onChange={(e) => setDefaultRecipient(e.target.value)}
                className="w-full h-9 px-3 text-xs border border-[#cbd5e1] rounded-md bg-white"
              >
                <option value="">-- Select Default Recipient --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.fullName}>
                    {a.fullName} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
              {editingRouteId ? (
                <button
                  type="button"
                  onClick={deleteRoute}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] rounded-md cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Route
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPhaseId(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-[#1976d2] border border-[#cbd5e1] hover:bg-[#f8fafc] rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveRoute}
                  disabled={!routeName.trim()}
                  className="px-5 py-1.5 text-xs font-semibold bg-[#1976d2] hover:bg-[#1565c0] disabled:bg-[#93c5fd] text-white rounded-md cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

