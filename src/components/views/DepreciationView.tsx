/**
 * Legacy Logic Pro — Fixed Asset Register & IT Act WDV Depreciation Schedule
 * Section 5.10: Fixed asset register per client, computed WDV schedule following Indian IT Act conventions
 * (full-year vs half-year rate based on 180-day threshold), feeding into Profit & Loss statement.
 */

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
} from 'lucide-react';
import { FixedAsset } from '../../types';
import { computeDepreciationWDV } from '../../services/financialEngine';
import { formatIndianCurrency, formatIndianDate } from '../../lib/formatters';
import { hasPermission, UserRole } from '../../lib/permissions';

interface DepreciationViewProps {
  clientName: string;
  userRole: UserRole;
}

export const DepreciationView: React.FC<DepreciationViewProps> = ({
  clientName,
  userRole,
}) => {
  const [assets, setAssets] = useState<FixedAsset[]>([
    {
      id: 'fa-1',
      client_id: 'cli-apex-01',
      asset_name: 'CNC Lathe Machine (Plant Block)',
      category: 'Plant & Machinery',
      purchase_date: '2026-05-10',
      cost: 450000,
      it_act_rate: 15,
      days_used_in_fy: 320, // > 180 days -> full 15%
      created_at: '2026-05-10T10:00:00Z',
    },
    {
      id: 'fa-2',
      client_id: 'cli-apex-01',
      asset_name: 'Dell Precision Workstations (4 Units)',
      category: 'Computers & IT',
      purchase_date: '2026-11-20',
      cost: 280000,
      it_act_rate: 40,
      days_used_in_fy: 130, // < 180 days -> half rate 20%
      created_at: '2026-11-20T14:00:00Z',
    },
    {
      id: 'fa-3',
      client_id: 'cli-apex-01',
      asset_name: 'Executive Office Furniture & Fixtures',
      category: 'Furniture',
      purchase_date: '2026-04-15',
      cost: 120000,
      it_act_rate: 10,
      days_used_in_fy: 345, // > 180 days -> full 10%
      created_at: '2026-04-15T11:00:00Z',
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    asset_name: '',
    category: 'Plant & Machinery',
    purchase_date: '2026-06-01',
    cost: 100000,
    it_act_rate: 15,
    days_used_in_fy: 250,
  });

  const canAddAsset = hasPermission(userRole, 'add_fixed_assets');
  const result = computeDepreciationWDV(assets);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.asset_name) return;

    const item: FixedAsset = {
      id: `fa-${Date.now()}`,
      client_id: 'cli-apex-01',
      asset_name: newAsset.asset_name,
      category: newAsset.category,
      purchase_date: newAsset.purchase_date,
      cost: Number(newAsset.cost),
      it_act_rate: Number(newAsset.it_act_rate),
      days_used_in_fy: Number(newAsset.days_used_in_fy),
      created_at: new Date().toISOString(),
    };

    setAssets((prev) => [...prev, item]);
    setIsAddOpen(false);
    setNewAsset({
      asset_name: '',
      category: 'Plant & Machinery',
      purchase_date: '2026-06-01',
      cost: 100000,
      it_act_rate: 15,
      days_used_in_fy: 250,
    });
  };

  const handleDelete = (id: string) => {
    if (!canAddAsset) return;
    if (confirm('Delete this asset from the fixed asset register?')) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fixed Asset Register & WDV Schedule</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Income Tax Act, 1961 depreciation computation with 180-day rule enforcement for {clientName}.
          </p>
        </div>

        {canAddAsset ? (
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} className="text-amber-400" />
            <span>Add Fixed Asset</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            (Owner/Senior role required to add fixed assets)
          </span>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-slate-500">Total Gross Asset Block Cost</span>
          <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
            {formatIndianCurrency(assets.reduce((s, a) => s + a.cost, 0))}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{assets.length} registered asset blocks</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200">
          <span className="text-amber-900 font-medium">Computed IT Act Depreciation</span>
          <div className="text-xl font-bold text-amber-950 font-mono mt-0.5">
            {formatIndianCurrency(result.total_depreciation)}
          </div>
          <span className="text-[11px] text-amber-800">Feeds into P&L and ITR tax computation</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-200">
          <span className="text-emerald-800 font-medium">Closing WDV as at 31-03-2027</span>
          <div className="text-xl font-bold text-emerald-950 font-mono mt-0.5">
            {formatIndianCurrency(result.total_closing_wdv)}
          </div>
          <span className="text-[11px] text-emerald-700">Balance Sheet net carrying value</span>
        </div>
      </div>

      {/* 180-Day Rule Notice */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-center gap-2">
        <AlertCircle size={16} className="text-amber-600 shrink-0" />
        <span>
          <strong>Section 32 Convention:</strong> Assets put to use for fewer than 180 days during the year of acquisition are restricted to 50% of the prescribed depreciation block rate.
        </span>
      </div>

      {/* WDV Schedule Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <th className="py-3 px-4">Asset Description</th>
                <th className="py-3 px-4">Block Category</th>
                <th className="py-3 px-4">Acquisition Date</th>
                <th className="py-3 px-4 text-right">Cost (₹)</th>
                <th className="py-3 px-4 text-center">Days Used</th>
                <th className="py-3 px-4 text-right">Block Rate</th>
                <th className="py-3 px-4 text-right font-bold">Depreciation (₹)</th>
                <th className="py-3 px-4 text-right font-bold">Closing WDV (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.schedules.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.asset_name}</td>
                  <td className="py-3 px-4 text-slate-600">{item.category}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{formatIndianDate(item.purchase_date)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    {formatIndianCurrency(item.cost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${
                        item.is_half_rate ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {item.days_used} d {item.is_half_rate && '(50% Rate)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {item.applicable_rate}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-900">
                    {formatIndianCurrency(item.depreciation_amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-900">
                    {formatIndianCurrency(item.closing_wdv)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canAddAsset && (
                      <button
                        onClick={() => handleDelete(assets[idx]?.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Delete asset"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                <td className="py-3 px-4" colSpan={3}>
                  TOTALS (WDV SCHEDULE)
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                  {formatIndianCurrency(assets.reduce((s, a) => s + a.cost, 0))}
                </td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-right font-mono">-</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-amber-900">
                  {formatIndianCurrency(result.total_depreciation)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-900">
                  {formatIndianCurrency(result.total_closing_wdv)}
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4">
              <h3 className="font-bold text-sm">Add Fixed Asset to Register</h3>
              <p className="text-[11px] text-slate-400">Section 32 WDV Depreciation Tracking</p>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Asset Name / Description *</label>
                <input
                  type="text"
                  required
                  value={newAsset.asset_name}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                  placeholder="e.g. Injection Moulding Machine"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category Block</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Plant & Machinery">Plant & Machinery (15%)</option>
                    <option value="Computers & IT">Computers & IT (40%)</option>
                    <option value="Furniture">Furniture & Fixtures (10%)</option>
                    <option value="Motor Vehicles">Motor Vehicles (15% / 30%)</option>
                    <option value="Buildings">Buildings (10%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Block Rate (%)</label>
                  <input
                    type="number"
                    value={newAsset.it_act_rate}
                    onChange={(e) => setNewAsset({ ...newAsset, it_act_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Acquisition Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newAsset.cost}
                    onChange={(e) => setNewAsset({ ...newAsset, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Days Used in FY</label>
                  <input
                    type="number"
                    value={newAsset.days_used_in_fy}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, days_used_in_fy: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="e.g. 250"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
