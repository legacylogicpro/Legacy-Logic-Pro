"""
Legacy Logic Pro — Rules Engine Router
"""

from fastapi import APIRouter, Depends
from dependencies import WorkspaceContext, get_workspace_context

router = APIRouter()

@router.get("/")
async def list_rules(ctx: WorkspaceContext = Depends(get_workspace_context)):
    """List validation and auto-correct rules for workspace clients."""
    return [
        {
            "id": "r-1",
            "name": "Section 269ST Cash Alert",
            "is_active": True,
            "rule_type": "validation",
            "threshold": 200000.0
        }
    ]
