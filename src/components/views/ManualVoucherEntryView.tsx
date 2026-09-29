/**
 * Legacy Logic Pro — Manual Double-Entry Voucher Form
 * Section 5.6: Payment, Receipt, Journal, Sales, Purchase, Contra types with multi-line rows,
 * live Dr = Cr validation, auto-suggested voucher numbers, narration, and seamless session pool merge.
 */

import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { VoucherEntry, VoucherLine, VoucherType } from '../../types';
import { STANDARD_CHART_OF_ACCOUNTS } from '../../data/seedData';
import { formatIndianCurrency, parseIndianAmount } from '../../lib/formatters';

interface ManualVoucherEntryViewProps {
  onSaveVoucher: (voucher: VoucherEntry) => void;
  onNavigate: (tab: any) => void;
  existingVouchersCount: number;
}

export const ManualVoucherEntryView: React.FC<ManualVoucherEntryViewProps> = ({
  onSaveVoucher,
  onNavigate,
  existingVouchersCount,
}) => {
  const [voucherType, setVoucherType] = useState<VoucherType>('Payment');
  const [voucherNo, setVoucherNo] = useState(`MAN/${voucherType.substring(0, 3).toUpperCase()}/${101 + existingVouchersCount}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');

  const [lines, setLines] = useState<VoucherLine[]>([
    {
      id: 'l-init-1',
      ledger_id: '6050',
      ledger_name: 'Office Rent & Maintenance',
      gl_code: '6050',
      debit: 50000,
      credit: 0,
    },
    {
      id: 'l-init-2',
      ledger_id: '1020',
      ledger_name: 'HDFC Current Account',
      gl_code: '1020',
      debit: 0,
      credit: 50000,
    },
  ]);

  const handleTypeChange = (type: VoucherType) => {
    setVoucherType(type);
    setVoucherNo(`MAN/${type.substring(0, 3).toUpperCase()}/${101 + existingVouchersCount}`);
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `l-manual-${Date.now()}-${prev.length}`,
        ledger_id: '1100',
        ledger_name: 'Sundry Debtors / Trade Receivables',
        gl_code: '1100',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      alert('A double-entry voucher must have at least two legs.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, updates: Partial<VoucherLine>) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i === idx) {
          const updated = { ...line, ...updates };
          // If ledger changed, update gl_code and name
          if (updates.gl_code) {
            const acct = STANDARD_CHART_OF_ACCOUNTS.find((a) => a.gl_code === updates.gl_code);
            if (acct) {
              updated.ledger_name = acct.gl_name;
              updated.ledger_id = acct.gl_code;
            }
          }
          return updated;
        }
        return line;
      })
    );
  };

  // Live Dr = Cr Validation
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01 && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert(`Voucher is not balanced! Total Debits (${formatIndianCurrency(totalDebit)}) must equal Total Credits (${formatIndianCurrency(totalCredit)}).`);
      return;
    }

    const newVoucher: VoucherEntry = {
      id: `man-vch-${Date.now()}`,
      voucher_no: voucherNo.trim() || `MAN/${Date.now().toString().slice(-4)}`,
      voucher_type: voucherType,
      date,
      narration: narration.trim() || `Being ${voucherType.toLowerCase()} transaction recorded manually.`,
      source: 'manual', // Identified as manual for edit/delete permissions
      is_reviewed: true,
      reviewer_name: 'CA In-Charge',
      reviewed_at: new Date().toISOString(),
      lines,
    };

    onSaveVoucher(newVoucher);
    alert(`Voucher #${newVoucher.voucher_no} successfully saved and merged into the financial session pool!`);
    onNavigate('daybook');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manual Double-Entry Voucher</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record adjustment journals, bank receipts, and payments directly into the current audit session.
          </p>
        </div>
        <button
          onClick={() => onNavigate('daybook')}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
        >
          <ArrowLeft size={14} />
          <span>Back to Day Book</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        {/* Top Controls: Type, Number, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Voucher Type *</label>
            <select
              value={voucherType}
              onChange={(e) => handleTypeChange(e.target.value as VoucherType)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <option value="Payment">Payment Voucher</option>
              <option value="Receipt">Receipt Voucher</option>
              <option value="Journal">Journal Voucher</option>
              <option value="Sales">Sales Voucher</option>
              <option value="Purchase">Purchase Voucher</option>
              <option value="Contra">Contra (Bank / Cash)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Voucher Number *</label>
            <input
              type="text"
              required
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Date of Transaction *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Double Entry Line Rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider pb-1">
            <span>Accounting Legs (Debit / Credit Rows)</span>
            <button
              type="button"
              onClick={handleAddLine}
              className="text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold normal-case"
            >
              <Plus size={14} />
              <span>Add Line Row</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 grid grid-cols-12 gap-3 font-semibold text-slate-600 text-[11px]">
              <div className="col-span-6">General Ledger Account Head</div>
              <div className="col-span-3 text-right">Debit (₹)</div>
              <div className="col-span-3 text-right">Credit (₹)</div>
            </div>

            {lines.map((line, idx) => (
              <div key={line.id} className="p-2.5 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/50">
                <div className="col-span-6 flex items-center gap-2">
                  <select
                    value={line.gl_code || '1100'}
                    onChange={(e) => handleUpdateLine(idx, { gl_code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 truncate"
                  >
                    {STANDARD_CHART_OF_ACCOUNTS.map((acct) => (
                      <option key={acct.gl_code} value={acct.gl_code}>
                        [{acct.gl_code}] {acct.gl_name} ({acct.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit || ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleUpdateLine(idx, { debit: val, credit: val > 0 ? 0 : line.credit });
                    }}
                    className="w-full text-right bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit || ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleUpdateLine(idx, { credit: val, debit: val > 0 ? 0 : line.debit });
                    }}
                    className="w-full text-right bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="bg-slate-100 p-3 grid grid-cols-12 gap-3 font-semibold text-slate-800 text-xs">
              <div className="col-span-6 flex items-center justify-between">
                <span>TOTALS</span>
                {isBalanced ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-medium text-[11px]">
                    <CheckCircle2 size={13} />
                    Balanced (Debits = Credits)
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1 font-medium text-[11px]">
                    <AlertCircle size={13} />
                    Diff: {formatIndianCurrency(diff)}
                  </span>
                )}
              </div>
              <div className="col-span-3 text-right font-mono text-emerald-800">
                {formatIndianCurrency(totalDebit)}
              </div>
              <div className="col-span-3 text-right font-mono text-slate-800 pr-7">
                {formatIndianCurrency(totalCredit)}
              </div>
            </div>
          </div>
        </div>

        {/* Narration */}
        <div>
          <label className="block font-medium text-slate-700 mb-1 text-xs">
            Voucher Narration / Particulars *
          </label>
          <textarea
            rows={2}
            required
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Being office rent paid for Connaught Place premises via HDFC Cheque #441029..."
            className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Saved entries automatically sync into Trial Balance, Ledger, and P&L.
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate('daybook')}
              className="px-4 py-2 rounded text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save size={14} className="text-amber-400" />
              <span>Save & Post Voucher</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
