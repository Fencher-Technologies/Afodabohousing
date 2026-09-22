/**
 * Push notifications (Expo).
 *
 * After sign-in the app asks for permission, gets this phone's Expo push
 * token and registers it with the backend, which pushes every notification
 * (payments, agreements, rent reminders, admin alerts…) to it. On sign-out
 * the token is removed so the next person to use the phone doesn't receive
 * the previous user's alerts.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "@/src/lib/api-client";

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  // The backend sends with channelId "default".
  await Notifications.setNotificationChannelAsync("default", {
    name: "Axis notifications",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#1a4d3a",
  });
}

/**
 * Ask permission (once), get the token and register it with the backend.
 * Returns the token, or null if push isn't possible (simulator, web,
 * permission denied). Never throws.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return null;

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted" && existing.canAskAgain !== false) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!token) return null;

    await api.post("/notifications/push-token", {
      token,
      platform: Platform.OS,
      device_name: Device.modelName ?? null,
    });
    registeredToken = token;
    return token;
  } catch (err) {
    console.warn("Push registration failed:", err);
    return null;
  }
}

/** Remove this phone from the signed-in account. Call before clearing auth. */
export async function unregisterPushNotifications(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await api.delete(`/notifications/push-token?token=${encodeURIComponent(token)}`);
  } catch {
    // Not fatal: the backend also moves the token when someone else signs in.
  }
}
