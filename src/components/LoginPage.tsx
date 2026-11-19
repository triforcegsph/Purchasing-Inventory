import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { UserAccount } from '../types/erp';

export const SYSTEM_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-applicant',
    username: 'applicant@triforcegs.com.ph',
    password: '1234',
    fullName: 'Engr. John Doe',
    role: 'Applicant/Requestor',
    department: 'Site Engineering & Operations',
  },
  {
    id: 'usr-req-approver',
    username: 'req.approver@triforcegs.com.ph',
    password: '1234',
    fullName: 'Engr. Alex Smith',
    role: 'REQ Approver',
    department: 'Engineering Cost & Requisition Control',
  },
  {
    id: 'usr-po-approver',
    username: 'po.approver@triforcegs.com.ph',
    password: '1234',
    fullName: 'Dir. Jane Doe',
    role: 'PO Approver',
    department: 'Executive Purchasing Authorization',
  },
  {
    id: 'usr-warehouse',
    username: 'warehouse@triforcegs.com.ph',
    password: '1234',
    fullName: 'Warehouse Manager',
    role: 'Warehouse Manager',
    department: 'Central Warehouse & Inventory Control',
  },
];

interface LoginPageProps {
  onLogin: (account: UserAccount) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('applicant@triforcegs.com.ph');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUser = username.trim().toLowerCase();
    const match = SYSTEM_ACCOUNTS.find(
      (acc) =>
        (acc.username.toLowerCase() === trimmedUser ||
          acc.role.toLowerCase() === trimmedUser) &&
        acc.password === password
    );
    if (!match) {
      setError('Invalid credentials. Please select one of the test accounts below or check your email and password.');
      return;
    }
    onLogin(match);
  };

  return (
    <div className="min-h-screen bg-[#eef0f3] flex flex-col justify-between text-[#1f2328]">
      {/* Top Corporate Masthead */}
      <header className="bg-[#23262b] text-white h-12 px-4 flex items-center justify-between border-b border-[#16181c]">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-[#4da3ff]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            TRIFORCEGS • Purchasing &amp; Inventory System
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Enterprise Access Portal
        </span>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white border border-[#cfd5dc] rounded-[2px] shadow-md overflow-hidden">
          {/* Left Side: Standard Login Form */}
          <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-[#cfd5dc] flex flex-col justify-between space-y-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#005ec4] mb-1">
                Triforce Global Solutions
              </div>
              <h1 className="text-lg font-bold text-[#1f2328]">
                System Sign In
              </h1>
              <p className="text-xs text-[#5c646d] mt-1">
                Sign in with your assigned role account to access Purchasing, Warehouse, and End-to-End Tracking.
              </p>

              {error && (
                <div className="mt-3 bg-[#fce8e6] border border-[#f6aea9] text-[#c5221f] px-3 py-2 rounded-[2px] text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-1">
                    Account Email / Role
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#6b7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="applicant@triforcegs.com.ph"
                      className="w-full h-8 pl-8 pr-2.5 text-xs border border-[#b9c0c8] rounded-[2px] bg-white focus:outline-none focus:border-[#0072ed]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#495057] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#6b7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full h-8 pl-8 pr-2.5 text-xs border border-[#b9c0c8] rounded-[2px] bg-white focus:outline-none focus:border-[#0072ed]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-8 bg-[#0072ed] hover:bg-[#005ec4] text-white text-xs font-semibold rounded-[2px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-[#e5e8ec] text-[11px] text-[#5c646d] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#137333] shrink-0" />
              <span>Role-based segregation of duties enforced.</span>
            </div>
          </div>

          {/* Right Side: 4 Role Accounts Quick-Access Directory */}
          <div className="md:col-span-7 p-6 bg-[#fafbfd] space-y-3">
            <div className="flex items-center justify-between border-b border-[#cfd5dc] pb-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#1f2328]">
                  Available Test Accounts (Click to Sign In)
                </h2>
                <p className="text-[11px] text-[#5c646d]">
                  Default password for all test accounts: <code className="font-mono font-semibold text-[#1f2328]">1234</code>
                </p>
              </div>
              <KeyRound className="w-4 h-4 text-[#005ec4]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYSTEM_ACCOUNTS.map((acc) => {
                const roleDescriptions: Record<UserAccount['role'], string> = {
                  'Applicant/Requestor': 'Creates BOQ, PRQ, POE, and Material Requests; tracks order progress.',
                  'REQ Approver': 'Reviews and approves Purchase Requisitions (PRQ) before PO creation.',
                  'PO Approver': 'Reviews, approves, or rejects Purchase Orders (POE) before delivery.',
                  'Warehouse Manager': 'Handles Goods Receiving (GRN), Withdrawals (ISS), Stock, SMTP & Rules.',
                };

                const badgeColors: Record<UserAccount['role'], string> = {
                  'Applicant/Requestor': 'bg-[#e7f1ff] text-[#005ec4] border-[#b6d4fe]',
                  'REQ Approver': 'bg-[#fff8e1] text-[#8d6e00] border-[#ffe082]',
                  'PO Approver': 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]',
                  'Warehouse Manager': 'bg-[#f1f3f5] text-[#2d3339] border-[#ced4da]',
                };

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onLogin(acc)}
                    className="text-left p-3 bg-white hover:bg-[#f4f8ff] border border-[#cfd5dc] hover:border-[#0072ed] rounded-[2px] transition-colors space-y-1.5 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${badgeColors[acc.role]}`}
                      >
                        {acc.role}
                      </span>
                      <span className="text-[10px] font-semibold text-[#005ec4] opacity-0 group-hover:opacity-100 transition-opacity">
                        Sign In &rarr;
                      </span>
                    </div>
                    <div className="font-bold text-xs text-[#1f2328]">{acc.fullName}</div>
                    <div className="text-[10.5px] font-mono text-[#495057] truncate">{acc.username}</div>
                    <div className="text-[10.5px] text-[#5c646d] leading-snug">
                      {roleDescriptions[acc.role]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#dfe3e8] border-t border-[#cfd5dc] px-4 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
        <span>Triforce Global Solutions (TRIFORCEGS) • Purchasing &amp; Inventory System</span>
        <span className="font-mono">RBAC Enabled</span>
      </footer>
    </div>
  );
}
