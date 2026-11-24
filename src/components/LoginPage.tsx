import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
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
    id: 'usr-applicant-2',
    username: 'applicant2@triforcegs.com.ph',
    password: '1234',
    fullName: 'Engr. Maria Santos',
    role: 'Applicant/Requestor',
    department: 'Civil & Structural Engineering',
  },
  {
    id: 'usr-applicant-3',
    username: 'applicant3@triforcegs.com.ph',
    password: '1234',
    fullName: 'Engr. Carlos Reyes',
    role: 'Applicant/Requestor',
    department: 'Electrical & MEPF Operations',
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
  {
    id: 'usr-purchaser',
    username: 'purchaser@triforcegs.com.ph',
    password: '1234',
    fullName: 'Purchaser',
    role: 'Purchaser',
    department: 'Procurement & Purchasing',
  },
  {
    id: 'usr-admin',
    username: 'admin@triforcegs.com.ph',
    password: '1234',
    fullName: 'System Admin',
    role: 'Admin',
    department: 'System Administration & Control',
  },
];

interface LoginPageProps {
  accounts?: UserAccount[];
  onLogin: (account: UserAccount) => void;
}

export function LoginPage({ accounts = SYSTEM_ACCOUNTS, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUser = username.trim().toLowerCase();
    const match = accounts.find(
      (acc) =>
        (acc.username.toLowerCase() === trimmedUser ||
          acc.role.toLowerCase() === trimmedUser) &&
        acc.password === password
    );
    if (!match) {
      setError('Invalid credentials. Please check your account email and password.');
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
            Purchasing &amp; Inventory System
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Enterprise Access Portal
        </span>
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#cfd5dc] rounded-[2px] shadow-md p-6 space-y-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#005ec4] mb-1">
              Purchasing &amp; Inventory System
            </div>
            <h1 className="text-lg font-bold text-[#1f2328]">
              System Sign In
            </h1>
            <p className="text-xs text-[#5c646d] mt-1">
              Sign in with your assigned account to access Purchasing, Warehouse, and End-to-End Tracking.
            </p>
          </div>

          {error && (
            <div className="bg-[#fce8e6] border border-[#f6aea9] text-[#c5221f] px-3 py-2 rounded-[2px] text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#495057] mb-1">
                Account Email
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#6b7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="username"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

          <div className="pt-3 border-t border-[#e5e8ec] text-[11px] text-[#5c646d] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#137333] shrink-0" />
            <span>Role-based segregation of duties enforced.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#dfe3e8] border-t border-[#cfd5dc] px-4 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
        <span>Purchasing &amp; Inventory System</span>
        <span className="font-mono">RBAC Enabled</span>
      </footer>
    </div>
  );
}
