import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAuthSnapshot, signOut as signOutService } from '../services/auth.service';
import { supabase } from '../services/supabase';
import type { AppRole, ProfileRow } from '../types/database';

interface AuthContextValue {
  error: Error | null;
  loading: boolean;
  profile: ProfileRow | null;
  refresh: () => Promise<void>;
  role: AppRole | null;
  session: Session | null;
  signOut: () => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const hydrate = async (nextSession: Session | null) => {
    setLoading(true);

    try {
      const snapshot = await fetchAuthSnapshot(nextSession);

      console.info('[auth-debug] AuthContext hydrate result', {
        hasProfile: Boolean(snapshot.profile),
        hasSession: Boolean(snapshot.session),
        role: snapshot.role,
        userId: snapshot.user?.id ?? null,
      });

      setError(null);
      setProfile(snapshot.profile);
      setRole(snapshot.role);
      setSession(snapshot.session);
      setUser(snapshot.user);
    } catch (caughtError) {
      console.error('[auth-debug] AuthContext hydrate failed', {
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
        userId: nextSession?.user.id ?? null,
      });
      setError(caughtError instanceof Error ? caughtError : new Error('Could not load account.'));
      setProfile(null);
      setRole(null);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        void hydrate(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        void hydrate(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      loading,
      profile,
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        await hydrate(data.session);
      },
      role,
      session,
      signOut: async () => {
        await signOutService();
        setError(null);
        setProfile(null);
        setRole(null);
        setSession(null);
        setUser(null);
      },
      user,
    }),
    [error, loading, profile, role, session, user],
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
