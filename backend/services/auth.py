from supabase import Client

from config import get_settings

settings = get_settings()


class AuthService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

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

    def sign_in(self, email: str, password: str) -> dict:
        response = self.supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        return {
            "user": response.user,
            "session": response.session,
        }

    def sign_out(self, token: str) -> None:
        self.supabase.auth.admin.sign_out(token)

    def get_user(self, token: str) -> dict | None:
        try:
            user = self.supabase.auth.get_user(token)
            return user.model_dump() if user else None
        except Exception:
            return None

    def reset_password(self, email: str) -> dict:
        return self.supabase.auth.reset_password_email(email)


def get_auth_service(supabase: Client) -> AuthService:
    return AuthService(supabase)
