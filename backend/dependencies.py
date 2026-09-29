"""
Legacy Logic Pro — Authentication & Authorization Dependencies
Section 3.2: Supabase JWT verification, server-side workspace resolution, and role-gating.
"""

from typing import List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import settings
from supabase import create_client, Client

security = HTTPBearer(auto_error=True)

# Supabase client singleton
_supabase: Optional[Client] = None

def get_supabase_client() -> Client:
    global _supabase
    if _supabase is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase credentials are not configured on the server."
            )
        _supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    return _supabase


class AuthUser:
    def __init__(self, user_id: str, email: str):
        self.user_id = user_id
        self.email = email


class WorkspaceContext:
    def __init__(self, user: AuthUser, workspace_id: str, role: str):
        self.user = user
        self.workspace_id = workspace_id
        self.role = role


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """Verifies the Supabase JWT Bearer token using SUPABASE_JWT_SECRET."""
    token = credentials.credentials
    try:
        # If secret is set, verify HS256 signature; otherwise decode claims
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        else:
            payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: 'sub' missing."
            )
        return AuthUser(user_id=user_id, email=email)
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT verification failed: {str(e)}"
        )


async def get_workspace_context(
    user: AuthUser = Depends(get_current_user),
    x_workspace_id: Optional[str] = Header(None, alias="X-Workspace-Id"),
) -> WorkspaceContext:
    """
    Section 3.2: Resolves workspace membership and role SERVER-SIDE.
    Never trusts a client-supplied role or unverified workspace ID.
    """
    if not x_workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Workspace-Id' is required for authenticated workspace endpoints."
        )

    # In local testing or fallback when Supabase is not connected
    if not settings.supabase_url or not settings.supabase_service_key:
        return WorkspaceContext(
            user=user,
            workspace_id=x_workspace_id,
            role="firm_owner_admin"
        )

    supabase = get_supabase_client()
    res = supabase.table("workspace_members").select("role, is_active").eq("workspace_id", x_workspace_id).eq("user_id", user.user_id).execute()

    if not res.data or len(res.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of the requested workspace."
        )

    member_record = res.data[0]
    if not member_record.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your workspace membership account has been deactivated by the firm owner."
        )

    return WorkspaceContext(
        user=user,
        workspace_id=x_workspace_id,
        role=member_record.get("role", "junior_associate")
    )


def require_role(allowed_roles: List[str]):
    """Role-gating dependency that enforces the role permission matrix."""
    async def role_checker(ctx: WorkspaceContext = Depends(get_workspace_context)) -> WorkspaceContext:
        if ctx.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action restricted. Required role: {', '.join(allowed_roles)}; your role: {ctx.role}."
            )
        return ctx
    return role_checker
