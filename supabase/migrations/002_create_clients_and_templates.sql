-- ====================================================================
-- MIGRATION 002: Client Workspaces, Ledger Templates & Rules
-- ====================================================================

-- 1. Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'proprietorship', 'partnership', 'llp', 'company')),
    gstin TEXT,
    pan TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ledger Mapping Templates table
CREATE TABLE IF NOT EXISTS public.ledger_mapping_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Client Validation & Auto-Correct Rules table
CREATE TABLE IF NOT EXISTS public.client_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('validation', 'auto_correct', 'gst_check', 'voucher_match')),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_rules ENABLE ROW LEVEL SECURITY;

-- RLS for clients
CREATE POLICY "Active members can view scoped clients"
    ON public.clients
    FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and seniors can manage clients"
    ON public.clients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = clients.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );

-- RLS for templates and rules
CREATE POLICY "Active members can view templates and rules"
    ON public.ledger_mapping_templates FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and seniors can manage templates"
    ON public.ledger_mapping_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = ledger_mapping_templates.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );

CREATE POLICY "Active members can view rules"
    ON public.client_rules FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Owners and seniors can manage rules"
    ON public.client_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = client_rules.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );
