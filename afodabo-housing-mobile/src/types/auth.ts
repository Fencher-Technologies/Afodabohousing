export interface AuthUser {
  email: string;
  id: string;
  user_metadata?: Record<string, unknown> | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string | null;
  role?: 'admin' | 'house_manager' | 'tenant' | null;
  user: AuthUser;
}
