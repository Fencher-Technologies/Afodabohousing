# mypy: ignore-errors
import logging
import secrets
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
from phone import normalize_phone, phone_to_email, validate_pin
from services import (
    AuthService,
    PhoneAuthService,
    decrypt_password,
    encrypt_password,
    get_auth_service,
    get_phone_auth_service,
    hash_pin,
    verify_pin,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    phone: str | None = None
    role: str = "tenant"
    accepted_terms: bool = False
    terms_version: str | None = None
    privacy_version: str | None = None


class InviteRequest(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    role: str


class InviteResponse(BaseModel):
    message: str
    invitation_id: str
    email: str | None = None
    phone: str | None = None
    role: str
    token: str
    expires_at: str
    status: str


class AcceptInviteRequest(BaseModel):
    token: str
    password: str | None = None
    full_name: str
    phone: str | None = None
    verify_token: str | None = None
    pin: str | None = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    role: str | None = None
    token_type: str = "bearer"
    user: dict
    user_id: str | None = None


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


class PhoneSendOtpRequest(BaseModel):
    phone: str


class PhoneVerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class PhoneRegisterRequest(BaseModel):
    phone: str
    verify_token: str
    full_name: str
    pin: str
    role: str
    accepted_terms: bool = False
    terms_version: str | None = None
    privacy_version: str | None = None


class PhoneRegisterManagerRequest(BaseModel):
    phone: str
    verify_token: str
    first_name: str
    last_name: str
    email: str | None = None


class PhoneRegisterManagerResponse(BaseModel):
    success: bool
    message: str


class PhoneSignInRequest(BaseModel):
    phone: str
    pin: str


class PhoneLinkRequest(BaseModel):
    phone: str
    verify_token: str
    pin: str
    current_password: str


class PhoneForgotPinRequest(BaseModel):
    phone: str
    verify_token: str
    new_pin: str


class PhoneChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str


class PhoneOtpResponse(BaseModel):
    status: str
    message: str
    expires_in: int | None = None


class PhoneVerifyOtpResponse(BaseModel):
    valid: bool
    message: str
    verify_token: str | None = None


class PhoneRegisterResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    role: str
    token_type: str = "bearer"
    user: dict
    user_id: str | None = None


PhoneSignInResponse = TokenResponse


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
    if data.role not in ("tenant", "free", "house_manager"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public signup is only available for tenant, free, or house_manager roles",
        )

    if not data.accepted_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy to create an account.",
        )

    normalized_phone = None
    if data.phone:
        try:
            normalized_phone = normalize_phone(data.phone)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    existing_profile = (
        service_supabase.table("profiles")
        .select("id, user_id")
        .eq("email", data.email)
        .limit(1)
        .execute()
    )
    if existing_profile.data:
        auth_id = _find_auth_user_by_email(service_supabase, data.email)
        if not auth_id:
            service_supabase.table("profiles").delete().eq("id", existing_profile.data[0]["id"]).execute()

    try:
        result = service.sign_up(
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            phone=normalized_phone or data.phone,
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
            "phone": normalized_phone,
            "user_id": user_id,
            "role": data.role,
            "accepted_terms": True,
            "accepted_terms_at": datetime.now(UTC).isoformat(),
            "terms_version": data.terms_version or "1.0",
            "privacy_version": data.privacy_version or "1.0",
        }
        service_supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
    except Exception as e:
        logger.warning("Failed to upsert profile after signup: %s", str(e))

    return TokenResponse(
        access_token=result["session"].access_token,
        refresh_token=getattr(result["session"], "refresh_token", None),
        role=data.role,
        user=user_data,
        user_id=user_id,
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
    if not data.email and not data.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone must be provided.",
        )

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

    if data.email:
        normalized_email = data.email.lower().strip()
        existing = supabase.table("profiles").select("user_id").eq("email", normalized_email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A user with email '{normalized_email}' already exists in the system. They can sign in directly.",
            )
        existing_auth = _find_auth_user_by_email(supabase, normalized_email)
        if existing_auth:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email '{normalized_email}' already exists but has no profile. Contact support.",
            )

    if data.phone:
        normalized_phone = normalize_phone(data.phone)
        existing_phone = supabase.table("profiles").select("user_id").eq("phone", normalized_phone).execute()
        if existing_phone.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A user with phone '{normalized_phone}' already exists in the system. They can sign in directly.",
            )

    invite_payload = {
        "email": data.email.lower().strip() if data.email else None,
        "phone": normalize_phone(data.phone) if data.phone else None,
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
        "Invitation created: role=%s email=%s phone=%s invited_by=%s token=%s",
        data.role, data.email, data.phone, current_user.id, invitation["token"],
    )

    return InviteResponse(
        message=f"Invitation sent to {data.email or data.phone}",
        invitation_id=invitation["id"],
        email=invitation.get("email"),
        phone=invitation.get("phone"),
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

    invite_phone = invitation.get("phone")
    invite_email = invitation.get("email")

    # ── Phone-based invitation ──
    if invite_phone:
        phone = normalize_phone(invite_phone)

        if not data.verify_token or not data.pin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone invitations require verify_token and pin.",
            )

        pin_error = validate_pin(data.pin)
        if pin_error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pin_error)

        verify = _verify_phone_token(supabase, phone, data.verify_token)
        if not verify:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token.",
            )

        internal_email = phone_to_email(phone)
        password = secrets.token_urlsafe(24)

        pin_hash_val = hash_pin(data.pin)
        encrypted_password = encrypt_password(password, data.pin)

        orphan_id = _find_auth_user_by_email(supabase, internal_email)
        if orphan_id:
            try:
                supabase.auth.admin.delete_user(orphan_id)
            except Exception:
                pass

        try:
            auth_result = supabase.auth.admin.create_user({
                "email": internal_email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": data.full_name, "phone": phone},
            })
        except Exception as e:
            msg = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    body = e.response.json()
                    msg = body.get("msg", body.get("error_description", body.get("error", msg)))
                except Exception:
                    msg = str(e)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

        user = auth_result.user
        user_id = user.id

        profile_payload = {
            "user_id": user_id,
            "email": "",
            "full_name": data.full_name,
            "phone": phone,
            "role": invitation["role"],
            "created_by": invitation["invited_by"],
            "status": "active",
            "pin_hash": pin_hash_val,
            "auth_password_enc": encrypted_password,
            "phone_verified_at": datetime.now(UTC).isoformat(),
        }
        if invitation.get("manager_id"):
            profile_payload["manager_id"] = invitation["manager_id"]

        try:
            supabase.table("profiles").upsert(profile_payload, on_conflict="user_id").execute()
        except Exception as e:
            try:
                supabase.auth.admin.delete_user(user_id)
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create profile: {str(e)}",
            )

        supabase.table("invitations").update({"status": "accepted"}).eq("id", invitation["id"]).execute()

        try:
            sign_in_result = supabase.auth.sign_in_with_password({
                "email": internal_email,
                "password": password,
            })
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Account created but sign-in failed: {str(e)}",
            )

        session = sign_in_result.session
        user_data = user.model_dump() if hasattr(user, "model_dump") else {"id": str(user_id), "email": internal_email}

        return TokenResponse(
            access_token=session.access_token,
            refresh_token=getattr(session, "refresh_token", None),
            role=invitation["role"],
            user=user_data,
        )

    # ── Email-based invitation ──
    if not invite_email:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invitation has no email or phone.",
        )

    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email invitations require a password.",
        )

    existing_user_id = _find_auth_user_by_email(supabase, invite_email)

    if existing_user_id:
        logger.info("User %s already exists — updating profile and signing in", existing_user_id)

        profile_payload = {
            "user_id": existing_user_id,
            "email": invite_email,
            "full_name": data.full_name,
            "phone": normalize_phone(data.phone) if data.phone else "",
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
        "phone": normalize_phone(data.phone) if data.phone else "",
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

    role = (profile or {}).get("role") or _resolve_role(supabase, user_id) or "tenant"

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


# ── Phone Auth Helpers ──


def _verify_phone_token(supabase: Client, phone: str, token: str) -> bool:
    phone = normalize_phone(phone)
    now = datetime.now(UTC)
    result = (
        supabase.table("phone_otps")
        .select("*")
        .eq("phone", phone)
        .eq("otp_code", f"verify_token:{token}")
        .gte("expires_at", now.isoformat())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return False
    supabase.table("phone_otps").update({"verified_at": now.isoformat()}).eq("id", result.data[0]["id"]).execute()
    return True


# ── Phone Auth ──


@router.post("/phone/send-otp", response_model=PhoneOtpResponse)
async def send_phone_otp(
    data: PhoneSendOtpRequest,
    svc: PhoneAuthService = Depends(get_phone_auth_service),
) -> PhoneOtpResponse:
    result = await svc.send_otp(data.phone)
    return PhoneOtpResponse(**result)


@router.post("/phone/verify-otp", response_model=PhoneVerifyOtpResponse)
async def verify_phone_otp(
    data: PhoneVerifyOtpRequest,
    svc: PhoneAuthService = Depends(get_phone_auth_service),
) -> PhoneVerifyOtpResponse:
    token = await svc.verify_otp_for_token(data.phone, data.otp)
    if not token:
        return PhoneVerifyOtpResponse(valid=False, message="OTP verification failed", verify_token=None)
    return PhoneVerifyOtpResponse(valid=True, message="Phone verified", verify_token=token)


@router.post("/phone/register", response_model=PhoneRegisterResponse)
def register_phone(
    data: PhoneRegisterRequest,
    supabase: Client = Depends(get_service_client),
    svc: PhoneAuthService = Depends(get_phone_auth_service),
) -> PhoneRegisterResponse:
    phone = normalize_phone(data.phone)

    pin_error = validate_pin(data.pin)
    if pin_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pin_error)

    if data.role not in ("tenant", "house_manager", "manager"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'tenant' or 'house_manager'",
        )
    if data.role == "manager":
        data.role = "house_manager"

    if not data.accepted_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy to create an account.",
        )

    existing = svc.get_profile_by_phone(phone)
    if existing:
        internal_email = existing.get("email", phone_to_email(phone))
        auth_id = _find_auth_user_by_email(supabase, internal_email)
        if not auth_id:
            supabase.table("profiles").delete().eq("id", existing["id"]).execute()
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This phone number is already registered. Sign in with your PIN instead.",
            )

    verify = _verify_phone_token(supabase, phone, data.verify_token)
    if not verify:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token. Please verify your OTP again.",
        )

    internal_email = phone_to_email(phone)
    password = secrets.token_urlsafe(24)

    pin_hash_val = hash_pin(data.pin)
    encrypted_password = encrypt_password(password, data.pin)

    orphan_id = _find_auth_user_by_email(supabase, internal_email)
    if orphan_id:
        try:
            supabase.auth.admin.delete_user(orphan_id)
        except Exception:
            pass

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": internal_email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name, "phone": phone},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user = auth_result.user
    user_id = user.id

    try:
        supabase.table("profiles").upsert({
            "user_id": user_id,
            "email": "",
            "full_name": data.full_name,
            "phone": phone,
            "role": data.role,
            "status": "active",
            "pin_hash": pin_hash_val,
            "auth_password_enc": encrypted_password,
            "phone_verified_at": datetime.now(UTC).isoformat(),
            "accepted_terms": True,
            "accepted_terms_at": datetime.now(UTC).isoformat(),
            "terms_version": data.terms_version or "1.0",
            "privacy_version": data.privacy_version or "1.0",
        }, on_conflict="user_id").execute()
    except Exception as e:
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create profile: {str(e)}",
        )

    try:
        sign_in = supabase.auth.sign_in_with_password({
            "email": internal_email,
            "password": password,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account created but sign-in failed: {str(e)}",
        )

    session = sign_in.session
    user_data = user.model_dump() if hasattr(user, "model_dump") else {"id": str(user_id), "email": internal_email}

    return PhoneRegisterResponse(
        access_token=session.access_token,
        refresh_token=getattr(session, "refresh_token", None),
        user=user_data,
        role=data.role,
        user_id=user_id,
    )


@router.post("/phone/register-manager", response_model=PhoneRegisterManagerResponse)
def register_manager(
    data: PhoneRegisterManagerRequest,
    supabase: Client = Depends(get_service_client),
    svc: PhoneAuthService = Depends(get_phone_auth_service),
) -> PhoneRegisterManagerResponse:
    phone = normalize_phone(data.phone)

    if not data.first_name.strip() or not data.last_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First and last name are required")

    existing = svc.get_profile_by_phone(phone)
    if existing and existing.get("role") == "house_manager":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This phone number is already registered as a house manager.",
        )

    verify = _verify_phone_token(supabase, phone, data.verify_token)
    if not verify:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token. Please verify your OTP again.",
        )

    full_name = f"{data.first_name.strip()} {data.last_name.strip()}"
    email = data.email.strip() if data.email else None
    if email:
        existing_email = supabase.table("profiles").select("user_id").eq("email", email).execute()
        if existing_email.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )

    internal_email = email or phone_to_email(phone)
    password = secrets.token_urlsafe(24)

    orphan_id = _find_auth_user_by_email(supabase, internal_email)
    if orphan_id:
        try:
            supabase.auth.admin.delete_user(orphan_id)
        except Exception:
            pass

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": internal_email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name, "phone": phone},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user = auth_result.user
    user_id = user.id

    try:
        supabase.table("profiles").upsert({
            "user_id": user_id,
            "email": email or '',
            "full_name": full_name,
            "phone": phone,
            "role": "house_manager",
            "status": "pending",
            "phone_verified_at": datetime.now(UTC).isoformat(),
        }, on_conflict="user_id").execute()
    except Exception as e:
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create profile: {str(e)}",
        )

    logger.info("House manager registered pending approval: phone=%s email=%s", phone, internal_email)

    return PhoneRegisterManagerResponse(
        success=True,
        message="Verification successful. Your registration is pending admin approval.",
    )


