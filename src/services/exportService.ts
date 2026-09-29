/**
 * Legacy Logic Pro — Multi-Format Export Service
 * Excel (styled with Summary sheet), PDF (with conditional DRAFT watermark), JSON & Tally XML
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatIndianCurrency, formatIndianDate } from '../lib/formatters';
import { TrialBalanceResult } from './financialEngine';
import { Invoice, VoucherEntry } from '../types';

export function exportTrialBalanceToExcel(
  tb: TrialBalanceResult,
  clientName: string,
  period: string
) {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['LEGACY LOGIC PRO — FINANCIAL REPORTING ENGINE'],
    ['WORKING PAPER — FOR INTERNAL AUDIT & REVIEW ONLY'],
    [],
    ['Client Name:', clientName],
    ['Reporting Period:', period],
    ['Report Type:', 'Grouped Ledger Trial Balance'],
    ['Generated On:', new Date().toLocaleString('en-IN')],
    [],
    ['Total Debits (Closing):', formatIndianCurrency(tb.total_debit)],
    ['Total Credits (Closing):', formatIndianCurrency(tb.total_credit)],
    ['Imbalance Difference:', formatIndianCurrency(tb.difference)],
    ['Status:', tb.is_balanced ? 'BALANCED' : 'IMBALANCE DETECTED'],
    [],
    ['Confidential — Prepared on behalf of client. Not for public distribution.'],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // 2. Trial Balance Sheet (Grouped Ledger Balances, NOT raw entries!)
  const headers = [
    'GL Code',
    'Ledger Head Name',
    'Classification',
    'Opening Dr (₹)',
    'Opening Cr (₹)',
    'Period Dr (₹)',
    'Period Cr (₹)',
    'Closing Dr (₹)',
    'Closing Cr (₹)',
  ];

  const rows = tb.rows.map(r => [
    r.gl_code,
    r.gl_name,
    r.category,
    r.opening_debit ? formatIndianCurrency(r.opening_debit) : '-',
    r.opening_credit ? formatIndianCurrency(r.opening_credit) : '-',
    r.period_debit ? formatIndianCurrency(r.period_debit) : '-',
    r.period_credit ? formatIndianCurrency(r.period_credit) : '-',
    r.closing_debit ? formatIndianCurrency(r.closing_debit) : '-',
    r.closing_credit ? formatIndianCurrency(r.closing_credit) : '-',
  ]);

  rows.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    formatIndianCurrency(tb.total_debit),
    formatIndianCurrency(tb.total_credit),
  ]);

  const tbWs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, tbWs, 'Trial Balance');

  XLSX.writeFile(wb, `${clientName.replace(/\s+/g, '_')}_Trial_Balance_${period}.xlsx`);
}

export function exportTrialBalanceToPDF(
  tb: TrialBalanceResult,
  clientName: string,
  period: string,
  firmName = 'Mehta, Singhal & Associates LLP'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hasAnomalies = !tb.is_balanced;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(firmName, 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Chartered Accountants · Audit & Practice Management Working Paper', 14, 21);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TRIAL BALANCE: ${clientName.toUpperCase()}`, 14, 29);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${period} | As on: ${new Date().toLocaleDateString('en-IN')}`, 14, 34);

  // AutoTable
  const headers = [['GL Code', 'Ledger Name', 'Category', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr']];
  const body = tb.rows.map(r => [
    r.gl_code,
    r.gl_name,
    r.category,
    formatIndianCurrency(r.period_debit),
    formatIndianCurrency(r.period_credit),
    formatIndianCurrency(r.closing_debit),
    formatIndianCurrency(r.closing_credit),
  ]);

  body.push([
    'TOTAL',
    '',
    '',
    '',
    '',
    formatIndianCurrency(tb.total_debit),
    formatIndianCurrency(tb.total_credit),
  ]);

  (doc as any).autoTable({
    head: headers,
    body: body,
    startY: 38,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didDrawPage: (data: any) => {
      // DRAFT Watermark if unresolved anomalies or imbalances exist
      if (hasAnomalies) {
        doc.saveGraphicsState();
        doc.setFontSize(72);
        doc.setTextColor(239, 68, 68);
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
        doc.text('DRAFT — IMBALANCE', 50, 120, { angle: 25 });
        doc.restoreGraphicsState();
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} · Legacy Logic Pro Working Paper (Not a filed return)`,
        14,
        doc.internal.pageSize.height - 8
      );
    },
  });

  doc.save(`${clientName.replace(/\s+/g, '_')}_Trial_Balance.pdf`);
}

export function exportInvoiceToPDF(invoice: Invoice, firmProfile: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Firm Letterhead
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(firmProfile.firm_name || 'Mehta, Singhal & Associates LLP', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(firmProfile.address || 'Connaught Place, New Delhi', 14, 24);
  doc.text(`GSTIN: ${firmProfile.gstin} | PAN: ${firmProfile.pan} | Email: ${firmProfile.contact_email}`, 14, 29);

  doc.setDrawColor(200);
  doc.line(14, 33, 196, 33);

  // Invoice Title & Meta
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 14, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoice_number}`, 14, 49);
  doc.text(`Date of Issue: ${formatIndianDate(invoice.issue_date)}`, 14, 54);
  doc.text(`Due Date: ${formatIndianDate(invoice.due_date)}`, 14, 59);

  // Client Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 120, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client_name, 120, 48);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, 54);

  // Items Table
  const headers = [['#', 'Description of Professional Services', 'Taxable?', 'Amount (₹)']];
  const rows = invoice.items.map((it, idx) => [
    idx + 1,
    it.description,
    it.is_taxable ? 'Yes (18% GST)' : 'No (Exempt)',
    formatIndianCurrency(it.amount),
  ]);

  (doc as any).autoTable({
    head: headers,
    body: rows,
    startY: 65,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: { 3: { halign: 'right' } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Calculation Box
  doc.setFontSize(10);
  doc.text(`Subtotal:`, 130, finalY);
  doc.text(formatIndianCurrency(invoice.subtotal), 196, finalY, { align: 'right' });

  doc.text(`GST (18% on Taxable Items):`, 130, finalY + 6);
  doc.text(formatIndianCurrency(invoice.gst_amount), 196, finalY + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount Due:`, 130, finalY + 14);
  doc.text(formatIndianCurrency(invoice.total_amount), 196, finalY + 14, { align: 'right' });

  // Bank Account Payment Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bank Remittance Instructions:', 14, finalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${firmProfile.bank_name}`, 14, finalY + 25);
  doc.text(`A/c No: ${firmProfile.account_number} | IFSC: ${firmProfile.ifsc_code}`, 14, finalY + 30);

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
}

export function downloadJsonFile(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTallyXmlFile(xmlContent: string, filename: string) {
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
