import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from './backend-api';

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AppNotification {
  body: string;
  created_at: string;
  id: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  recipient_id: string;
  title: string;
  type: string;
}

export async function fetchNotifications(): Promise<{
  notifications: AppNotification[];
  total: number;
}> {
  return apiRequest<{ notifications: AppNotification[]; total: number }>(
    '/notifications',
    { auth: true },
  );
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${notificationId}`, {
    auth: true,
    method: 'PATCH',
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await ExpoNotifications.setNotificationChannelAsync('default', {
        importance: ExpoNotifications.AndroidImportance.MAX,
        name: 'Default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await ExpoNotifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function uploadPushToken(token: string) {
  try {
    await apiRequest('/notifications/push-token', {
      auth: true,
      body: { platform: 'expo', token },
      method: 'POST',
    });
  } catch {
    return;
  }
}
