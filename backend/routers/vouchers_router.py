"""
Legacy Logic Pro — Vouchers & Day Book Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import VoucherEntrySchema

router = APIRouter()

@router.post("/manual", response_model=VoucherEntrySchema)
async def post_manual_voucher(
    voucher: VoucherEntrySchema,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Validates double entry equilibrium (total debits equal total credits)
    and returns verified voucher to merge into session entry pool.
    """
    total_debit = sum(line.debit for line in voucher.lines)
    total_credit = sum(line.credit for line in voucher.lines)

    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Double entry imbalance: Debits (₹{total_debit:.2f}) != Credits (₹{total_credit:.2f})"
        )

    voucher.source = "manual"
    voucher.is_reviewed = True
    return voucher
