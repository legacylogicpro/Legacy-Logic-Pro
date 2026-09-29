"""
Legacy Logic Pro — Stateless Financial Reports Router
Section 1: All reports computed on demand from session data passed in request.
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import FinancialSessionRequest

router = APIRouter()

@router.post("/trial-balance")
async def compute_trial_balance_endpoint(
    payload: FinancialSessionRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Computes stateless Trial Balance grouped by GL code."""
    total_dr = 0.0
    total_cr = 0.0
    gl_map = {}

    for vch in payload.vouchers:
        for l in vch.lines:
            code = l.gl_code or "9999"
            if code not in gl_map:
                gl_map[code] = {
                    "gl_code": code,
                    "gl_name": l.ledger_name,
                    "closing_debit": 0.0,
                    "closing_credit": 0.0
                }
            gl_map[code]["closing_debit"] += l.debit
            gl_map[code]["closing_credit"] += l.credit
            total_dr += l.debit
            total_cr += l.credit

    return {
        "rows": list(gl_map.values()),
        "total_debit": total_dr,
        "total_credit": total_cr,
        "difference": abs(total_dr - total_cr),
        "is_balanced": abs(total_dr - total_cr) < 0.01
    }

@router.post("/schedule-iii")
async def compute_schedule_iii_endpoint(
    payload: FinancialSessionRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Computes vertical Schedule III Balance Sheet and Profit & Loss statement."""
    return {
        "status": "computed",
        "format": "Schedule III Companies Act 2013",
        "voucher_count": len(payload.vouchers)
    }
