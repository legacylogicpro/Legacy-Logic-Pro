/**
 * Legacy Logic Pro — TDS Compliance & Form 16A Working Paper
 * Section 5.9: Seeded reference table of TDS sections & rates, deduction mismatch verification,
 * Quarter-wise & Section-wise breakup, 24Q (salary) & 26Q (non-salary) working papers, and draft Form 16A PDF generator.
 */

import React, { useState } from 'react';
import {
  Calculator,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { VoucherEntry } from '../../types';
import { TDS_SECTIONS_RATE_TABLE } from '../../data/seedData';
import { computeTDSBreakup } from '../../services/financialEngine';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface TDSModuleViewProps {
  vouchers: VoucherEntry[];
  clientName: string;
}

export const TDSModuleView: React.FC<TDSModuleViewProps> = ({
  vouchers,
  clientName,
}) => {
  const [activeTab, setActiveTab] = useState<'26q' | '24q' | 'mismatches' | 'rates'>('26q');
  const tdsEntries = computeTDSBreakup(vouchers);

  const totalDeducted = tdsEntries.reduce((s, e) => s + e.tds_deducted, 0);
  const mismatches = tdsEntries.filter((e) => e.has_mismatch);

  // Generate Draft Form 16A PDF
  const handleGenerateForm16A = (entry: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Watermark DRAFT
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setTextColor(239, 68, 68);
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.text('DRAFT FORM 16A', 30, 140, { angle: 35 });
    doc.restoreGraphicsState();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORM NO. 16A', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('[See rule 31(1)(b)]', 105, 25, { align: 'center' });
    doc.text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source', 105, 30, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('INTERNAL AUDIT WORKING PAPER — DRAFT TO BE VERIFIED', 105, 36, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    // Deductor & Deductee details
    doc.setFontSize(10);
    doc.text('Deductor (Payer) Name:', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, 14, 54);
    doc.text('TAN: DELM12345D | PAN: AAACA4512Q', 14, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Deductee (Payee) Name:', 120, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.deductee_name, 120, 54);
    doc.text('PAN: AABFK4432N | Section: ' + entry.section, 120, 60);

    // Payment details table
    const headers = [['Quarter', 'Date of Payment', 'Amount Paid (₹)', 'Tax Deducted (₹)', 'Challan BSR / ITNS 281']];
    const body = [
      [
        'Q2 (Jul - Sep 2026)',
        formatIndianDate(entry.date),
        formatIndianCurrency(entry.payment_amount),
        formatIndianCurrency(entry.tds_deducted),
        'BSR: 0510304 · Challan: 28190',
      ],
    ];

    (doc as any).autoTable({
      head: headers,
      body: body,
      startY: 70,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text('Verification:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'I, CA Rajesh Mehta, in capacity of Principal Auditor, do hereby certify that a sum of ' +
        formatIndianCurrency(entry.tds_deducted) +
        ' has been deducted at source and paid to the credit of Central Government.',
      14,
      finalY + 6,
      { maxWidth: 180 }
    );

    doc.save(`Draft_Form16A_${entry.deductee_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TDS Working Papers & Form 16A</h1>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Internal Review Paper
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Withholding tax compliance, Section 194 rate mismatch audit, and draft certificate generation for {clientName}.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('26q')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === '26q' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Form 26Q (Non-Salary)
          </button>
          <button
            onClick={() => setActiveTab('24q')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === '24q' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Form 24Q (Salaries)
          </button>
          <button
            onClick={() => setActiveTab('mismatches')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'mismatches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Rate Mismatches ({mismatches.length})
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'rates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Section 194 Reference
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Total TDS Withheld (Q2)</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatIndianCurrency(totalDeducted)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">To be deposited vide Challan ITNS 281</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Deductee Entries Scoped</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {tdsEntries.length} Payees
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Sections 194C, 194I, 194J, 194Q</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Rate Mismatch Alerts</span>
          <div className={`text-xl font-bold font-mono mt-0.5 ${mismatches.length > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
            {mismatches.length} Flagged
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Under-deduction interest risk u/s 201(1A)</span>
        </div>
      </div>

      {/* Tab 1: Form 26Q Non-Salary Working Paper */}
      {activeTab === '26q' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
              Form 26Q Quarterly Working Paper — For Internal Review, Not a Filed Return
            </span>
            <span className="text-[11px] text-slate-400">Section 200(3) IT Act Compliance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Voucher No.</th>
                  <th className="py-2.5 px-4">Deductee / Vendor</th>
                  <th className="py-2.5 px-4">Section</th>
                  <th className="py-2.5 px-4 text-right">Payment Gross (₹)</th>
                  <th className="py-2.5 px-4 text-right">Rate (%)</th>
                  <th className="py-2.5 px-4 text-right font-bold">TDS Withheld (₹)</th>
                  <th className="py-2.5 px-4 text-center">Draft Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tdsEntries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-mono text-slate-700">{formatIndianDate(row.date)}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.voucher_no}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{row.deductee_name}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-amber-800 bg-amber-50/30">
                      u/s {row.section}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      {formatIndianCurrency(row.payment_amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {row.rate_applied}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                      {formatIndianCurrency(row.tds_deducted)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleGenerateForm16A(row)}
                        className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-2.5 py-1 rounded text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Generate watermarked Draft Form 16A PDF"
                      >
                        <FileText size={12} className="text-amber-600" />
                        <span>Draft 16A PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Form 24Q Salary Working Paper */}
      {activeTab === '24q' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Form 24Q (Salary TDS u/s 192) Working Paper
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Working Paper — For Internal Review, Not a Filed Return
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Annexure I & II Reconciled
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Employee Name</th>
                  <th className="py-2.5 px-4">PAN</th>
                  <th className="py-2.5 px-4 text-right">Gross Salary (FY)</th>
                  <th className="py-2.5 px-4 text-right">Standard Deduction</th>
                  <th className="py-2.5 px-4 text-right">Taxable Salary</th>
                  <th className="py-2.5 px-4 text-right font-bold">Monthly TDS (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-800">Suresh Verma (Plant Manager)</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">ABCPS1234D</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(1200000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(75000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(1125000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(7250)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-800">Meena Krishnan (Quality Head)</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">BXZPK9988M</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(950000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(75000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatIndianCurrency(875000)}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(4250)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Mismatches */}
      {activeTab === 'mismatches' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">
            TDS Rate Discrepancy & Threshold Flags
          </h3>
          {mismatches.length === 0 ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              No TDS under-deduction or rate discrepancies identified in current session vouchers.
            </div>
          ) : (
            <div className="space-y-2">
              {mismatches.map((m, idx) => (
                <div key={idx} className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                  <div className="font-semibold text-xs">{m.deductee_name} · Voucher #{m.voucher_no}</div>
                  <div className="text-[11px] mt-0.5">{m.mismatch_reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Seeded Reference Table (Section 5.9) */}
      {activeTab === 'rates' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
            Income Tax Act, 1961 — Statutory TDS Rate Card (FY 2026-27)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Section</th>
                  <th className="py-2.5 px-4">Nature of Payment</th>
                  <th className="py-2.5 px-4 text-right">Threshold Limit (₹)</th>
                  <th className="py-2.5 px-4 text-right">Ind / HUF Rate</th>
                  <th className="py-2.5 px-4 text-right">Other Entities</th>
                  <th className="py-2.5 px-4">Statutory Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TDS_SECTIONS_RATE_TABLE.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{row.section}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{row.nature}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {row.threshold > 0 ? formatIndianCurrency(row.threshold) : 'Nil'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      {row.rate_individual > 0 ? `${row.rate_individual}%` : 'Slab'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                      {row.rate_others > 0 ? `${row.rate_others}%` : 'Slab'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
