from supabase import Client

from config import get_settings

from .base import with_retry

settings = get_settings()


class AuthService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    @with_retry
    def sign_up(self, email: str, password: str, **metadata) -> dict:
        response = self.supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": metadata}
        })
        return {
            "user": response.user,
            "session": response.session,
        }

    @with_retry
    def sign_in(self, email: str, password: str) -> dict:
        response = self.supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        return {
            "user": response.user,
            "session": response.session,
        }

    @with_retry
    def refresh_session(self, refresh_token: str) -> dict:
        response = self.supabase.auth.refresh_session(refresh_token)
        return {
            "user": response.user,
            "session": response.session,
        }

    @with_retry
    def sign_out(self, token: str) -> None:
        self.supabase.auth.admin.sign_out(token)

    @with_retry
    def get_user(self, token: str) -> dict | None:
        try:
            user = self.supabase.auth.get_user(token)
            return user.model_dump() if user else None
        except Exception:
            return None

    @with_retry
    def reset_password(self, email: str) -> dict:
        return self.supabase.auth.reset_password_email(email)

    @with_retry
    def change_password(self, user_id: str, email: str, current_password: str, new_password: str) -> dict:
        try:
            self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": current_password,
            })
        except Exception:
            raise ValueError("Current password is incorrect")

        self.supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": new_password},
        )
        return {"message": "Password updated successfully"}


def get_auth_service(supabase: Client) -> AuthService:
    return AuthService(supabase)
