"""
Legacy Logic Pro — AI Financial Copilot Router
Section 5.13: Uses Gemini 3.1 Pro Preview with Thinking Level HIGH.
Enforces hard check on enableAI session opt-in flag.
"""

from fastapi import APIRouter, Depends, HTTPException
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import AIQueryRequest, AIQueryResponse
from config import settings
from google import genai
from google.genai import types

router = APIRouter()

@router.post("/query", response_model=AIQueryResponse)
async def query_ai_financial_copilot(
    payload: AIQueryRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Stateless financial advisory query powered by Gemini 3.1 Pro with High Thinking.
    Strictly gated by payload.enableAI.
    """
    if not payload.enableAI:
        raise HTTPException(
            status_code=403,
            detail="AI Assistant is disabled for this session. Zero AI API calls are permitted without explicit session opt-in."
        )

    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the backend server."
        )

    try:
        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""
You are an expert Indian Chartered Accountant advising on Legacy Logic Pro.
Context of currently loaded financial session:
Client: {payload.sessionData.get('clientName', 'Client')}
Vouchers Loaded: {len(payload.sessionData.get('vouchers', []))}

Question from Auditor:
{payload.query}

Format answers using the Indian numbering system (e.g. ₹12,34,567.00). Ground in Indian tax laws.
"""

        response = client.models.generate_content(
            model="gemini-3.1-pro-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_level="HIGH"
                )
            )
        )

        return AIQueryResponse(
            answer=response.text or "No response generated.",
            advisory="Advisory only. Review against statutory vouchers and source documents before final audit sign-off.",
            modelUsed="gemini-3.1-pro-preview"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini reasoning execution failed: {str(e)}"
        )
