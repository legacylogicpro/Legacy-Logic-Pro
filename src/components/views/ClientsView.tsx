/**
 * Legacy Logic Pro — Client Workspace Management
 * Section 5.3: List, search, add via centered modal dialog, detail view with tabs (Overview, Templates, Rules, Audit History),
 * delete with confirmation, and strict role checks.
 */

import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building,
  Mail,
  Phone,
  Trash2,
  FileText,
  Sliders,
  History,
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Client, EntityType } from '../../types';
import { hasPermission, UserRole } from '../../lib/permissions';

interface ClientsViewProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  onAddClient: (newClient: Omit<Client, 'id' | 'created_at'>) => void;
  onDeleteClient: (id: string) => void;
  userRole: UserRole;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  onDeleteClient,
  userRole,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'rules' | 'audit'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New Client Form State
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    entity_type: 'company' as EntityType,
    gstin: '',
    pan: '',
  });

  const canManageClients = hasPermission(userRole, 'create_delete_clients');

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.pan.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  const handleSubmitNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pan) {
      alert('Client Name and PAN are mandatory fields.');
      return;
    }
    onAddClient({
      workspace_id: selectedClient?.workspace_id || 'ws-delhi-001',
      name: formData.name,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      entity_type: formData.entity_type,
      gstin: formData.gstin.toUpperCase(),
      pan: formData.pan.toUpperCase(),
    });
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      entity_type: 'company',
      gstin: '',
      pan: '',
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Practice Profiles</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scoped multi-tenant profiles for corporate, LLP, and proprietorship engagements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, GSTIN, PAN..."
              className="bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-64"
            />
          </div>

          {canManageClients ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={15} className="text-amber-400" />
              <span>Add Client</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              (Owner/Senior role required to add clients)
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Client List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Client List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <div className="p-3 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Active Client Entities ({filteredClients.length})
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const isSelected = client.id === selectedClientId;
              return (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/70 border-l-4 border-amber-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">{client.name}</h3>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="uppercase text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {client.entity_type}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-700">{client.pan}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Client Detail Tabs */}
        {selectedClient && (
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedClient.name}</h2>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-medium uppercase">{selectedClient.entity_type}</span>
                  <span aria-hidden="true">·</span>
                  <span>GSTIN: <strong className="font-mono text-slate-700">{selectedClient.gstin || 'Unregistered'}</strong></span>
                </div>
              </div>

              {canManageClients && (
                <button
                  onClick={() => setDeleteConfirmId(selectedClient.id)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 self-start"
                >
                  <Trash2 size={14} />
                  <span>Delete Client</span>
                </button>
              )}
            </div>

            {/* Sub-Tabs (Overview, Ledger Templates, Rules, Audit History) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ledger Templates
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Client Rules Engine
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
                  activeTab === 'audit'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Audit History
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 font-medium">Permanent Account Number (PAN)</span>
                    <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                      {selectedClient.pan}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 font-medium">Goods & Services Tax (GSTIN)</span>
                    <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                      {selectedClient.gstin || 'Composition / Unregistered'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 font-medium">Primary Contact Email</span>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedClient.contact_email || 'accounts@client.in'}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 font-medium">Contact Phone</span>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedClient.contact_phone || '+91 98110 00000'}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-900">
                  <h4 className="font-semibold text-xs mb-1">Chartered Accountant Practice Note</h4>
                  <p className="text-[11px] leading-relaxed">
                    This client’s financial entries are parsed in volatile server RAM on demand.
                    Every generated statement (Trial Balance, Schedule III, BRS, Form 16A) remains an internal
                    working paper until authorized by a Senior Associate or Firm Partner.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Ledger Templates */}
            {activeTab === 'templates' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Saved mapping templates automatically convert raw OCR extracted heads to standardized GL accounts for {selectedClient.name}.
                </p>
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">Standard Indian Manufacturing GL Template</h4>
                    <p className="text-[11px] text-slate-500">14 default head mappings · Updated FY 2026-27</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Active Default
                  </span>
                </div>
              </div>
            )}

            {/* Tab 3: Rules */}
            {activeTab === 'rules' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Custom validation rules, auto-correction patterns, and threshold triggers scoped to {selectedClient.name}.
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Section 269ST Cash Alert</div>
                      <div className="text-[11px] text-slate-500">Flag any cash payment or receipt $\ge$ ₹2,00,000</div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">ACTIVE</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">ITC Missing GSTIN Restriction</div>
                      <div className="text-[11px] text-slate-500">Mark inward invoices &gt; ₹50,000 without vendor GSTIN as Ineligible</div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">ACTIVE</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Audit History */}
            {activeTab === 'audit' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between">
                  <div>
                    <strong className="text-slate-800">Document Batch Ingestion</strong>
                    <div className="text-[11px] text-slate-500">Extracted 7 vouchers from Bank Statement Sept 2026</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Today, 10:14 AM</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between">
                  <div>
                    <strong className="text-slate-800">BRS Working Paper Finalized</strong>
                    <div className="text-[11px] text-slate-500">Closed with ₹0 difference by CA Rajesh Mehta</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">18 Sep 2026</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centered Modal Dialog for Adding Client (Section 5.3 strictly specifies centered modal dialog, not side drawer) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Add New Client Practice Profile</h3>
                <p className="text-[11px] text-slate-400">Firm practice record for compliance & working papers</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewClient} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Client / Trade Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Precision Motors Pvt Ltd"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as EntityType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="company">Private / Public Limited</option>
                    <option value="llp">Limited Liability Partnership (LLP)</option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Permanent Account No. (PAN) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAACA4512Q"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 07AAACA4512Q1Z5"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="accounts@company.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 98201 00000"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded transition-colors"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle size={22} />
              <h4 className="font-bold text-sm text-slate-900">Delete Client Profile?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this client workspace? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteClient(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-1.5 rounded"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
