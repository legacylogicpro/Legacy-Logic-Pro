/**
 * Legacy Logic Pro — Workspace Settings & Team Member Management
 * Section 5.21: Subscription plan details, upload quota progress bar, firm billing profile configuration,
 * and workspace member management (invite via centered modal with seat-limit enforcement, role change, deactivate/reactivate).
 */

import React, { useState } from 'react';
import {
  Settings,
  Users,
  ShieldCheck,
  Building,
  CreditCard,
  Plus,
  Trash2,
  Lock,
  UserCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { FirmBillingProfile, Workspace, WorkspaceMember } from '../../types';
import { INITIAL_FIRM_PROFILE } from '../../data/seedData';
import { getRoleBadgeLabel, hasPermission, UserRole } from '../../lib/permissions';
import { formatIndianDate } from '../../lib/formatters';

interface SettingsViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  userRole: UserRole;
  onInviteMember: (newMember: Omit<WorkspaceMember, 'id' | 'invited_at' | 'joined_at'>) => void;
  onUpdateMemberRole: (memberId: string, newRole: UserRole) => void;
  onToggleMemberActive: (memberId: string) => void;
  onNavigate: (tab: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  members,
  userRole,
  onInviteMember,
  onUpdateMemberRole,
  onToggleMemberActive,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'firm' | 'team' | 'subscription'>('team');
  const [profile, setProfile] = useState<FirmBillingProfile>(INITIAL_FIRM_PROFILE);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: 'junior_associate' as UserRole,
  });

  const canManageUsers = hasPermission(userRole, 'invite_remove_users');
  const activeMembersCount = members.filter((m) => m.is_active).length;
  const isSeatLimitReached = activeMembersCount >= workspace.seat_limit;

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;
    if (isSeatLimitReached) {
      alert(`Seat limit of ${workspace.seat_limit} reached for ${workspace.plan.toUpperCase()} plan. Upgrade plan to invite additional team members.`);
      return;
    }

    onInviteMember({
      workspace_id: workspace.id,
      user_id: `usr-${Date.now()}`,
      email: inviteData.email,
      full_name: inviteData.full_name,
      role: inviteData.role,
      is_active: true,
      invited_by: 'firm_owner_admin',
    });

    setIsInviteModalOpen(false);
    setInviteData({
      email: '',
      full_name: '',
      role: 'junior_associate',
    });
    alert(`Invitation sent to ${inviteData.email}!`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Firm Administration & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Team access permissions, seat allocation, firm billing profile, and subscription management.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Team Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('firm')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'firm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Firm Profile
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'subscription' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Subscription & Quotas
          </button>
        </div>
      </div>

      {/* Tab 1: Team Members & Seat Control */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Seat Usage: {activeMembersCount} of {workspace.seat_limit} Allocated
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Role permission matrix enforces strict separation of audit review, invoice issue, and user invites.
              </p>
            </div>

            {canManageUsers ? (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                disabled={isSeatLimitReached}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={14} className="text-amber-400" />
                <span>Invite Associate</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                (Firm Owner role required to invite or modify seats)
              </span>
            )}
          </div>

          {isSeatLimitReached && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
              <span>All {workspace.seat_limit} seats on your current plan are in use.</span>
              <button
                onClick={() => onNavigate('plans_pricing')}
                className="font-bold text-amber-950 underline"
              >
                Upgrade to Elite Plan
              </button>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.full_name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.email}</td>
                    <td className="py-3 px-4">
                      {canManageUsers && m.role !== 'firm_owner_admin' ? (
                        <select
                          value={m.role}
                          onChange={(e) => onUpdateMemberRole(m.id, e.target.value as UserRole)}
                          className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="senior_associate">Senior Associate (CA)</option>
                          <option value="junior_associate">Junior Associate / Article</option>
                        </select>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {getRoleBadgeLabel(m.role)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatIndianDate(m.joined_at?.split('T')[0])}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          m.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {m.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManageUsers && m.role !== 'firm_owner_admin' && (
                        <button
                          onClick={() => onToggleMemberActive(m.id)}
                          className={`text-xs font-medium underline ${
                            m.is_active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-700 hover:text-emerald-800'
                          }`}
                        >
                          {m.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Firm Profile (Section 5.18 & 5.21) */}
      {activeTab === 'firm' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Firm Letterhead & Billing Profile</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              These details appear on client tax invoices, audit working paper letterheads, and BRS certificates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">CA Firm / Practice Name</label>
              <input
                type="text"
                value={profile.firm_name}
                onChange={(e) => setProfile({ ...profile, firm_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Firm Registered Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Firm GSTIN (15 Digits)</label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Firm PAN (10 Digits)</label>
              <input
                type="text"
                value={profile.pan}
                onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Bank Name & Branch</label>
              <input
                type="text"
                value={profile.bank_name}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Bank Account Number</label>
              <input
                type="text"
                value={profile.account_number}
                onChange={(e) => setProfile({ ...profile, account_number: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Bank IFSC Code</label>
              <input
                type="text"
                value={profile.ifsc_code}
                onChange={(e) => setProfile({ ...profile, ifsc_code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-medium">Billing Contact Email</label>
              <input
                type="email"
                value={profile.contact_email}
                onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => alert('Firm Billing profile updated.')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded text-xs transition-colors"
            >
              Save Firm Profile
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Subscription & Quota Usage (Section 5.21) */}
      {activeTab === 'subscription' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Current Plan: {workspace.plan.toUpperCase()}
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{workspace.name}</h3>
            </div>
            <button
              onClick={() => onNavigate('plans_pricing')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded text-xs"
            >
              View All Plans
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Monthly Document Upload Quota</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {workspace.uploads_used_this_month} / 200 files
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${(workspace.uploads_used_this_month / 200) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {200 - workspace.uploads_used_this_month} uploads remaining this month.
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Authorized Firm User Seats</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {activeMembersCount} / {workspace.seat_limit} seats
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${(activeMembersCount / workspace.seat_limit) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {workspace.seat_limit - activeMembersCount} seats remaining.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Centered Modal Dialog (Section 5.21) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Invite Firm Team Member</h3>
                <p className="text-[11px] text-slate-400">Seat-enforced workspace access</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Associate Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CA Ankit Sharma, ACA"
                  value={inviteData.full_name}
                  onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ankit.sharma@firm.in"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Designated Role *</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="senior_associate">Senior Associate (CA) — Review & Sign-Off Rights</option>
                  <option value="junior_associate">Junior Associate / Article — Processing & Data Entry</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded"
                >
                  Issue Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
