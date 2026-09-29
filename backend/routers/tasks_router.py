"""
Legacy Logic Pro — Practice Workflow & Tasks Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import WorkspaceContext, get_workspace_context, require_role, get_supabase_client
from models.schemas import PracticeTaskCreate, PracticeTaskResponse
from config import settings

router = APIRouter()

@router.get("/", response_model=List[PracticeTaskResponse])
async def list_tasks(ctx: WorkspaceContext = Depends(get_workspace_context)):
    """List all practice tasks in the user's workspace."""
    if not settings.supabase_url:
        return []
    supabase = get_supabase_client()
    res = supabase.table("practice_tasks").select("*").eq("workspace_id", ctx.workspace_id).order("due_date").execute()
    return res.data or []

@router.post("/", response_model=PracticeTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: PracticeTaskCreate,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """Assign a new practice task. Restricted to Owners and Senior Associates."""
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    supabase = get_supabase_client()
    data = payload.model_dump()
    data["workspace_id"] = ctx.workspace_id
    res = supabase.table("practice_tasks").insert(data).execute()
    return res.data[0]
