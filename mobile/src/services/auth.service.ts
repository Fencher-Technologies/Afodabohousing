import type { Session, User } from '@supabase/supabase-js';
import { isAppRole } from '../utils/roles';
import type { AppRole, ProfileRow } from '../types/database';
import { supabase } from './supabase';

export type RegisterableRole = Exclude<AppRole, 'admin'>;

export interface AuthSnapshot {
  profile: ProfileRow | null;
  role: AppRole | null;
  session: Session | null;
  user: User | null;
}

export interface RegisterPayload {
  email: string;
  fullName: string;
  password: string;
  phone: string;
  role: RegisterableRole;
}

interface SaveProfilePayload {
  fullName: string;
  phone: string;
  userId: string;
}

function getAuthErrorDetails(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return {
      message: String(error),
    };
  }

  const errorRecord = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
    stack?: unknown;
  };

  return {
    code: typeof errorRecord.code === 'string' ? errorRecord.code : null,
    message: typeof errorRecord.message === 'string' ? errorRecord.message : String(error),
    name: typeof errorRecord.name === 'string' ? errorRecord.name : null,
    status: typeof errorRecord.status === 'number' ? errorRecord.status : null,
    stack: typeof errorRecord.stack === 'string' ? errorRecord.stack : null,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(error);
}

export async function fetchStoredUserRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.info('[auth-debug] role fetch result', {
    data,
    error: error?.message ?? null,
    userId,
  });

  if (error) {
    throw error;
  }

  return isAppRole(data?.role) ? data.role : null;
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.info('[auth-debug] profile fetch result', {
    data,
    error: error?.message ?? null,
    userId,
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

function getMetadataRole(user: User): AppRole | null {
  const metadataRole = user.user_metadata?.role;

  return isAppRole(metadataRole) ? metadataRole : null;
}

export async function fetchAuthSnapshot(session: Session | null): Promise<AuthSnapshot> {
  if (!session?.user) {
    console.info('[auth-debug] final resolved role', {
      role: null,
      source: 'signed-out',
    });

    return {
      profile: null,
      role: null,
      session: null,
      user: null,
    };
  }

  const metadataRole = getMetadataRole(session.user);
  const [storedRoleResult, profileResult] = await Promise.allSettled([
    fetchStoredUserRole(session.user.id),
    fetchProfile(session.user.id),
  ]);
  const storedRole = storedRoleResult.status === 'fulfilled' ? storedRoleResult.value : null;
  const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
  const resolvedRole = storedRole ?? metadataRole;

  if (storedRoleResult.status === 'rejected') {
    console.warn('[auth-debug] role fetch failed; using validated auth metadata fallback', {
      error: getErrorMessage(storedRoleResult.reason),
      metadataRole,
      userId: session.user.id,
    });
  }

  if (profileResult.status === 'rejected') {
    console.warn('[auth-debug] profile fetch failed; continuing without profile data', {
      error: getErrorMessage(profileResult.reason),
      userId: session.user.id,
    });
  }

  console.info('[auth-debug] final resolved role', {
    metadataRole,
    role: resolvedRole,
    source: storedRole ? 'user_roles' : metadataRole ? 'auth-metadata' : 'unavailable',
    userId: session.user.id,
  });

  return {
    profile,
    role: resolvedRole,
    session,
    user: session.user,
  };
}

async function saveUserRole(userId: string, role: AppRole) {
  const { data: existingRoles, error: readRoleError } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('user_id', userId);

  if (readRoleError) {
    console.error('[auth-debug] role save result', {
      error: readRoleError.message,
      role,
      stage: 'read-existing',
      success: false,
      userId,
    });
    throw new Error(`Could not check your account role. ${readRoleError.message}`);
  }

  if ((existingRoles?.length ?? 0) > 0) {
    const { data: updatedRoles, error: updateRoleError } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId)
      .select('role');

    if (updateRoleError) {
      console.error('[auth-debug] role save result', {
        error: updateRoleError.message,
        role,
        stage: 'update',
        success: false,
        userId,
      });
      throw new Error(`Could not save your selected account role. ${updateRoleError.message}`);
    }

    if (!updatedRoles?.some((updatedRole) => updatedRole.role === role)) {
      console.error('[auth-debug] role save result', {
        error: 'Updated role could not be confirmed.',
        role,
        stage: 'update',
        success: false,
        userId,
      });
      throw new Error('Could not save your selected account role. Please try again.');
    }

    console.info('[auth-debug] role save result', {
      role,
      stage: 'update',
      success: true,
      userId,
    });

    return;
  }

  const { data: insertedRole, error: insertRoleError } = await supabase
    .from('user_roles')
    .insert({
      role,
      user_id: userId,
    })
    .select('role')
    .maybeSingle();

  if (insertRoleError) {
    console.error('[auth-debug] role save result', {
      error: insertRoleError.message,
      role,
      stage: 'insert',
      success: false,
      userId,
    });
    throw new Error(`Could not save your selected account role. ${insertRoleError.message}`);
  }

  if (insertedRole?.role !== role) {
    console.error('[auth-debug] role save result', {
      error: 'Inserted role could not be confirmed.',
      role,
      stage: 'insert',
      success: false,
      userId,
    });
    throw new Error('Could not save your selected account role. Please try again.');
  }

  console.info('[auth-debug] role save result', {
    role,
    stage: 'insert',
    success: true,
    userId,
  });
}

async function saveProfile(payload: SaveProfilePayload) {
  const profileDetails = {
    full_name: payload.fullName,
    phone: payload.phone || null,
  };

  const { data: existingProfiles, error: readProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', payload.userId);

  if (readProfileError) {
    console.error('[auth-debug] profile save result', {
      error: readProfileError.message,
      stage: 'read-existing',
      success: false,
      userId: payload.userId,
    });
    throw new Error(`Could not check your profile details. ${readProfileError.message}`);
  }

  if ((existingProfiles?.length ?? 0) > 0) {
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update(profileDetails)
      .eq('user_id', payload.userId);

    if (updateProfileError) {
      console.error('[auth-debug] profile save result', {
        error: updateProfileError.message,
        stage: 'update',
        success: false,
        userId: payload.userId,
      });
      throw new Error(`Could not save your profile details. ${updateProfileError.message}`);
    }

    console.info('[auth-debug] profile save result', {
      stage: 'update',
      success: true,
      userId: payload.userId,
    });

    return;
  }

  const { error: insertProfileError } = await supabase.from('profiles').insert({
    ...profileDetails,
    user_id: payload.userId,
  });

  if (insertProfileError) {
    console.error('[auth-debug] profile save result', {
      error: insertProfileError.message,
      stage: 'insert',
      success: false,
      userId: payload.userId,
    });
    throw new Error(`Could not save your profile details. ${insertProfileError.message}`);
  }

  console.info('[auth-debug] profile save result', {
    stage: 'insert',
    success: true,
    userId: payload.userId,
  });
}

async function saveAccountRecords(
  userId: string,
  role: AppRole,
  profilePayload: SaveProfilePayload | null,
) {
  const results = await Promise.allSettled([
    saveUserRole(userId, role),
    profilePayload ? saveProfile(profilePayload) : Promise.resolve(),
  ]);

  console.info('[auth-debug] account persistence summary', {
    profileSaved: results[1].status === 'fulfilled',
    role,
    roleSaved: results[0].status === 'fulfilled',
    userId,
  });

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn('[auth-debug] account persistence fallback active', {
        error: getErrorMessage(result.reason),
        record: index === 0 ? 'user_roles' : 'profiles',
        userId,
      });
    }
  });
}

