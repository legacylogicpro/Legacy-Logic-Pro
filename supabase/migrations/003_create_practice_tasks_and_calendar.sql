-- ====================================================================
-- MIGRATION 003: Practice Tasks & Compliance Calendar Reference
-- ====================================================================

-- 1. Compliance Due Dates Reference Table
CREATE TABLE IF NOT EXISTS public.compliance_due_dates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
    applicable_entity_types TEXT[] NOT NULL DEFAULT '{}',
    due_day_or_date TEXT NOT NULL,
    description TEXT NOT NULL,
    section_or_form TEXT NOT NULL
);

-- 2. Practice Tasks table
CREATE TABLE IF NOT EXISTS public.practice_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id TEXT,
    assignee_name TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'done', 'overdue')) DEFAULT 'pending',
    compliance_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.compliance_due_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_tasks ENABLE ROW LEVEL SECURITY;

-- Compliance calendar reference is readable by all authenticated users
CREATE POLICY "Allow authenticated read of compliance calendar"
    ON public.compliance_due_dates FOR SELECT
    TO authenticated
    USING (true);

-- Tasks: active workspace members can view
CREATE POLICY "Active members can view workspace tasks"
    ON public.practice_tasks FOR SELECT
    USING (public.is_active_workspace_member(workspace_id));

-- Tasks: junior associates can update status of their tasks; seniors & owners can manage all
CREATE POLICY "Seniors and owners can manage all tasks"
    ON public.practice_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = practice_tasks.workspace_id
            AND user_id = auth.uid()
            AND role IN ('firm_owner_admin', 'senior_associate')
            AND is_active = true
        )
    );

CREATE POLICY "Junior associates can update tasks"
    ON public.practice_tasks FOR UPDATE
    USING (public.is_active_workspace_member(workspace_id));
