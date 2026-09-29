"""
Legacy Logic Pro — AI Financial Copilot Router
Section 5.13: Uses Groq Llama 3.3 70B Versatile instead of Gemini.
Enforces hard check on enableAI session opt-in flag.
"""

import os
from fastapi import APIRouter, Depends, HTTPException
from dependencies import WorkspaceContext, get_workspace_context
from models.schemas import AIQueryRequest, AIQueryResponse
from config import settings
from groq import Groq

router = APIRouter()

@router.post("/query", response_model=AIQueryResponse)
async def query_ai_financial_copilot(
    payload: AIQueryRequest,
    ctx: WorkspaceContext = Depends(get_workspace_context)
):
    """
    Stateless financial advisory query powered by Groq (Llama 3.3 70B).
    Strictly gated by payload.enableAI.
    """
    if not payload.enableAI:
        raise HTTPException(
            status_code=403,
            detail="AI Assistant is disabled for this session. Zero AI API calls are permitted without explicit session opt-in."
        )

    # settings file se config le, ya fir direct OS environment variables se
    groq_api_key = getattr(settings, 'groq_api_key', None) or os.environ.get("GROQ_API_KEY")
    
    if not groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend server."
        )

    try:
        # Initialize Groq Client
        client = Groq(api_key=groq_api_key)

        system_prompt = f"""
You are an expert Indian Chartered Accountant advising on Legacy Logic Pro.
Context of currently loaded financial session:
Client: {payload.sessionData.get('clientName', 'Client')}
Vouchers Loaded: {len(payload.sessionData.get('vouchers', []))}

Format answers using the Indian numbering system (e.g. ₹12,34,567.00). Ground in Indian tax laws.
"""

        # Groq API Call (OpenAI jaisa format hota hai iska)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt.strip()},
                {"role": "user", "content": payload.query}
            ],
            temperature=0.2
        )

        answer_text = response.choices[0].message.content

        return AIQueryResponse(
            answer=answer_text or "No response generated.",
            advisory="Advisory only. Review against statutory vouchers and source documents before final audit sign-off.",
            modelUsed="llama-3.3-70b-versatile"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Groq reasoning execution failed: {str(e)}"
        )
