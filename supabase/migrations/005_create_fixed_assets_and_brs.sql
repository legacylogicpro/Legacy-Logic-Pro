-- ====================================================================
-- MIGRATION 005: Fixed Assets, BRS, Deductions & Entry Reviews
-- ====================================================================

-- 1. Fixed Assets Register
CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    category TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    it_act_rate NUMERIC(5, 2) NOT NULL,
    days_used_in_fy INT NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Chapter VI-A Deductions
CREATE TABLE IF NOT EXISTS public.chapter_via_deductions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    financial_year TEXT NOT NULL,
    section TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bank Reconciliations (BRS)
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    bank_ledger_id TEXT NOT NULL,
    bank_ledger_name TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    book_balance NUMERIC(15, 2) NOT NULL,
    bank_statement_balance NUMERIC(15, 2) NOT NULL,
    unreconciled_difference NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_finalized BOOLEAN NOT NULL DEFAULT false,
    finalized_by TEXT,
    finalized_at TIMESTAMPTZ,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Entry Reviews (Persistent auditor sign-offs per voucher)
CREATE TABLE IF NOT EXISTS public.entry_reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    voucher_id TEXT NOT NULL,
    is_reviewed BOOLEAN NOT NULL DEFAULT true,
    reviewer_name TEXT NOT NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_voucher_review UNIQUE (client_id, voucher_id)
);

-- Enable RLS
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_via_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_reviews ENABLE ROW LEVEL SECURITY;

-- Read policies for active members
CREATE POLICY "Active members can view fixed assets" ON public.fixed_assets FOR SELECT USING (public.is_active_workspace_member(workspace_id));
CREATE POLICY "Active members can view chapter via deductions" ON public.chapter_via_deductions FOR SELECT USING (public.is_active_workspace_member(workspace_id));
CREATE POLICY "Active members can view BRS statements" ON public.bank_reconciliations FOR SELECT USING (public.is_active_workspace_member(workspace_id));
CREATE POLICY "Active members can view entry reviews" ON public.entry_reviews FOR SELECT USING (public.is_active_workspace_member(workspace_id));

-- Management policies (owners & seniors)
CREATE POLICY "Owners and seniors can manage fixed assets" ON public.fixed_assets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = fixed_assets.workspace_id AND user_id = auth.uid() AND role IN ('firm_owner_admin', 'senior_associate') AND is_active = true));

CREATE POLICY "Owners and seniors can manage chapter via deductions" ON public.chapter_via_deductions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = chapter_via_deductions.workspace_id AND user_id = auth.uid() AND role IN ('firm_owner_admin', 'senior_associate') AND is_active = true));

CREATE POLICY "Owners and seniors can finalize and manage BRS" ON public.bank_reconciliations FOR ALL
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = bank_reconciliations.workspace_id AND user_id = auth.uid() AND role IN ('firm_owner_admin', 'senior_associate') AND is_active = true));

CREATE POLICY "Owners and seniors can sign off entry reviews" ON public.entry_reviews FOR ALL
    USING (EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = entry_reviews.workspace_id AND user_id = auth.uid() AND role IN ('firm_owner_admin', 'senior_associate') AND is_active = true));
