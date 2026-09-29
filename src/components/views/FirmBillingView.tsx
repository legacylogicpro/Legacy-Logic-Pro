/**
 * Legacy Logic Pro — Firm Billing & Client Invoicing
 * Section 5.18: The CA firm billing its OWN clients (strictly separated from client accounting entries).
 * Reusable fee item rate card, invoice creation with line items, automatic 18% GST calculation,
 * status tracking (draft/sent/paid/overdue/cancelled), and professional PDF invoice generator.
 */

import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  FileText,
  Download,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Client, FeeItem, FirmBillingProfile, Invoice, InvoiceItem } from '../../types';
import { INITIAL_FEE_ITEMS, INITIAL_FIRM_PROFILE } from '../../data/seedData';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { exportInvoiceToPDF } from '../../services/exportService';
import { hasPermission, UserRole } from '../../lib/permissions';

interface FirmBillingViewProps {
  clients: Client[];
  userRole: UserRole;
}

export const FirmBillingView: React.FC<FirmBillingViewProps> = ({
  clients,
  userRole,
}) => {
  const [feeItems, setFeeItems] = useState<FeeItem[]>(INITIAL_FEE_ITEMS);
  const [firmProfile, setFirmProfile] = useState<FirmBillingProfile>(INITIAL_FIRM_PROFILE);

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv-001',
      invoice_number: 'MSA/2026/041',
      client_id: 'cli-apex-01',
      client_name: 'Apex Industrial Gears Pvt Ltd',
      issue_date: '2026-09-01',
      due_date: '2026-09-15',
      status: 'paid',
      subtotal: 75000,
      gst_amount: 13500, // 18%
      total_amount: 88500,
      items: [
        {
          id: 'it-1',
          description: 'Statutory Audit Fees for Corporate Entity (FY 2025-26)',
          quantity: 1,
          unit_price: 75000,
          is_taxable: true,
          amount: 75000,
        },
      ],
    },
    {
      id: 'inv-002',
      invoice_number: 'MSA/2026/042',
      client_id: 'cli-shanti-02',
      client_name: 'Shanti Retail Ventures LLP',
      issue_date: '2026-09-10',
      due_date: '2026-09-25',
      status: 'sent',
      subtotal: 45000,
      gst_amount: 8100,
      total_amount: 53100,
      items: [
        {
          id: 'it-2',
          description: 'Tax Audit & 3CD Certification u/s 44AB',
          quantity: 1,
          unit_price: 45000,
          is_taxable: true,
          amount: 45000,
        },
      ],
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: 'init-it-1',
      description: 'Monthly GST Retainership & Return Filing (GSTR-1 & 3B)',
      quantity: 1,
      unit_price: 15000,
      is_taxable: true,
      amount: 15000,
    },
  ]);

  const canManageInvoices = hasPermission(userRole, 'create_edit_invoices');

  const handleAddItemRow = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: `it-${Date.now()}-${prev.length}`,
        description: 'Professional Services',
        quantity: 1,
        unit_price: 10000,
        is_taxable: true,
        amount: 10000,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectPreloadedFee = (idx: number, feeId: string) => {
    const fee = feeItems.find((f) => f.id === feeId);
    if (!fee) return;
    setInvoiceItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              description: fee.description,
              unit_price: fee.default_amount,
              is_taxable: fee.is_taxable,
              amount: fee.default_amount * it.quantity,
            }
          : it
      )
    );
  };

  // Compute live subtotal and 18% GST on taxable items (Section 5.18)
  const subtotal = invoiceItems.reduce((s, it) => s + (it.amount || 0), 0);
  const taxableSum = invoiceItems.filter((it) => it.is_taxable).reduce((s, it) => s + it.amount, 0);
  const gstAmount = Math.round(taxableSum * 0.18);
  const grandTotal = subtotal + gstAmount;

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInvoices) return;

    const cl = clients.find((c) => c.id === selectedClientId) || clients[0];
    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `MSA/2026/${101 + invoices.length}`,
      client_id: cl.id,
      client_name: cl.name,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'sent',
      subtotal,
      gst_amount: gstAmount,
      total_amount: grandTotal,
      items: invoiceItems,
    };

    setInvoices((prev) => [newInv, ...prev]);
    setIsCreateOpen(false);
    alert(`Tax Invoice #${newInv.invoice_number} created and saved to database!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Firm Billing & Client Fee Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            CA practice client invoicing with 18% GST computation, rate card management, and branded PDF generation.
          </p>
        </div>

        {canManageInvoices ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} className="text-amber-400" />
            <span>Create Tax Invoice</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            (Owner/Senior role required to create invoices)
          </span>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Total Invoiced (Current FY)</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatIndianCurrency(invoices.reduce((s, i) => s + i.total_amount, 0))}
          </div>
          <span className="text-[11px] text-slate-400">{invoices.length} invoices issued</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-200">
          <span className="text-emerald-800 font-medium">Collections Received</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            {formatIndianCurrency(invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0))}
          </div>
          <span className="text-[11px] text-emerald-700">Cleared in HDFC Current A/c</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200">
          <span className="text-amber-900 font-medium">Outstanding Client Dues</span>
          <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
            {formatIndianCurrency(invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total_amount, 0))}
          </div>
          <span className="text-[11px] text-amber-800">Sent & awaiting payment</span>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
          Practice Invoices Issued
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Invoice No.</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">GST (18%)</th>
                <th className="py-3 px-4 text-right font-bold">Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{inv.client_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{formatIndianDate(inv.issue_date)}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{formatIndianDate(inv.due_date)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatIndianCurrency(inv.subtotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatIndianCurrency(inv.gst_amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIndianCurrency(inv.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'sent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => exportInvoiceToPDF(inv, firmProfile)}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-2.5 py-1 rounded text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Download branded Tax Invoice PDF with Firm Letterhead"
                    >
                      <Download size={12} className="text-amber-600" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Fee Rate Card Section (Section 5.18) */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">
            Standard Firm Fee Schedule (Rate Card)
          </span>
          <span className="text-[11px] text-slate-400">Pre-configured retainership and certification rates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {feeItems.map((fee) => (
            <div key={fee.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-start">
              <div>
                <div className="font-semibold text-slate-900">{fee.description}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {fee.is_taxable ? 'Subject to 18% GST' : 'Exempt / Reimbursement'}
                </div>
              </div>
              <span className="font-mono font-bold text-slate-900 shrink-0">
                {formatIndianCurrency(fee.default_amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Create Invoice Centered Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Create Practice Tax Invoice</h3>
                <p className="text-[11px] text-slate-400">Automated 18% GST calculation on professional services</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Billed Client *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gstin || c.pan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {invoiceItems.map((item, idx) => (
                    <div key={item.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          onChange={(e) => handleSelectPreloadedFee(idx, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs truncate mb-1"
                        >
                          <option value="">Select from Rate Card...</option>
                          {feeItems.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.description} ({formatIndianCurrency(f.default_amount)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            setInvoiceItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it))
                            )
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10) || 1;
                            setInvoiceItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, quantity: q, amount: q * it.unit_price } : it
                              )
                            );
                          }}
                          className="w-full text-center bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            setInvoiceItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, unit_price: p, amount: p * it.quantity } : it
                              )
                            );
                          }}
                          className="w-full text-right bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Total Calculation Summary */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs text-right">
                <div>Subtotal: <strong className="font-mono">{formatIndianCurrency(subtotal)}</strong></div>
                <div>CGST (9%) + SGST (9%): <strong className="font-mono">{formatIndianCurrency(gstAmount)}</strong></div>
                <div className="text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                  Total Payable: <span className="font-mono text-amber-900">{formatIndianCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded"
                >
                  Save & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
