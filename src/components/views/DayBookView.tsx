/**
 * Legacy Logic Pro — Day Book & Tally XML Export
 * Section 5.6: Chronological order of every voucher (manual + uploaded), correct total amounts from whichever side
 * actually has a value, unique composite keys, read-only protection on OCR vouchers, and Tally-compatible XML export.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Download,
  Filter,
  Trash2,
  Edit2,
  Lock,
  ChevronDown,
  ChevronRight,
  FileCode,
} from 'lucide-react';
import { VoucherEntry } from '../../types';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { downloadTallyXmlFile } from '../../services/exportService';
import { generateTallyXML } from '../../services/financialEngine';

interface DayBookViewProps {
  vouchers: VoucherEntry[];
  clientName: string;
  onNavigate: (tab: any) => void;
  onDeleteVoucher: (id: string) => void;
}

export const DayBookView: React.FC<DayBookViewProps> = ({
  vouchers,
  clientName,
  onNavigate,
  onDeleteVoucher,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort chronologically by date
  const sortedVouchers = [...vouchers].sort((a, b) => a.date.localeCompare(b.date));

  const filteredVouchers = sortedVouchers.filter((v) => {
    if (filterType !== 'all' && v.voucher_type !== filterType) return false;
    return true;
  });

  const handleExportTally = () => {
    const xml = generateTallyXML(vouchers, clientName);
    downloadTallyXmlFile(xml, `${clientName.replace(/\s+/g, '_')}_Tally_Vouchers.xml`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Day Book & Journal Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit of all manual entries and scanned OCR extractions with Tally ERP/Prime XML compatibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTally}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            title="Download standard Tally XML envelope format for import into Tally ERP9 / Prime"
          >
            <FileCode size={14} className="text-amber-600" />
            <span>Export Tally XML</span>
          </button>

          <button
            onClick={() => onNavigate('voucher_entry')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} className="text-amber-400" />
            <span>New Manual Voucher</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="font-medium text-slate-600">Voucher Type:</span>
          <div className="flex items-center gap-1">
            {['all', 'Payment', 'Receipt', 'Journal', 'Sales', 'Purchase', 'Contra'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type === 'all' ? 'All Vouchers' : type}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          Showing {filteredVouchers.length} of {vouchers.length} vouchers
        </span>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No.</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Primary Particulars / Narration</th>
                <th className="py-3 px-4 text-right">Voucher Amount (₹)</th>
                <th className="py-3 px-4 text-center">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.map((vch, idx) => {
                // Section 5.6: Correct total computed from whichever side actually has a value — not debit-only!
                const totalDebit = vch.lines.reduce((s, l) => s + (l.debit || 0), 0);
                const totalCredit = vch.lines.reduce((s, l) => s + (l.credit || 0), 0);
                const voucherAmount = totalDebit > 0 ? totalDebit : totalCredit;

                // Composite fallback key so distinct rows without voucher_no stay distinct!
                const compositeKey = vch.id || `${vch.date}_${vch.voucher_no || 'NO_NUM'}_${idx}`;
                const isExpanded = expandedId === compositeKey;
                const isManual = vch.source === 'manual';

                return (
                  <React.Fragment key={compositeKey}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : compositeKey)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {formatIndianDate(vch.date)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {vch.voucher_no || (
                          <span className="text-rose-600 font-normal italic">[Unassigned]</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{vch.voucher_type}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={vch.narration}>
                        {vch.narration}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatIndianCurrency(voucherAmount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isManual ? (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            OCR Read-Only
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isManual ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                if (confirm(`Delete manual voucher #${vch.voucher_no}?`)) {
                                  onDeleteVoucher(vch.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Delete manual voucher"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                            title="Uploaded/OCR entries are immutable source documents"
                          >
                            <Lock size={12} />
                            <span>Locked</span>
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Legs Detail */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="p-4 pl-12">
                          <div className="bg-white rounded border border-slate-200 p-3 max-w-2xl">
                            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                              Transaction Journal Breakdown
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase">
                                  <th className="py-1 text-left">Ledger Account Head</th>
                                  <th className="py-1 text-left">GL Code</th>
                                  <th className="py-1 text-right">Debit (₹)</th>
                                  <th className="py-1 text-right">Credit (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {vch.lines.map((l, i) => (
                                  <tr key={i}>
                                    <td className="py-1 font-medium text-slate-800">{l.ledger_name}</td>
                                    <td className="py-1 font-mono text-slate-500">{l.gl_code || '-'}</td>
                                    <td className="py-1 text-right font-mono text-emerald-800">
                                      {l.debit > 0 ? formatIndianCurrency(l.debit) : '-'}
                                    </td>
                                    <td className="py-1 text-right font-mono text-slate-800">
                                      {l.credit > 0 ? formatIndianCurrency(l.credit) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {vch.narration && (
                              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                <strong>Narration:</strong> {vch.narration}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
