import type { ProfileRow, UserRole } from '../types/supabase';
import { apiRequest } from './backend-api';
import { mapBackendProfileToProfileRow } from './backend-mappers';
import { clearStoredAuthSession, setStoredAuthSession } from './auth-storage';
import { sendSmsMessage } from './platform';
import type { AuthSession, AuthUser } from '../types/auth';

function isKnownRole(role: string | null | undefined): role is Exclude<UserRole, null> {
  return role === 'tenant' || role === 'house_manager' || role === 'admin';
}

export interface RegisterPayload {
  email: string;
  fullName: string;
  password: string;
  phone: string;
  role: Exclude<UserRole, 'admin' | null>;
}

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  userId: string;
}

export interface SendInvitePayload {
  email: string;
  role: 'tenant';
}

export interface SendInviteResponse {
  id: string;
  email: string;
  token: string;
  role: string;
  status: string;
  expires_at: string;
}

export async function sendInvite(payload: SendInvitePayload): Promise<SendInviteResponse> {
  return apiRequest<SendInviteResponse>('/auth/invite', {
    auth: true,
    body: payload,
    method: 'POST',
  });
}

export interface AuthSnapshot {
  profile: ProfileRow | null;
  role: UserRole;
  session: AuthSession | null;
  user: AuthUser | null;
}

export async function fetchUserRole(userId: string): Promise<UserRole> {
  void userId;

  const response = await apiRequest<{ email: string; role?: string | null; user_id: string }>(
    '/auth/roles',
    {
      auth: true,
    },
  );

  return isKnownRole(response.role) ? response.role : null;
}

export async function fetchProfile(userId: string) {
  void userId;
  const profile = await apiRequest<{
    avatar_url?: string | null;
    created_at: string;
    email?: string;
    full_name?: string | null;
    id: string;
    phone?: string | null;
    role?: string | null;
    updated_at?: string;
    user_id: string;
  }>('/auth/profile', {
    auth: true,
  });

  return mapBackendProfileToProfileRow(profile);
}

export async function fetchAuthSnapshot(session: AuthSession | null): Promise<AuthSnapshot> {
  if (!session?.user) {
    return {
      profile: null,
      role: null,
      session: null,
      user: null,
    };
  }

  const [roleResult, profileResult] = await Promise.allSettled([
    fetchUserRole(session.user.id),
    fetchProfile(session.user.id),
  ]);

  const sessionRole = isKnownRole(session.role) ? session.role : null;
  const metadataRole = isKnownRole(
    typeof session.user.user_metadata?.role === 'string' ? session.user.user_metadata.role : null,
  )
    ? (session.user.user_metadata?.role as Exclude<UserRole, null>)
    : null;
  const role =
    roleResult.status === 'fulfilled' && isKnownRole(roleResult.value)
      ? roleResult.value
      : (sessionRole ?? metadataRole ?? null);
  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;

  return {
    profile,
    role,
    session,
    user: session.user,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const response = await apiRequest<{
    access_token: string;
    refresh_token?: string | null;
    role?: string | null;
    token_type: string;
    user: {
      email: string;
      id: string;
      user_metadata?: Record<string, unknown> | null;
    };
  }>('/auth/signin', {
    body: { email, password },
    method: 'POST',
  });

  const session: AuthSession = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    role: isKnownRole(response.role) ? response.role : null,
    user: {
      email: response.user.email,
      id: response.user.id,
      user_metadata: response.user.user_metadata ?? null,
    },
  };

  await setStoredAuthSession(session);

  return session;
}

export async function registerUser(payload: RegisterPayload) {
  const response = await apiRequest<{
    access_token: string;
    refresh_token?: string | null;
    role?: string | null;
    token_type: string;
    user: {
      email: string;
      id: string;
      user_metadata?: Record<string, unknown> | null;
    };
  }>('/auth/signup', {
    body: {
      email: payload.email,
      full_name: payload.fullName,
      password: payload.password,
      phone: payload.phone || null,
      role: payload.role,
    },
    method: 'POST',
  });

  const session: AuthSession = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? null,
    role: isKnownRole(response.role) ? response.role : payload.role,
    user: {
      email: response.user.email,
      id: response.user.id,
      user_metadata: response.user.user_metadata ?? {
        full_name: payload.fullName,
        role: payload.role,
      },
    },
  };

  await setStoredAuthSession(session);

  if (payload.phone) {
    try {
      await sendSmsMessage(
        payload.phone,
        `Welcome to Afodabo Housing! Your account has been created as ${
          payload.role === 'house_manager' ? 'House Manager' : 'Tenant'
        }.`,
      );
    } catch {
      return session;
    }
  }

  return session;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
  fullName: string;
  phone: string;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await apiRequest('/auth/change-password', {
    auth: true,
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
    method: 'POST',
  });
}

export async function acceptInvite(payload: AcceptInvitePayload) {
  const response = await apiRequest<{
    access_token: string;
    role?: string | null;
    user: {
      email: string;
      id: string;
      user_metadata?: Record<string, unknown> | null;
    };
    user_id: string;
  }>('/auth/accept-invite', {
    body: {
      token: payload.token,
      password: payload.password,
      full_name: payload.fullName,
      phone: payload.phone || null,
    },
    method: 'POST',
  });

  const session: AuthSession = {
    accessToken: response.access_token,
    refreshToken: null,
    role: response.role === 'tenant' || response.role === 'house_manager' ? response.role : null,
    user: {
      email: response.user.email,
      id: response.user.id,
      user_metadata: response.user.user_metadata ?? null,
    },
  };

  await setStoredAuthSession(session);

  return session;
}

export async function signOutUser() {
  try {
    await apiRequest('/auth/signout', {
      auth: true,
      method: 'POST',
    });
  } finally {
    await clearStoredAuthSession();
  }
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const normalizedName = payload.fullName.trim();
  const normalizedPhone = payload.phone.trim();

  if (!normalizedName) {
    throw new Error('Full name is required.');
  }

  void payload.userId;

  const profile = await apiRequest<{
    avatar_url?: string | null;
    created_at: string;
    email?: string;
    full_name?: string | null;
    id: string;
    phone?: string | null;
    role?: string | null;
    updated_at?: string;
    user_id: string;
  }>('/auth/profile', {
    auth: true,
    body: {
      full_name: normalizedName,
      phone: normalizedPhone || null,
    },
    method: 'PATCH',
  });

  return mapBackendProfileToProfileRow(profile);
}
