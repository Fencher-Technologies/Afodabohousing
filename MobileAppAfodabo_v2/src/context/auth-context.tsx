import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback, useEffect } from "react";

import { api, clearTokens, getStoredToken, onTokensCleared, setRefreshToken, setStoredToken } from "../lib/api-client";
import { authService } from "../services/auth";
import { subscriptionsService } from "../services/subscriptions";
import type { Subscription, User, UserRole } from "../types";

const SESSION_KEY = "axis_session";
const ONBOARDING_KEY = "axis_onboarding_seen";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  subscription: Subscription | null;
}

function useAuthInner() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [token, onboard, storedSession] = await Promise.all([
          getStoredToken(),
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        console.log("[DEBUG_AUTH] init — token exists:", !!token, "storedSession:", storedSession);
        if (onboard === "true") setHasSeenOnboarding(true);

        if (token) {
          console.log("[DEBUG_AUTH] init — fetching /auth/me");
          const me = await authService.getMe();
          console.log("[DEBUG_AUTH] init — /auth/me result:", { id: me.id, role: me.role, email: me.email, status: me.status });
          let fullName = "";
          let phone = "";
          let profileRole: string | undefined;
          try {
            const profile = await authService.getProfile();
            fullName = profile.full_name || "";
            phone = profile.phone || "";
            profileRole = profile.role;
            console.log("[DEBUG_AUTH] init — /auth/profile result:", { id: profile.id, role: profileRole, full_name: profile.full_name });
          } catch {
            // profile is best-effort; stays empty if unavailable
            console.log("[DEBUG_AUTH] init — /auth/profile failed or unavailable");
          }
          const effectiveRole = profileRole || me.role || "tenant";
          const role = (effectiveRole === "house_manager" || effectiveRole === "landlord" ? "manager" : effectiveRole === "tenant" ? "tenant" : "guest") as UserRole;
          const userData = {
            id: me.id,
            email: me.email,
            full_name: fullName,
            phone,
            role,
            email_verified: me.status === "active",
            created_at: "",
          };
          console.log("[DEBUG_AUTH] init — setting user from token:", userData);
          setUser(userData);

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
                console.log("[DEBUG_AUTH] init — subscription loaded:", sub.plan_name, sub.status);
              } else {
                console.log("[DEBUG_AUTH] init — no active subscription");
              }
            } catch {
              // subscription fetch is best-effort
              console.log("[DEBUG_AUTH] init — subscription fetch failed");
            }
          }
        } else {
          console.log("[DEBUG_AUTH] init — no token, user stays null");
        }
      } catch (e) {
        console.log("[DEBUG_AUTH] init — error, clearing tokens:", e);
        await clearTokens();
      } finally {
        setIsLoading(false);
        console.log("[DEBUG_AUTH] init — complete, isLoading=false");
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
    console.log("[DEBUG_AUTH] signIn — /auth/signin response:", { user_id: result.user_id, role: result.role, user_id_from_user: result.user?.id });
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
      console.log("[DEBUG_AUTH] signIn — /auth/profile result:", { id: profile.id, role: profileRole, user_id: profile.user_id });
    } catch {
      // profile is best-effort; stay empty if unavailable
      console.log("[DEBUG_AUTH] signIn — /auth/profile failed or unavailable");
    }

    const effectiveRole = profileRole || result.role || "tenant";
    const role = (effectiveRole === "house_manager" || effectiveRole === "landlord" ? "manager" : effectiveRole === "tenant" ? "tenant" : "guest") as UserRole;

    const userData: User = {
      id: result.user_id || result.user?.id as string || "",
      email,
      full_name: fullName,
      phone,
      role,
      email_verified: true,
      created_at: "",
    };
    console.log("[DEBUG_AUTH] signIn — effective role:", effectiveRole, "profileRole:", profileRole, "signinRole:", result.role);
    console.log("[DEBUG_AUTH] signIn — setting user:", { id: userData.id, email: userData.email, role: userData.role });
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, role);
    console.log("[DEBUG_AUTH] signIn — SESSION_KEY set to:", role);

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
          console.log("[DEBUG_AUTH] signIn — subscription loaded:", sub.plan_name, sub.status);
        } else {
          console.log("[DEBUG_AUTH] signIn — no active subscription");
        }
      } catch {
        // subscription fetch is best-effort
        console.log("[DEBUG_AUTH] signIn — subscription fetch failed");
      }
    }

    console.log("[DEBUG_AUTH] signIn — complete, returning userData");
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
    await AsyncStorage.setItem(SESSION_KEY, role);
    return userData;
  }, []);

  const signOut = useCallback(async () => {
    console.log("[DEBUG_AUTH] signOut — starting, user id:", user?.id, "role:", user?.role);
    try {
      await authService.signOut();
      console.log("[DEBUG_AUTH] signOut — server session revoked");
    } catch {
      console.log("[DEBUG_AUTH] signOut — server signout failed (non-fatal)");
    }
    console.log("[DEBUG_AUTH] signOut — clearing persisted tokens");
    await clearTokens({ suppressNotification: true });
    await AsyncStorage.removeItem(SESSION_KEY);
    const tokenAfter = await getStoredToken();
    console.log("[DEBUG_AUTH] signOut — token after clear:", tokenAfter);
    console.log("[DEBUG_AUTH] signOut — clearing React state");
    setUser(null);
    setSubscription(null);
    console.log("[DEBUG_AUTH] signOut — complete");
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
    console.log("[DEBUG_AUTH] refreshAuth — starting");
    try {
      const token = await getStoredToken();
      console.log("[DEBUG_AUTH] refreshAuth — token exists:", !!token);
      if (!token) {
        console.log("[DEBUG_AUTH] refreshAuth — no token, setting user to null");
        setUser(null);
        return null;
      }
      const me = await authService.getMe();
      console.log("[DEBUG_AUTH] refreshAuth — /auth/me result:", { id: me.id, role: me.role, email: me.email, status: me.status });
      let fullName = "";
      let phone = "";
      let profileRole: string | undefined;
      try {
        const profile = await authService.getProfile();
        fullName = profile.full_name || "";
        phone = profile.phone || "";
        profileRole = profile.role;
        console.log("[DEBUG_AUTH] refreshAuth — /auth/profile result:", { id: profile.id, role: profileRole });
      } catch {
        // best-effort
        console.log("[DEBUG_AUTH] refreshAuth — /auth/profile failed or unavailable");
      }
      const effectiveRole = profileRole || me.role || "tenant";
      const role = (effectiveRole === "house_manager" || effectiveRole === "landlord" ? "manager" : effectiveRole === "tenant" ? "tenant" : "guest") as UserRole;
      const userData: User = {
        id: me.id,
        email: me.email,
        full_name: fullName,
        phone,
        role,
        email_verified: me.status === "active",
        created_at: "",
      };
      console.log("[DEBUG_AUTH] refreshAuth — setting user:", { id: userData.id, role: userData.role });
      setUser(userData);
      await AsyncStorage.setItem(SESSION_KEY, role);
      console.log("[DEBUG_AUTH] refreshAuth — SESSION_KEY set to:", role);

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
            console.log("[DEBUG_AUTH] refreshAuth — subscription loaded:", sub.plan_name, sub.status);
          } else {
            console.log("[DEBUG_AUTH] refreshAuth — no active subscription");
          }
        } catch {
          console.log("[DEBUG_AUTH] refreshAuth — subscription fetch failed");
        }
      }

      return userData;
    } catch (e) {
      console.log("[DEBUG_AUTH] refreshAuth — error, clearing tokens:", e);
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
