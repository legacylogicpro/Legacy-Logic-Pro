/**
 * Legacy Logic Pro — Schedule III Financial Statements
 * Section 5.7: Vertical Schedule III Balance Sheet and Profit & Loss statement with GL classification,
 * subtotal lines, and Assets = Liabilities + Equity balance verification.
 */

import React, { useState } from 'react';
import {
  FileBarChart2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { VoucherEntry } from '../../types';
import { computeScheduleIII } from '../../services/financialEngine';
import { formatIndianCurrency } from '../../lib/formatters';

interface ScheduleIIIViewProps {
  vouchers: VoucherEntry[];
  clientName: string;
}

export const ScheduleIIIView: React.FC<ScheduleIIIViewProps> = ({
  vouchers,
  clientName,
}) => {
  const [activeStatement, setActiveStatement] = useState<'balance_sheet' | 'pnl'>('balance_sheet');
  const report = computeScheduleIII(vouchers);
  const bs = report.balance_sheet;
  const pnl = report.profit_and_loss;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Schedule III Financial Statements</h1>
            {activeStatement === 'balance_sheet' && (
              bs.is_balanced ? (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Assets = Equity & Liabilities
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Diff: {formatIndianCurrency(bs.difference)}
                </span>
              )
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Companies Act, 2013 Division I/II vertical presentation for {clientName} (FY 2026-27).
          </p>
        </div>

        {/* Statement Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveStatement('balance_sheet')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeStatement === 'balance_sheet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Part I: Balance Sheet
          </button>
          <button
            onClick={() => setActiveStatement('pnl')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeStatement === 'pnl'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Part II: Statement of Profit & Loss
          </button>
        </div>
      </div>

      {/* Part I: Vertical Balance Sheet */}
      {activeStatement === 'balance_sheet' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">
              Schedule III Balance Sheet as at 31st March 2027
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Figures in Indian Rupees (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Particulars</th>
                  <th className="py-2.5 px-4 w-20 text-center">Note No.</th>
                  <th className="py-2.5 px-4 text-right">Current Period (₹)</th>
                  <th className="py-2.5 px-4 text-right">Previous Period (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Equity & Liabilities */}
                {bs.equity_and_liabilities.map((line, idx) => (
                  <tr
                    key={`eq-${idx}`}
                    className={line.is_header ? 'bg-slate-50 font-bold text-slate-900' : 'hover:bg-slate-50/50'}
                  >
                    <td className={`py-2 px-4 ${line.is_header ? 'font-bold' : 'text-slate-700'}`}>
                      {line.classification}
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-slate-500">{line.note_no}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {line.is_header ? '' : formatIndianCurrency(line.current_amount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">
                      {line.is_header ? '' : formatIndianCurrency(line.previous_amount)}
                    </td>
                  </tr>
                ))}

                {/* Total Equity & Liabilities */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2.5 px-4" colSpan={2}>
                    TOTAL EQUITY AND LIABILITIES
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-bold">
                    {formatIndianCurrency(bs.total_equity_and_liabilities)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {formatIndianCurrency(1150000)}
                  </td>
                </tr>

                {/* Assets */}
                {bs.assets.map((line, idx) => (
                  <tr
                    key={`as-${idx}`}
                    className={line.is_header ? 'bg-slate-50 font-bold text-slate-900' : 'hover:bg-slate-50/50'}
                  >
                    <td className={`py-2 px-4 ${line.is_header ? 'font-bold' : 'text-slate-700'}`}>
                      {line.classification}
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-slate-500">{line.note_no}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {line.is_header ? '' : formatIndianCurrency(line.current_amount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">
                      {line.is_header ? '' : formatIndianCurrency(line.previous_amount)}
                    </td>
                  </tr>
                ))}

                {/* Total Assets */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2.5 px-4" colSpan={2}>
                    TOTAL ASSETS
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-bold">
                    {formatIndianCurrency(bs.total_assets)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {formatIndianCurrency(1150000)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Part II: Statement of Profit and Loss */}
      {activeStatement === 'pnl' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">
              Statement of Profit and Loss for the year ended 31st March 2027
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Figures in Indian Rupees (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Particulars</th>
                  <th className="py-2.5 px-4 w-20 text-center">Note No.</th>
                  <th className="py-2.5 px-4 text-right">Current Year (₹)</th>
                  <th className="py-2.5 px-4 text-right">Previous Year (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Revenue */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-4" colSpan={4}>REVENUE</td>
                </tr>
                {pnl.revenue_items.map((line, idx) => (
                  <tr key={`rev-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-700 pl-6">{line.classification}</td>
                    <td className="py-2 px-4 text-center font-mono text-slate-500">{line.note_no}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {formatIndianCurrency(line.current_amount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">
                      {formatIndianCurrency(line.previous_amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-4" colSpan={2}>TOTAL REVENUE (I)</td>
                  <td className="py-2 px-4 text-right font-mono font-bold text-emerald-800">
                    {formatIndianCurrency(pnl.total_revenue)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-600">
                    {formatIndianCurrency(435000)}
                  </td>
                </tr>

                {/* Expenses */}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-4" colSpan={4}>EXPENSES</td>
                </tr>
                {pnl.expense_items.map((line, idx) => (
                  <tr key={`exp-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-700 pl-6">{line.classification}</td>
                    <td className="py-2 px-4 text-center font-mono text-slate-500">{line.note_no}</td>
                    <td className="py-2 px-4 text-right font-mono font-medium text-slate-900">
                      {formatIndianCurrency(line.current_amount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-500">
                      {formatIndianCurrency(line.previous_amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-4" colSpan={2}>TOTAL EXPENSES (II)</td>
                  <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(pnl.total_expenses)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-600">
                    {formatIndianCurrency(378000)}
                  </td>
                </tr>

                {/* Profit Figures */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                  <td className="py-2.5 px-4" colSpan={2}>PROFIT BEFORE TAX (I - II)</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-900">
                    {formatIndianCurrency(pnl.profit_before_tax)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {formatIndianCurrency(57000)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-slate-700 pl-6" colSpan={2}>Current Tax Expense (25%)</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-800">
                    {formatIndianCurrency(pnl.tax_expense)}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-500">
                    {formatIndianCurrency(14250)}
                  </td>
                </tr>
                <tr className="bg-emerald-50 font-bold text-emerald-950 border-t-2 border-emerald-300">
                  <td className="py-3 px-4" colSpan={2}>PROFIT FOR THE PERIOD (PAT)</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-900 font-extrabold text-sm">
                    {formatIndianCurrency(pnl.profit_after_tax)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-800">
                    {formatIndianCurrency(42750)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
