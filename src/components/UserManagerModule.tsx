import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ModuleKey, UserAccount, UserRole } from '../types/erp';

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

interface UserManagerModuleProps {
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  roleDefaults: Record<UserRole, ModuleKey[]>;
  currentUserId?: string;
  onAddLog: (module: string, docNo: string, action: string, comments: string) => void;
}

export function UserManagerModule({
  accounts,
  setAccounts,
  roleDefaults,
  currentUserId,
  onAddLog,
}: UserManagerModuleProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('1234');
  const [role, setRole] = useState<UserRole>('Applicant/Requestor');
  const [department, setDepartment] = useState('');
  const [newModules, setNewModules] = useState<ModuleKey[]>(roleDefaults['Applicant/Requestor']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleRoleSelectForNewUser = (nextRole: UserRole) => {
    setRole(nextRole);
    setNewModules([...roleDefaults[nextRole]]);
  };

  const toggleNewModule = (mod: ModuleKey) => {
    setNewModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
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
      department: department.trim() || 'Operations',
      allowedModules: [...newModules],
    };

    setAccounts((prev) => [...prev, created]);
    onAddLog(
      'System',
      created.username,
      'User Created',
      `${created.fullName} (${created.role}) — Modules: ${newModules.join(', ')}`
    );
    notify(`Created account for ${created.fullName} (${created.role}).`);
    setFullName('');
    setUsername('');
    setPassword('1234');
    setDepartment('');
  };

  const updateUserRole = (userId: string, nextRole: UserRole) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    const defaults = [...roleDefaults[nextRole]];
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === userId ? { ...a, role: nextRole, allowedModules: defaults } : a
      )
    );
    onAddLog(
      'System',
      target.username,
      'User Role Updated',
      `Changed ${target.fullName} role to ${nextRole} (reset to role defaults).`
    );
    notify(`Updated ${target.fullName}'s role to ${nextRole}.`);
  };

  const toggleUserModule = (userId: string, mod: ModuleKey) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    const currentMods = target.allowedModules?.length
      ? target.allowedModules
      : roleDefaults[target.role];
    const hasMod = currentMods.includes(mod);
    if (hasMod && currentMods.length === 1) {
      setErrorMsg('Each user must have access to at least 1 module.');
      return;
    }
    setErrorMsg(null);
    const updatedMods = hasMod
      ? currentMods.filter((m) => m !== mod)
      : [...currentMods, mod];

    setAccounts((prev) =>
      prev.map((a) => (a.id === userId ? { ...a, allowedModules: updatedMods } : a))
    );
    onAddLog(
      'System',
      target.username,
      'User Access Updated',
      `${target.fullName}: ${hasMod ? 'Removed' : 'Granted'} ${mod.toUpperCase()} access.`
    );
  };

  const resetUserToDefaults = (userId: string) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    const defaults = [...roleDefaults[target.role]];
    setAccounts((prev) =>
      prev.map((a) => (a.id === userId ? { ...a, allowedModules: defaults } : a))
    );
    notify(`Reset ${target.fullName} to default ${target.role} permissions.`);
  };

  const deleteUser = (userId: string) => {
    const target = accounts.find((a) => a.id === userId);
    if (!target) return;
    if (userId === 'usr-admin' || userId === currentUserId) {
      setErrorMsg('Cannot delete the active Admin account.');
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== userId));
    onAddLog('System', target.username, 'User Removed', `Removed account ${target.fullName}.`);
    notify(`Removed account ${target.fullName}.`);
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

      {/* Create New User Card */}
      <form onSubmit={handleCreateUser} className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328] flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-[#0072ed]" />
            Create User Account &amp; Assign Access
          </span>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </div>

        <div className="p-3 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                Assigned Role
              </label>
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
              <label className="block text-[11px] font-semibold text-[#495057] mb-0.5">
                Department
              </label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Site Engineering"
                className="w-full h-7 px-2 border border-[#b9c0c8] rounded-[2px] bg-white"
              />
            </div>
          </div>

          <div className="bg-[#fafbfd] border border-[#d5dbe2] rounded-[2px] p-2.5">
            <div className="text-[11px] font-semibold text-[#495057] mb-1.5">
              Module Access for New User:
            </div>
            <div className="flex flex-wrap gap-2">
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
                      onChange={() => toggleNewModule(m.key)}
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

      {/* Existing Users & Per-User Access Matrix */}
      <div className="bg-white border border-[#cfd5dc] rounded-[2px]">
        <div className="px-3 py-2 bg-[#f4f6f8] border-b border-[#cfd5dc] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#1f2328] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0072ed]" />
            User Accounts &amp; Role / Module Access ({accounts.length} Users)
          </span>
          <span className="text-[11px] text-[#5c646d] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
            Changes apply immediately on next view or login
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#eef2f6] border-b border-[#cfd5dc] text-[#2d3339]">
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">User</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2] w-44">Role</th>
                <th className="px-2.5 py-1.5 font-semibold border-r border-[#d5dbe2]">Allowed Modules</th>
                <th className="px-2.5 py-1.5 font-semibold text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5dbe2]">
              {accounts.map((acc, idx) => {
                const effectiveMods =
                  acc.allowedModules && acc.allowedModules.length > 0
                    ? acc.allowedModules
                    : roleDefaults[acc.role];
                const isProtected = acc.id === 'usr-admin' || acc.id === currentUserId;
                return (
                  <tr key={acc.id} className={idx % 2 === 1 ? 'bg-[#fafbfd]' : 'bg-white'}>
                    <td className="px-2.5 py-2 border-r border-[#e5e8ec] align-top">
                      <div className="font-semibold text-[#1f2328]">{acc.fullName}</div>
                      <div className="text-[11px] font-mono text-[#005ec4]">{acc.username}</div>
                      <div className="text-[10px] text-[#5c646d]">{acc.department}</div>
                    </td>
                    <td className="px-2.5 py-2 border-r border-[#e5e8ec] align-top">
                      <select
                        value={acc.role}
                        disabled={acc.id === 'usr-admin'}
                        onChange={(e) => updateUserRole(acc.id, e.target.value as UserRole)}
                        className="w-full h-7 px-2 text-xs border border-[#b9c0c8] rounded-[2px] bg-white font-semibold disabled:bg-[#f1f3f5]"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2.5 py-2 border-r border-[#e5e8ec]">
                      <div className="flex flex-wrap gap-1.5">
                        {MODULE_OPTIONS.map((m) => {
                          const checked = effectiveMods.includes(m.key);
                          return (
                            <label
                              key={m.key}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border text-[10.5px] cursor-pointer ${
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
                    <td className="px-2.5 py-2 text-right align-top space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => resetUserToDefaults(acc.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-[#eef0f3] border border-[#b9c0c8] rounded-[2px] text-[10.5px] font-semibold text-[#1f2328] cursor-pointer"
                        title="Reset to default modules for this role"
                      >
                        <RotateCcw className="w-3 h-3" /> Default
                      </button>
                      {!isProtected && (
                        <button
                          type="button"
                          onClick={() => deleteUser(acc.id)}
                          className="inline-flex items-center px-1.5 py-0.5 bg-white hover:bg-[#fce8e6] border border-[#b9c0c8] rounded-[2px] text-[#c5221f] cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 className="w-3 h-3" />
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
    </div>
  );
}
