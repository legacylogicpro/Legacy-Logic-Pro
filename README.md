# Legacy Logic Pro — CA Document Intelligence & Practice Management

Legacy Logic Pro is a production-ready, deployable SaaS platform built specifically for Chartered Accountant (CA) firms in India. It streamlines document ingestion (scanned books, bank statements, tax invoices, and Excel ledgers) with zero permanent storage, and unifies audit workflows, statutory tax working papers, practice task management, and firm billing.

---

## 1. Core Architecture & Design Philosophy

- **100% In-Memory Document Processing:** Uploaded documents (PDF, PNG, JPG, XLSX, XLS, CSV, ZIP) are streamed directly into volatile RAM, extracted via OCR/parsers, and discarded immediately. No raw bytes or customer accounting files are ever written to disk or uploaded to any storage bucket.
- **Strict Multi-Tenancy & Data Isolation:** Workspaces are isolated with Row Level Security (RLS) policies on every Supabase PostgreSQL table. Server-side queries enforce workspace boundaries as defense-in-depth.
- **No Public Self-Registration:** Only workspace owners/admins can invite team members. Access is controlled by an immutable 3-role permission matrix:
  1. `firm_owner_admin`: Full management, seat allocation, role changes, firm billing, BRS locking.
  2. `senior_associate`: Client creation, document processing, audit reviews, BRS locking, invoice generation.
  3. `junior_associate`: Document ingestion, manual voucher entry, task execution, report viewing.
- **Stateless Financial Computations:** Trial Balance, Schedule III Balance Sheet, Profit & Loss, GST summaries, and TDS breakups are computed purely on demand from session data passed in request payloads.
- **Statutory Audit-Ready First:** Every generated tax or compliance statement is explicitly watermarked and labeled as an **internal working paper**, not a filed government return.

---

## 2. Tech Stack

- **Interactive AI Studio Container:** React 19, TypeScript, Tailwind CSS, Express full-stack middleware (`server.ts`), `@google/genai` with `gemini-3.1-pro-preview` High Thinking Mode, `xlsx`, `jspdf`, `jspdf-autotable`.
- **Frontend Target:** Next.js 14 (App Router), TypeScript in strict mode, Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, client-side PDF & Excel exporters.
- **Backend Target:** FastAPI (Python 3.11+), Pydantic v2 models, Uvicorn ASGI server, PyMuPDF + pdf2image + Tesseract OCR (English + Hindi), openpyxl + pandas, ReportLab.
- **Database & Auth Target:** Supabase (PostgreSQL + Supabase Auth with JWT, Row Level Security on every table).
- **Deployment Targets:** Frontend on **Vercel**, Backend on **Railway** (Docker), Database on **Supabase**.

---

## 3. Repository Structure

```
├── backend/                  # FastAPI (Python 3.11+) backend service
│   ├── models/schemas.py     # Pydantic v2 models matched field-for-field with frontend
│   ├── routers/              # Modular API routers for all functional domains
│   ├── config.py             # Pydantic Settings configuration
│   ├── dependencies.py       # Supabase JWT verification & server-side role resolution
│   ├── main.py               # FastAPI entry point with strict CORS configuration
│   ├── Dockerfile            # Railway Dockerfile with Poppler & Tesseract OCR (Eng + Hin)
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment variables reference
├── frontend/                 # Next.js 14 App Router application
│   ├── src/app/              # Next.js 14 App Router pages & layouts
│   ├── src/lib/api-client.ts # Single exported API_BASE_URL client
│   ├── package.json          # Frontend dependencies
│   ├── next.config.mjs       # Strict mode config (zero error suppression)
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   └── .env.example          # Frontend environment variables reference
├── supabase/                 # Supabase PostgreSQL migrations & seed data
│   ├── migrations/
│   │   ├── 001_create_workspaces_and_members.sql
│   │   ├── 002_create_clients_and_templates.sql
│   │   ├── 003_create_practice_tasks_and_calendar.sql
│   │   ├── 004_create_firm_billing_and_invoices.sql
│   │   ├── 005_create_fixed_assets_and_brs.sql
│   │   └── 006_create_audit_trail_immutable.sql
│   └── seed.sql              # Standard Chart of Accounts, TDS sections & rates, Due dates
├── src/                      # AI Studio live interactive application
├── server.ts                 # Full-stack server with Vite middleware & Gemini 3.1 Pro Thinking Mode
├── .env.example              # Top-level environment template
└── README.md                 # System documentation & QA testing checklist
```

---

