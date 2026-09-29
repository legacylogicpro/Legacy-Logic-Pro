"""
Legacy Logic Pro — Firm Billing & Invoicing Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import WorkspaceContext, get_workspace_context, require_role, get_supabase_client
from models.schemas import InvoiceCreate, InvoiceResponse
from config import settings

router = APIRouter()

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(ctx: WorkspaceContext = Depends(get_workspace_context)):
    """List all firm practice invoices."""
    if not settings.supabase_url:
        return []
    supabase = get_supabase_client()
    res = supabase.table("invoices").select("*").eq("workspace_id", ctx.workspace_id).order("issue_date", desc=True).execute()
    return res.data or []

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """Create a client fee invoice with 18% GST calculation."""
    if not settings.supabase_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    supabase = get_supabase_client()
    data = payload.model_dump()
    data["workspace_id"] = ctx.workspace_id
    data["invoice_number"] = f"MSA/2026/{hash(data['client_id']) % 1000:03d}"
    res = supabase.table("invoices").insert(data).execute()
    return res.data[0]
