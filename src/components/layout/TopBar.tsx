/**
 * Legacy Logic Pro — Persistent Top Header Bar
 * Client selector (scoping all reports), firm context, role switcher, and AI session indicator
 */

import React from 'react';
import { Client, Workspace } from '../../types';
import { getRoleBadgeLabel, UserRole } from '../../lib/permissions';
import { Building, Sparkles, UserCircle, ChevronDown, CheckCircle } from 'lucide-react';

interface TopBarProps {
  workspace: Workspace;
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  userRole: UserRole;
  onChangeUserRole: (role: UserRole) => void;
  enableAI: boolean;
  onOpenUpload: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  workspace,
  clients,
  selectedClientId,
  onSelectClient,
  userRole,
  onChangeUserRole,
  enableAI,
  onOpenUpload,
}) => {
  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
      {/* Client Context Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Building size={16} className="text-slate-400" />
          <span className="font-medium text-slate-600">Active Client:</span>
        </div>

        <div className="relative">
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors shadow-xs"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.entity_type.toUpperCase()}) — {c.gstin || c.pan}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
        </div>

        {selectedClient && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            <span>PAN: <strong className="text-slate-700 font-mono">{selectedClient.pan}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>FY 2026-27 (AY 2027-28)</span>
          </div>
        )}
      </div>

      {/* Right Controls: AI Opt-in Badge, Role Switcher, Firm Badge */}
      <div className="flex items-center gap-4">
        {/* AI Assistant Session Indicator */}
        <div
          onClick={onOpenUpload}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer transition-colors border ${
            enableAI
              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
          }`}
          title={enableAI ? 'AI Assistant is active for this session (Gemini 3.1 Pro High Thinking)' : 'AI Assistant is disabled (0 API calls). Click to toggle in Ingestion.'}
        >
          <Sparkles size={13} className={enableAI ? 'text-amber-600' : 'text-slate-400'} />
          <span className="font-medium">
            AI: {enableAI ? 'Enabled (Session)' : 'Disabled'}
          </span>
        </div>

        {/* Live Role Switcher (Test all 3 roles easily) */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-semibold text-slate-900 leading-tight">CA Firm Workspace</div>
            <div className="text-[10px] text-slate-500">
              Role: <span className="font-medium text-amber-700">{getRoleBadgeLabel(userRole)}</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={userRole}
              onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs rounded py-1 pl-2.5 pr-7 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
              title="Switch user role to test permissions"
            >
              <option value="firm_owner_admin">Owner / Admin</option>
              <option value="senior_associate">Senior Associate (CA)</option>
              <option value="junior_associate">Junior Associate / Article</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
};
