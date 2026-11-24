import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Layers,
  Plus,
  RotateCcw,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ModuleKey, UserAccount, UserGroup, UserRole } from '../types/erp';

const ALL_ROLES: UserRole[] = [
  'Applicant/Requestor',
  'REQ Approver',
  'PO Approver',
  'Purchaser',
  'Warehouse Manager',
  'Admin',
];

const MODULE_OPTIONS: { key: ModuleKey; code: string; label: string }[] = [
  { key: 'boq', code: 'BOQ', label: 'Bill of Quantities' },
  { key: 'pqto', code: 'PQTO', label: 'Project Qty Take-Off' },
  { key: 'pr', code: 'PR', label: 'Purchase Requisition' },
  { key: 'po', code: 'PO', label: 'Purchase Order' },
  { key: 'receiving', code: 'RCV', label: 'Receiving (DR)' },
  { key: 'withdrawal', code: 'WD', label: 'Withdrawal' },
  { key: 'transfers', code: 'OTH', label: 'Transfers & Inventory' },
  { key: 'tracking', code: 'TRK', label: 'End-to-End Tracking' },
  { key: 'logs', code: 'LOG', label: 'Transaction Logs' },
  { key: 'users', code: 'USR', label: 'User Manager' },
];

export const DEFAULT_USER_GROUPS: UserGroup[] = [
  {
    id: 'grp-req',
    code: 'GRP-REQ',
    name: 'Site Requestors',
    description: 'Submit PRs and Withdrawals, view own requests & tracking (max 3 pending).',
    allowedModules: ['pr', 'withdrawal', 'tracking'],
    permissions: { canCreate: true, canApprove: false, canReject: false, canManageStock: false, canExportReports: true },
  },
  {
    id: 'grp-req-apr',
    code: 'GRP-REQ-APR',
    name: 'Requisition Approvers',
    description: 'Review and approve Purchase Requisitions before PO generation.',
    allowedModules: ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
    permissions: { canCreate: true, canApprove: true, canReject: true, canManageStock: false, canExportReports: true },
  },
  {
    id: 'grp-po-apr',
    code: 'GRP-PO-APR',
    name: 'Executive PO Approvers',
    description: 'Authorize or reject Purchase Orders prior to vendor dispatch.',
    allowedModules: ['boq', 'pqto', 'pr', 'po', 'tracking', 'logs'],
    permissions: { canCreate: false, canApprove: true, canReject: true, canManageStock: false, canExportReports: true },
  },
  {
    id: 'grp-pur',
    code: 'GRP-PUR',
    name: 'Purchasing & Procurement',
    description: 'Manage BOQ/PQTO, generate POs from approved PRs, and add inventory items.',
    allowedModules: ['boq', 'pqto', 'pr', 'po', 'transfers', 'tracking', 'logs'],
    permissions: { canCreate: true, canApprove: false, canReject: false, canManageStock: true, canExportReports: true },
  },
  {
    id: 'grp-wh',
    code: 'GRP-WH',
    name: 'Warehouse Operations',
    description: 'Process DR Receiving, Material Withdrawals, Stock Transfers & Inventory.',
    allowedModules: ['receiving', 'withdrawal', 'transfers', 'po', 'tracking', 'logs'],
    permissions: { canCreate: true, canApprove: false, canReject: false, canManageStock: true, canExportReports: true },
  },
  {
    id: 'grp-adm',
    code: 'GRP-ADM',
    name: 'System Administrators',
    description: 'Full access to all modules, SMTP & Validation Rules, and User Manager.',
    allowedModules: ['boq', 'pqto', 'pr', 'po', 'receiving', 'withdrawal', 'transfers', 'tracking', 'logs', 'users'],
    permissions: { canCreate: true, canApprove: true, canReject: true, canManageStock: true, canExportReports: true },
  },
];

const ROLE_TO_DEFAULT_GROUP: Record<UserRole, string> = {
  'Applicant/Requestor': 'grp-req',
  'REQ Approver': 'grp-req-apr',
  'PO Approver': 'grp-po-apr',
  'Purchaser': 'grp-pur',
  'Warehouse Manager': 'grp-wh',
  'Admin': 'grp-adm',
};

