/**
 * Legacy Logic Pro — Multi-Year Comparative Statements
 * Section 5.7: Balance Sheet and P&L across 2+ periods side by side with absolute and percentage variance columns
 * and visual trend analysis for statutory audits.
 */

import React, { useState } from 'react';
import { Percent, TrendingUp, TrendingDown, ArrowRight, BarChart2 } from 'lucide-react';
import { formatIndianCurrency } from '../../lib/formatters';

interface ComparativeViewProps {
  clientName: string;
}

interface ComparativeItem {
  item: string;
  p1: number;
  p2: number;
  isTotal?: boolean;
  isHighlight?: boolean;
}

export const ComparativeView: React.FC<ComparativeViewProps> = ({ clientName }) => {
  const [statementType, setStatementType] = useState<'pnl' | 'balance_sheet'>('pnl');

  const pnlComparative: ComparativeItem[] = [
    { item: 'Revenue from Operations', p1: 1540000, p2: 1890000 },
    { item: 'Other Operating Income', p1: 45000, p2: 52000 },
    { item: 'Total Income', p1: 1585000, p2: 1942000, isTotal: true },
    { item: 'Cost of Materials Consumed', p1: 780000, p2: 910000 },
    { item: 'Employee Benefits Expense', p1: 310000, p2: 365000 },
    { item: 'Depreciation & Amortisation', p1: 65000, p2: 72000 },
    { item: 'Other Operating Expenses', p1: 145000, p2: 168000 },
    { item: 'Total Expenses', p1: 1300000, p2: 1515000, isTotal: true },
    { item: 'Profit Before Tax (PBT)', p1: 285000, p2: 427000, isHighlight: true },
    { item: 'Provision for Tax (25%)', p1: 71250, p2: 106750 },
    { item: 'Profit After Tax (PAT)', p1: 213750, p2: 320250, isHighlight: true },
  ];

  const bsComparative: ComparativeItem[] = [
    { item: 'Shareholders’ Funds (Equity & Reserves)', p1: 850000, p2: 1170250 },
    { item: 'Non-Current Borrowings (Term Loans)', p1: 200000, p2: 150000 },
    { item: 'Trade Payables (Creditors)', p1: 340000, p2: 410000 },
    { item: 'Other Current Liabilities & Provisions', p1: 95000, p2: 125000 },
    { item: 'Total Equity & Liabilities', p1: 1485000, p2: 1855250, isTotal: true },
    { item: 'Property, Plant & Equipment (Fixed Assets)', p1: 520000, p2: 610000 },
    { item: 'Inventories / Stock-in-Trade', p1: 280000, p2: 340000 },
    { item: 'Trade Receivables (Debtors)', p1: 420000, p2: 590000 },
    { item: 'Cash & Cash Equivalents', p1: 195000, p2: 245250 },
    { item: 'Other Advances & Tax Assets', p1: 70000, p2: 70000 },
    { item: 'Total Assets', p1: 1485000, p2: 1855250, isTotal: true },
  ];

  const activeData = statementType === 'pnl' ? pnlComparative : bsComparative;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Year Comparative Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side financial statement variance analysis between FY 2025-26 and FY 2026-27 for {clientName}.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setStatementType('pnl')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              statementType === 'pnl' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Profit & Loss Statement
          </button>
          <button
            onClick={() => setStatementType('balance_sheet')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              statementType === 'balance_sheet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Balance Sheet
          </button>
        </div>
      </div>

      {/* Comparative Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Financial Statement Line Item</th>
                <th className="py-3 px-4 text-right">FY 2025-26 (₹)</th>
                <th className="py-3 px-4 text-right">FY 2026-27 (₹)</th>
                <th className="py-3 px-4 text-right font-bold">Absolute Variance (₹)</th>
                <th className="py-3 px-4 text-right font-bold">% Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeData.map((row, idx) => {
                const diff = row.p2 - row.p1;
                const pct = row.p1 > 0 ? (diff / row.p1) * 100 : 0;
                const isPositive = diff >= 0;

                let rowStyle = 'hover:bg-slate-50/60';
                if (row.isTotal) rowStyle = 'bg-slate-50 font-bold text-slate-900 border-t border-b border-slate-200';
                if (row.isHighlight) rowStyle = 'bg-amber-50/40 font-bold text-amber-950';

                return (
                  <tr key={idx} className={rowStyle}>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{row.item}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatIndianCurrency(row.p1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 font-semibold">
                      {formatIndianCurrency(row.p2)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold ${
                        isPositive ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatIndianCurrency(diff)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isPositive ? '+' : ''}
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
