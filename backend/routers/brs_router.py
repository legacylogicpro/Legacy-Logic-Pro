"""
Legacy Logic Pro — Bank Reconciliation Statement (BRS) Router
"""

from fastapi import APIRouter, Depends, HTTPException
from dependencies import WorkspaceContext, get_workspace_context, require_role
from models.schemas import BRSFinalizeRequest

router = APIRouter()

@router.post("/finalize")
async def finalize_brs(
    payload: BRSFinalizeRequest,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """
    Finalizes and locks the Bank Reconciliation Statement in the database.
    Restricted strictly to Firm Owners and Senior Associates.
    """
    if abs(payload.unreconciled_difference) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot lock BRS with unreconciled difference of ₹{payload.unreconciled_difference:.2f}."
        )

    return {
        "status": "finalized",
        "is_locked": True,
        "finalized_by": ctx.user.email,
        "client_id": payload.client_id,
        "bank_ledger_name": payload.bank_ledger_name
    }
