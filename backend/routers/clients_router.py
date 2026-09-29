"""
Legacy Logic Pro — Clients API Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import WorkspaceContext, get_workspace_context, require_role, get_supabase_client
from models.schemas import ClientCreate, ClientResponse
from config import settings

router = APIRouter()

@router.get("/", response_model=List[ClientResponse])
async def list_clients(ctx: WorkspaceContext = Depends(get_workspace_context)):
    """List all clients scoped to the authenticated user's workspace."""
    if not settings.supabase_url:
        return []
    supabase = get_supabase_client()
    res = supabase.table("clients").select("*").eq("workspace_id", ctx.workspace_id).order("name").execute()
    return res.data or []

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """Create a new client practice profile. Restricted to Owner and Senior Associate."""
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    supabase = get_supabase_client()
    insert_data = payload.model_dump()
    insert_data["workspace_id"] = ctx.workspace_id
    res = supabase.table("clients").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create client")
    return res.data[0]

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """Delete a client practice profile. Restricted to Owner and Senior Associate."""
    if not settings.supabase_url:
        return
    supabase = get_supabase_client()
    supabase.table("clients").delete().eq("id", client_id).eq("workspace_id", ctx.workspace_id).execute()
    return None