async function saveAccountRecordsFromMetadata(user: User) {
  const role = getMetadataRole(user);

  if (!role) {
    console.warn('[auth-debug] account persistence skipped: no supported metadata role', {
      userId: user.id,
      value: user.user_metadata?.role ?? null,
    });
    return;
  }

  const fullName =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  const phone =
    typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone.trim() : '';

  await saveAccountRecords(
    user.id,
    role,
    fullName
      ? {
          fullName,
          phone,
          userId: user.id,
        }
      : null,
  );
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await saveAccountRecordsFromMetadata(data.user);
  }

  return data;
}

export async function registerUser(payload: RegisterPayload) {
  const signupMetadata = {
    full_name: payload.fullName,
    phone: payload.phone || null,
    role: payload.role,
  };

  console.info('[auth-debug] registerUser signUp payload', {
    email: payload.email,
    metadata: signupMetadata,
    passwordProvided: Boolean(payload.password),
    role: payload.role,
  });

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: signupMetadata,
    },
  });

  if (error) {
    const errorDetails = getAuthErrorDetails(error);

    console.info(
      '[auth-debug] registerUser signUp error details',
      JSON.stringify({
        email: payload.email,
        error: errorDetails,
        role: payload.role,
        stage: 'supabase.auth.signUp',
      }),
    );
    console.info('[auth-debug] registerUser signUp error message', errorDetails.message);
    console.info('[auth-debug] registerUser signUp error status', errorDetails.status);
    console.info('[auth-debug] registerUser signUp error code', errorDetails.code);
    console.info('[auth-debug] registerUser signUp error stack', errorDetails.stack);
    console.error('[auth-debug] registerUser signUp failed', {
      email: payload.email,
      errorMessage: errorDetails.message,
      errorStatus: errorDetails.status,
      role: payload.role,
      stage: 'supabase.auth.signUp',
    });
    throw error;
  }

  console.info('[auth-debug] registerUser signUp result', {
    email: payload.email,
    hasSession: Boolean(data.session),
    hasUser: Boolean(data.user),
    role: payload.role,
    userId: data.user?.id ?? null,
  });

  if (!data.user) {
    throw new Error('Account was created without a user record.');
  }

  const userId = data.user.id;

  await saveAccountRecords(userId, payload.role, {
    fullName: payload.fullName,
    phone: payload.phone,
    userId,
  });

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