@router.post("/phone/signin", response_model=PhoneSignInResponse)
def signin_phone(
    data: PhoneSignInRequest,
    supabase: Client = Depends(get_service_client),
) -> PhoneSignInResponse:
    phone = normalize_phone(data.phone)

    profile = supabase.table("profiles").select("*").eq("phone", phone).execute()
    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number.",
        )

    profile = profile.data[0]

    if not profile.get("pin_hash") or not profile.get("auth_password_enc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account does not have a PIN set up. Please sign in with email and password.",
        )

    if not verify_pin(data.pin, profile["pin_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN.",
        )

    if profile.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {profile['status']}. Please contact your administrator.",
        )

    try:
        decrypted_password = decrypt_password(profile["auth_password_enc"], data.pin)
    except Exception as e:
        logger.error("Failed to decrypt auth password for %s: %s", profile["phone"], str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate. Please try again.",
        )

    email_to_use = profile.get("email")
    if not email_to_use:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account has no email configured.",
        )

    try:
        result = supabase.auth.sign_in_with_password({
            "email": email_to_use,
            "password": decrypted_password,
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)

    user_data = result.user
    user_data_dict = user_data.model_dump() if hasattr(user_data, "model_dump") else user_data

    return TokenResponse(
        access_token=result.session.access_token,
        refresh_token=getattr(result.session, "refresh_token", None),
        role=profile.get("role") or "tenant",
        user=user_data_dict,
    )


@router.post("/phone/link")
def link_phone(
    data: PhoneLinkRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    phone = normalize_phone(data.phone)

    pin_error = validate_pin(data.pin)
    if pin_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pin_error)

    existing = supabase.table("profiles").select("id").eq("phone", phone).execute()
    if existing.data:
        existing_id = existing.data[0].get("user_id")
        if existing_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This phone number is already linked to another account.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This phone number is already linked to your account.",
        )

    verify = _verify_phone_token(supabase, phone, data.verify_token)
    if not verify:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    profile = _get_profile(current_user.id, supabase)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profile has no email.")

    try:
        supabase.auth.sign_in_with_password({"email": email, "password": data.current_password})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    pin_hash_val = hash_pin(data.pin)
    encrypted_password = encrypt_password(data.current_password, data.pin)

    supabase.table("profiles").update({
        "phone": phone,
        "pin_hash": pin_hash_val,
        "auth_password_enc": encrypted_password,
        "phone_verified_at": datetime.now(UTC).isoformat(),
    }).eq("user_id", current_user.id).execute()

    return {"message": "Phone number linked successfully. You can now sign in with your phone and PIN."}


