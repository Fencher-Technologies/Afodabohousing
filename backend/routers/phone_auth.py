import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client
from dependencies import get_service_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/phone", tags=["auth"])


class PhoneSignInRequest(BaseModel):
    phone: str


class PhoneVerifyRequest(BaseModel):
    phone: str
    token: str


class PhoneSignInResponse(BaseModel):
    message: str
    access_token: str | None = None
    refresh_token: str | None = None
    user: dict | None = None


@router.post("/signin", response_model=PhoneSignInResponse)
def phone_signin(
    data: PhoneSignInRequest,
    supabase: Client = Depends(get_service_client),
) -> PhoneSignInResponse:
    try:
        result = supabase.auth.sign_in_with_otp({"phone": data.phone})
        return PhoneSignInResponse(message="OTP sent to phone number")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify", response_model=PhoneSignInResponse)
def phone_verify(
    data: PhoneVerifyRequest,
    supabase: Client = Depends(get_service_client),
) -> PhoneSignInResponse:
    try:
        result = supabase.auth.verify_otp({"phone": data.phone, "token": data.token, "type": "sms"})
        session = result.session
        user_data = result.user.model_dump() if hasattr(result.user, "model_dump") else {"phone": data.phone}
        return PhoneSignInResponse(
            message="Phone verified",
            access_token=session.access_token,
            refresh_token=getattr(session, "refresh_token", None),
            user=user_data,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
