from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import ProfileResponse, ProfileUpdate
from services import AuthService, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
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


def get_auth_svc(supabase: Client = Depends(get_supabase_client)) -> AuthService:
    return get_auth_service(supabase)


@router.post("/signup", response_model=TokenResponse)
def signup(
    data: SignUpRequest,
    service: AuthService = Depends(get_auth_svc),
) -> TokenResponse:
    result = service.sign_up(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        phone=data.phone,
    )
    if not result.get("session"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed - check your email for confirmation",
        )
    user = result["user"]
    user_data = user.model_dump() if hasattr(user, "model_dump") else user

    if data.full_name:
        try:
            supabase = get_supabase_client()
            supabase.table("profiles").update({"full_name": data.full_name}).eq(
                "user_id", user_data.get("id")
            ).execute()
        except Exception:
            pass

    return TokenResponse(
        access_token=result["session"].access_token,
        user=user_data,
    )


@router.post("/signin", response_model=TokenResponse)
def signin(
    data: SignInRequest,
    service: AuthService = Depends(get_auth_svc),
) -> TokenResponse:
    result = service.sign_in(email=data.email, password=data.password)
    return TokenResponse(
        access_token=result["session"].access_token,
        user=result["user"].model_dump() if hasattr(result["user"], "model_dump") else result["user"],
    )


@router.post("/signin/form", response_model=TokenResponse)
def signin_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_svc),
) -> TokenResponse:
    result = service.sign_in(email=form_data.username, password=form_data.password)
    return TokenResponse(
        access_token=result["session"].access_token,
        user=result["user"].model_dump() if hasattr(result["user"], "model_dump") else result["user"],
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
    supabase: Client = Depends(get_supabase_client),
) -> UserResponse:
    try:
        user = supabase.auth.get_user()
        user_metadata = user.user.model_dump().get("user_metadata") if user else None
    except Exception:
        user_metadata = None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
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
    payload = data.model_dump(exclude_none=True)
    response = supabase.table("profiles").update(payload).eq("user_id", current_user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**response.data[0])