@router.post("/phone/forgot-pin")
def forgot_pin(
    data: PhoneForgotPinRequest,
    supabase: Client = Depends(get_service_client),
) -> dict:
    phone = normalize_phone(data.phone)

    pin_error = validate_pin(data.new_pin)
    if pin_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pin_error)

    verify = _verify_phone_token(supabase, phone, data.verify_token)
    if not verify:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    profile_result = supabase.table("profiles").select("*").eq("phone", phone).execute()
    if not profile_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number.",
        )

    profile = profile_result.data[0]

    if not profile.get("pin_hash") or not profile.get("auth_password_enc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This phone number is not linked to a PIN-based account.",
        )

    email = profile.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profile has no email.")

    new_password = secrets.token_urlsafe(24)

    try:
        supabase.auth.admin.update_user_by_id(profile["user_id"], {"password": new_password})
    except Exception as e:
        logger.error("Failed to update password for user %s: %s", profile["user_id"], str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset PIN. Please try again.",
        )

    pin_hash_val = hash_pin(data.new_pin)
    encrypted_password = encrypt_password(new_password, data.new_pin)

    supabase.table("profiles").update({
        "pin_hash": pin_hash_val,
        "auth_password_enc": encrypted_password,
    }).eq("user_id", profile["user_id"]).execute()

    return {"message": "PIN reset successfully. You can now sign in with your new PIN."}