## 4. Local Setup Instructions

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_JWT_SECRET, and GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js 14)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# Open http://localhost:3000
```

### Full-Stack Live AI Studio Container
```bash
npm install
npm run dev
# Runs Express on port 3000 with Vite middleware and Gemini 3.1 Pro High Thinking Mode
```

---

## 5. Supabase Database Migrations

Apply migration files in sequence via the Supabase SQL Editor or CLI:
1. `001_create_workspaces_and_members.sql` — Workspaces and membership tables with RLS functions.
2. `002_create_clients_and_templates.sql` — Client entities, ledger mapping templates, and client rules.
3. `003_create_practice_tasks_and_calendar.sql` — Compliance task register and statutory due dates reference.
4. `004_create_firm_billing_and_invoices.sql` — Firm billing profile, fee rate cards, and invoices with 18% GST.
5. `005_create_fixed_assets_and_brs.sql` — Fixed assets (WDV), Chapter VI-A deductions, BRS statements, and persistent entry reviews.
6. `006_create_audit_trail_immutable.sql` — Strictly immutable (insert-only, WORM compliant) audit trail.
7. `seed.sql` — Pre-loaded standard Indian compliance due dates and chart of accounts.

---

## 6. Deployment Guidelines

### Frontend on Vercel
1. Link your GitHub repository to Vercel and set Root Directory to `frontend`.
2. Configure Environment Variables in Vercel Project Settings:
   - `NEXT_PUBLIC_API_URL`: Your Railway production backend URL (e.g., `https://legacy-logic-backend.up.railway.app`).
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon public key.
3. Deploy with default build command (`npm run build`).

### Backend on Railway (Docker)
1. Link the repository to Railway and set the build context to `backend`.
2. Railway detects `backend/Dockerfile` and automatically installs Poppler and Tesseract OCR packages.
3. Set Railway Environment Variables:
   - `PORT`: 8000 (Railway will route public traffic).
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key.
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret.
   - `ALLOWED_ORIGINS`: Your Vercel frontend domain (e.g., `https://legacy-logic-pro.vercel.app`).
   - `GEMINI_API_KEY`: Google Gemini API key.

---

## 7. Manual Testing Checklist (Section 8, Item 9)

Use this checklist to verify every major user flow:

- [ ] **1. Authentication & Role Permissions**
  - Verify that only workspace owners/admins can invite new associates or modify assigned roles.
  - Test role switcher in top bar: verify Junior Associates cannot delete clients, edit ledger mappings, finalize BRS, or issue firm invoices.
- [ ] **2. Client Practice Profile Management**
  - Open "Client Workspaces", search by name or GSTIN.
  - Click "Add Client": verify the centered modal dialog opens (not a side drawer). Create a client and verify it populates with proper PAN formatting.
  - Delete a client and verify confirmation modal triggers.
- [ ] **3. Document Ingestion & Extraction (OCR)**
  - Open "Document Ingestion (OCR)".
  - Verify upload quota indicator shows current usage (e.g., `24 / 200 files`).
  - Observe processing options: verify "Enable AI Assistant for this session" is **strictly defaulted to OFF**.
  - Drop a scanned voucher or Excel ledger. Watch the 5-stage progress indicator advance.
  - Review the extraction summary: entries extracted, auto-corrections, duplicates found, anomalies flagged, and GST lines separated.
- [ ] **4. Ledger Head Mapping**
  - Verify detected raw ledger heads can be mapped to standard Indian GL codes (Assets 1000s, Liabilities 2000s, Equity 3000s, Revenue 4000s, Direct Exp 5000s, Indirect Exp 6000s).
  - Test mutually-exclusive tag rules: attempt to tag a single ledger simultaneously as both `bank` and `cash`, or `gst_outward` and `tds`. Verify the UI blocks saving with a clear conflict alert.
  - Click "Save & Apply Template" and verify mapping succeeds.
- [ ] **5. Manual Double-Entry & Day Book**
  - Open "Manual Double Entry". Create a Payment or Journal voucher.
  - Test live Dr = Cr validation: verify save button is disabled when debits do not equal credits.
  - Save the voucher: open "Day Book" and verify the newly entered voucher merges into the session pool.
  - Check that uploaded/OCR vouchers display a "Locked / Read-Only" indicator and cannot be deleted, while manual vouchers allow deletion.
  - Click "Export Tally XML" and verify valid XML downloads.
- [ ] **6. Trial Balance**
  - Open "Trial Balance": verify rows are grouped by GL code with opening, period, and closing debit/credit figures.
  - Click any row to expand underlying transactions.
  - Check imbalance detection: if total debits != total credits, verify the red warning banner and test the "Filter Imbalanced Only" toggle.
  - Click "Export Excel" (verify styled workbook with Summary sheet downloads) and "Export PDF" (verify DRAFT watermark appears if imbalanced).
