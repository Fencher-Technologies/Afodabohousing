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

  // ── Phone Auth ──────────────────────────────────────────
  sendOtp: (phone: string) =>
    api.post<{ message: string; otp_length: number }>("/auth/phone/send-otp", { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<{ valid: boolean; message: string; verify_token?: string | null }>("/auth/phone/verify-otp", { phone, otp }),

  registerWithPhone: (data: { phone: string; full_name: string; pin: string; verify_token: string; accepted_terms?: boolean; terms_version?: string; privacy_version?: string }) =>
    api.post<SignInResponse>("/auth/phone/register", data),

  signInWithPhone: (phone: string, pin: string) =>
    api.post<SignInResponse>("/auth/phone/signin", { phone, pin }),

  linkPhone: (data: { phone: string; pin: string; current_password: string }) =>
    api.post<{ message: string }>("/auth/phone/link", data),

  forgotPin: (data: { phone: string; verify_token: string; new_pin: string }) =>
    api.post<{ message: string }>("/auth/phone/forgot-pin", data),

  changePin: (data: { current_pin: string; new_pin: string }) =>
    api.post<{ message: string }>("/auth/phone/change-pin", data),

  // ── Invites ──────────────────────────────────────────────
  sendInvite: (data: { email?: string; phone?: string; role: string }) =>
    api.post<{ message: string; invitation_id: string; token: string; expires_at: string; status: string }>("/auth/invite", data),

  acceptInvite: (data: { token: string; full_name: string; password?: string; verify_token?: string; pin?: string; phone?: string }) =>
    api.post<SignInResponse>("/auth/accept-invite", data),
};