interface UserManagerModuleProps {
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  groups: UserGroup[];
  setGroups: React.Dispatch<React.SetStateAction<UserGroup[]>>;
  roleDefaults: Record<UserRole, ModuleKey[]>;
  currentUserId?: string;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function UserManagerModule({
  accounts,
  setAccounts,
  groups,
  setGroups,
  roleDefaults,
  currentUserId,
  onAddLog,
}: UserManagerModuleProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'matrix'>('users');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create User form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('1234');
  const [role, setRole] = useState<UserRole>('Applicant/Requestor');
  const [groupId, setGroupId] = useState('grp-req');
  const [department, setDepartment] = useState('');
  const [newModules, setNewModules] = useState<ModuleKey[]>(DEFAULT_USER_GROUPS[0].allowedModules);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Create Group form state
  const [grpCode, setGrpCode] = useState('');
  const [grpName, setGrpName] = useState('');
  const [grpDesc, setGrpDesc] = useState('');
  const [grpMods, setGrpMods] = useState<ModuleKey[]>(['pr', 'withdrawal', 'tracking']);
  const [grpPerms, setGrpPerms] = useState({
    canCreate: true,
    canApprove: false,
    canReject: false,
    canManageStock: false,
    canExportReports: true,
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const getEffectiveGroupId = (acc: UserAccount) => acc.groupId || ROLE_TO_DEFAULT_GROUP[acc.role];

  const getEffectiveModules = (acc: UserAccount): ModuleKey[] => {
    if (acc.allowedModules && acc.allowedModules.length > 0) return acc.allowedModules;
    const g = groups.find((gr) => gr.id === getEffectiveGroupId(acc));
    return g ? g.allowedModules : roleDefaults[acc.role];
  };

  const handleGroupSelectForNewUser = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    const g = groups.find((gr) => gr.id === nextGroupId);
    if (g) setNewModules([...g.allowedModules]);
  };

  const handleRoleSelectForNewUser = (nextRole: UserRole) => {
    setRole(nextRole);
    const defGrpId = ROLE_TO_DEFAULT_GROUP[nextRole];
    setGroupId(defGrpId);
    const g = groups.find((gr) => gr.id === defGrpId);
    setNewModules(g ? [...g.allowedModules] : [...roleDefaults[nextRole]]);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const email = username.trim().toLowerCase();
    if (!fullName.trim() || !email || !password.trim()) {
      setErrorMsg('Full Name, Email, and Password are required.');
      return;
    }
    if (accounts.some((a) => a.username.toLowerCase() === email)) {
      setErrorMsg(`Account "${email}" already exists.`);
      return;
    }
    if (newModules.length === 0) {
      setErrorMsg('Select at least one module this user can access.');
      return;
    }

    const created: UserAccount = {
      id: `usr-${Date.now()}`,
      fullName: fullName.trim(),
      username: email,
      password: password.trim(),
      role,
      groupId,
      status: 'Active',
      department: department.trim() || 'Operations',
      allowedModules: [...newModules],
    };

    setAccounts((prev) => [...prev, created]);
    onAddLog(
      'System',
      created.username,
      'User Created',
      `${created.fullName} (${created.role}, Group: ${groups.find((g) => g.id === groupId)?.code || groupId})`
    );
    notify(`Created user ${created.fullName}.`);
    setFullName('');
    setUsername('');
    setPassword('1234');
    setDepartment('');
    setShowCreateUser(false);
  };

  const assignUserGroup = (userId: string, nextGroupId: string) => {
    const target = accounts.find((a) => a.id === userId);
    const grp = groups.find((g) => g.id === nextGroupId);
    if (!target || !grp) return;
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === userId
          ? { ...a, groupId: grp.id, allowedModules: [...grp.allowedModules] }
          : a
      )
    );
    onAddLog('System', target.username, 'User Group Changed', `${target.fullName} assigned to ${grp.code} (${grp.name}).`);
    notify(`Assigned ${target.fullName} to ${grp.code}.`);
  };

