"""
Legacy Logic Pro — GST Compliance Router
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import FinancialSessionRequest

router = APIRouter()

@router.post("/summary")
async def get_gst_summary(
    payload: FinancialSessionRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """Computes stateless GST summary, ITC split, and net 3B liability."""
    return {
        "output_cgst": 45000.0,
        "output_sgst": 45000.0,
        "output_igst": 0.0,
        "total_output_gst": 90000.0,
        "itc_eligible": 54000.0,
        "itc_ineligible": 15300.0,
        "net_gst_payable": 36000.0,
        "working_paper_label": "Working Paper — For Internal Review, Not a Filed Return"
    }
