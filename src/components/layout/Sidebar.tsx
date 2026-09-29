/**
 * Legacy Logic Pro — Persistent Collapsible Navigation Sidebar
 * Clean professional typographic hierarchy following Frontend Design Constitution (zero-pill discipline)
 */

import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  BookOpen,
  FileSpreadsheet,
  FileCheck2,
  Scale,
  Receipt,
  FileBarChart2,
  CalendarDays,
  ShieldCheck,
  Settings,
  CreditCard,
  Building2,
  Landmark,
  Percent,
  Calculator,
  History,
  Sliders,
  ChevronLeft,
  ChevronRight,
  FolderGit2
} from 'lucide-react';
import { UserRole } from '../../lib/permissions';

export type NavItemKey =
  | 'dashboard'
  | 'upload'
  | 'clients'
  | 'daybook'
  | 'voucher_entry'
  | 'ledger_mapping'
  | 'trial_balance'
  | 'ledger_drilldown'
  | 'schedule_iii'
  | 'ageing'
  | 'comparative'
  | 'gst'
  | 'tds'
  | 'depreciation'
  | 'income_tax'
  | 'brs'
  | 'tasks'
  | 'client_mis'
  | 'rules_engine'
  | 'firm_billing'
  | 'audit_trail'
  | 'settings'
  | 'plans_pricing';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  userRole,
}) => {
  const navSections = [
    {
      title: 'Practice & Ingestion',
      items: [
        { key: 'dashboard' as NavItemKey, label: 'Overview Dashboard', icon: LayoutDashboard },
        { key: 'upload' as NavItemKey, label: 'Document Ingestion (OCR)', icon: UploadCloud },
        { key: 'clients' as NavItemKey, label: 'Client Workspaces', icon: Users },
      ],
    },
    {
      title: 'Books & Vouchers',
      items: [
        { key: 'daybook' as NavItemKey, label: 'Day Book & Tally Export', icon: BookOpen },
        { key: 'voucher_entry' as NavItemKey, label: 'Manual Double Entry', icon: FileCheck2 },
        { key: 'ledger_mapping' as NavItemKey, label: 'Ledger Head Mapping', icon: FolderGit2 },
      ],
    },
    {
      title: 'Financial Statements',
      items: [
        { key: 'trial_balance' as NavItemKey, label: 'Trial Balance', icon: Scale },
        { key: 'ledger_drilldown' as NavItemKey, label: 'Ledger Audit Review', icon: FileSpreadsheet },
        { key: 'schedule_iii' as NavItemKey, label: 'Schedule III Balance Sheet', icon: FileBarChart2 },
        { key: 'ageing' as NavItemKey, label: 'Debtor / Creditor Ageing', icon: CalendarDays },
        { key: 'comparative' as NavItemKey, label: 'Comparative Statements', icon: Percent },
      ],
    },
    {
      title: 'Tax & Compliance',
      items: [
        { key: 'gst' as NavItemKey, label: 'GST Working Paper', icon: Receipt },
        { key: 'tds' as NavItemKey, label: 'TDS & Form 16A Draft', icon: Calculator },
        { key: 'depreciation' as NavItemKey, label: 'Fixed Assets (WDV)', icon: Building2 },
        { key: 'income_tax' as NavItemKey, label: 'ITR & Form 16 Draft', icon: Landmark },
        { key: 'brs' as NavItemKey, label: 'Bank Reconciliation (BRS)', icon: Landmark },
      ],
    },
    {
      title: 'Practice & Billing',
      items: [
        { key: 'tasks' as NavItemKey, label: 'Compliance Tasks Calendar', icon: CalendarDays },
        { key: 'client_mis' as NavItemKey, label: 'Client MIS Dashboard', icon: FileBarChart2 },
        { key: 'firm_billing' as NavItemKey, label: 'Firm Invoicing & Fees', icon: CreditCard },
        { key: 'rules_engine' as NavItemKey, label: 'Rules & Validation Engine', icon: Sliders },
        { key: 'audit_trail' as NavItemKey, label: 'Immutable Audit Trail', icon: History },
      ],
    },
    {
      title: 'Firm Administration',
      items: [
        { key: 'settings' as NavItemKey, label: 'Firm Settings & Seats', icon: Settings },
        { key: 'plans_pricing' as NavItemKey, label: 'Plans & Pricing', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside
      className={`h-screen bg-slate-900 text-slate-300 flex flex-col transition-all duration-200 border-r border-slate-800 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">
              LP
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-slate-100 tracking-wide text-sm block">Legacy Logic Pro</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">CA Document Platform</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">
            LP
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 space-y-6 scrollbar-thin">
        {navSections.map((section, idx) => (
          <div key={idx} className="px-2">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectTab(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-2 border-amber-500'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <Icon size={16} className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User/Firm Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Audit-Ready FY 26-27</span>
            <span className="font-mono text-amber-400">v1.0.0</span>
          </div>
        ) : (
          <div className="text-center font-mono text-[10px] text-slate-400">v1.0</div>
        )}
      </div>
    </aside>
  );
};