- [ ] **7. Ledger Drilldown & Audit Sign-Off**
  - Open "Ledger Audit Review", select a GL account.
  - Verify the running balance column computes accurately.
  - Expand an entry: enter reviewer notes and click "Mark Reviewed & Persist Notes". Verify sign-off persists.
- [ ] **8. Schedule III Financial Statements**
  - Open "Schedule III Balance Sheet". Verify vertical presentation format (Part I: Equity & Liabilities / Assets, Part II: Statement of Profit & Loss).
  - Verify that `Total Assets = Total Equity and Liabilities` equilibrium is visually audited.
- [ ] **9. Debtor & Creditor Ageing Analysis**
  - Switch between Receivables and Payables.
  - Verify the 6 age buckets (0-30, 31-60, 61-90, 91-180, 181-365, >365 days) display the safe-to-critical color gradient.
- [ ] **10. Comparative Financial Statements**
  - Verify side-by-side FY 2025-26 and FY 2026-27 statement with computed absolute and percentage variance columns.
- [ ] **11. GST Compliance Module**
  - Verify Summary tab shows Output tax, Input tax, Eligible ITC, and Net 3B cash payable.
  - Open "Client Reconciliation": edit client-provided figures and verify live differences calculate.
  - Click "Flag Row" and verify row highlights.
  - In "ITC Eligibility Audit", test statutory override and reason notes.
- [ ] **12. TDS Compliance Module & Draft Form 16A**
  - Review Form 26Q working paper and Section 194 rate discrepancy flags.
  - Click "Draft 16A PDF": verify generated PDF contains statutory certificate wording with explicit "DRAFT FORM 16A" watermark.
- [ ] **13. Depreciation WDV Schedule**
  - Open "Fixed Assets (WDV)": verify assets put to use for < 180 days receive 50% half-rate depreciation under Section 32 convention.
  - Add an asset and verify closing WDV recalculates.
- [ ] **14. Income Tax (ITR) Computation & Draft Form 16**
  - Verify ITR working paper starts from P&L profit, adds inadmissible items, deducts allowable IT Act depreciation and Chapter VI-A deductions (80C, 80D, 80G).
  - Add a Section 80C deduction and verify taxable income and tax liability recalculate.
  - In "Draft Form 16", click download for an employee and verify draft watermarked PDF outputs.
- [ ] **15. Bank Reconciliation Statement (BRS)**
  - Verify book balance is automatically pulled from bank GL ledger.
  - Add reconciling items (unpresented cheques, bank charges).
  - When unreconciled difference reaches ₹0.00, click "Finalize & Lock BRS" (verify junior associates cannot click this).
  - Click "Export BRS Working Paper" to verify PDF generation.
- [ ] **16. Rules Engine**
  - Open "Rules & Validation Engine". Toggle rules between active and inactive.
  - Use the interactive "Test-Runner": enter sample text and amount, click "Execute Test Heuristics", and review triggered rule logs.
- [ ] **17. Practice Tasks & Compliance Calendar**
  - Click "Generate Tasks from Calendar": verify statutory deadlines (GSTR-1, 3B, Advance Tax, TDS, AOC-4, MGT-7) populate without creating duplicates on repeat clicks.
  - Change task status to "In Progress" or "Completed".
- [ ] **18. Client MIS Scorecard**
  - Verify financial ratios (Current Ratio, Debt-Equity, Gross Margin %, Net Margin %) render with status evaluations.
- [ ] **19. Firm Invoicing & Billing**
  - Open "Firm Invoicing & Fees". Click "Create Tax Invoice".
  - Select items from rate card: verify automatic 18% GST calculation on taxable services.
  - Save invoice and click "PDF": verify branded tax invoice generates with firm letterhead and bank remittance details.
- [ ] **20. Immutable Audit Trail**
  - Open "Immutable Audit Trail": verify file processing, mapping updates, BRS finalizations, and manual entries appear with timestamps.
  - Export audit log as JSON.
- [ ] **21. AI Assistant (Gemini 3.1 Pro Thinking Mode)**
  - Verify that when the AI toggle was OFF during ingestion, the floating assistant is hidden and zero API calls are made.
  - When enabled in ingestion options, click the floating assistant, ask a complex question (e.g. "What is our net GST liability and any ITC ineligibility?"), and verify reasoned thinking execution and Indian currency formatting.
- [ ] **22. Plans & Pricing**
  - Open "Plans & Pricing": review Starter (₹799), Pro (₹1,999), and Elite (₹4,499) tiers.
  - Select a plan: verify static UPI QR code and payment instructions appear for manual activation.
