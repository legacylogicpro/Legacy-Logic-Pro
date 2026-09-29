/**
 * Legacy Logic Pro — Master Root Application
 * Full-stack CA Document Intelligence & Practice Management Platform for India
 */

import React, { useState } from 'react';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { FloatingAIAssistant } from './components/ai/FloatingAIAssistant';

// View Components
import { DashboardView } from './components/views/DashboardView';
import { DocumentUploadView } from './components/views/DocumentUploadView';
import { ClientsView } from './components/views/ClientsView';
import { ManualVoucherEntryView } from './components/views/ManualVoucherEntryView';
import { DayBookView } from './components/views/DayBookView';
import { LedgerMappingView } from './components/views/LedgerMappingView';
import { TrialBalanceView } from './components/views/TrialBalanceView';
import { LedgerDrilldownView } from './components/views/LedgerDrilldownView';
import { ScheduleIIIView } from './components/views/ScheduleIIIView';
import { AgeingView } from './components/views/AgeingView';
import { ComparativeView } from './components/views/ComparativeView';
import { GSTModuleView } from './components/views/GSTModuleView';
import { TDSModuleView } from './components/views/TDSModuleView';
import { DepreciationView } from './components/views/DepreciationView';
import { IncomeTaxView } from './components/views/IncomeTaxView';
import { BankReconciliationView } from './components/views/BankReconciliationView';
import { RulesEngineView } from './components/views/RulesEngineView';
import { PracticeWorkflowView } from './components/views/PracticeWorkflowView';
import { ClientMISView } from './components/views/ClientMISView';
import { FirmBillingView } from './components/views/FirmBillingView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SettingsView } from './components/views/SettingsView';
import { PlansPricingView } from './components/views/PlansPricingView';

// Seed & Type Data
import {
  INITIAL_CLIENTS,
  INITIAL_MEMBERS,
  INITIAL_TASKS,
  INITIAL_WORKSPACE,
  SAMPLE_VOUCHERS,
} from './data/seedData';
import {
  AuditLogEntry,
  Client,
  PracticeTask,
  ProcessingResultSummary,
  VoucherEntry,
  Workspace,
  WorkspaceMember,
} from './types';
import { UserRole } from './lib/permissions';
import { computeGSTSummary, computeTrialBalance } from './services/financialEngine';

