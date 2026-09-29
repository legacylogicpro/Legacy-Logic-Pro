/**
 * Legacy Logic Pro — Core Data Types & Schemas
 * Typed field-for-field matching FastAPI Pydantic models
 */

import { UserRole } from '../lib/permissions';

export type PlanType = 'starter' | 'pro' | 'elite';

export interface Workspace {
  id: string;
  name: string;
  plan: PlanType;
  seat_limit: number;
  uploads_used_this_month: number;
  plan_activated_at: string;
  plan_expires_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  invited_by: string;
  invited_at: string;
  joined_at: string;
}

export type EntityType = 'individual' | 'proprietorship' | 'partnership' | 'llp' | 'company';

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  entity_type: EntityType;
  gstin: string;
  pan: string;
  created_at: string;
}

export type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase' | 'Contra';

export interface VoucherLine {
  id: string;
  ledger_id: string;
  ledger_name: string;
  gl_code?: string;
  debit: number;
  credit: number;
  party_name?: string;
  gstin?: string;
  gst_rate?: number;
  tds_section?: string;
}

export interface AnomalyItem {
  code: string;
  type: 'rule_based' | 'ai_assisted';
  severity: 'warning' | 'error';
  title: string;
  description: string;
  voucher_id?: string;
  voucher_no?: string;
}

export interface VoucherEntry {
  id: string;
  voucher_no: string;
  voucher_type: VoucherType;
  date: string; // ISO 8601 YYYY-MM-DD
  narration: string;
  source: 'uploaded_ocr' | 'manual';
  is_reviewed?: boolean;
  reviewer_name?: string;
  review_notes?: string;
  reviewed_at?: string;
  lines: VoucherLine[];
  raw_text?: string;
  anomalies?: AnomalyItem[];
}

export type LedgerTag =
  | 'gst_outward'
  | 'gst_inward'
  | 'itc_eligible'
  | 'itc_ineligible'
  | 'tds'
  | 'bank'
  | 'cash';

export interface LedgerMapping {
  raw_name: string;
  gl_code: string;
  gl_name: string;
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Direct Expense' | 'Indirect Expense' | 'Duties & Taxes';
  voucher_type: VoucherType;
  tags: LedgerTag[];
}

export interface LedgerTemplate {
  id: string;
  client_id: string;
  name: string;
  mappings: LedgerMapping[];
  created_at: string;
}

export interface ClientRule {
  id: string;
  client_id: string;
  rule_type: 'validation' | 'auto_correct' | 'gst_check' | 'voucher_match';
  name: string;
  is_active: boolean;
  priority: number;
  config: {
    condition?: 'amount_gt' | 'amount_lt' | 'field_empty' | 'gstin_missing' | 'voucher_type_missing' | 'date_outside_fy';
    field?: string;
    threshold?: number;
    severity?: 'warning' | 'error';
    find_text?: string;
    replace_text?: string;
    case_sensitive?: boolean;
    check_type?: 'cgst_sgst_mismatch' | 'rate_mismatch' | 'missing_gstin_high_val' | 'itc_ineligibility';
    action?: 'flag' | 'auto_correct' | 'reject';
    pattern_type?: 'contains' | 'starts_with' | 'ends_with' | 'regex';
    pattern_text?: string;
    assign_voucher_type?: VoucherType;
  };
}

export interface PracticeTask {
  id: string;
  workspace_id: string;
  client_id: string;
  client_name?: string;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee_name?: string;
  due_date: string; // YYYY-MM-DD
  status: 'pending' | 'in_progress' | 'done' | 'overdue';
  compliance_type?: string;
  created_at: string;
}

export interface ComplianceDueDate {
  id: string;
  code: string;
  title: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  applicable_entity_types: EntityType[];
  due_day_or_date: string; // e.g. "11th of month" or "31-07"
  description: string;
  section_or_form: string;
}

export interface FixedAsset {
  id: string;
  client_id: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  cost: number;
  it_act_rate: number; // e.g. 15, 40
  days_used_in_fy: number; // >= 180 gets full year depreciation, < 180 gets 50%
  created_at: string;
}

export interface ChapterVIADeduction {
  id: string;
  client_id: string;
  financial_year: string;
  section: string; // 80C, 80D, 80G, etc.
  description: string;
  amount: number;
}

export interface BRSLineItem {
  id: string;
  reconciliation_id: string;
  category: 'cheque_issued_not_presented' | 'cheque_deposited_not_cleared' | 'bank_charges_not_recorded' | 'interest_not_recorded' | 'other';
  description: string;
  amount: number;
  is_addition: boolean;
}

export interface BankReconciliation {
  id: string;
  client_id: string;
  bank_ledger_id: string;
  bank_ledger_name: string;
  as_of_date: string;
  book_balance: number;
  bank_statement_balance: number;
  unreconciled_difference: number;
  is_finalized: boolean;
  finalized_by?: string;
  finalized_at?: string;
  items: BRSLineItem[];
}

export interface FirmBillingProfile {
  firm_name: string;
  address: string;
  gstin: string;
  pan: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  contact_email: string;
  contact_phone: string;
}

export interface FeeItem {
  id: string;
  description: string;
  default_amount: number;
  is_taxable: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  items: InvoiceItem[];
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  client_id?: string;
  client_name?: string;
  details: string;
  created_at: string;
}

export interface ProcessingOptions {
  autoCorrectMisalignedColumns: boolean;
  flagDuplicateEntries: boolean;
  separateGstEntries: boolean;
  enableAIAssistant: boolean;
}

export interface ProcessingResultSummary {
  entries_extracted: number;
  auto_corrections_made: number;
  duplicates_found: number;
  anomalies_flagged: number;
  gst_entries_separated: number;
  vouchers: VoucherEntry[];
}