@router.post("/phone/change-pin")
def change_pin(
    data: PhoneChangePinRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    pin_error = validate_pin(data.new_pin)
    if pin_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pin_error)

    profile = _get_profile(current_user.id, supabase)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

    if not profile.get("auth_password_enc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No PIN is set on this account. Link a phone first.",
        )

    if not verify_pin(data.current_pin, profile["pin_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current PIN is incorrect.",
        )

    try:
        decrypted_password = decrypt_password(profile["auth_password_enc"], data.current_pin)
    except Exception as e:
        logger.error("Failed to decrypt password for PIN change: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change PIN. Please try again.",
        )

    pin_hash_val = hash_pin(data.new_pin)
    encrypted_password = encrypt_password(decrypted_password, data.new_pin)

    supabase.table("profiles").update({
        "pin_hash": pin_hash_val,
        "auth_password_enc": encrypted_password,
    }).eq("user_id", current_user.id).execute()

    return {"message": "PIN changed successfully."}


# ── Helpers ──


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UserResponse:
    profile = _get_profile(current_user.id, supabase) or {}

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=profile.get("role") or current_user.role,
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
    if "phone" in payload:
        raw_phone = (payload["phone"] or "").strip()
        if raw_phone:
            try:
                payload["phone"] = normalize_phone(raw_phone)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=f"Invalid phone number: {exc}")
        else:
            payload["phone"] = None
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
