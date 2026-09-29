-- ====================================================================
-- MIGRATION 006: Immutable Insert-Only Audit Trail
-- Section 5.19: Insert-only at database level. No UPDATE or DELETE permitted
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Select policy: active members can view
CREATE POLICY "Active members can view audit trail"
    ON public.audit_trail FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

-- Insert policy: active members can insert audit entries
CREATE POLICY "Active members can append audit entries"
    ON public.audit_trail FOR INSERT
    WITH CHECK (public.is_active_workspace_member(workspace_id));

-- STRICT IMMUTABILITY: Revoke all UPDATE and DELETE rights on audit_trail
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_trail FROM authenticated, anon, public;

-- Safety trigger preventing update or delete even if superuser runs manual SQL
CREATE OR REPLACE FUNCTION public.prevent_audit_trail_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail is strictly immutable (WORM compliant). Modifications or deletions are prohibited by statutory policy.';
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trail_immutable ON public.audit_trail;
CREATE TRIGGER trg_audit_trail_immutable
    BEFORE UPDATE OR DELETE ON public.audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_trail_mutation();
