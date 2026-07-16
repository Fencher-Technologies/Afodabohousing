import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ProfileRow, UserRole } from '../types/supabase';
import { fetchAuthSnapshot, signOutUser } from '../services/auth';
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  subscribeToAuthSession,
} from '../services/auth-storage';
import { setSentryUser } from '../services/sentry';
import type { AuthSession, AuthUser } from '../types/auth';

interface AuthContextValue {
  loading: boolean;
  profile: ProfileRow | null;
  refresh: () => Promise<void>;
  role: UserRole;
  session: AuthSession | null;
  signOut: () => Promise<void>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isUnauthorizedHydrationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /unauthorized|401|must be signed in/i.test(error.message);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setSentryUser(
      user
        ? {
            email: user.email,
            id: user.id,
            role,
            username:
              typeof user.user_metadata?.full_name === 'string'
                ? user.user_metadata.full_name
                : null,
          }
        : null,
    );
  }, [role, user]);

  const hydrate = async (nextSession: AuthSession | null) => {
    try {
      const snapshot = await fetchAuthSnapshot(nextSession);
      setProfile(snapshot.profile);
      setRole(snapshot.role);
      setSession(snapshot.session);
      setUser(snapshot.user);
    } catch (error) {
      if (isUnauthorizedHydrationError(error)) {
        await clearStoredAuthSession();
        setProfile(null);
        setRole(null);
        setSession(null);
        setUser(null);
        return;
      }

      setProfile(null);
      setRole(nextSession?.role ?? null);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    getStoredAuthSession().then((storedSession) => {
      if (!mounted) {
        return;
      }

      void hydrate(storedSession);
    });

    const unsubscribe = subscribeToAuthSession((nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      profile,
      refresh: async () => {
        const storedSession = await getStoredAuthSession();
        await hydrate(storedSession);
      },
      role,
      session,
      signOut: async () => {
        await signOutUser();
        setProfile(null);
        setRole(null);
        setSession(null);
        setUser(null);
        setSentryUser(null);
      },
      user,
    }),
    [loading, profile, role, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
