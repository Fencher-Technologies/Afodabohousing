import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_active_user,
    require_super_admin,
    require_super_admin_or_manager,
)
from models import ProfileResponse, ProfileUpdate
from services import AuthService, get_auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Request / Response Models ──


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None
    role: str = "tenant"


class InviteRequest(BaseModel):
    email: EmailStr
    role: str


class InviteResponse(BaseModel):
    message: str
    invitation_id: str


class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    full_name: str
    phone: str | None = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: dict
    role: str | None = None
    user_id: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    status: str | None = None
    full_name: str | None = None
    created_by: str | None = None
    manager_id: str | None = None
    user_metadata: dict | None = None


class ErrorResponse(BaseModel):
    detail: str


class RoleAssignRequest(BaseModel):
    user_id: str
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Helpers ──


def get_auth_svc(supabase: Client = Depends(get_supabase_client)) -> AuthService:
    return get_auth_service(supabase)


def _resolve_role(service_supabase: Client, user_id: str) -> str | None:
    try:
        result = service_supabase.table("profiles").select("role").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0].get("role")
    except Exception as e:
        logger.warning("Failed to resolve user role for %s: %s", user_id, str(e))
    return None


def _get_profile(user_id: str, supabase: Client) -> dict | None:
    result = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


# ── Endpoints ──


@router.post("/signup", response_model=TokenResponse)
def signup(
    data: SignUpRequest,
    service: AuthService = Depends(get_auth_svc),
    service_supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    if data.role != "tenant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public signup is only available for the tenant role",
        )

    try:
        result = service.sign_up(
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            phone=data.phone,
        )
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    if not result.get("session"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed - check your email for confirmation",
        )

    user = result["user"]
    user_data = user.model_dump() if hasattr(user, "model_dump") else user
    user_id = user_data.get("id")

    try:
        profile_payload = {
            "email": data.email,
            "full_name": data.full_name,
            "phone": data.phone,
            "user_id": user_id,
        }
        service_supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
        service_supabase.table("profiles").update({"role": data.role}).eq("user_id", user_id).execute()
    except Exception as e:
        logger.warning("Failed to upsert profile after signup: %s", str(e))

    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=data.role,
        user=user_data,
        user_id=str(user_id) if user_id else None,
    )


@router.post(
    "/invite",
    response_model=InviteResponse,
    responses={403: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
)
def invite_user(
    data: InviteRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> InviteResponse:
    valid_roles = {"house_manager", "tenant"}
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
        )

    if current_user.role == "super_admin" and data.role != "house_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin can only invite house managers",
        )

    if current_user.role == "house_manager" and data.role != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House manager can only invite tenants",
        )

    existing = supabase.table("profiles").select("user_id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    invite_payload = {
        "email": data.email,
        "role": data.role,
        "invited_by": current_user.id,
        "manager_id": current_user.id if data.role == "tenant" else None,
    }

    result = supabase.table("invitations").insert(invite_payload).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation",
        )

    invitation = result.data[0]

    logger.info(
        "Invitation created: role=%s email=%s invited_by=%s token=%s",
        data.role, data.email, current_user.id, invitation["token"],
    )

    return InviteResponse(
        message=f"Invitation sent to {data.email}",
        invitation_id=invitation["id"],
    )


@router.post(
    "/accept-invite",
    response_model=TokenResponse,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def accept_invite(
    data: AcceptInviteRequest,
    supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    result = (
        supabase.table("invitations")
        .select("*")
        .eq("token", data.token)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation token",
        )

    invitation = result.data[0]

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is already {invitation['status']}",
        )

    expires_at = invitation["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        supabase.table("invitations").update({"status": "expired"}).eq("id", invitation["id"]).execute()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": invitation["email"],
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    new_user = auth_result.user
    user_id = new_user.id

    profile_payload = {
        "user_id": user_id,
        "full_name": data.full_name,
        "phone": data.phone or "",
        "role": invitation["role"],
        "created_by": invitation["invited_by"],
        "status": "active",
    }
    if invitation.get("manager_id"):
        profile_payload["manager_id"] = invitation["manager_id"]

    supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()

    supabase.table("invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()

    sign_in_result = supabase.auth.sign_in_with_password({
        "email": invitation["email"],
        "password": data.password,
    })

    session = sign_in_result.session
    user_data = new_user.model_dump() if hasattr(new_user, "model_dump") else {"id": str(new_user.id), "email": invitation["email"]}

    return TokenResponse(
        access_token=session.access_token,
        user=user_data,
        role=invitation["role"],
        user_id=str(user_id),
    )


@router.post("/signin", response_model=TokenResponse)
def signin(
    data: SignInRequest,
    service: AuthService = Depends(get_auth_svc),
    supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    try:
        result = service.sign_in(email=data.email, password=data.password)
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg,
        )

    user = result["user"]
    user_data = user.model_dump() if hasattr(user, "model_dump") else user
    user_id = str(user_data.get("id") or "")

    profile = _get_profile(user_id, supabase)
    if profile and profile.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {profile['status']}. Please contact your administrator.",
        )

    role = (profile or {}).get("role", _resolve_role(supabase, user_id) or "tenant")

    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=role,
        user=user_data,
        user_id=user_id,
    )


@router.post("/signin/form", response_model=TokenResponse)
def signin_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_svc),
    supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    return signin(SignInRequest(email=form_data.username, password=form_data.password), service, supabase)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    data: RefreshRequest,
    service: AuthService = Depends(get_auth_svc),
    supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    try:
        result = service.refresh_session(data.refresh_token)
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg,
        )

    user_data = result["user"].model_dump() if hasattr(result["user"], "model_dump") else result["user"]
    user_id = str(user_data.get("id") or "")
    role = _resolve_role(supabase, user_id)

    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=role,
        user=user_data,
        user_id=user_id,
    )


@router.post("/signout")
def signout(
    current_user: CurrentUser = Depends(get_current_user),
    service: AuthService = Depends(get_auth_svc),
) -> dict:
    return {"message": "Successfully signed out"}


@router.post("/reset-password")
def reset_password(
    email: EmailStr,
    service: AuthService = Depends(get_auth_svc),
) -> dict:
    service.reset_password(email)
    return {"message": "Password reset email sent"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_service_client),
) -> UserResponse:
    profile = _get_profile(current_user.id, supabase) or {}

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=profile.get("role", current_user.role),
        status=profile.get("status", current_user.status),
        full_name=profile.get("full_name", current_user.full_name),
        created_by=str(profile["created_by"]) if profile.get("created_by") else None,
        manager_id=str(profile["manager_id"]) if profile.get("manager_id") else None,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    response = supabase.table("profiles").select("*").eq("user_id", current_user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**response.data[0])


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdate,
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    payload = data.model_dump(exclude_none=True, mode="json")
    response = supabase.table("profiles").update(payload).eq("user_id", current_user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**response.data[0])


@router.get("/roles")
def get_roles(
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    result = supabase.table("profiles").select("role, status").eq("user_id", current_user.id).execute()
    data = result.data[0] if result.data else {}
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "role": data.get("role", current_user.role),
        "status": data.get("status", current_user.status),
    }
