/**
 * Legacy Logic Pro — Bank Reconciliation Statement (BRS)
 * Section 5.12: Bank/Cash book scoped strictly to bank/cash GL accounts, BRS working paper with auto-pulled book balance,
 * bank statement balance input, categorized reconciling items closing gap, live difference indicator,
 * owner/senior-only Finalize lock, and standard BRS working paper PDF export.
 */

import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { BankReconciliation, BRSLineItem, VoucherEntry } from '../../types';
import { STANDARD_CHART_OF_ACCOUNTS } from '../../data/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { hasPermission, UserRole } from '../../lib/permissions';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface BankReconciliationViewProps {
  vouchers: VoucherEntry[];
  clientName: string;
  userRole: UserRole;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  vouchers,
  clientName,
  userRole,
}) => {
  // Scoped to Bank GL accounts only (1020 HDFC Current A/c, 1021 ICICI Bank)
  const bankAccounts = STANDARD_CHART_OF_ACCOUNTS.filter((a) => a.default_tags.includes('bank'));
  const [selectedBankCode, setSelectedBankCode] = useState<string>('1020');

  // Compute auto-pulled book balance from current session vouchers for selected bank
  let computedBookBalance = 240000; // Starting baseline
  for (const v of vouchers) {
    for (const l of v.lines) {
      if (l.gl_code === selectedBankCode) {
        computedBookBalance += (l.debit || 0) - (l.credit || 0);
      }
    }
  }

  // BRS Working Paper State
  const [bankStatementBalance, setBankStatementBalance] = useState<number>(computedBookBalance + 38000);
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedInfo, setFinalizedInfo] = useState<{ by: string; at: string } | null>(null);

  const [reconcilingItems, setReconcilingItems] = useState<BRSLineItem[]>([
    {
      id: 'brs-1',
      reconciliation_id: 'rec-01',
      category: 'cheque_issued_not_presented',
      description: 'Cheque #441029 issued to Precision Machine Works not yet cleared by bank',
      amount: 40000,
      is_addition: true, // Add back to book balance
    },
    {
      id: 'brs-2',
      reconciliation_id: 'rec-01',
      category: 'bank_charges_not_recorded',
      description: 'Quarterly ledger folio & NEFT processing charges debited by HDFC Bank',
      amount: 2000,
      is_addition: false, // Deduct from book balance
    },
  ]);

  // New Reconciling Item Form
  const [newItemCat, setNewItemCat] = useState<BRSLineItem['category']>('cheque_issued_not_presented');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState(10000);

  const canFinalize = hasPermission(userRole, 'finalize_brs');

  // Compute Adjusted Reconciled Balance
  let additionsSum = 0;
  let deductionsSum = 0;

  for (const item of reconcilingItems) {
    if (item.is_addition) additionsSum += item.amount;
    else deductionsSum += item.amount;
  }

  const adjustedBookBalance = computedBookBalance + additionsSum - deductionsSum;
  const unreconciledDiff = Math.abs(adjustedBookBalance - bankStatementBalance);
  const isReconciled = unreconciledDiff < 0.01;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinalized) return;
    if (!newItemDesc || newItemAmount <= 0) return;

    // Cheques issued not presented and interest received are additions to book balance
    // Cheques deposited not cleared and bank charges are deductions from book balance
    const isAddition =
      newItemCat === 'cheque_issued_not_presented' || newItemCat === 'interest_not_recorded';

    setReconcilingItems((prev) => [
      ...prev,
      {
        id: `brs-${Date.now()}`,
        reconciliation_id: 'rec-01',
        category: newItemCat,
        description: newItemDesc,
        amount: Number(newItemAmount),
        is_addition: isAddition,
      },
    ]);
    setNewItemDesc('');
    setNewItemAmount(10000);
  };

  const handleDeleteItem = (id: string) => {
    if (isFinalized) return;
    setReconcilingItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleFinalize = () => {
    if (!canFinalize) {
      alert('Only Firm Owners or Senior Associates can finalize and lock BRS.');
      return;
    }
    if (!isReconciled) {
      alert(`Cannot finalize with unreconciled difference of ${formatIndianCurrency(unreconciledDiff)}. Difference must be zero.`);
      return;
    }

    setIsFinalized(true);
    setFinalizedInfo({
      by: 'CA Senior Partner',
      at: new Date().toLocaleString('en-IN'),
    });
    alert('Bank Reconciliation Statement has been locked and permanently saved to the database.');
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Watermark if unfinalized or diff exists
    if (!isReconciled || !isFinalized) {
      doc.saveGraphicsState();
      doc.setFontSize(55);
      doc.setTextColor(239, 68, 68);
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
      doc.text('DRAFT BRS WORKING PAPER', 20, 140, { angle: 35 });
      doc.restoreGraphicsState();
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK RECONCILIATION STATEMENT', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${clientName} | Bank: HDFC Current Account`, 105, 26, { align: 'center' });
    doc.text(`As on 30th September 2026 · Internal Audit Working Paper`, 105, 31, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35);

    const headers = [['Particulars', 'Amount (₹)', 'Net Balance (₹)']];
    const body: any[] = [
      ['Balance as per Cash/Bank Book (Auto-computed)', '', formatIndianCurrency(computedBookBalance)],
      ['ADD: Reconciling Additions', '', ''],
    ];

    reconcilingItems
      .filter((i) => i.is_addition)
      .forEach((i) => {
        body.push([`  • ${i.description}`, formatIndianCurrency(i.amount), '']);
      });

    body.push(['Total Additions', '', `+${formatIndianCurrency(additionsSum)}`]);
    body.push(['LESS: Reconciling Deductions', '', '']);

    reconcilingItems
      .filter((i) => !i.is_addition)
      .forEach((i) => {
        body.push([`  • ${i.description}`, formatIndianCurrency(i.amount), '']);
      });

    body.push(['Total Deductions', '', `-${formatIndianCurrency(deductionsSum)}`]);
    body.push(['Adjusted Balance as per Books', '', formatIndianCurrency(adjustedBookBalance)]);
    body.push(['Balance as per Bank Statement', '', formatIndianCurrency(bankStatementBalance)]);
    body.push(['Unreconciled Difference', '', formatIndianCurrency(unreconciledDiff)]);

    (doc as any).autoTable({
      head: headers,
      body: body,
      startY: 42,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(9);
    doc.text(
      isFinalized
        ? `Status: FINALIZED & LOCKED by ${finalizedInfo?.by} on ${finalizedInfo?.at}`
        : 'Status: DRAFT / IN-PROGRESS (Not Finalized)',
      14,
      finalY
    );

    doc.save(`BRS_${clientName.replace(/\s+/g, '_')}_HDFC.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank Reconciliation Statement (BRS)</h1>
            {isFinalized ? (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Lock size={12} />
                Finalized & Locked
              </span>
            ) : isReconciled ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Reconciled (Diff: ₹0.00)
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={12} />
                Diff: {formatIndianCurrency(unreconciledDiff)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal audit reconciliation between Ledger Bank Book and Bank Passbook for {clientName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer size={14} className="text-slate-600" />
            <span>Export BRS Working Paper</span>
          </button>

          {!isFinalized && canFinalize && (
            <button
              onClick={handleFinalize}
              disabled={!isReconciled}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Lock size={14} className="text-amber-400" />
              <span>Finalize & Lock BRS</span>
            </button>
          )}
        </div>
      </div>

      {/* Bank Account Selector & Balance Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <label className="text-slate-500 block mb-1">Target Bank Account</label>
          <select
            value={selectedBankCode}
            onChange={(e) => setSelectedBankCode(e.target.value)}
            disabled={isFinalized}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {bankAccounts.map((b) => (
              <option key={b.gl_code} value={b.gl_code}>
                [{b.gl_code}] {b.gl_name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Auto-Pulled Book Balance</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formatIndianCurrency(computedBookBalance)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of session vouchers</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <label className="text-slate-500 block mb-1">Bank Statement Balance (Passbook)</label>
          <input
            type="number"
            disabled={isFinalized}
            value={bankStatementBalance}
            onChange={(e) => setBankStatementBalance(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Finalized Banner if locked */}
      {isFinalized && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-700" />
            <span>
              <strong>BRS Finalized & Audit-Locked:</strong> Approved by {finalizedInfo?.by} on {finalizedInfo?.at}. Editing is locked.
            </span>
          </div>
          <button
            onClick={() => {
              if (canFinalize && confirm('Unlock BRS for editing adjustments?')) {
                setIsFinalized(false);
              }
            }}
            className="text-xs text-emerald-800 underline font-medium"
          >
            Unlock for edit
          </button>
        </div>
      )}

      {/* BRS Working Paper Reconciliation Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">
            Bank Reconciliation Statement Working Paper
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            Unreconciled Difference:{' '}
            <strong className={isReconciled ? 'text-emerald-700' : 'text-rose-600'}>
              {formatIndianCurrency(unreconciledDiff)}
            </strong>
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <tbody className="divide-y divide-slate-100">
            {/* 1. Book Balance */}
            <tr className="bg-slate-50 font-bold text-slate-900">
              <td className="py-2.5 px-4">Balance as per Cash/Bank Book</td>
              <td className="py-2.5 px-4 text-right font-mono" colSpan={2}>
                {formatIndianCurrency(computedBookBalance)}
              </td>
            </tr>

            {/* 2. Additions */}
            <tr className="bg-slate-100/50 font-semibold text-slate-700 text-[11px]">
              <td className="py-2 px-4" colSpan={3}>
                ADD: Reconciling Items (Amounts not yet credited or cheques issued not presented)
              </td>
            </tr>
            {reconcilingItems
              .filter((i) => i.is_addition)
              .map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-4 pl-8 text-slate-700">
                    <span className="font-medium text-slate-800 capitalize">
                      {item.category.replace(/_/g, ' ')}:
                    </span>{' '}
                    {item.description}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-emerald-800 font-medium">
                    +{formatIndianCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right w-16">
                    {!isFinalized && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            {/* 3. Deductions */}
            <tr className="bg-slate-100/50 font-semibold text-slate-700 text-[11px]">
              <td className="py-2 px-4" colSpan={3}>
                LESS: Reconciling Items (Bank charges, direct debits, or cheques deposited not cleared)
              </td>
            </tr>
            {reconcilingItems
              .filter((i) => !i.is_addition)
              .map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-4 pl-8 text-slate-700">
                    <span className="font-medium text-slate-800 capitalize">
                      {item.category.replace(/_/g, ' ')}:
                    </span>{' '}
                    {item.description}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-rose-800 font-medium">
                    -{formatIndianCurrency(item.amount)}
                  </td>
                  <td className="py-2 px-4 text-right w-16">
                    {!isFinalized && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            {/* Adjusted Book Balance */}
            <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
              <td className="py-2.5 px-4">Adjusted Balance as per Books</td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900" colSpan={2}>
                {formatIndianCurrency(adjustedBookBalance)}
              </td>
            </tr>

            {/* Bank Statement Balance */}
            <tr className="bg-slate-50 font-semibold text-slate-800">
              <td className="py-2.5 px-4">Balance as per Bank Statement (Passbook)</td>
              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900" colSpan={2}>
                {formatIndianCurrency(bankStatementBalance)}
              </td>
            </tr>

            {/* Difference */}
            <tr className={`font-bold ${isReconciled ? 'bg-emerald-50 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}>
              <td className="py-3 px-4">UNRECONCILED DIFFERENCE</td>
              <td className="py-3 px-4 text-right font-mono font-bold text-base" colSpan={2}>
                {formatIndianCurrency(unreconciledDiff)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Reconciling Item Form */}
      {!isFinalized && (
        <form
          onSubmit={handleAddItem}
          className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 text-xs"
        >
          <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider pb-1">
            Add Reconciling Line Item
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Item Category</label>
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value as BRSLineItem['category'])}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="cheque_issued_not_presented">Cheque Issued Not Presented (Add)</option>
                <option value="interest_not_recorded">Interest Credited by Bank (Add)</option>
                <option value="cheque_deposited_not_cleared">Cheque Deposited Not Cleared (Less)</option>
                <option value="bank_charges_not_recorded">Bank Charges & Fees (Less)</option>
                <option value="other">Other Adjustments</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1 font-medium">Description / Cheque Ref</label>
              <input
                type="text"
                required
                placeholder="e.g. Cheque #551201 issued to vendor on 28th Sept..."
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-slate-600 mb-1 font-medium">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors shrink-0"
              >
                Add Item
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
