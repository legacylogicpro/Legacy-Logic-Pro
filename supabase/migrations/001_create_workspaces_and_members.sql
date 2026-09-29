-- ====================================================================
-- MIGRATION 001: Workspaces and Multi-Tenant Members
-- Idempotent schema definition for Legacy Logic Pro
-- ====================================================================

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'elite')) DEFAULT 'pro',
    seat_limit INT NOT NULL DEFAULT 8,
    uploads_used_this_month INT NOT NULL DEFAULT 0,
    plan_activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('firm_owner_admin', 'senior_associate', 'junior_associate')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by TEXT NOT NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper security function to verify active membership
CREATE OR REPLACE FUNCTION public.is_active_workspace_member(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id
        AND user_id = auth.uid()
        AND is_active = true
    );
$$;

-- RLS Policies on workspaces
CREATE POLICY "Active members can view their workspace"
    ON public.workspaces
    FOR SELECT
    USING (public.is_active_workspace_member(id));

CREATE POLICY "Firm owners can update their workspace"
    ON public.workspaces
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = id
            AND user_id = auth.uid()
            AND role = 'firm_owner_admin'
            AND is_active = true
        )
    );

-- RLS Policies on workspace_members
CREATE POLICY "Active members can view fellow members"
    ON public.workspace_members
    FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

CREATE POLICY "Firm owners can invite or modify members"
    ON public.workspace_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_members.workspace_id
            AND user_id = auth.uid()
            AND role = 'firm_owner_admin'
            AND is_active = true
        )
    );