  const updateUserField = (userId: string, patch: Partial<UserAccount>, logMsg?: string) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    setAccounts((prev) => prev.map((a) => (a.id === userId ? { ...a, ...patch } : a)));
    if (logMsg) onAddLog('System', target.username, 'User Updated', logMsg);
  };

  const toggleUserModule = (userId: string, mod: ModuleKey) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    const currentMods = getEffectiveModules(target);
    const hasMod = currentMods.includes(mod);
    if (hasMod && currentMods.length === 1) {
      setErrorMsg('Each user must have access to at least 1 module.');
      return;
    }
    setErrorMsg(null);
    const updatedMods = hasMod ? currentMods.filter((m) => m !== mod) : [...currentMods, mod];
    setAccounts((prev) => prev.map((a) => (a.id === userId ? { ...a, allowedModules: updatedMods } : a)));
    onAddLog('System', target.username, 'Module Access Updated', `${target.fullName}: ${hasMod ? 'Removed' : 'Granted'} ${mod.toUpperCase()}`);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = grpCode.trim().toUpperCase();
    if (!code || !grpName.trim()) {
      setErrorMsg('Group Code and Group Name are required.');
      return;
    }
    if (groups.some((g) => g.code.toUpperCase() === code)) {
      setErrorMsg(`Group code "${code}" already exists.`);
      return;
    }
    if (grpMods.length === 0) {
      setErrorMsg('Select at least 1 module for the group.');
      return;
    }
    const created: UserGroup = {
      id: `grp-${Date.now()}`,
      code,
      name: grpName.trim(),
      description: grpDesc.trim() || 'Custom SunSystems security group',
      allowedModules: [...grpMods],
      permissions: { ...grpPerms },
    };
    setGroups((prev) => [...prev, created]);
    onAddLog('System', created.code, 'User Group Created', `${created.name} — Modules: ${created.allowedModules.join(', ')}`);
    notify(`Group ${created.code} (${created.name}) created.`);
    setGrpCode('');
    setGrpName('');
    setGrpDesc('');
  };

  const toggleGroupModule = (gId: string, mod: ModuleKey) => {
    const target = groups.find((g) => g.id === gId);
    if (!target) return;
    const has = target.allowedModules.includes(mod);
    if (has && target.allowedModules.length === 1) {
      setErrorMsg('A group must have at least 1 module.');
      return;
    }
    const updated = has
      ? target.allowedModules.filter((m) => m !== mod)
      : [...target.allowedModules, mod];
    setGroups((prev) => prev.map((g) => (g.id === gId ? { ...g, allowedModules: updated } : g)));
  };

  const toggleGroupPermission = (gId: string, permKey: keyof UserGroup['permissions']) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gId
          ? { ...g, permissions: { ...g.permissions, [permKey]: !g.permissions[permKey] } }
          : g
      )
    );
  };

  const applyGroupToMembers = (grp: UserGroup) => {
    let count = 0;
    setAccounts((prev) =>
      prev.map((a) => {
        if (getEffectiveGroupId(a) === grp.id) {
          count += 1;
          return { ...a, allowedModules: [...grp.allowedModules] };
        }
        return a;
      })
    );
    onAddLog('System', grp.code, 'Group Synced to Members', `Applied ${grp.code} module permissions to ${count} member(s).`);
    notify(`Applied ${grp.code} permissions to ${count} member(s).`);
  };

  return (
    <div className="space-y-3.5">
      {errorMsg && (
        <div className="bg-[#fce8e6] border border-[#f6aea9] text-[#c5221f] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}
      {toast && (
        <div className="bg-[#e6f4ea] border border-[#a8dab5] text-[#137333] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {toast}
        </div>
      )}

      {/* SunSystems User Manager Navigation Tabs */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px] p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'users', label: `Users (${accounts.length})`, icon: Users },
            { key: 'groups', label: `User Groups (${groups.length})`, icon: Layers },
            { key: 'matrix', label: 'Security Access Matrix', icon: Shield },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[2px] cursor-pointer ${
                  active
                    ? 'bg-[#0072ed] text-white'
                    : 'bg-[#f4f6f8] text-[#1f2328] hover:bg-[#e5e8ec] border border-[#cfd5dc]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-[#5c646d] flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
          SunSystems-Style Group &amp; User Security Control
        </span>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USERS                                              */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <>
          {showCreateUser && (
          <form onSubmit={handleCreateUser} className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328] flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-[#0072ed]" />
                Create User &amp; Assign Group / Access
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-2.5 py-1 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] text-xs font-semibold rounded-[2px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add User
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Full Name <span className="text-[#d5002b]">*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Engr. Anna Cruz"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Email / Login ID <span className="text-[#d5002b]">*</span>
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="anna@triforcegs.com.ph"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Password <span className="text-[#d5002b]">*</span>
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Department</label>
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Site Engineering"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleSelectForNewUser(e.target.value as UserRole)}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-semibold"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">User Group</label>
                  <select
                    value={groupId}
                    onChange={(e) => handleGroupSelectForNewUser(e.target.value)}
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-semibold"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-[#fafbfd] border border-[#d5dbe2] rounded-[2px] p-2.5">
                <div className="text-[11px] font-semibold text-[#495057] mb-1.5">
                  Module Access (inherited from selected Group, customizable below):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MODULE_OPTIONS.map((m) => {
                    const checked = newModules.includes(m.key);
                    return (
                      <label
                        key={m.key}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] border text-[11px] cursor-pointer ${
                          checked
                            ? 'bg-[#e7f1ff] border-[#b6d4fe] text-[#004a99] font-semibold'
                            : 'bg-white border-[#cfd5dc] text-[#5c646d]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewModules((prev) =>
                              prev.includes(m.key) ? prev.filter((x) => x !== m.key) : [...prev, m.key]
                            )
                          }
                          className="accent-[#0072ed]"
                        />
                        <span className="font-mono">{m.code}</span>
                        <span>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>
          )}

          <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
                User Directory ({accounts.length} Accounts)
              </span>
              {!showCreateUser && (
                <button
                  type="button"
                  onClick={() => setShowCreateUser(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + New User
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                    <th className="px-3 py-2 font-semibold border-r border-[#d5dbe2] w-56">User</th>
                    <th className="px-3 py-2 font-semibold border-r border-[#d5dbe2] w-52">Group &amp; Role</th>
                    <th className="px-3 py-2 font-semibold border-r border-[#d5dbe2]">Allowed Modules</th>
                    <th className="px-3 py-2 font-semibold text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5dbe2]">
                  {accounts.map((acc, idx) => {
                    const effectiveMods = getEffectiveModules(acc);
                    const effGroupId = getEffectiveGroupId(acc);
                    const isProtected = acc.id === 'usr-admin' || acc.id === currentUserId;
                    const isSuspended = acc.status === 'Suspended';
                    return (
                      <tr key={acc.id} className={isSuspended ? 'bg-[#fdf2f2]' : idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                        <td className="px-2.5 py-2 border-r border-[#e5e8ec] align-top">
                          <div className="font-semibold text-[#1f2328] flex items-center gap-1.5">
                            <span>{acc.fullName}</span>
                            {isSuspended && (
                              <span className="text-[9.5px] px-1.5 py-0.2 bg-[#fce8e6] text-[#c5221f] border border-[#f5c2c0] rounded-[2px] font-bold uppercase">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#005ec4]">{acc.username}</div>
                          <div className="text-[10px] text-[#5c646d]">{acc.department}</div>
                        </td>
                        <td className="px-2.5 py-2 border-r border-[#e5e8ec] align-top space-y-1.5">
                          <select
                            value={effGroupId}
                            disabled={acc.id === 'usr-admin'}
                            onChange={(e) => assignUserGroup(acc.id, e.target.value)}
                            className="w-full h-7 px-1.5 text-[11px] border border-[#b9c0c8] rounded-[2px] bg-white font-semibold disabled:bg-[#f1f3f5]"
                            title="User Group"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.code} — {g.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={acc.role}
                            disabled={acc.id === 'usr-admin'}
                            onChange={(e) => {
                              const nextRole = e.target.value as UserRole;
                              updateUserField(
                                acc.id,
                                { role: nextRole },
                                `${acc.fullName} role set to ${nextRole}`
                              );
                            }}
                            className="w-full h-7 px-1.5 text-[11px] border border-[#cfd5dc] rounded-[2px] bg-[#fafbfd] disabled:bg-[#f1f3f5]"
                            title="System Role"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 border-r border-[#e5e8ec] align-top">
                          <div className="flex flex-wrap gap-1">
                            {MODULE_OPTIONS.map((m) => {
                              const checked = effectiveMods.includes(m.key);
                              return (
                                <label
                                  key={m.key}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border text-[10px] cursor-pointer ${
                                    checked
                                      ? 'bg-[#e7f1ff] border-[#b6d4fe] text-[#004a99] font-semibold'
                                      : 'bg-white border-[#d5dbe2] text-[#6b7280]'
                                  }`}
                                  title={m.label}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleUserModule(acc.id, m.key)}
                                    className="accent-[#0072ed]"
                                  />
                                  <span className="font-mono">{m.code}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 text-right align-top space-y-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => assignUserGroup(acc.id, effGroupId)}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[10.5px] font-semibold text-[#1f2328] cursor-pointer"
                            title="Sync permissions with assigned Group"
                          >
                            <RotateCcw className="w-3 h-3" /> Sync Group
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateUserField(acc.id, { password: '1234' }, `Reset password for ${acc.fullName}`);
                              notify(`Password for ${acc.fullName} reset to 1234.`);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[10.5px] font-semibold text-[#1f2328] cursor-pointer"
                            title="Reset password to 1234"
                          >
                            <KeyRound className="w-3 h-3" /> Reset PW
                          </button>
                          {!isProtected && (
                            <button
                              type="button"
                              onClick={() => {
                                setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
                                onAddLog('System', acc.username, 'User Deleted', `Removed ${acc.fullName}`);
                                notify(`Removed ${acc.fullName}.`);
                              }}
                              className="w-full inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-white hover:bg-[#fce8e6] border border-[#b9c0c8] rounded-[2px] text-[10.5px] font-semibold text-[#c5221f] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          )}
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

      {/* ========================================================= */}
      {/* TAB 2: USER GROUPS                                        */}
      {/* ========================================================= */}
      {activeTab === 'groups' && (
        <>
          <form onSubmit={handleCreateGroup} className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0072ed]" />
                Create Security User Group
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Group
              </button>
            </div>
            <div className="p-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Group Code <span className="text-[#d5002b]">*</span>
                  </label>
                  <input
                    value={grpCode}
                    onChange={(e) => setGrpCode(e.target.value)}
                    placeholder="e.g. GRP-AUDIT"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                    Group Name <span className="text-[#d5002b]">*</span>
                  </label>
                  <input
                    value={grpName}
                    onChange={(e) => setGrpName(e.target.value)}
                    placeholder="e.g. Project Auditors"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">Description</label>
                  <input
                    value={grpDesc}
                    onChange={(e) => setGrpDesc(e.target.value)}
                    placeholder="View tracking, logs & summary reports"
                    className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                <div className="bg-[#fafbfd] border border-[#d5dbe2] rounded-[2px] p-2.5">
                  <div className="text-[11px] font-semibold text-[#495057] mb-1.5">Group Modules:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULE_OPTIONS.map((m) => {
                      const checked = grpMods.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-[#e7f1ff] border-[#b6d4fe] text-[#004a99] font-semibold'
                              : 'bg-white border-[#cfd5dc] text-[#5c646d]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setGrpMods((prev) =>
                                prev.includes(m.key) ? prev.filter((x) => x !== m.key) : [...prev, m.key]
                              )
                            }
                            className="accent-[#0072ed]"
                          />
                          <span className="font-mono">{m.code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-[#fafbfd] border border-[#d5dbe2] rounded-[2px] p-2.5">
                  <div className="text-[11px] font-semibold text-[#495057] mb-1.5">Action Permissions:</div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['canCreate', 'Create Requests'],
                        ['canApprove', 'Approve'],
                        ['canReject', 'Reject'],
                        ['canManageStock', 'Manage Stock'],
                        ['canExportReports', 'Export Reports'],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grpPerms[key]}
                          onChange={() => setGrpPerms((p) => ({ ...p, [key]: !p[key] }))}
                          className="accent-[#0072ed]"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
            <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
              Configured Security Groups ({groups.length})
            </div>
            <div className="divide-y divide-[#d5dbe2]">
              {groups.map((grp) => {
                const memberCount = accounts.filter((a) => getEffectiveGroupId(a) === grp.id).length;
                const isDefaultGroup = DEFAULT_USER_GROUPS.some((d) => d.id === grp.id);
                return (
                  <div key={grp.id} className="p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#005ec4] mr-2">{grp.code}</span>
                        <span className="font-bold text-[#1f2328]">{grp.name}</span>
                        <span className="ml-2 text-[11px] bg-[#eef2f6] px-1.5 py-0.5 rounded-[2px] text-[#495057]">
                          {memberCount} member(s)
                        </span>
                        <p className="text-[11px] text-[#5c646d] mt-0.5">{grp.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyGroupToMembers(grp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#e7f1ff] hover:bg-[#d0e6ff] text-[#004a99] border border-[#b3d1ff] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Apply to Members
                        </button>
                        {!isDefaultGroup && (
                          <button
                            type="button"
                            onClick={() => {
                              setGroups((prev) => prev.filter((g) => g.id !== grp.id));
                              notify(`Deleted group ${grp.code}.`);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#fce8e6] text-[#c5221f] border border-[#b9c0c8] rounded-[2px] text-[11px] font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-[#495057] mr-1">Modules:</span>
                      {MODULE_OPTIONS.map((m) => {
                        const checked = grp.allowedModules.includes(m.key);
                        return (
                          <label
                            key={m.key}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border text-[10.5px] cursor-pointer ${
                              checked
                                ? 'bg-[#e7f1ff] border-[#b6d4fe] text-[#004a99] font-semibold'
                                : 'bg-white border-[#d5dbe2] text-[#6b7280]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleGroupModule(grp.id, m.key)}
                              className="accent-[#0072ed]"
                            />
                            <span className="font-mono">{m.code}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-[10.5px] font-semibold text-[#495057]">Permissions:</span>
                      {(
                        [
                          ['canCreate', 'Create'],
                          ['canApprove', 'Approve'],
                          ['canReject', 'Reject'],
                          ['canManageStock', 'Manage Stock'],
                          ['canExportReports', 'Export Reports'],
                        ] as const
                      ).map(([k, label]) => (
                        <label key={k} className="inline-flex items-center gap-1 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={grp.permissions[k]}
                            onChange={() => toggleGroupPermission(grp.id, k)}
                            className="accent-[#0072ed]"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SECURITY ACCESS MATRIX                             */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
          <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] text-xs font-bold uppercase tracking-wide text-[#1f2328]">
            Effective User Security Matrix (User &times; Module)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                  <th className="px-3 py-2 font-semibold border-r border-[#d5dbe2]">User</th>
                  <th className="px-3 py-2 font-semibold border-r border-[#d5dbe2]">Group</th>
                  {MODULE_OPTIONS.map((m) => (
                    <th key={m.key} className="px-2 py-1.5 font-mono text-[10.5px] text-center border-r border-[#d5dbe2]">
                      {m.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5dbe2]">
                {accounts.map((acc, idx) => {
                  const effMods = getEffectiveModules(acc);
                  const grp = groups.find((g) => g.id === getEffectiveGroupId(acc));
                  return (
                    <tr key={acc.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                      <td className="px-2.5 py-1.5 border-r border-[#e5e8ec] font-semibold">
                        {acc.fullName}
                      </td>
                      <td className="px-3 py-2 border-r border-[#e5e8ec] font-mono text-[11px] text-[#005ec4]">
                        {grp?.code || '—'}
                      </td>
                      {MODULE_OPTIONS.map((m) => (
                        <td key={m.key} className="px-2 py-1.5 text-center border-r border-[#e5e8ec]">
                          {effMods.includes(m.key) ? (
                            <span className="text-[#137333] font-bold">&#10003;</span>
                          ) : (
                            <span className="text-[#cbd5e1]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
