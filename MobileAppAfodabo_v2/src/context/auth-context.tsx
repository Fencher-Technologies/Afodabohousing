import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback, useEffect } from "react";

import { api, clearTokens, getStoredToken, onTokensCleared, setRefreshToken, setStoredToken } from "../lib/api-client";
import { debugAuth } from "../lib/debug";
import { toAppRole } from "../lib/roles";
import { authService } from "../services/auth";
import { subscriptionsService } from "../services/subscriptions";
import type { Subscription, User, UserRole } from "../types";

const SESSION_KEY = "afodabo_session";
const ONBOARDING_KEY = "afodabo_onboarding_seen";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedSession {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  email_verified: boolean;
  cached_at: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  subscription: Subscription | null;
}

function parseCachedSession(raw: string | null): CachedSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.id !== "string" || typeof parsed.email !== "string" || typeof parsed.role !== "string") {
      return null;
    }
    if (typeof parsed.cached_at !== "number") return null;
    if (Date.now() - parsed.cached_at > CACHE_TTL_MS) return null;
    return {
      id: parsed.id as string,
      email: parsed.email as string,
      full_name: (parsed.full_name as string) || "",
      phone: (parsed.phone as string) || "",
      role: parsed.role as UserRole,
      email_verified: (parsed.email_verified as boolean) || false,
      cached_at: parsed.cached_at as number,
    };
  } catch {
    return null;
  }
}

function cachedSessionToUser(c: CachedSession): User {
  return {
    id: c.id,
    email: c.email,
    full_name: c.full_name,
    phone: c.phone,
    role: c.role,
    email_verified: c.email_verified,
    created_at: "",
  };
}

