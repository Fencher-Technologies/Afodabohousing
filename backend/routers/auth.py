import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_active_user,
    require_super_admin_or_manager,
)
from models import ProfileResponse, ProfileUpdate
from services import AuthService, get_auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


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
    email: str
    role: str
    token: str
    expires_at: str
    status: str


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
    role: str | None = None
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    user_metadata: dict | None = None


class RoleAssignRequest(BaseModel):
    user_id: str
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


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


def _find_auth_user_by_email(supabase: Client, email: str) -> str | None:
    try:
        result = supabase.auth.admin.list_users()
        for user in result:
            if hasattr(user, "email") and user.email == email:
                return user.id
            if isinstance(user, dict) and user.get("email") == email:
                return user.get("id")
    except Exception as e:
        logger.warning("Failed to list auth users for email lookup: %s", str(e))
    return None


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
    user_id = str(user_data.get("id") or "")

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
    )


@router.post(
    "/invite",
    response_model=InviteResponse,
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
            detail=f"A user with email '{data.email}' already exists in the system. They can sign in directly.",
        )

    existing_auth = _find_auth_user_by_email(supabase, data.email)
    if existing_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{data.email}' already exists but has no profile. Contact support.",
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
        email=invitation["email"],
        role=invitation["role"],
        token=str(invitation["token"]),
        expires_at=invitation["expires_at"],
        status=invitation["status"],
    )


@router.post("/accept-invite", response_model=TokenResponse)
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
        expires_at = expires_at.replace(tzinfo=UTC)

    if expires_at < datetime.now(UTC):
        supabase.table("invitations").update({"status": "expired"}).eq("id", invitation["id"]).execute()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    invite_email = invitation["email"]
    existing_user_id = _find_auth_user_by_email(supabase, invite_email)

    if existing_user_id:
        logger.info("User %s already exists — updating profile and signing in", existing_user_id)

        profile_payload = {
            "user_id": existing_user_id,
            "email": invite_email,
            "full_name": data.full_name,
            "phone": data.phone or "",
            "role": invitation["role"],
            "created_by": invitation["invited_by"],
            "status": "active",
        }
        if invitation.get("manager_id"):
            profile_payload["manager_id"] = invitation["manager_id"]

        try:
            supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
        except Exception as e:
            logger.error("Failed to upsert profile for existing user %s: %s", existing_user_id, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile for existing account",
            )

        supabase.table("invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()

        try:
            sign_in_result = supabase.auth.sign_in_with_password({
                "email": invite_email,
                "password": data.password,
            })
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account exists but sign-in failed: {str(e)}",
            )

        session = sign_in_result.session
        return TokenResponse(
            access_token=session.access_token,
            user={"id": existing_user_id, "email": invite_email},
            role=invitation["role"],
        )

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": invite_email,
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
        "email": invite_email,
        "full_name": data.full_name,
        "phone": data.phone or "",
        "role": invitation["role"],
        "created_by": invitation["invited_by"],
        "status": "active",
    }
    if invitation.get("manager_id"):
        profile_payload["manager_id"] = invitation["manager_id"]

    try:
        supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
    except Exception as e:
        logger.error("Failed to upsert profile for new user %s: %s", user_id, str(e))
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile — please try accepting the invitation again",
        )

    supabase.table("invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()

    try:
        sign_in_result = supabase.auth.sign_in_with_password({
            "email": invite_email,
            "password": data.password,
        })
    except Exception as e:
        logger.error("Sign-in after accept-invite failed for %s: %s", invite_email, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account created but sign-in failed — please try logging in",
        )

    session = sign_in_result.session
    user_data = new_user.model_dump() if hasattr(new_user, "model_dump") else {"id": str(user_id), "email": invite_email}

    return TokenResponse(
        access_token=session.access_token,
        user=user_data,
        role=invitation["role"],
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
    )


@router.post("/signin/form", response_model=TokenResponse)
def signin_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: Client = Depends(get_service_client),
    service: AuthService = Depends(get_auth_svc),
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


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters",
        )

    try:
        supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": data.current_password,
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    try:
        supabase.auth.update_user({"password": data.new_password})
    except Exception as e:
        logger.error("Failed to update password for %s: %s", current_user.email, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not change password",
        )

    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UserResponse:
    profile = _get_profile(current_user.id, supabase) or {}

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=profile.get("role", current_user.role),
        user_metadata=profile.get("user_metadata"),
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    response = supabase.table("profiles").select("*").eq("user_id", current_user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**response.data[0])


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
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
