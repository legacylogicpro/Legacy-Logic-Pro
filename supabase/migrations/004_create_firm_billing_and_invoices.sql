-- ====================================================================
-- MIGRATION 004: Firm Billing, Rate Card & Invoicing
-- ====================================================================

-- 1. Firm Billing Profile
CREATE TABLE IF NOT EXISTS public.firm_billing_profiles (
    workspace_id TEXT PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    firm_name TEXT NOT NULL,
    address TEXT NOT NULL,
    gstin TEXT NOT NULL,
    pan TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Fee Items (Rate Card)
CREATE TABLE IF NOT EXISTS public.fee_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    default_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_invoice_num UNIQUE (workspace_id, invoice_number)
);

-- Enable RLS
ALTER TABLE public.firm_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Billing profile policies
CREATE POLICY "Active members can view firm billing profile"
    ON public.firm_billing_profiles FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners can manage firm billing profile"
    ON public.firm_billing_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = firm_billing_profiles.workspace_id
            AND user_id = auth.uid()
            AND role = 'firm_owner_admin'
            AND is_active = true
        )
    );

-- Invoices & Fee Items: Owners and Seniors can manage; Juniors can view
CREATE POLICY "Active members can view invoices and fee items"
    ON public.invoices FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and seniors can manage invoices"
    ON public.invoices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = invoices.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );

CREATE POLICY "Active members can view fee items"
    ON public.fee_items FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and seniors can manage fee items"
    ON public.fee_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = fee_items.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );
