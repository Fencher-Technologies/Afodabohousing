import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useCallback, useEffect } from "react";

import { Alert } from "react-native";
import { api, clearTokens, getStoredToken, onTokensCleared, setRefreshToken, setStoredToken } from "../lib/api-client";
import { authService } from "../services/auth";
import { subscriptionsService } from "../services/subscriptions";
import type { Subscription, User, UserRole } from "../types";

const SESSION_KEY = "afodabo_session";
const ONBOARDING_KEY = "afodabo_onboarding_seen";

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
        const [token, onboard] = await Promise.all([
          getStoredToken(),
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (onboard === "true") setHasSeenOnboarding(true);

        if (token) {
          const me = await authService.getMe();
          const role = (me.role === "house_manager" ? "manager" : me.role) as UserRole;
          let fullName = "";
          let phone = "";
          try {
            const profile = await authService.getProfile();
            fullName = profile.full_name || "";
            phone = profile.phone || "";
          } catch {
            // profile is best-effort; stays empty if unavailable
          }
          setUser({
            id: me.id,
            email: me.email,
            full_name: fullName,
            phone,
            role,
            email_verified: me.status === "active",
            created_at: "",
          });

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
      } catch {
        await clearTokens();
      } finally {
        setIsLoading(false);
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
    await setStoredToken(result.access_token);
    if (result.refresh_token) {
      await setRefreshToken(result.refresh_token);
    }
    Alert.alert("Login successful", "Welcome back!");

    const role = (result.role === "house_manager" ? "manager" : result.role) as UserRole;

    let fullName = "";
    let phone = "";
    try {
      const profile = await authService.getProfile();
      fullName = profile.full_name || "";
      phone = profile.phone || "";
    } catch {
      // profile is best-effort; stay empty if unavailable
    }

    const userData: User = {
      id: result.user_id || result.user?.id as string || "",
      email,
      full_name: fullName,
      phone,
      role,
      email_verified: true,
      created_at: "",
    };
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, role);

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
    try {
      await authService.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSubscription(null);
    await clearTokens({ suppressNotification: true });
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

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
    try {
      const token = await getStoredToken();
      if (!token) {
        setUser(null);
        return null;
      }
      const me = await authService.getMe();
      const role = (me.role === "house_manager" ? "manager" : me.role) as UserRole;
      let fullName = "";
      let phone = "";
      try {
        const profile = await authService.getProfile();
        fullName = profile.full_name || "";
        phone = profile.phone || "";
      } catch {
        // best-effort
      }
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
      await AsyncStorage.setItem(SESSION_KEY, role);
      return userData;
    } catch {
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
