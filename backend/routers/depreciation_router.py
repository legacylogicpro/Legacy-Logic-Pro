"""
Legacy Logic Pro — Fixed Asset & Depreciation Router
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context, require_role
from models.schemas import FixedAssetCreate

router = APIRouter()

@router.post("/assets")
async def add_fixed_asset(
    payload: FixedAssetCreate,
    ctx: WorkspaceContext = Depends(require_role(["firm_owner_admin", "senior_associate"]))
):
    """Adds an asset to the client's fixed asset register with Section 32 WDV rates."""
    is_half_rate = payload.days_used_in_fy < 180
    effective_rate = payload.it_act_rate / 2 if is_half_rate else payload.it_act_rate
    dep_amount = round((payload.cost * effective_rate) / 100, 2)
    closing_wdv = round(payload.cost - dep_amount, 2)

    return {
        "status": "success",
        "asset_name": payload.asset_name,
        "effective_rate": effective_rate,
        "is_half_rate_applied": is_half_rate,
        "depreciation_amount": dep_amount,
        "closing_wdv": closing_wdv
    }