export default function App() {
  // Navigation & UI State
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // User & Workspace State
  const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);
  const [members, setMembers] = useState<WorkspaceMember[]>(INITIAL_MEMBERS);
  const [userRole, setUserRole] = useState<UserRole>('firm_owner_admin'); // Role switcher available in header
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>(INITIAL_CLIENTS[0].id);

  // Stateless Financial Session Data (In-Memory Pool)
  const [vouchers, setVouchers] = useState<VoucherEntry[]>(SAMPLE_VOUCHERS);
  const [tasks, setTasks] = useState<PracticeTask[]>(INITIAL_TASKS);

  // Session-Gated AI Toggle (Section 5.4 strictly defaulted to OFF)
  const [enableAI, setEnableAI] = useState<boolean>(false);

  // Immutable Audit Trail State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-01',
      workspace_id: 'ws-delhi-001',
      user_id: 'usr-1',
      user_email: 'ca.mehta@msa-advisors.in',
      action_type: 'USER_SIGNIN',
      details: 'Principal Partner authenticated via Supabase Auth JWT',
      created_at: '2026-09-29T10:00:00Z',
    },
    {
      id: 'log-02',
      workspace_id: 'ws-delhi-001',
      user_id: 'usr-2',
      user_email: 'priya.singhal@msa-advisors.in',
      action_type: 'DOCUMENT_EXTRACTION',
      client_id: 'cli-apex-01',
      client_name: 'Apex Industrial Gears Pvt Ltd',
      details: 'Extracted 7 vouchers from Bank Statement Sept 2026; 2 anomalies flagged',
      created_at: '2026-09-29T10:14:00Z',
    },
    {
      id: 'log-03',
      workspace_id: 'ws-delhi-001',
      user_id: 'usr-1',
      user_email: 'ca.mehta@msa-advisors.in',
      action_type: 'BRS_FINALIZATION',
      client_id: 'cli-apex-01',
      client_name: 'Apex Industrial Gears Pvt Ltd',
      details: 'BRS for HDFC Current A/c finalized and audit locked with ₹0.00 difference',
      created_at: '2026-09-29T11:30:00Z',
    },
  ]);

  const recordAuditLog = (actionType: string, details: string, clientName?: string) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      workspace_id: workspace.id,
      user_id: 'usr-1',
      user_email: members.find((m) => m.role === userRole)?.email || 'firm.associate@msa-advisors.in',
      action_type: actionType,
      client_name: clientName,
      details,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // Document Ingestion Handler
  const handleProcessingComplete = (summary: ProcessingResultSummary) => {
    setVouchers((prev) => [...summary.vouchers, ...prev]);
    setWorkspace((prev) => ({
      ...prev,
      uploads_used_this_month: prev.uploads_used_this_month + 1,
    }));
    recordAuditLog(
      'DOCUMENT_EXTRACTION',
      `Processed batch: ${summary.entries_extracted} vouchers extracted, ${summary.anomalies_flagged} anomalies flagged, ${summary.auto_corrections_made} auto-corrections.`,
      selectedClient.name
    );
  };

  // Manual Voucher Handler
  const handleSaveManualVoucher = (newVoucher: VoucherEntry) => {
    setVouchers((prev) => [newVoucher, ...prev]);
    recordAuditLog(
      'MANUAL_VOUCHER_ENTRY',
      `Manual ${newVoucher.voucher_type} voucher #${newVoucher.voucher_no} posted for ${selectedClient.name}.`,
      selectedClient.name
    );
  };

  // Delete Manual Voucher Handler
  const handleDeleteVoucher = (voucherId: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
    recordAuditLog('VOUCHER_DELETED', `Manual voucher ID ${voucherId} deleted from session pool.`);
  };

  // Persistent Audit Review Notes Handler (Section 5.7)
  const handleUpdateVoucherReview = (voucherId: string, reviewerName: string, notes: string) => {
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === voucherId
          ? {
              ...v,
              is_reviewed: true,
              reviewer_name: reviewerName,
              review_notes: notes,
              reviewed_at: new Date().toISOString(),
            }
          : v
      )
    );
    recordAuditLog('AUDIT_ENTRY_REVIEWED', `Voucher ID ${voucherId} marked reviewed with auditor notes.`);
  };

  // Client Management Handlers
  const handleAddClient = (newClientData: Omit<Client, 'id' | 'created_at'>) => {
    const createdClient: Client = {
      ...newClientData,
      id: `cli-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setClients((prev) => [createdClient, ...prev]);
    setSelectedClientId(createdClient.id);
    recordAuditLog('CLIENT_CREATED', `Client practice profile created for ${createdClient.name}.`, createdClient.name);
  };

  const handleDeleteClient = (clientId: string) => {
    const clientName = clients.find((c) => c.id === clientId)?.name;
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (selectedClientId === clientId && clients.length > 1) {
      setSelectedClientId(clients.find((c) => c.id !== clientId)!.id);
    }
    recordAuditLog('CLIENT_DELETED', `Client practice profile deleted for ${clientName}.`, clientName);
  };

  // Practice Tasks Handlers
  const handleAddTask = (newTask: PracticeTask) => {
    setTasks((prev) => [newTask, ...prev]);
    recordAuditLog('TASK_ASSIGNED', `Task "${newTask.title}" assigned to ${newTask.assignee_name}.`, newTask.client_name);
  };

  const handleUpdateTaskStatus = (taskId: string, status: PracticeTask['status']) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleBatchGenerateTasks = (newTasks: PracticeTask[]) => {
    setTasks((prev) => [...newTasks, ...prev]);
    recordAuditLog('COMPLIANCE_TASKS_GENERATED', `Batch generated ${newTasks.length} statutory compliance tasks.`);
  };

  // Team Member Handlers
  const handleInviteMember = (newMemberData: Omit<WorkspaceMember, 'id' | 'invited_at' | 'joined_at'>) => {
    const member: WorkspaceMember = {
      ...newMemberData,
      id: `mem-${Date.now()}`,
      invited_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, member]);
    recordAuditLog('MEMBER_INVITED', `Invited associate ${member.email} with role ${member.role}.`);
  };

  const handleUpdateMemberRole = (memberId: string, newRole: UserRole) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    recordAuditLog('MEMBER_ROLE_CHANGED', `Changed member ID ${memberId} role to ${newRole}.`);
  };

  const handleToggleMemberActive = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_active: !m.is_active } : m))
    );
  };

  // Context bundle for AI queries
  const aiSessionData = {
    clientName: selectedClient?.name,
    vouchers: vouchers,
    trialBalance: computeTrialBalance(vouchers),
    gst: computeGSTSummary(vouchers),
    anomalies: vouchers.flatMap((v) => v.anomalies || []),
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Persistent Collapsible Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Persistent Top Header */}
        <TopBar
          workspace={workspace}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          userRole={userRole}
          onChangeUserRole={setUserRole}
          enableAI={enableAI}
          onOpenUpload={() => setCurrentTab('upload')}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          {currentTab === 'dashboard' && (
            <DashboardView
              workspace={workspace}
              members={members}
              clients={clients}
              vouchers={vouchers}
              tasks={tasks}
              userRole={userRole}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'upload' && (
            <DocumentUploadView
              workspace={workspace}
              enableAI={enableAI}
              onToggleAI={setEnableAI}
              onProcessingComplete={handleProcessingComplete}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'clients' && (
            <ClientsView
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              userRole={userRole}
            />
          )}

          {currentTab === 'voucher_entry' && (
            <ManualVoucherEntryView
              onSaveVoucher={handleSaveManualVoucher}
              onNavigate={setCurrentTab}
              existingVouchersCount={vouchers.length}
            />
          )}

          {currentTab === 'daybook' && (
            <DayBookView
              vouchers={vouchers}
              clientName={selectedClient.name}
              onNavigate={setCurrentTab}
              onDeleteVoucher={handleDeleteVoucher}
            />
          )}

          {currentTab === 'ledger_mapping' && (
            <LedgerMappingView
              clientName={selectedClient.name}
              onApplyMapping={() => recordAuditLog('MAPPING_UPDATE', `Template applied for ${selectedClient.name}`, selectedClient.name)}
            />
          )}

          {currentTab === 'trial_balance' && (
            <TrialBalanceView
              vouchers={vouchers}
              clientName={selectedClient.name}
            />
          )}

          {currentTab === 'ledger_drilldown' && (
            <LedgerDrilldownView
              vouchers={vouchers}
              clientName={selectedClient.name}
              userRole={userRole}
              onUpdateVoucherReview={handleUpdateVoucherReview}
            />
          )}

          {currentTab === 'schedule_iii' && (
            <ScheduleIIIView
              vouchers={vouchers}
              clientName={selectedClient.name}
            />
          )}

          {currentTab === 'ageing' && (
            <AgeingView
              vouchers={vouchers}
              clientName={selectedClient.name}
            />
          )}

          {currentTab === 'comparative' && (
            <ComparativeView clientName={selectedClient.name} />
          )}

          {currentTab === 'gst' && (
            <GSTModuleView
              vouchers={vouchers}
              clientName={selectedClient.name}
            />
          )}

          {currentTab === 'tds' && (
            <TDSModuleView
              vouchers={vouchers}
              clientName={selectedClient.name}
            />
          )}

          {currentTab === 'depreciation' && (
            <DepreciationView
              clientName={selectedClient.name}
              userRole={userRole}
            />
          )}

          {currentTab === 'income_tax' && (
            <IncomeTaxView
              vouchers={vouchers}
              client={selectedClient}
            />
          )}

          {currentTab === 'brs' && (
            <BankReconciliationView
              vouchers={vouchers}
              clientName={selectedClient.name}
              userRole={userRole}
            />
          )}

          {currentTab === 'tasks' && (
            <PracticeWorkflowView
              tasks={tasks}
              clients={clients}
              userRole={userRole}
              onAddTask={handleAddTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
              onBatchGenerateTasks={handleBatchGenerateTasks}
            />
          )}

          {currentTab === 'client_mis' && (
            <ClientMISView
              client={selectedClient}
              vouchers={vouchers}
              tasks={tasks}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'rules_engine' && (
            <RulesEngineView clientName={selectedClient.name} />
          )}

          {currentTab === 'firm_billing' && (
            <FirmBillingView
              clients={clients}
              userRole={userRole}
            />
          )}

          {currentTab === 'audit_trail' && (
            <AuditTrailView logs={auditLogs} clients={clients} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              workspace={workspace}
              members={members}
              userRole={userRole}
              onInviteMember={handleInviteMember}
              onUpdateMemberRole={handleUpdateMemberRole}
              onToggleMemberActive={handleToggleMemberActive}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'plans_pricing' && (
            <PlansPricingView onBackToApp={() => setCurrentTab('dashboard')} />
          )}
        </main>

        {/* Floating AI Assistant (Section 5.13: strictly gated by session opt-in toggle!) */}
        <FloatingAIAssistant
          enableAI={enableAI}
          sessionData={aiSessionData}
          workspaceId={workspace.id}
        />
      </div>
    </div>
  );
}
