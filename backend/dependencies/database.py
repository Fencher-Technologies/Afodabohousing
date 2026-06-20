from functools import lru_cache

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, ClientOptions, create_client

from config import get_settings

security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=2)
def _get_cached_client(anon_key: str, is_service: bool = False) -> Client:
    settings = get_settings()
    key = settings.supabase_service_role_key if is_service else anon_key
    return create_client(
        settings.supabase_url,
        key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            headers={"X-Client-Info": "rental-management-api/0.2.0"},
            postgrest_client_timeout=settings.supabase_client_timeout,
        ),
    )


def get_supabase_client(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> Client:
    settings = get_settings()
    if not credentials:
        return _get_cached_client(settings.supabase_anon_key, is_service=False)

    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            headers={
                "Authorization": f"Bearer {credentials.credentials}",
                "X-Client-Info": "rental-management-api/0.2.0",
            },
            postgrest_client_timeout=settings.supabase_client_timeout,
        ),
    )


def get_service_client() -> Client:
    settings = get_settings()
    return _get_cached_client(settings.supabase_service_role_key, is_service=True)


SupabaseClient = Client
