/**
 * Legacy Logic Pro — Executive Practice Dashboard
 * Section 5.2: Firm-wide metrics, anomalies, pending reviews, tasks due, seat usage, recent activity
 */

import React from 'react';
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Calendar,
  CreditCard,
  UserCheck,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Client, PracticeTask, VoucherEntry, Workspace, WorkspaceMember } from '../../types';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { UserRole } from '../../lib/permissions';

interface DashboardViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  clients: Client[];
  vouchers: VoucherEntry[];
  tasks: PracticeTask[];
  userRole: UserRole;
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  members,
  clients,
  vouchers,
  tasks,
  userRole,
  onNavigate,
}) => {
  // Compute dashboard metrics
  const totalClients = clients.length;
  const filesProcessedMonth = workspace.uploads_used_this_month;
  const anomaliesCount = vouchers.reduce((acc, v) => acc + (v.anomalies?.length || 0), 0);
  const pendingReviews = vouchers.filter((v) => !v.is_reviewed).length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const activeMembers = members.filter((m) => m.is_active).length;

  const sampleRecentActivities = [
    { id: 1, action: 'Document Extraction Completed', target: 'Bank Statement Sept 2026', time: '12 mins ago', user: 'CA Priya Singhal' },
    { id: 2, action: 'Trial Balance Imbalance Flagged', target: 'Apex Industrial Gears Pvt Ltd', time: '1 hour ago', user: 'System (Rule Engine)' },
    { id: 3, action: 'Form 26Q TDS Working Paper Generated', target: 'Quarter 2 Non-Salary TDS', time: '3 hours ago', user: 'Aravind Kumar' },
    { id: 4, action: 'Tax Invoice MSA-2026-088 Sent', target: 'Shanti Retail Ventures LLP', time: 'Yesterday', user: 'CA Rajesh Mehta' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <span>{workspace.name}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30">
              {workspace.plan.toUpperCase()} PLAN
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Practice Management & Document Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Stateless audit working papers, GST/TDS reconciliation, and automated CA practice workflow for FY 2026-27.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('upload')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-md text-xs transition-colors flex items-center gap-2 shadow-xs"
          >
            <FileText size={15} />
            <span>Process New Documents</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Legible, Unboxed Metadata, Zero Slop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Clients Scoped</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalClients}</div>
          <div className="text-[11px] text-slate-500 mt-1">All active CA engagements</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Monthly Upload Quota</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {filesProcessedMonth} <span className="text-sm font-normal text-slate-500">/ 200 files</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, (filesProcessedMonth / 200) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Anomalies Flagged</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{anomaliesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cash limits, missing GSTIN, unposted</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Pending Entry Reviews</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingReviews}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting senior associate sign-off</div>
        </div>
      </div>

      {/* Secondary Metrics & Firm Practice Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Compliance Tasks Widget */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Practice Tasks
              </span>
              <Calendar size={15} className="text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{pendingTasks.length}</span>
              <span className="text-xs text-slate-500">pending assignments</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overdueTasks.length > 0 ? (
                <span className="text-rose-600 font-medium">
                  {overdueTasks.length} task overdue (GSTR-3B / Advance Tax)
                </span>
              ) : (
                <span className="text-emerald-700">All compliance items on schedule</span>
              )}
            </p>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="mt-4 text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start"
          >
            <span>View compliance calendar</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Firm Billing Widget */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Outstanding Firm Fees
              </span>
              <CreditCard size={15} className="text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatIndianCurrency(185000)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">3 client bills awaiting payment</p>
          </div>
          <button
            onClick={() => onNavigate('firm_billing')}
            className="mt-4 text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start"
          >
            <span>Manage firm invoicing</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Workspace Seat Allocation (Owner/Senior view) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Active Staff Seats
              </span>
              <UserCheck size={15} className="text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {activeMembers} <span className="text-sm font-normal text-slate-500">/ {workspace.seat_limit} seats</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {workspace.seat_limit - activeMembers} seats remaining on Pro plan
            </p>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="mt-4 text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start"
          >
            <span>Manage firm team</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Two Column Section: Recent Activity & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit & Activity Feed */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Recent Practice Activity
            </h2>
            <button
              onClick={() => onNavigate('audit_trail')}
              className="text-xs text-amber-700 hover:text-amber-800 font-medium"
            >
              Full Audit Trail
            </button>
          </div>

          <div className="space-y-3">
            {sampleRecentActivities.map((act) => (
              <div key={act.id} className="flex items-start justify-between text-xs py-1.5 border-b border-slate-50 last:border-none">
                <div>
                  <div className="font-medium text-slate-900">{act.action}</div>
                  <div className="text-[11px] text-slate-500">{act.target} · {act.user}</div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Essential CA Modules Shortcuts */}
        <div className="bg-white p-5 rounded-lg border border-slate-200">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Stateless Working Papers (FY 2026-27)
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => onNavigate('trial_balance')}
              className="p-3 rounded border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">Trial Balance</div>
              <div className="text-[11px] text-slate-500 mt-0.5">GL grouped with imbalance checks</div>
            </button>

            <button
              onClick={() => onNavigate('gst')}
              className="p-3 rounded border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">GST Module</div>
              <div className="text-[11px] text-slate-500 mt-0.5">GSTR-3B & ITC eligibility audit</div>
            </button>

            <button
              onClick={() => onNavigate('tds')}
              className="p-3 rounded border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">TDS 26Q / 24Q</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Section 194 rates & Form 16A draft</div>
            </button>

            <button
              onClick={() => onNavigate('schedule_iii')}
              className="p-3 rounded border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-left"
            >
              <div className="font-semibold text-slate-900">Schedule III BS / P&L</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Vertical format financial statements</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
