/**
 * Legacy Logic Pro — Immutable Audit Trail Log
 * Section 5.19: Insert-only at database level (no update or delete permitted by anyone).
 * Logs file processing runs (entry/error/anomaly counts), exports, ledger mapping changes, client creation, sign-ins.
 * Filterable by date range, client, and action type, and exportable.
 */

import React, { useState } from 'react';
import { History, Download, Filter, Search, ShieldCheck } from 'lucide-react';
import { AuditLogEntry, Client } from '../../types';
import { formatIndianDate } from '../../lib/formatters';
import { downloadJsonFile } from '../../services/exportService';

interface AuditTrailViewProps {
  logs: AuditLogEntry[];
  clients: Client[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs, clients }) => {
  const [filterAction, setFilterAction] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action_type !== filterAction) return false;
    if (filterClient !== 'all' && log.client_id !== filterClient) return false;
    if (
      searchTerm &&
      !log.details.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExportLogs = () => {
    downloadJsonFile(filteredLogs, `Legacy_Logic_Pro_Audit_Log_${new Date().toISOString().split('T')[0]}.json`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Immutable Firm Audit Trail</h1>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} />
              Insert-Only (WORM Compliant)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-proof event journal of file extractions, mapping changes, BRS locks, and exports.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download size={14} className="text-slate-600" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <span className="font-medium text-slate-600">Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
            >
              <option value="all">All Events</option>
              <option value="DOCUMENT_EXTRACTION">Document Extraction</option>
              <option value="MAPPING_UPDATE">Ledger Mapping</option>
              <option value="BRS_FINALIZATION">BRS Finalization</option>
              <option value="INVOICE_ISSUED">Invoice Issued</option>
              <option value="USER_SIGNIN">User Sign-in</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Client:</span>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search details or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded pl-8 pr-2 py-1 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Showing {filteredLogs.length} events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
              <th className="py-2.5 px-4">Timestamp (IST)</th>
              <th className="py-2.5 px-4">Action Type</th>
              <th className="py-2.5 px-4">Initiated By</th>
              <th className="py-2.5 px-4">Client Target</th>
              <th className="py-2.5 px-4">Audit Details & Record Counts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {log.action_type}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-medium text-slate-800">{log.user_email}</td>
                <td className="py-2.5 px-4 text-slate-600">{log.client_name || 'Global Firm'}</td>
                <td className="py-2.5 px-4 text-slate-700">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
