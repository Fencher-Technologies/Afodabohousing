import json
import time
from urllib.request import urlopen

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from supabase import Client

from config import get_settings

from .database import get_service_client, get_supabase_client

security = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    role: str = "authenticated"
    exp: int


class CurrentUser(BaseModel):
    id: str
    email: str
    role: str = "authenticated"

    model_config = {"arbitrary_types_allowed": True}


_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600


def _get_jwks(supabase_url: str) -> dict:
    global _jwks_cache, _jwks_cache_time
    current_time = time.time()

    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        with urlopen(jwks_url, timeout=10) as response:
            _jwks_cache = json.loads(response.read())
            _jwks_cache_time = current_time
            return _jwks_cache
    except Exception:
        if _jwks_cache:
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to fetch JWKS",
        )


def _verify_token(token: str, settings) -> TokenPayload:
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwks = _get_jwks(settings.supabase_url)

    try:
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key.get("use"),
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.supabase_anon_key,
            issuer=f"{settings.supabase_url}/auth/v1",
        )
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTClaimsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid claims: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser:
    settings = get_settings()
    token = credentials.credentials

    try:
        payload = _verify_token(token, settings)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        id=payload.sub,
        email=payload.email or "",
        role=payload.role,
    )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser | None:
    if not credentials:
        return None

    settings = get_settings()
    try:
        payload = _verify_token(credentials.credentials, settings)
        return CurrentUser(
            id=payload.sub,
            email=payload.email or "",
            role=payload.role,
        )
    except HTTPException:
        return None
    except Exception:
        return None


def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        role = None

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
