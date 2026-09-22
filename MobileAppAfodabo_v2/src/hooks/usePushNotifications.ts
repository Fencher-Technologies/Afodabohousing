import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

import { registerForPushNotifications } from "@/src/lib/push-notifications";

/**
 * Registers the phone for push whenever someone is signed in, keeps the
 * in-app notification list fresh when a push arrives, and opens the
 * notifications screen when one is tapped.
 */
export function usePushNotifications(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    registerForPushNotifications();
  }, [userId]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    const openNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      router.push("/notifications");
    };
    const tapped = Notifications.addNotificationResponseReceivedListener(openNotifications);

    // App was closed and opened by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && userId) openNotifications();
    });

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [queryClient, userId]);
}