function useAuthInner() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [token, onboard, storedSessionRaw] = await Promise.all([
          getStoredToken(),
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        debugAuth("init - token exists:", !!token, "storedSession:", storedSessionRaw ? "present" : "null");
        if (onboard === "true") setHasSeenOnboarding(true);

        if (token) {
          const cached = parseCachedSession(storedSessionRaw);

          if (cached) {
            // Fast path: render immediately from cache, validate in background
            const cachedUser = cachedSessionToUser(cached);
            debugAuth("init - fast path, rendering from cache:", cachedUser.role);
            setUser(cachedUser);
            setIsLoading(false);

            // Background validation - non-blocking
            (async () => {
              try {
                const [me, profile] = await Promise.allSettled([
                  authService.getMe(),
                  authService.getProfile(),
                ]);

                const meData = me.status === "fulfilled" ? me.value : null;
                const profileData = profile.status === "fulfilled" ? profile.value : null;

                if (meData) {
                  const effectiveRole = profileData?.role || meData.role || "tenant";
                  const role = toAppRole(effectiveRole);
                  const freshUser: User = {
                    id: meData.id,
                    email: meData.email,
                    full_name: profileData?.full_name || "",
                    phone: profileData?.phone || "",
                    role,
                    email_verified: meData.status === "active",
                    created_at: "",
                  };
                  debugAuth("init - background validation succeeded:", freshUser.role);
                  setUser(freshUser);
                  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
                    id: freshUser.id,
                    email: freshUser.email,
                    full_name: freshUser.full_name,
                    phone: freshUser.phone,
                    role: freshUser.role,
                    email_verified: freshUser.email_verified,
                    cached_at: Date.now(),
                  }));

                  if (role === "manager") {
                    try {
                      const sub = await subscriptionsService.getCurrent();
                      if (sub) {
                        setSubscription({
                          id: sub.id,
                          manager_id: sub.manager_id,
                          plan_id: sub.plan_id as Subscription["plan_id"],
                          plan_name: sub.plan_name,
                          status: sub.status as Subscription["status"],
                          started_at: sub.started_at,
                          expires_at: sub.expires_at,
                          auto_renew: sub.auto_renew,
                          days_remaining: sub.days_remaining,
                          payment_reference: sub.payment_reference,
                        });
                      }
                    } catch {
                      // subscription fetch is best-effort
                    }
                  }
                } else if (me.status === "rejected" && (me.reason as { status?: number })?.status === 401) {
                  // Session is genuinely expired - check if refresh works
                  debugAuth("init - background validation 401, session invalid");
                  await clearTokens();
                  setUser(null);
                } else {
                  // Network error or server error - keep cached user
                  debugAuth("init - background validation failed (network/server), keeping cache");
                }
              } catch {
                debugAuth("init - background validation error, keeping cache");
              }
            })();
          } else {
            // Fallback: no valid cache, blocking validation
            debugAuth("init - no cache, blocking validation");
            const me = await authService.getMe();
            let fullName = "";
            let phone = "";
            let profileRole: string | undefined;
            try {
              const profile = await authService.getProfile();
              fullName = profile.full_name || "";
              phone = profile.phone || "";
              profileRole = profile.role;
            } catch {
              // profile is best-effort
            }
            const effectiveRole = profileRole || me.role || "tenant";
            const role = toAppRole(effectiveRole);
            const userData: User = {
              id: me.id,
              email: me.email,
              full_name: fullName,
              phone,
              role,
              email_verified: me.status === "active",
              created_at: "",
            };
            setUser(userData);
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
              phone: userData.phone,
              role: userData.role,
              email_verified: userData.email_verified,
              cached_at: Date.now(),
            }));

            if (role === "manager") {
              try {
                const sub = await subscriptionsService.getCurrent();
                if (sub) {
                  setSubscription({
                    id: sub.id,
                    manager_id: sub.manager_id,
                    plan_id: sub.plan_id as Subscription["plan_id"],
                    plan_name: sub.plan_name,
                    status: sub.status as Subscription["status"],
                    started_at: sub.started_at,
                    expires_at: sub.expires_at,
                    auto_renew: sub.auto_renew,
                    days_remaining: sub.days_remaining,
                    payment_reference: sub.payment_reference,
                  });
                }
              } catch {
                // subscription fetch is best-effort
              }
            }
          }
        } else {
          debugAuth("init - no token, user stays null");
        }
      } catch (e) {
        debugAuth("init - error, clearing tokens:", e);
        await clearTokens();
      } finally {
        setIsLoading(false);
        debugAuth("init - complete, isLoading=false");
      }
    })();
  }, []);

  useEffect(() => {
    return onTokensCleared(() => {
      setUser(null);
      setSubscription(null);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    debugAuth("signIn - /auth/signin response:", { user_id: result.user_id, role: result.role, user_id_from_user: result.user?.id });
    await setStoredToken(result.access_token);
    if (result.refresh_token) {
      await setRefreshToken(result.refresh_token);
    }
    let fullName = "";
    let phone = "";
    let profileRole: string | undefined;
    try {
      const profile = await authService.getProfile();
      fullName = profile.full_name || "";
      phone = profile.phone || "";
      profileRole = profile.role;
      debugAuth("signIn - /auth/profile result:", { id: profile.id, role: profileRole, user_id: profile.user_id });
    } catch {
      // profile is best-effort; stay empty if unavailable
      debugAuth("signIn - /auth/profile failed or unavailable");
    }

    const effectiveRole = profileRole || result.role || "tenant";
    const role = toAppRole(effectiveRole);

    const userData: User = {
      id: result.user_id || result.user?.id as string || "",
      email,
      full_name: fullName,
      phone,
      role,
      email_verified: true,
      created_at: "",
    };
    debugAuth("signIn - effective role:", effectiveRole, "profileRole:", profileRole, "signinRole:", result.role);
    debugAuth("signIn - setting user:", { id: userData.id, email: userData.email, role: userData.role });
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
      email_verified: userData.email_verified,
      cached_at: Date.now(),
    }));
    debugAuth("signIn - SESSION_KEY set to:", role);

    if (role === "manager") {
      try {
        const sub = await subscriptionsService.getCurrent();
        if (sub) {
          setSubscription({
            id: sub.id,
            manager_id: sub.manager_id,
            plan_id: sub.plan_id as Subscription["plan_id"],
            plan_name: sub.plan_name,
            status: sub.status as Subscription["status"],
            started_at: sub.started_at,
            expires_at: sub.expires_at,
            auto_renew: sub.auto_renew,
            days_remaining: sub.days_remaining,
            payment_reference: sub.payment_reference,
          });
          debugAuth("signIn - subscription loaded:", sub.plan_name, sub.status);
        } else {
          debugAuth("signIn - no active subscription");
        }
      } catch {
        // subscription fetch is best-effort
        debugAuth("signIn - subscription fetch failed");
      }
    }

    debugAuth("signIn - complete, returning userData");
    return userData;
  }, []);

  const register = useCallback(async (role: UserRole, data: { full_name: string; email: string; phone: string; password: string; accepted_terms?: boolean; terms_version?: string; privacy_version?: string }) => {
    const result = await authService.signUp({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      role: role === "manager" ? "house_manager" : "tenant",
      accepted_terms: data.accepted_terms,
      terms_version: data.terms_version,
      privacy_version: data.privacy_version,
    });
    await setStoredToken(result.access_token);
    if (result.refresh_token) {
      await setRefreshToken(result.refresh_token);
    }

    const userData: User = {
      id: result.user_id || "",
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      role,
      email_verified: true,
      created_at: "",
    };
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
      email_verified: userData.email_verified,
      cached_at: Date.now(),
    }));
    return userData;
  }, []);

  const signOut = useCallback(async () => {
    debugAuth("signOut - starting, user id:", user?.id, "role:", user?.role);
    try {
      await authService.signOut();
      debugAuth("signOut - server session revoked");
    } catch {
      debugAuth("signOut - server signout failed (non-fatal)");
    }
    debugAuth("signOut - clearing persisted tokens");
    await clearTokens({ suppressNotification: true });
    await AsyncStorage.removeItem(SESSION_KEY);
    const tokenAfter = await getStoredToken();
    debugAuth("signOut - token cleared:", tokenAfter === null);
    debugAuth("signOut - clearing React state");
    setUser(null);
    setSubscription(null);
    debugAuth("signOut - complete");
  }, [user]);

  const markOnboardingSeen = useCallback(async () => {
    setHasSeenOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, "full_name" | "email" | "phone">>) => {
    const result = await authService.updateProfile({
      full_name: updates.full_name,
      phone: updates.phone,
    });
    setUser((prev) =>
      prev
        ? {
            ...prev,
            full_name: result.full_name || prev.full_name,
            phone: result.phone || prev.phone,
          }
        : prev
    );
  }, []);

  const refreshAuth = useCallback(async () => {
    debugAuth("refreshAuth - starting");
    try {
      const token = await getStoredToken();
      debugAuth("refreshAuth - token exists:", !!token);
      if (!token) {
        debugAuth("refreshAuth - no token, setting user to null");
        setUser(null);
        return null;
      }
      const [meResult, profileResult] = await Promise.allSettled([
        authService.getMe(),
        authService.getProfile(),
      ]);

      const me = meResult.status === "fulfilled" ? meResult.value : null;
      const profile = profileResult.status === "fulfilled" ? profileResult.value : null;

      if (!me) {
        debugAuth("refreshAuth - /auth/me failed, clearing tokens");
        await clearTokens();
        setUser(null);
        return null;
      }

      const fullName = profile?.full_name || "";
      const phone = profile?.phone || "";
      const profileRole = profile?.role;
      debugAuth("refreshAuth - /auth/me result:", { id: me.id, role: me.role });
      const effectiveRole = profileRole || me.role || "tenant";
      const role = toAppRole(effectiveRole);
      const userData: User = {
        id: me.id,
        email: me.email,
        full_name: fullName,
        phone,
        role,
        email_verified: me.status === "active",
        created_at: "",
      };
      debugAuth("refreshAuth - setting user:", { id: userData.id, role: userData.role });
      setUser(userData);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        role: userData.role,
        email_verified: userData.email_verified,
        cached_at: Date.now(),
      }));
      debugAuth("refreshAuth - SESSION_KEY set to:", role);

      if (role === "manager") {
        try {
          const sub = await subscriptionsService.getCurrent();
          if (sub) {
            setSubscription({
              id: sub.id,
              manager_id: sub.manager_id,
              plan_id: sub.plan_id as Subscription["plan_id"],
              plan_name: sub.plan_name,
              status: sub.status as Subscription["status"],
              started_at: sub.started_at,
              expires_at: sub.expires_at,
              auto_renew: sub.auto_renew,
              days_remaining: sub.days_remaining,
              payment_reference: sub.payment_reference,
            });
            debugAuth("refreshAuth - subscription loaded:", sub.plan_name, sub.status);
          } else {
            debugAuth("refreshAuth - no active subscription");
          }
        } catch {
          debugAuth("refreshAuth - subscription fetch failed");
        }
      }

      return userData;
    } catch (e) {
      debugAuth("refreshAuth - error, clearing tokens:", e);
      await clearTokens();
      setUser(null);
      return null;
    }
  }, []);

  return {
    user,
    isLoading,
    hasSeenOnboarding,
    subscription,
    setSubscription,
    signIn,
    register,
    signOut,
    markOnboardingSeen,
    updateProfile,
    refreshAuth,
  };
}

export const [AuthProvider, useAuth] = createContextHook(useAuthInner);
export type AuthContextType = ReturnType<typeof useAuthInner>;
