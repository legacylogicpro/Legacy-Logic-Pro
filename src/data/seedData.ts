/**
 * Pre-loaded Indian Financial & Compliance Reference Data
 * Standard Indian Chart of Accounts GL Codes, TDS Sections, Due Dates, and Initial Workspace Data
 */

import { Client, ComplianceDueDate, FeeItem, FirmBillingProfile, PracticeTask, VoucherEntry, Workspace, WorkspaceMember } from '../types';

export interface ChartOfAccountItem {
  gl_code: string;
  gl_name: string;
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Direct Expense' | 'Indirect Expense' | 'Duties & Taxes';
  default_tags: string[];
}

export const STANDARD_CHART_OF_ACCOUNTS: ChartOfAccountItem[] = [
  // Assets (1000 - 1999)
  { gl_code: '1010', gl_name: 'Cash-in-Hand', category: 'Asset' as const, default_tags: ['cash'] },
  { gl_code: '1020', gl_name: 'HDFC Current Account', category: 'Asset' as const, default_tags: ['bank'] },
  { gl_code: '1021', gl_name: 'ICICI Bank Current A/c', category: 'Asset' as const, default_tags: ['bank'] },
  { gl_code: '1022', gl_name: 'State Bank of India OD A/c', category: 'Asset' as const, default_tags: ['bank'] },
  { gl_code: '1100', gl_name: 'Sundry Debtors / Trade Receivables', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1150', gl_name: 'Input CGST Receivable', category: 'Asset' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '1151', gl_name: 'Input SGST Receivable', category: 'Asset' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '1152', gl_name: 'Input IGST Receivable', category: 'Asset' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '1160', gl_name: 'TDS Receivable (FY 2024-25)', category: 'Asset' as const, default_tags: ['tds'] },
  { gl_code: '1200', gl_name: 'Stock-in-Trade / Inventory', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1500', gl_name: 'Plant & Machinery', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1510', gl_name: 'Computers & IT Equipment', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1520', gl_name: 'Office Furniture & Fixtures', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1530', gl_name: 'Motor Vehicles', category: 'Asset' as const, default_tags: [] },
  { gl_code: '1900', gl_name: 'Security Deposits & Advances', category: 'Asset' as const, default_tags: [] },

  // Liabilities (2000 - 2999)
  { gl_code: '2010', gl_name: 'Sundry Creditors / Trade Payables', category: 'Liability' as const, default_tags: [] },
  { gl_code: '2100', gl_name: 'Bank Term Loan', category: 'Liability' as const, default_tags: [] },
  { gl_code: '2110', gl_name: 'Working Capital / Cash Credit', category: 'Liability' as const, default_tags: ['bank'] },
  { gl_code: '2210', gl_name: 'Output CGST Payable', category: 'Liability' as const, default_tags: ['gst_outward'] },
  { gl_code: '2211', gl_name: 'Output SGST Payable', category: 'Liability' as const, default_tags: ['gst_outward'] },
  { gl_code: '2212', gl_name: 'Output IGST Payable', category: 'Liability' as const, default_tags: ['gst_outward'] },
  { gl_code: '2250', gl_name: 'TDS Payable u/s 194C (Contractors)', category: 'Liability' as const, default_tags: ['tds'] },
  { gl_code: '2251', gl_name: 'TDS Payable u/s 194J (Professionals)', category: 'Liability' as const, default_tags: ['tds'] },
  { gl_code: '2252', gl_name: 'TDS Payable u/s 194I (Rent)', category: 'Liability' as const, default_tags: ['tds'] },
  { gl_code: '2253', gl_name: 'TDS Payable u/s 192 (Salaries)', category: 'Liability' as const, default_tags: ['tds'] },
  { gl_code: '2300', gl_name: 'Salary & Wages Payable', category: 'Liability' as const, default_tags: [] },
  { gl_code: '2350', gl_name: 'Audit Fees Payable', category: 'Liability' as const, default_tags: [] },

  // Equity / Capital (3000 - 3999)
  { gl_code: '3010', gl_name: 'Equity Share Capital / Partner Capital', category: 'Equity' as const, default_tags: [] },
  { gl_code: '3050', gl_name: 'Retained Earnings / P&L Balance', category: 'Equity' as const, default_tags: [] },
  { gl_code: '3080', gl_name: 'Partners Drawings A/c', category: 'Equity' as const, default_tags: [] },

  // Revenue / Income (4000 - 4999)
  { gl_code: '4010', gl_name: 'Sales — Domestic (GST Taxable 18%)', category: 'Revenue' as const, default_tags: ['gst_outward'] },
  { gl_code: '4020', gl_name: 'Sales — Inter-State (IGST 18%)', category: 'Revenue' as const, default_tags: ['gst_outward'] },
  { gl_code: '4050', gl_name: 'Professional & Consulting Fees Received', category: 'Revenue' as const, default_tags: ['gst_outward'] },
  { gl_code: '4100', gl_name: 'Export of Goods / Services (Zero Rated)', category: 'Revenue' as const, default_tags: ['gst_outward'] },
  { gl_code: '4800', gl_name: 'Interest Income from Fixed Deposits', category: 'Revenue' as const, default_tags: [] },
  { gl_code: '4900', gl_name: 'Discount & Commission Received', category: 'Revenue' as const, default_tags: [] },

  // Direct Expenses (5000 - 5999)
  { gl_code: '5010', gl_name: 'Raw Material Purchases (Intra-State)', category: 'Direct Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '5020', gl_name: 'Raw Material Purchases (Inter-State)', category: 'Direct Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '5100', gl_name: 'Freight & Cartage Inwards', category: 'Direct Expense' as const, default_tags: ['gst_inward'] },
  { gl_code: '5200', gl_name: 'Direct Factory Wages', category: 'Direct Expense' as const, default_tags: [] },
  { gl_code: '5300', gl_name: 'Power & Fuel Charges', category: 'Direct Expense' as const, default_tags: [] },

  // Indirect Expenses (6000 - 6999)
  { gl_code: '6010', gl_name: 'Staff Salaries & Bonus', category: 'Indirect Expense' as const, default_tags: [] },
  { gl_code: '6050', gl_name: 'Office Rent & Maintenance', category: 'Indirect Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '6100', gl_name: 'Legal & Professional Charges', category: 'Indirect Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '6150', gl_name: 'Audit Fees', category: 'Indirect Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '6200', gl_name: 'Bank Charges & Processing Fees', category: 'Indirect Expense' as const, default_tags: [] },
  { gl_code: '6250', gl_name: 'Printing, Stationery & Courier', category: 'Indirect Expense' as const, default_tags: [] },
  { gl_code: '6300', gl_name: 'Telephone & Internet Expenses', category: 'Indirect Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '6400', gl_name: 'Depreciation as per Books', category: 'Indirect Expense' as const, default_tags: [] },
  { gl_code: '6500', gl_name: 'Advertising & Business Promotion', category: 'Indirect Expense' as const, default_tags: ['gst_inward', 'itc_eligible'] },
  { gl_code: '6600', gl_name: 'Travel & Conveyance', category: 'Indirect Expense' as const, default_tags: [] },
  { gl_code: '6700', gl_name: 'Interest on Bank Borrowings', category: 'Indirect Expense' as const, default_tags: [] },
];

export const TDS_SECTIONS_RATE_TABLE = [
  { section: '192', nature: 'Salary Payments', threshold: 250000, rate_individual: 0, rate_others: 0, description: 'Average income tax slab rates' },
  { section: '194A', nature: 'Interest other than on Securities', threshold: 40000, rate_individual: 10, rate_others: 10, description: 'Bank / NBFC interest payments' },
  { section: '194C', nature: 'Payment to Contractors / Sub-contractors', threshold: 30000, rate_individual: 1, rate_others: 2, description: '1% for Ind/HUF, 2% for others; single > 30k or aggregate > 1L' },
  { section: '194H', nature: 'Commission or Brokerage', threshold: 15000, rate_individual: 5, rate_others: 5, description: 'Commission / brokerage payments' },
  { section: '194I(a)', nature: 'Rent on Plant, Machinery or Equipment', threshold: 240000, rate_individual: 2, rate_others: 2, description: '2% on plant/machinery' },
  { section: '194I(b)', nature: 'Rent on Land or Building or Furniture', threshold: 240000, rate_individual: 10, rate_others: 10, description: '10% on office/factory building' },
  { section: '194J(a)', nature: 'Technical Services Fees', threshold: 30000, rate_individual: 2, rate_others: 2, description: '2% for FTS under IT Act' },
  { section: '194J(b)', nature: 'Professional Services Fees / Royalty', threshold: 30000, rate_individual: 10, rate_others: 10, description: '10% for professional services' },
  { section: '194Q', nature: 'Purchase of Goods (aggregate > 50 Lakhs)', threshold: 5000000, rate_individual: 0.1, rate_others: 0.1, description: '0.1% on purchase of goods' },
  { section: '195', nature: 'Payment to Non-Residents', threshold: 0, rate_individual: 20, rate_others: 20, description: 'Rates in force / DTAA rates' },
];

export const COMPLIANCE_DUE_DATES: ComplianceDueDate[] = [
  { id: 'c1', code: 'GSTR-1', title: 'GSTR-1 (Outward Supplies)', frequency: 'monthly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '11th of every month', description: 'Monthly statement of outward supplies for regular taxpayers', section_or_form: 'Form GSTR-1' },
  { id: 'c2', code: 'GSTR-3B', title: 'GSTR-3B (Summary Return & Tax Payment)', frequency: 'monthly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '20th of every month', description: 'Monthly self-declaration summary return and tax payment', section_or_form: 'Form GSTR-3B' },
  { id: 'c3', code: 'TDS_DEPOSIT', title: 'TDS Monthly Deposit (Challan ITNS 281)', frequency: 'monthly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '7th of every month', description: 'Deposit of tax deducted at source for preceding month', section_or_form: 'Challan 281' },
  { id: 'c4', code: 'TDS_26Q_Q1', title: 'Quarterly TDS Return Q1 (26Q / 24Q)', frequency: 'quarterly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '31st July', description: 'Quarter 1 TDS return for payments made April to June', section_or_form: 'Form 26Q/24Q' },
  { id: 'c5', code: 'TDS_26Q_Q2', title: 'Quarterly TDS Return Q2 (26Q / 24Q)', frequency: 'quarterly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '31st October', description: 'Quarter 2 TDS return for payments made July to September', section_or_form: 'Form 26Q/24Q' },
  { id: 'c6', code: 'TDS_26Q_Q3', title: 'Quarterly TDS Return Q3 (26Q / 24Q)', frequency: 'quarterly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '31st January', description: 'Quarter 3 TDS return for payments made October to December', section_or_form: 'Form 26Q/24Q' },
  { id: 'c7', code: 'TDS_26Q_Q4', title: 'Quarterly TDS Return Q4 (26Q / 24Q)', frequency: 'quarterly', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '31st May', description: 'Quarter 4 TDS return for payments made January to March', section_or_form: 'Form 26Q/24Q' },
  { id: 'c8', code: 'ADV_TAX_Q1', title: 'Advance Tax Installment 1 (15%)', frequency: 'quarterly', applicable_entity_types: ['individual', 'proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '15th June', description: 'First installment of advance income tax', section_or_form: 'Challan 280' },
  { id: 'c9', code: 'ADV_TAX_Q2', title: 'Advance Tax Installment 2 (45%)', frequency: 'quarterly', applicable_entity_types: ['individual', 'proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '15th September', description: 'Second installment of advance income tax', section_or_form: 'Challan 280' },
  { id: 'c10', code: 'ADV_TAX_Q3', title: 'Advance Tax Installment 3 (75%)', frequency: 'quarterly', applicable_entity_types: ['individual', 'proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '15th December', description: 'Third installment of advance income tax', section_or_form: 'Challan 280' },
  { id: 'c11', code: 'ADV_TAX_Q4', title: 'Advance Tax Installment 4 (100%)', frequency: 'quarterly', applicable_entity_types: ['individual', 'proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '15th March', description: 'Final installment of advance income tax', section_or_form: 'Challan 280' },
  { id: 'c12', code: 'ITR_NON_AUDIT', title: 'Income Tax Return (Non-Audit Cases)', frequency: 'annual', applicable_entity_types: ['individual', 'proprietorship', 'partnership'], due_day_or_date: '31st July', description: 'ITR filing for individuals and non-audit entities', section_or_form: 'ITR-1/2/3/4' },
  { id: 'c13', code: 'TAX_AUDIT_REPORT', title: 'Tax Audit Report u/s 44AB', frequency: 'annual', applicable_entity_types: ['proprietorship', 'partnership', 'llp', 'company'], due_day_or_date: '30th September', description: 'Furnishing of tax audit report by Chartered Accountant', section_or_form: 'Form 3CA-3CD / 3CB-3CD' },
  { id: 'c14', code: 'ITR_AUDIT', title: 'Income Tax Return (Audit Cases & Companies)', frequency: 'annual', applicable_entity_types: ['llp', 'company', 'partnership'], due_day_or_date: '31st October', description: 'ITR filing for entities subject to tax audit and companies', section_or_form: 'ITR-5 / ITR-6' },
  { id: 'c15', code: 'ROC_DIR_3_KYC', title: 'Director KYC (DIR-3 KYC / Web)', frequency: 'annual', applicable_entity_types: ['company'], due_day_or_date: '30th September', description: 'Annual KYC filing for DIN holders', section_or_form: 'Form DIR-3 KYC' },
  { id: 'c16', code: 'ROC_AOC_4', title: 'ROC Financial Statements Filing (AOC-4)', frequency: 'annual', applicable_entity_types: ['company'], due_day_or_date: '30 days from AGM (30th Oct)', description: 'Filing of audited financial statements with Registrar of Companies', section_or_form: 'Form AOC-4' },
  { id: 'c17', code: 'ROC_MGT_7', title: 'ROC Annual Return (MGT-7 / 7A)', frequency: 'annual', applicable_entity_types: ['company'], due_day_or_date: '60 days from AGM (29th Nov)', description: 'Filing of company annual return with ROC', section_or_form: 'Form MGT-7' },
  { id: 'c18', code: 'ROC_DPT_3', title: 'Return of Deposits (DPT-3)', frequency: 'annual', applicable_entity_types: ['company'], due_day_or_date: '30th June', description: 'Annual return of deposits or transactions not considered as deposit', section_or_form: 'Form DPT-3' },
];

export const INITIAL_WORKSPACE: Workspace = {
  id: 'ws-delhi-001',
  name: 'Mehta, Singhal & Associates LLP',
  plan: 'pro',
  seat_limit: 8,
  uploads_used_this_month: 24,
  plan_activated_at: '2026-01-01T00:00:00Z',
  plan_expires_at: '2026-12-31T23:59:59Z',
};

export const INITIAL_MEMBERS: WorkspaceMember[] = [
  {
    id: 'mem-1',
    workspace_id: 'ws-delhi-001',
    user_id: 'usr-1',
    email: 'ca.mehta@msa-advisors.in',
    full_name: 'CA Rajesh Mehta, FCA',
    role: 'firm_owner_admin',
    is_active: true,
    invited_by: 'system',
    invited_at: '2026-01-01T00:00:00Z',
    joined_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mem-2',
    workspace_id: 'ws-delhi-001',
    user_id: 'usr-2',
    email: 'priya.singhal@msa-advisors.in',
    full_name: 'CA Priya Singhal, ACA',
    role: 'senior_associate',
    is_active: true,
    invited_by: 'usr-1',
    invited_at: '2026-01-05T10:00:00Z',
    joined_at: '2026-01-05T12:00:00Z',
  },
  {
    id: 'mem-3',
    workspace_id: 'ws-delhi-001',
    user_id: 'usr-3',
    email: 'aravind.k@msa-advisors.in',
    full_name: 'Aravind Kumar (Article Assistant)',
    role: 'junior_associate',
    is_active: true,
    invited_by: 'usr-1',
    invited_at: '2026-02-01T09:00:00Z',
    joined_at: '2026-02-01T11:00:00Z',
  },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-apex-01',
    workspace_id: 'ws-delhi-001',
    name: 'Apex Industrial Gears Pvt Ltd',
    contact_email: 'accounts@apexgears.in',
    contact_phone: '+91 98201 44552',
    entity_type: 'company',
    gstin: '07AAACA4512Q1Z5',
    pan: 'AAACA4512Q',
    created_at: '2026-01-10T10:30:00Z',
  },
  {
    id: 'cli-shanti-02',
    workspace_id: 'ws-delhi-001',
    name: 'Shanti Retail Ventures LLP',
    contact_email: 'cfo@shantiretail.com',
    contact_phone: '+91 98112 33441',
    entity_type: 'llp',
    gstin: '07AAAFS7890R1ZY',
    pan: 'AAAFS7890R',
    created_at: '2026-01-15T14:20:00Z',
  },
  {
    id: 'cli-rajesh-03',
    workspace_id: 'ws-delhi-001',
    name: 'Rajesh Sharma & Sons (Proprietorship)',
    contact_email: 'rajesh.sharma@gmail.com',
    contact_phone: '+91 99554 11223',
    entity_type: 'proprietorship',
    gstin: '07AAYPS9901M1ZA',
    pan: 'AAYPS9901M',
    created_at: '2026-02-01T11:00:00Z',
  },
  {
    id: 'cli-kothari-04',
    workspace_id: 'ws-delhi-001',
    name: 'Kothari Pharma Distributors',
    contact_email: 'info@kotharipharma.in',
    contact_phone: '+91 98710 66554',
    entity_type: 'partnership',
    gstin: '07AABFK4432N1Z8',
    pan: 'AABFK4432N',
    created_at: '2026-02-18T16:45:00Z',
  },
];

export const INITIAL_FIRM_PROFILE: FirmBillingProfile = {
  firm_name: 'Mehta, Singhal & Associates LLP',
  address: 'Plot 42, Barakhamba Road, Connaught Place, New Delhi - 110001',
  gstin: '07AABFM1234D1ZP',
  pan: 'AABFM1234D',
  bank_name: 'HDFC Bank Ltd, KG Marg Branch',
  account_number: '50200012345678',
  ifsc_code: 'HDFC0000003',
  contact_email: 'billing@msa-advisors.in',
  contact_phone: '+91 11 4123 9900',
};

export const INITIAL_FEE_ITEMS: FeeItem[] = [
  { id: 'fee-1', description: 'Statutory Audit Fees for Corporate Entity', default_amount: 75000, is_taxable: true },
  { id: 'fee-2', description: 'Tax Audit & 3CD Certification u/s 44AB', default_amount: 45000, is_taxable: true },
  { id: 'fee-3', description: 'Monthly GST Retainership & Return Filing (GSTR-1 & 3B)', default_amount: 15000, is_taxable: true },
  { id: 'fee-4', description: 'Quarterly TDS Compliance & Form 26Q/24Q', default_amount: 8500, is_taxable: true },
  { id: 'fee-5', description: 'Annual ROC Compliance & Filing of AOC-4/MGT-7', default_amount: 25000, is_taxable: true },
  { id: 'fee-6', description: 'Income Tax Assessment & Scrutiny Representation', default_amount: 50000, is_taxable: true },
  { id: 'fee-7', description: 'Government Challan Reimbursement (Out-of-Pocket)', default_amount: 5000, is_taxable: false },
];

export const INITIAL_TASKS: PracticeTask[] = [
  {
    id: 'tsk-001',
    workspace_id: 'ws-delhi-001',
    client_id: 'cli-apex-01',
    client_name: 'Apex Industrial Gears Pvt Ltd',
    title: 'GSTR-3B Reconciliation & Filing for current month',
    description: 'Verify 2B ITC mismatch and finalize 3B return draft for review',
    assignee_id: 'mem-2',
    assignee_name: 'CA Priya Singhal, ACA',
    due_date: '2026-10-20',
    status: 'in_progress',
    compliance_type: 'GSTR-3B',
    created_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'tsk-002',
    workspace_id: 'ws-delhi-001',
    client_id: 'cli-apex-01',
    client_name: 'Apex Industrial Gears Pvt Ltd',
    title: 'Form 26Q Quarter 2 TDS working paper finalization',
    description: 'Reconcile 194C contractor deductions against Ledger and prepare Challan 281 audit notes',
    assignee_id: 'mem-3',
    assignee_name: 'Aravind Kumar',
    due_date: '2026-10-31',
    status: 'pending',
    compliance_type: 'TDS_26Q',
    created_at: '2026-09-22T14:30:00Z',
  },
  {
    id: 'tsk-003',
    workspace_id: 'ws-delhi-001',
    client_id: 'cli-shanti-02',
    client_name: 'Shanti Retail Ventures LLP',
    title: 'Bank Reconciliation Statement (BRS) as of September month end',
    description: 'Verify 4 unpresented cheques in HDFC Current A/c and record bank charges',
    assignee_id: 'mem-2',
    assignee_name: 'CA Priya Singhal, ACA',
    due_date: '2026-10-05',
    status: 'pending',
    compliance_type: 'BRS',
    created_at: '2026-09-25T11:00:00Z',
  },
  {
    id: 'tsk-004',
    workspace_id: 'ws-delhi-001',
    client_id: 'cli-rajesh-03',
    client_name: 'Rajesh Sharma & Sons (Proprietorship)',
    title: 'ITR-3 Working Paper & Capital Account computation',
    description: 'Verify drawings, calculate depreciation on motor van and prepare draft computation',
    assignee_id: 'mem-3',
    assignee_name: 'Aravind Kumar',
    due_date: '2026-10-15',
    status: 'pending',
    compliance_type: 'ITR',
    created_at: '2026-09-26T16:00:00Z',
  },
];

export const SAMPLE_VOUCHERS: VoucherEntry[] = [
  {
    id: 'vch-101',
    voucher_no: 'SAL/2026/041',
    voucher_type: 'Sales',
    date: '2026-08-12',
    narration: 'Being gear components supplied to Bharat Heavy Automotives vide Tax Inv #41',
    source: 'uploaded_ocr',
    is_reviewed: true,
    reviewer_name: 'CA Priya Singhal',
    review_notes: 'Verified e-invoice QR code and tax breakdown. ITC matched.',
    reviewed_at: '2026-08-14T11:20:00Z',
    lines: [
      { id: 'l1', ledger_id: '1100', ledger_name: 'Bharat Heavy Automotives Ltd', gl_code: '1100', debit: 590000, credit: 0, party_name: 'Bharat Heavy Automotives Ltd', gstin: '07AAACB1122D1Z9' },
      { id: 'l2', ledger_id: '4010', ledger_name: 'Sales — Domestic (GST Taxable 18%)', gl_code: '4010', debit: 0, credit: 500000, gst_rate: 18 },
      { id: 'l3', ledger_id: '2210', ledger_name: 'Output CGST Payable', gl_code: '2210', debit: 0, credit: 45000 },
      { id: 'l4', ledger_id: '2211', ledger_name: 'Output SGST Payable', gl_code: '2211', debit: 0, credit: 45000 },
    ],
  },
  {
    id: 'vch-102',
    voucher_no: 'PUR/2026/089',
    voucher_type: 'Purchase',
    date: '2026-08-18',
    narration: 'Being high-grade alloy steel billets purchased from Jindal Precision Steels Inv #JP-881',
    source: 'uploaded_ocr',
    is_reviewed: false,
    lines: [
      { id: 'l5', ledger_id: '5010', ledger_name: 'Raw Material Purchases (Intra-State)', gl_code: '5010', debit: 300000, credit: 0, gst_rate: 18 },
      { id: 'l6', ledger_id: '1150', ledger_name: 'Input CGST Receivable', gl_code: '1150', debit: 27000, credit: 0 },
      { id: 'l7', ledger_id: '1151', ledger_name: 'Input SGST Receivable', gl_code: '1151', debit: 27000, credit: 0 },
      { id: 'l8', ledger_id: '2010', ledger_name: 'Jindal Precision Steels Ltd', gl_code: '2010', debit: 0, credit: 354000, party_name: 'Jindal Precision Steels Ltd', gstin: '07AAACJ9988K1Z3' },
    ],
  },
  {
    id: 'vch-103',
    voucher_no: 'PAY/2026/014',
    voucher_type: 'Payment',
    date: '2026-08-25',
    narration: 'Being payment made to Precision Machine Works for lathe overhaul after deducting TDS u/s 194C @ 2%',
    source: 'uploaded_ocr',
    is_reviewed: true,
    reviewer_name: 'CA Rajesh Mehta',
    review_notes: '194C deducted correctly at 2% on ₹1,00,000 contractor bill.',
    reviewed_at: '2026-08-26T15:10:00Z',
    lines: [
      { id: 'l9', ledger_id: '2010', ledger_name: 'Precision Machine Works', gl_code: '2010', debit: 100000, credit: 0, party_name: 'Precision Machine Works' },
      { id: 'l10', ledger_id: '2250', ledger_name: 'TDS Payable u/s 194C (Contractors)', gl_code: '2250', debit: 0, credit: 2000, tds_section: '194C' },
      { id: 'l11', ledger_id: '1020', ledger_name: 'HDFC Current Account', gl_code: '1020', debit: 0, credit: 98000 },
    ],
  },
  {
    id: 'vch-104',
    voucher_no: 'RCP/2026/032',
    voucher_type: 'Receipt',
    date: '2026-08-28',
    narration: 'Being NEFT funds received from Bharat Heavy Automotives against Inv #SAL/2026/041 after TDS u/s 194Q (0.1%)',
    source: 'uploaded_ocr',
    is_reviewed: false,
    lines: [
      { id: 'l12', ledger_id: '1020', ledger_name: 'HDFC Current Account', gl_code: '1020', debit: 589410, credit: 0 },
      { id: 'l13', ledger_id: '1160', ledger_name: 'TDS Receivable (FY 2024-25)', gl_code: '1160', debit: 590, credit: 0, tds_section: '194Q' },
      { id: 'l14', ledger_id: '1100', ledger_name: 'Bharat Heavy Automotives Ltd', gl_code: '1100', debit: 0, credit: 590000, party_name: 'Bharat Heavy Automotives Ltd' },
    ],
  },
  {
    id: 'vch-105',
    voucher_no: 'JRN/2026/009',
    voucher_type: 'Journal',
    date: '2026-08-31',
    narration: 'Being monthly provision for office rent Connaught Place building with TDS u/s 194I @ 10%',
    source: 'uploaded_ocr',
    is_reviewed: false,
    lines: [
      { id: 'l15', ledger_id: '6050', ledger_name: 'Office Rent & Maintenance', gl_code: '6050', debit: 100000, credit: 0 },
      { id: 'l16', ledger_id: '1150', ledger_name: 'Input CGST Receivable', gl_code: '1150', debit: 9000, credit: 0 },
      { id: 'l17', ledger_id: '1151', ledger_name: 'Input SGST Receivable', gl_code: '1151', debit: 9000, credit: 0 },
      { id: 'l18', ledger_id: '2252', ledger_name: 'TDS Payable u/s 194I (Rent)', gl_code: '2252', debit: 0, credit: 10000, tds_section: '194I(b)' },
      { id: 'l19', ledger_id: '2010', ledger_name: 'DLF Commercial Properties Ltd', gl_code: '2010', debit: 0, credit: 108000, party_name: 'DLF Commercial Properties Ltd', gstin: '07AAACD4455E1Z0' },
    ],
  },
  {
    id: 'vch-106',
    voucher_no: 'PAY/2026/018',
    voucher_type: 'Payment',
    date: '2026-09-02',
    narration: 'High value cash withdrawal for festival bonus advance',
    source: 'uploaded_ocr',
    is_reviewed: false,
    anomalies: [
      {
        code: 'ANOM_HIGH_CASH',
        type: 'rule_based',
        severity: 'warning',
        title: 'High Value Cash Transaction',
        description: 'Cash withdrawal exceeds ₹2,00,000 threshold. Section 269ST compliance alert.',
        voucher_no: 'PAY/2026/018',
      },
      {
        code: 'ANOM_ROUND_SUM',
        type: 'rule_based',
        severity: 'warning',
        title: 'Round Number Concentration',
        description: 'Voucher amount is an exact round sum (₹2,50,000.00). Verify documentation.',
        voucher_no: 'PAY/2026/018',
      }
    ],
    lines: [
      { id: 'l20', ledger_id: '1010', ledger_name: 'Cash-in-Hand', gl_code: '1010', debit: 250000, credit: 0 },
      { id: 'l21', ledger_id: '1020', ledger_name: 'HDFC Current Account', gl_code: '1020', debit: 0, credit: 250000 },
    ],
  },
  {
    id: 'vch-107',
    voucher_no: '',
    voucher_type: 'Purchase',
    date: '2026-09-05',
    narration: 'Inter-State machinery spare purchase from Pune vendor — Missing voucher number on scanned challan',
    source: 'uploaded_ocr',
    is_reviewed: false,
    anomalies: [
      {
        code: 'ANOM_MISSING_VCH_NO',
        type: 'rule_based',
        severity: 'error',
        title: 'Missing Voucher / Invoice Number',
        description: 'Voucher number is absent from extracted document. Must be assigned before audit finalization.',
        voucher_id: 'vch-107',
      },
      {
        code: 'ANOM_MISSING_GSTIN',
        type: 'rule_based',
        severity: 'warning',
        title: 'Missing GSTIN on High Value Supply',
        description: 'Invoice exceeds ₹50,000 but vendor GSTIN is missing. ITC eligibility restricted.',
        voucher_id: 'vch-107',
      }
    ],
    lines: [
      { id: 'l22', ledger_id: '5020', ledger_name: 'Raw Material Purchases (Inter-State)', gl_code: '5020', debit: 85000, credit: 0 },
      { id: 'l23', ledger_id: '1152', ledger_name: 'Input IGST Receivable', gl_code: '1152', debit: 15300, credit: 0 },
      { id: 'l24', ledger_id: '2010', ledger_name: 'Maharshi Heavy Tools Pune', gl_code: '2010', debit: 0, credit: 100300, party_name: 'Maharshi Heavy Tools Pune' },
    ],
  },
];
