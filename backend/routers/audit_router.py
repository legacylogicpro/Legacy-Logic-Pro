"""
Legacy Logic Pro — Immutable Audit Trail Router
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context, get_supabase_client
from config import settings

router = APIRouter()

@router.get("/")
async def get_audit_trail(ctx: WorkspaceContext = Depends(get_workspace_context)):
    """Fetch immutable audit records."""
    if not settings.supabase_url:
        return []
    supabase = get_supabase_client()
    res = supabase.table("audit_trail").select("*").eq("workspace_id", ctx.workspace_id).order("created_at", desc=True).limit(100).execute()
    return res.data or []
