import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_admin,
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


def get_auth_svc(supabase: Client = Depends(get_supabase_client)) -> AuthService:
    return get_auth_service(supabase)


def _resolve_role(service_supabase: Client, user_id: str) -> str | None:
    try:
        result = service_supabase.table("user_roles").select("role").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0].get("role")
        profile_result = service_supabase.table("profiles").select("role").eq("user_id", user_id).execute()
        if profile_result.data:
            return profile_result.data[0].get("role")
    except Exception as e:
        logger.warning("Failed to resolve user role for %s: %s", user_id, str(e))
    return None


@router.post("/signup", response_model=TokenResponse)
def signup(
    data: SignUpRequest,
    service: AuthService = Depends(get_auth_svc),
    service_supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    if data.role not in {"tenant", "house_manager", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
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
        # Extract the Supabase error message from the HTTP error
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

    try:
        profile_payload = {
            "email": data.email,
            "full_name": data.full_name,
            "phone": data.phone,
            "user_id": user_data.get("id"),
        }
        service_supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
    except Exception as e:
        logger.warning("Failed to upsert profile after signup: %s", str(e))

    try:
        service_supabase.table("profiles").update({"role": data.role}).eq(
            "user_id", user_data.get("id")
        ).execute()
    except Exception as e:
        logger.warning("Failed to update profile role after signup: %s", str(e))

    try:
        service_supabase.table("user_roles").upsert(
            {"user_id": user_data.get("id"), "role": data.role},
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        logger.warning("Failed to upsert user role after signup: %s", str(e))

    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=data.role,
        user=user_data,
    )


@router.post("/signin", response_model=TokenResponse)
def signin(
    data: SignInRequest,
    service: AuthService = Depends(get_auth_svc),
    service_supabase: Client = Depends(get_service_client),
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
    user_data = result["user"].model_dump() if hasattr(result["user"], "model_dump") else result["user"]
    role = _resolve_role(service_supabase, str(user_data.get("id")))
    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=role,
        user=user_data,
    )


@router.post("/signin/form", response_model=TokenResponse)
def signin_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_svc),
    service_supabase: Client = Depends(get_service_client),
) -> TokenResponse:
    result = service.sign_in(email=form_data.username, password=form_data.password)
    user_data = result["user"].model_dump() if hasattr(result["user"], "model_dump") else result["user"]
    role = _resolve_role(service_supabase, str(user_data.get("id")))
    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=role,
        user=user_data,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    data: RefreshRequest,
    service: AuthService = Depends(get_auth_svc),
    service_supabase: Client = Depends(get_service_client),
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
    role = _resolve_role(service_supabase, str(user_data.get("id")))
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


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UserResponse:
    role = current_user.role
    user_metadata = None
    try:
        result = supabase.table("user_roles").select("role").eq("user_id", current_user.id).execute()
        if result.data:
            role = result.data[0].get("role", role)
        else:
            profile_result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if profile_result.data:
                role = profile_result.data[0].get("role", role)
    except Exception as e:
        logger.warning("Failed to fetch current user role: %s", str(e))
    try:
        user = supabase.auth.get_user()
        user_metadata = user.user.model_dump().get("user_metadata") if user else None
    except Exception as e:
        logger.warning("Failed to fetch user metadata: %s", str(e))
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=role,
        user_metadata=user_metadata,
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
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    result = supabase.table("user_roles").select("role").eq("user_id", current_user.id).execute()
    role = result.data[0].get("role") if result.data else current_user.role
    return {"user_id": current_user.id, "email": current_user.email, "role": role}


@router.post("/roles")
def assign_role(
    data: RoleAssignRequest,
    admin_user: CurrentUser = Depends(require_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if data.role not in {"tenant", "house_manager", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    profile_result = supabase.table("profiles").update({"role": data.role}).eq("user_id", data.user_id).execute()
    supabase.table("user_roles").upsert(
        {"user_id": data.user_id, "role": data.role},
        on_conflict="user_id",
    ).execute()

    if not profile_result.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return {"message": "Role assigned", "user_id": data.user_id, "role": data.role}

