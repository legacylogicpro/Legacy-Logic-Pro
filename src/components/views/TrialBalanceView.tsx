/**
 * Legacy Logic Pro — Trial Balance Statement
 * Section 5.7: Grouped by GL code, opening/period/closing Dr & Cr, expandable rows to underlying vouchers,
 * imbalance detection and visual flagging, date range filter, "imbalances only" view, and styled Excel/PDF export.
 */

import React, { useState } from 'react';
import {
  Scale,
  Download,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { VoucherEntry } from '../../types';
import { computeTrialBalance } from '../../services/financialEngine';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { exportTrialBalanceToExcel, exportTrialBalanceToPDF } from '../../services/exportService';

interface TrialBalanceViewProps {
  vouchers: VoucherEntry[];
  clientName: string;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  vouchers,
  clientName,
}) => {
  const [showImbalancesOnly, setShowImbalancesOnly] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  const tb = computeTrialBalance(vouchers, dateFilter);

  const displayRows = tb.rows.filter((row) => {
    if (showImbalancesOnly) {
      // Show rows with active non-zero closing balance or discrepancies
      return row.net_balance !== 0;
    }
    return true;
  });

  const handleExportExcel = () => {
    exportTrialBalanceToExcel(tb, clientName, 'FY 2026-27');
  };

  const handleExportPDF = () => {
    exportTrialBalanceToPDF(tb, clientName, 'FY 2026-27');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Trial Balance (Grouped by GL Code)</h1>
            {tb.is_balanced ? (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={13} />
                Balanced
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={13} />
                Imbalance: {formatIndianCurrency(tb.difference)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stateless computation on current session entries for {clientName}. Internal audit working paper.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Export grouped ledger balances to styled Excel with Summary sheet"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Export A4 PDF working paper with automatic DRAFT watermark if imbalanced"
          >
            <FileText size={14} className="text-rose-700" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Imbalance Warning Banner (Section 5.7) */}
      {!tb.is_balanced && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3 text-rose-900 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Trial Balance Out of Equilibrium:</strong> Total debits ({formatIndianCurrency(tb.total_debit)}) do not equal total credits ({formatIndianCurrency(tb.total_credit)}). Difference of {formatIndianCurrency(tb.difference)} must be reconciled.
            </div>
          </div>
          <button
            onClick={() => setShowImbalancesOnly(!showImbalancesOnly)}
            className="px-3 py-1 bg-rose-200/60 hover:bg-rose-200 text-rose-950 font-semibold rounded text-[11px] shrink-0 transition-colors"
          >
            {showImbalancesOnly ? 'Show All Rows' : 'Filter Imbalanced Only'}
          </button>
        </div>
      )}

      {/* Date Filter & View Toggles */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFilter.from}
              onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={dateFilter.to}
              onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
            />
          </div>
          {(dateFilter.from || dateFilter.to) && (
            <button
              onClick={() => setDateFilter({ from: '', to: '' })}
              className="text-slate-400 hover:text-slate-600 underline text-[11px]"
            >
              Clear
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showImbalancesOnly}
            onChange={(e) => setShowImbalancesOnly(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>Show Imbalances / Non-Zero Only</span>
        </label>
      </div>

      {/* Grouped Trial Balance Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">GL Code</th>
                <th className="py-3 px-4">Ledger Head Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4 text-right">Period Debit (₹)</th>
                <th className="py-3 px-4 text-right">Period Credit (₹)</th>
                <th className="py-3 px-4 text-right">Closing Debit (₹)</th>
                <th className="py-3 px-4 text-right">Closing Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row) => {
                const isExpanded = expandedCode === row.gl_code;
                return (
                  <React.Fragment key={row.gl_code}>
                    <tr
                      onClick={() => setExpandedCode(isExpanded ? null : row.gl_code)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400">
                        {row.vouchers.length > 0 &&
                          (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.gl_code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {row.gl_name}
                        {row.voucher_count > 0 && (
                          <span className="ml-2 text-[10px] text-slate-400 font-normal">
                            ({row.voucher_count} vouchers)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{row.category}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {row.period_debit > 0 ? formatIndianCurrency(row.period_debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {row.period_credit > 0 ? formatIndianCurrency(row.period_credit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {row.closing_debit > 0 ? formatIndianCurrency(row.closing_debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {row.closing_credit > 0 ? formatIndianCurrency(row.closing_credit) : '-'}
                      </td>
                    </tr>

                    {/* Underlying Vouchers Expansion (Section 5.7) */}
                    {isExpanded && row.vouchers.length > 0 && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="p-4 pl-12">
                          <div className="bg-white rounded border border-slate-200 p-3 max-w-3xl">
                            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                              Underlying Transactions for [{row.gl_code}] {row.gl_name}
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase">
                                  <th className="py-1 text-left">Date</th>
                                  <th className="py-1 text-left">Voucher No.</th>
                                  <th className="py-1 text-left">Narration</th>
                                  <th className="py-1 text-right">Debit (₹)</th>
                                  <th className="py-1 text-right">Credit (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {row.vouchers.map((v) => {
                                  const matchingLines = v.lines.filter(
                                    (l) => l.gl_code === row.gl_code || (!l.gl_code && row.gl_code === '9999')
                                  );
                                  return matchingLines.map((l, i) => (
                                    <tr key={`${v.id}-${i}`}>
                                      <td className="py-1 font-mono text-slate-600 whitespace-nowrap">
                                        {formatIndianDate(v.date)}
                                      </td>
                                      <td className="py-1 font-mono font-semibold text-slate-800">
                                        {v.voucher_no || 'Unassigned'}
                                      </td>
                                      <td className="py-1 text-slate-600 max-w-xs truncate">{v.narration}</td>
                                      <td className="py-1 text-right font-mono text-emerald-800">
                                        {l.debit > 0 ? formatIndianCurrency(l.debit) : '-'}
                                      </td>
                                      <td className="py-1 text-right font-mono text-slate-800">
                                        {l.credit > 0 ? formatIndianCurrency(l.credit) : '-'}
                                      </td>
                                    </tr>
                                  ));
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Total Row */}
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                <td className="py-3 px-4" colSpan={4}>
                  TOTAL EQUILIBRIUM BALANCE
                </td>
                <td className="py-3 px-4 text-right font-mono">-</td>
                <td className="py-3 px-4 text-right font-mono">-</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800">
                  {formatIndianCurrency(tb.total_debit)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-900">
                  {formatIndianCurrency(tb.total_credit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
