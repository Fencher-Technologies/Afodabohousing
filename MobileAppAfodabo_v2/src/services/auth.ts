import { api } from "../lib/api-client";

interface SignInResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: Record<string, unknown>;
  role: string;
  user_id: string;
}

interface SignUpResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: Record<string, unknown>;
  role: string;
  user_id: string;
}

interface ProfileResponse {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
}

interface UserResponse {
  id: string;
  email: string;
  role: string;
  status: string | null;
  full_name: string | null;
  created_by: string | null;
  manager_id: string | null;
}

export const authService = {
  signIn: (email: string, password: string) =>
    api.post<SignInResponse>("/auth/signin", { email, password }),

  signUp: (data: { email: string; password: string; full_name?: string; phone?: string; role?: string }) =>
    api.post<SignUpResponse>("/auth/signup", data),

  signOut: () =>
    api.post<{ message: string }>("/auth/signout"),

  refreshToken: (refresh_token: string) =>
    api.post<SignInResponse>("/auth/refresh", { refresh_token }),

  getProfile: () =>
    api.get<ProfileResponse>("/auth/profile"),

  updateProfile: (data: Record<string, unknown>) =>
    api.patch<ProfileResponse>("/auth/profile", data),

  changePassword: (current_password: string, new_password: string) =>
    api.post<{ message: string }>("/auth/change-password", { current_password, new_password }),

  resetPassword: (email: string) =>
    api.post<{ message: string }>(`/auth/reset-password?email=${encodeURIComponent(email)}`),

  getMe: () =>
    api.get<UserResponse>("/auth/me"),
};
