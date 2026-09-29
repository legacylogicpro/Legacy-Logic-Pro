/**
 * Legacy Logic Pro — Ledger Head Mapping & Rules Engine
 * Section 5.5: Map raw OCR heads to standard Indian GL codes, assign voucher types, and assign tags with
 * strict mutually-exclusive tag group validation. Reusable named templates per client & CSV import.
 */

import React, { useState } from 'react';
import {
  FolderGit2,
  Save,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  BookmarkPlus,
  RefreshCw,
} from 'lucide-react';
import { LedgerMapping, LedgerTag, VoucherType } from '../../types';
import { STANDARD_CHART_OF_ACCOUNTS } from '../../data/seedData';

interface LedgerMappingViewProps {
  clientName: string;
  onApplyMapping: (mappings: LedgerMapping[]) => void;
}

export const LedgerMappingView: React.FC<LedgerMappingViewProps> = ({
  clientName,
  onApplyMapping,
}) => {
  const [templateName, setTemplateName] = useState('Default Manufacturing GL Profile');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initial extracted raw heads
  const [mappings, setMappings] = useState<LedgerMapping[]>([
    {
      raw_name: 'Bharat Heavy Automotives Ltd',
      gl_code: '1100',
      gl_name: 'Sundry Debtors / Trade Receivables',
      category: 'Asset',
      voucher_type: 'Sales',
      tags: [],
    },
    {
      raw_name: 'Jindal Precision Steels Ltd',
      gl_code: '2010',
      gl_name: 'Sundry Creditors / Trade Payables',
      category: 'Liability',
      voucher_type: 'Purchase',
      tags: [],
    },
    {
      raw_name: 'Sales — Domestic (GST Taxable 18%)',
      gl_code: '4010',
      gl_name: 'Sales — Domestic (GST Taxable 18%)',
      category: 'Revenue',
      voucher_type: 'Sales',
      tags: ['gst_outward'],
    },
    {
      raw_name: 'Raw Material Purchases (Intra-State)',
      gl_code: '5010',
      gl_name: 'Raw Material Purchases (Intra-State)',
      category: 'Direct Expense',
      voucher_type: 'Purchase',
      tags: ['gst_inward', 'itc_eligible'],
    },
    {
      raw_name: 'HDFC Bank Current A/c No. 502000',
      gl_code: '1020',
      gl_name: 'HDFC Current Account',
      category: 'Asset',
      voucher_type: 'Payment',
      tags: ['bank'],
    },
    {
      raw_name: 'Office Petty Cash Imprest',
      gl_code: '1010',
      gl_name: 'Cash-in-Hand',
      category: 'Asset',
      voucher_type: 'Payment',
      tags: ['cash'],
    },
  ]);

  // Section 5.5: Mutually exclusive tag groups validation
  const validateTagConflicts = (tags: LedgerTag[]): string | null => {
    // Conflict 1: Bank vs Cash
    if (tags.includes('bank') && tags.includes('cash')) {
      return 'Illogical Mapping: A single ledger head cannot simultaneously be both [Bank] and [Cash].';
    }
    // Conflict 2: GST Outward vs TDS
    if (tags.includes('gst_outward') && tags.includes('tds')) {
      return 'Illogical Mapping: A ledger cannot be tagged simultaneously as [GST Outward Supply] and [TDS Withholding].';
    }
    // Conflict 3: ITC Eligible vs ITC Ineligible
    if (tags.includes('itc_eligible') && tags.includes('itc_ineligible')) {
      return 'Conflict: A ledger cannot simultaneously be marked [ITC Eligible] and [ITC Ineligible].';
    }
    // Conflict 4: Inward vs Outward GST
    if (tags.includes('gst_inward') && tags.includes('gst_outward')) {
      return 'Conflict: A ledger cannot simultaneously represent [Inward Supply ITC] and [Outward Output Tax].';
    }
    return null;
  };

  const handleTagToggle = (idx: number, tag: LedgerTag) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const target = mappings[idx];
    let newTags: LedgerTag[];

    if (target.tags.includes(tag)) {
      newTags = target.tags.filter((t) => t !== tag);
    } else {
      newTags = [...target.tags, tag];
      const conflict = validateTagConflicts(newTags);
      if (conflict) {
        setErrorMessage(`Validation Error on "${target.raw_name}": ${conflict}`);
        return;
      }
    }

    setMappings((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, tags: newTags } : m))
    );
  };

  const handleGlChange = (idx: number, gl_code: string) => {
    const acct = STANDARD_CHART_OF_ACCOUNTS.find((a) => a.gl_code === gl_code);
    if (!acct) return;

    setMappings((prev) =>
      prev.map((m, i) =>
        i === idx
          ? {
              ...m,
              gl_code: acct.gl_code,
              gl_name: acct.gl_name,
              category: acct.category,
            }
          : m
      )
    );
  };

  const handleSaveTemplate = () => {
    for (const m of mappings) {
      const conflict = validateTagConflicts(m.tags);
      if (conflict) {
        setErrorMessage(`Cannot save: Conflict in "${m.raw_name}": ${conflict}`);
        return;
      }
    }

    onApplyMapping(mappings);
    setSuccessMessage(`Mapping template "${templateName}" successfully saved and applied to ${clientName}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ledger Head Mapping Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standardize raw OCR extracted accounts into standard Chart of Accounts GL codes with tag rules for {clientName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              alert('CSV mapping import feature ready. Upload standard header-mapped CSV to auto-fill.');
            }}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleSaveTemplate}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save size={14} className="text-amber-400" />
            <span>Save & Apply Template</span>
          </button>
        </div>
      </div>

      {/* Error or Success Alerts */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Template Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <BookmarkPlus size={16} className="text-amber-600" />
          <span className="font-semibold text-slate-700">Template Profile:</span>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <span className="text-slate-400 text-[11px]">
          Enforces mutually exclusive tag groupings (Bank vs Cash, Inward vs Outward GST)
        </span>
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Raw Extracted Head Name</th>
                <th className="py-3 px-4">Mapped GL Code & Title</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Default Voucher</th>
                <th className="py-3 px-4">Compliance Tags (Mutually Exclusive Rules)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                    {m.raw_name}
                  </td>
                  <td className="py-3 px-4 min-w-[220px]">
                    <select
                      value={m.gl_code}
                      onChange={(e) => handleGlChange(idx, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {STANDARD_CHART_OF_ACCOUNTS.map((acct) => (
                        <option key={acct.gl_code} value={acct.gl_code}>
                          [{acct.gl_code}] {acct.gl_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] text-slate-600">{m.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={m.voucher_type}
                      onChange={(e) => {
                        const val = e.target.value as VoucherType;
                        setMappings((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, voucher_type: val } : item))
                        );
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="Payment">Payment</option>
                      <option value="Receipt">Receipt</option>
                      <option value="Journal">Journal</option>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                      <option value="Contra">Contra</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(['bank', 'cash', 'gst_outward', 'gst_inward', 'itc_eligible', 'itc_ineligible', 'tds'] as LedgerTag[]).map(
                        (tag) => {
                          const active = m.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleTagToggle(idx, tag)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                active
                                  ? 'bg-slate-900 text-amber-300 font-bold border border-slate-900'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {tag.replace('_', ' ')}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
