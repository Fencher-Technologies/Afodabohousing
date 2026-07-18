/**
 * Root Layout — wraps app in providers and conditionally routes by auth state.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/src/context/auth-context";
import { LoadingState } from "@/src/components/LoadingState";

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

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    if (!hasSeenOnboarding) {
      router.replace("/onboarding");
    } else if (!user) {
      router.replace("/guest/explore");
    } else if (user.role === "manager") {
      router.replace("/manager/home");
    } else if (user.role === "tenant") {
      router.replace("/tenant/my-tenancy");
    } else {
      router.replace("/guest/explore");
    }
  }, [user, isLoading, hasSeenOnboarding]);

  if (isLoading) {
    return <LoadingState message="Loading…" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
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
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
