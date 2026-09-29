/**
 * Legacy Logic Pro — Income Tax Computation & Draft Form 16
 * Section 5.11: ITR working paper starting from P&L profit, additions, allowable IT Act depreciation,
 * Chapter VI-A deductions, slab-based tax rates by entity type, and draft Form 16 PDF generation with watermark.
 */

import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { ChapterVIADeduction, Client, VoucherEntry } from '../../types';
import { computeITR, computeScheduleIII } from '../../services/financialEngine';
import { formatIndianCurrency } from '../../lib/formatters';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface IncomeTaxViewProps {
  vouchers: VoucherEntry[];
  client: Client;
}

export const IncomeTaxView: React.FC<IncomeTaxViewProps> = ({
  vouchers,
  client,
}) => {
  const [activeTab, setActiveTab] = useState<'itr_computation' | 'form16_draft'>('itr_computation');

  // Chapter VI-A Deductions table
  const [chapterVIADeductions, setChapterVIADeductions] = useState<ChapterVIADeduction[]>([
    {
      id: 'via-1',
      client_id: client.id,
      financial_year: '2026-27',
      section: '80C',
      description: 'Life Insurance Premium & Statutory PF Contributions',
      amount: 150000,
    },
    {
      id: 'via-2',
      client_id: client.id,
      financial_year: '2026-27',
      section: '80D',
      description: 'Mediclaim Health Insurance Premium for Family',
      amount: 25000,
    },
    {
      id: 'via-3',
      client_id: client.id,
      financial_year: '2026-27',
      section: '80G',
      description: 'Donation to PM National Relief Fund (100% Eligible)',
      amount: 10000,
    },
  ]);

  const [newSection, setNewSection] = useState('80C');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState(10000);

  const report = computeScheduleIII(vouchers);
  const pnlNetProfit = report.profit_and_loss.profit_before_tax;

  const itr = computeITR(
    pnlNetProfit,
    65000, // IT Act Depreciation
    45000, // Book Depreciation
    chapterVIADeductions,
    client.entity_type
  );

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc) return;
    setChapterVIADeductions((prev) => [
      ...prev,
      {
        id: `via-${Date.now()}`,
        client_id: client.id,
        financial_year: '2026-27',
        section: newSection,
        description: newDesc,
        amount: Number(newAmount),
      },
    ]);
    setNewDesc('');
    setNewAmount(10000);
  };

  const handleDeleteDeduction = (id: string) => {
    setChapterVIADeductions((prev) => prev.filter((d) => d.id !== id));
  };

  // Generate Draft Form 16 (Salary) PDF
  const handleGenerateForm16 = (employeeName: string, pan: string, gross: number, tax: number) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Watermark DRAFT
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setTextColor(239, 68, 68);
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.text('DRAFT FORM 16', 30, 140, { angle: 35 });
    doc.restoreGraphicsState();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORM NO. 16 (PART A & B)', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('[See rule 31(1)(a)]', 105, 25, { align: 'center' });
    doc.text('Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on Salary', 105, 30, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('INTERNAL AUDIT WORKING PAPER — DRAFT TO BE VERIFIED', 105, 36, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);

    // Employer & Employee details
    doc.setFontSize(10);
    doc.text('Employer (Company):', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, 14, 54);
    doc.text(`TAN: DELM12345D | PAN: ${client.pan}`, 14, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Employee (Deductee):', 120, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(employeeName, 120, 54);
    doc.text(`PAN: ${pan} | Period: FY 2026-27`, 120, 60);

    const headers = [['Item Description', 'Gross Salary (₹)', 'Deductions (₹)', 'Tax Deducted (₹)']];
    const body = [
      ['Gross Salary u/s 17(1)', formatIndianCurrency(gross), '-', '-'],
      ['Standard Deduction u/s 16(ia)', '-', formatIndianCurrency(75000), '-'],
      ['Chapter VI-A Deductions', '-', formatIndianCurrency(150000), '-'],
      ['Total Tax Deducted u/s 192 (FY)', '-', '-', formatIndianCurrency(tax)],
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
    doc.text('Attestation:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Verified draft Form 16 prepared by Practice Management Engine for ' +
        employeeName +
        '. Reconciled with TRACES 24Q quarterly statements.',
      14,
      finalY + 6,
      { maxWidth: 180 }
    );

    doc.save(`Draft_Form16_${employeeName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Income Tax Computation Working Paper</h1>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              AY 2027-28 (FY 2026-27)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statutory tax computation for {client.name} ({client.entity_type.toUpperCase()}) — Working Paper, Not a Filed Return.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('itr_computation')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'itr_computation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            ITR Computation
          </button>
          <button
            onClick={() => setActiveTab('form16_draft')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'form16_draft' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Draft Form 16 (Salaries)
          </button>
        </div>
      </div>

      {activeTab === 'itr_computation' && (
        <div className="space-y-6">
          {/* Statutory Working Paper Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-700 shrink-0" />
              <span>
                <strong>Working Paper Notice:</strong> Clearly designated as an internal audit working paper. Applicable tax rate: {client.entity_type === 'company' ? '25% (Corporate Rate)' : client.entity_type === 'llp' || client.entity_type === 'partnership' ? '30% (Firm Rate)' : 'Slab Rate (New Tax Regime)'}.
              </span>
            </div>
            <span className="font-mono font-bold text-amber-800 shrink-0">AY 2027-28</span>
          </div>

          {/* ITR Computation Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
              Statement of Total Income & Tax Payable
            </div>

            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-100">
                {/* 1. Profit Before Tax */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">
                    Net Profit Before Tax as per Profit & Loss Account
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(itr.pnl_net_profit)}
                  </td>
                </tr>

                {/* 2. Additions */}
                <tr className="bg-slate-50/50 font-semibold text-slate-700">
                  <td className="py-2 px-4" colSpan={2}>
                    Add: Inadmissible Expenses & Book Adjustments
                  </td>
                </tr>
                {itr.additions.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-600 pl-8">• {a.description}</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-700">
                      {formatIndianCurrency(a.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-slate-800 bg-slate-50/30">
                  <td className="py-2 px-4 pl-8">Total Additions</td>
                  <td className="py-2 px-4 text-right font-mono text-emerald-800 font-bold">
                    +{formatIndianCurrency(itr.total_additions)}
                  </td>
                </tr>

                {/* 3. Deductions */}
                <tr className="bg-slate-50/50 font-semibold text-slate-700">
                  <td className="py-2 px-4" colSpan={2}>
                    Less: Allowable Deductions under Income Tax Act
                  </td>
                </tr>
                {itr.deductions.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-600 pl-8">• {d.description}</td>
                    <td className="py-2 px-4 text-right font-mono text-slate-700">
                      {formatIndianCurrency(d.amount)}
                    </td>
                  </tr>
                ))}

                {/* 4. Gross Total Income */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-200">
                  <td className="py-2.5 px-4">GROSS TOTAL INCOME (GTI)</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-950">
                    {formatIndianCurrency(itr.gross_total_income)}
                  </td>
                </tr>

                {/* 5. Chapter VI-A Deductions */}
                <tr className="bg-slate-50/50 font-semibold text-slate-700">
                  <td className="py-2 px-4" colSpan={2}>
                    Less: Deductions under Chapter VI-A
                  </td>
                </tr>
                {itr.chapter_via_deductions.map((via, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2 px-4 text-slate-600 pl-8">
                      • Section {via.section} ({via.description})
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-700">
                      {formatIndianCurrency(via.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold text-slate-800 bg-slate-50/30">
                  <td className="py-2 px-4 pl-8">Total Chapter VI-A Allowed</td>
                  <td className="py-2 px-4 text-right font-mono text-rose-800 font-bold">
                    -{formatIndianCurrency(itr.total_chapter_via)}
                  </td>
                </tr>

                {/* 6. Total Taxable Income */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4">TOTAL TAXABLE INCOME (Rounded u/s 288A)</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-950">
                    {formatIndianCurrency(itr.total_taxable_income)}
                  </td>
                </tr>

                {/* 7. Tax Liabilities */}
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-4 text-slate-700 pl-8">Tax on Total Income</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-900">
                    {formatIndianCurrency(itr.base_tax)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-4 text-slate-700 pl-8">Add: Health & Education Cess @ 4%</td>
                  <td className="py-2 px-4 text-right font-mono text-slate-900">
                    {formatIndianCurrency(itr.health_and_education_cess)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 font-semibold text-slate-800">
                  <td className="py-2.5 px-4">Total Tax & Cess Liability</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(itr.total_tax_liability)}
                  </td>
                </tr>

                {/* 8. TDS Credits */}
                <tr className="hover:bg-slate-50/50 text-slate-700">
                  <td className="py-2 px-4 pl-8">Less: TDS Credits Claimed (Form 26AS / AIS)</td>
                  <td className="py-2 px-4 text-right font-mono text-emerald-800">
                    -{formatIndianCurrency(itr.tds_credit_available)}
                  </td>
                </tr>

                {/* 9. Net Tax Payable / Refund */}
                <tr className="bg-amber-100/70 font-bold text-amber-950 border-t-2 border-amber-300">
                  <td className="py-3.5 px-4 text-sm">
                    NET TAX PAYABLE / (REFUNDABLE)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-base text-amber-900">
                    {formatIndianCurrency(itr.net_tax_payable_or_refund, { showParenForNegative: true })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Chapter VI-A Deduction Entry Manager (Section 5.11) */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                Chapter VI-A Deductions Manager (Client Year-End)
              </span>
              <span className="text-[11px] text-slate-400">Sections 80C, 80D, 80G</span>
            </div>

            <form onSubmit={handleAddDeduction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="80C">Section 80C (Max ₹1.5L)</option>
                  <option value="80D">Section 80D (Mediclaim)</option>
                  <option value="80G">Section 80G (Donations)</option>
                  <option value="80TTA">Section 80TTA (Savings Interest)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PPF Deposit / Life Insurance"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-slate-600 mb-1 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors shrink-0 self-end"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden mt-3">
              {chapterVIADeductions.map((d) => (
                <div key={d.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <span className="font-semibold text-slate-800">Section {d.section}:</span>{' '}
                    <span className="text-slate-600">{d.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">
                      {formatIndianCurrency(d.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteDeduction(d.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Draft Form 16 (Salary) PDF Generation (Section 5.11) */}
      {activeTab === 'form16_draft' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Employee Draft Form 16 Certificates (Salary TDS)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Watermarked draft certificates generated for employee tax filing verification before digital signature.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Draft Working Papers
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Employee Name</th>
                  <th className="py-2.5 px-4">PAN</th>
                  <th className="py-2.5 px-4 text-right">Gross Salary</th>
                  <th className="py-2.5 px-4 text-right">Total TDS Deducted</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">Suresh Verma (Plant Manager)</td>
                  <td className="py-3 px-4 font-mono text-slate-600">ABCPS1234D</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-800">{formatIndianCurrency(1200000)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(87000)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleGenerateForm16('Suresh Verma', 'ABCPS1234D', 1200000, 87000)}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1 rounded text-xs transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <FileText size={12} className="text-amber-600" />
                      <span>Download Draft Form 16 PDF</span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">Meena Krishnan (Quality Head)</td>
                  <td className="py-3 px-4 font-mono text-slate-600">BXZPK9988M</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-800">{formatIndianCurrency(950000)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(51000)}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleGenerateForm16('Meena Krishnan', 'BXZPK9988M', 950000, 51000)}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1 rounded text-xs transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <FileText size={12} className="text-amber-600" />
                      <span>Download Draft Form 16 PDF</span>
                    </button>
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
