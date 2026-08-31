/**
 * Root Layout - wraps app in providers and conditionally routes by auth state.
 */

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/src/context/auth-context";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { LoadingState } from "@/src/components/LoadingState";
import { debugAuth } from "@/src/lib/debug";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { user, isLoading, hasSeenOnboarding } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    SplashScreen.hideAsync();

    if (isLoading) return;
    debugAuth("layout effect - isLoading:", isLoading, "user:", user?.id, "role:", user?.role, "onboarding:", hasSeenOnboarding);

    if (!user) {
      debugAuth("layout - user is null, clearing React Query cache");
      // TODO: Replace queryClient.clear() with targeted cache invalidation
      // once query keys are structured for user-specific data.
      queryClient.clear();
    }

    if (!hasSeenOnboarding) {
      debugAuth("layout - redirecting to /onboarding");
      router.replace("/onboarding");
    } else if (!user) {
      debugAuth("layout - redirecting to /guest/explore");
      router.replace("/guest/explore");
    } else if (user.role === "manager") {
      debugAuth("layout - redirecting to /manager/home");
      router.replace("/manager/home");
    } else if (user.role === "tenant") {
      debugAuth("layout - redirecting to /tenant/my-tenancy");
      router.replace("/tenant/my-tenancy");
    } else {
      debugAuth("layout - unknown role:", user.role, "redirecting to /guest/explore");
      router.replace("/guest/explore");
    }
  }, [user, isLoading, hasSeenOnboarding, queryClient]);

  if (isLoading) {
    return <LoadingState message="Loading…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="phone-auth" />
      <Stack.Screen name="phone-otp" />
      <Stack.Screen name="phone-pin-setup" />
      <Stack.Screen name="phone-signin" />
      <Stack.Screen name="forgot-pin" />
      <Stack.Screen name="change-pin" />
      <Stack.Screen name="accept-invite" />
      <Stack.Screen name="manager" />
      <Stack.Screen name="tenant" />
      <Stack.Screen name="guest" />
      <Stack.Screen name="property-detail" />
      <Stack.Screen name="tenancy-detail" />
      <Stack.Screen name="tenant-detail" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="subscription-payment" />
      <Stack.Screen name="payment-history" />
      <Stack.Screen name="create-property" />
      <Stack.Screen name="edit-property" />
      <Stack.Screen name="create-tenancy" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="submit-payment" />
      <Stack.Screen name="payment-verification" />
      <Stack.Screen name="create-agreement" />

      <Stack.Screen name="agreement-summary" />
      <Stack.Screen name="agreement-preview" />
      <Stack.Screen name="agreement-view" />
      <Stack.Screen name="agreement-history" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" backgroundColor={Colors.bg} />
          <ErrorBoundary>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
