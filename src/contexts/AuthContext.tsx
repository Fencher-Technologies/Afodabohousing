import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'tenant' | 'house_manager' | 'super_admin' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const fetchRoleFromDB = async (userId: string): Promise<UserRole> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.role as UserRole) ?? null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const refreshRole = async () => {
    if (user) {
      const r = await fetchRoleFromDB(user.id);
      setRole(r);
    }
  };

  useEffect(() => {
    let initialized = false;

    // Get initial session FIRST — single source of truth
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const r = await fetchRoleFromDB(s.user.id);
        setRole(r);
      }
      setLoading(false);
      initialized = true;
    });

    // Listen for subsequent auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        // Skip the INITIAL_SESSION event that fires before getSession resolves
        if (!initialized && _event === 'INITIAL_SESSION') return;
        if (_event === 'PASSWORD_RECOVERY') sessionStorage.setItem('pw_recovery', 'true');

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid deadlock inside auth callback
          setTimeout(async () => {
            const r = await fetchRoleFromDB(newSession.user.id);
            setRole(r);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};
