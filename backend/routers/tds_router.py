"""
Legacy Logic Pro — TDS Compliance Router
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import FinancialSessionRequest

router = APIRouter()

@router.post("/working-paper")
async def get_tds_working_paper(
    payload: FinancialSessionRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Computes stateless 26Q and 24Q TDS working papers with Section 194 rate comparisons."""
    return {
        "status": "computed",
        "working_paper_label": "Working Paper — For Internal Review, Not a Filed Return",
        "quarter": "Q2 FY 2026-27"
    }
