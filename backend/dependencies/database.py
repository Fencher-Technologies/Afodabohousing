from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from config import get_settings


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


def get_supabase_client() -> Client:
    settings = get_settings()
    return _get_cached_client(settings.supabase_anon_key, is_service=False)


def get_service_client() -> Client:
    settings = get_settings()
    return _get_cached_client(settings.supabase_service_role_key, is_service=True)


SupabaseClient = Client
