-- ====================================================================
-- SEED DATA: Pre-loaded Reference Data for Legacy Logic Pro
-- Standard Chart of Accounts, TDS Sections & Rates, Compliance Due Dates
-- ====================================================================

-- 1. Seed Compliance Due Dates Reference
INSERT INTO public.compliance_due_dates (code, title, frequency, applicable_entity_types, due_day_or_date, description, section_or_form)
VALUES
    ('GSTR-1', 'GSTR-1 (Outward Supplies)', 'monthly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '11th of every month', 'Monthly statement of outward supplies for regular taxpayers', 'Form GSTR-1'),
    ('GSTR-3B', 'GSTR-3B (Summary Return & Tax Payment)', 'monthly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '20th of every month', 'Monthly self-declaration summary return and tax payment', 'Form GSTR-3B'),
    ('TDS_DEPOSIT', 'TDS Monthly Deposit (Challan ITNS 281)', 'monthly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '7th of every month', 'Deposit of tax deducted at source for preceding month', 'Challan 281'),
    ('TDS_26Q_Q1', 'Quarterly TDS Return Q1 (26Q / 24Q)', 'quarterly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '31st July', 'Quarter 1 TDS return for payments made April to June', 'Form 26Q/24Q'),
    ('TDS_26Q_Q2', 'Quarterly TDS Return Q2 (26Q / 24Q)', 'quarterly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '31st October', 'Quarter 2 TDS return for payments made July to September', 'Form 26Q/24Q'),
    ('TDS_26Q_Q3', 'Quarterly TDS Return Q3 (26Q / 24Q)', 'quarterly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '31st January', 'Quarter 3 TDS return for payments made October to December', 'Form 26Q/24Q'),
    ('TDS_26Q_Q4', 'Quarterly TDS Return Q4 (26Q / 24Q)', 'quarterly', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '31st May', 'Quarter 4 TDS return for payments made January to March', 'Form 26Q/24Q'),
    ('ADV_TAX_Q1', 'Advance Tax Installment 1 (15%)', 'quarterly', ARRAY['individual', 'proprietorship', 'partnership', 'llp', 'company'], '15th June', 'First installment of advance income tax', 'Challan 280'),
    ('ADV_TAX_Q2', 'Advance Tax Installment 2 (45%)', 'quarterly', ARRAY['individual', 'proprietorship', 'partnership', 'llp', 'company'], '15th September', 'Second installment of advance income tax', 'Challan 280'),
    ('ADV_TAX_Q3', 'Advance Tax Installment 3 (75%)', 'quarterly', ARRAY['individual', 'proprietorship', 'partnership', 'llp', 'company'], '15th December', 'Third installment of advance income tax', 'Challan 280'),
    ('ADV_TAX_Q4', 'Advance Tax Installment 4 (100%)', 'quarterly', ARRAY['individual', 'proprietorship', 'partnership', 'llp', 'company'], '15th March', 'Final installment of advance income tax', 'Challan 280'),
    ('ITR_NON_AUDIT', 'Income Tax Return (Non-Audit Cases)', 'annual', ARRAY['individual', 'proprietorship', 'partnership'], '31st July', 'ITR filing for individuals and non-audit entities', 'ITR-1/2/3/4'),
    ('TAX_AUDIT_REPORT', 'Tax Audit Report u/s 44AB', 'annual', ARRAY['proprietorship', 'partnership', 'llp', 'company'], '30th September', 'Furnishing of tax audit report by Chartered Accountant', 'Form 3CA-3CD / 3CB-3CD'),
    ('ITR_AUDIT', 'Income Tax Return (Audit Cases & Companies)', 'annual', ARRAY['llp', 'company', 'partnership'], '31st October', 'ITR filing for entities subject to tax audit and companies', 'ITR-5 / ITR-6'),
    ('ROC_DIR_3_KYC', 'Director KYC (DIR-3 KYC / Web)', 'annual', ARRAY['company'], '30th September', 'Annual KYC filing for DIN holders', 'Form DIR-3 KYC'),
    ('ROC_AOC_4', 'ROC Financial Statements Filing (AOC-4)', 'annual', ARRAY['company'], '30 days from AGM', 'Filing of audited financial statements with ROC', 'Form AOC-4'),
    ('ROC_MGT_7', 'ROC Annual Return (MGT-7 / 7A)', 'annual', ARRAY['company'], '60 days from AGM', 'Filing of company annual return with ROC', 'Form MGT-7'),
    ('ROC_DPT_3', 'Return of Deposits (DPT-3)', 'annual', ARRAY['company'], '30th June', 'Annual return of deposits or transactions not considered as deposit', 'Form DPT-3')
ON CONFLICT (code) DO NOTHING;
