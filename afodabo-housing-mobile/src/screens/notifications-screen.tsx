import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import {
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/use-notifications';
import type { AppNotification } from '../services/notifications';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateLabel } from '../utils/format';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tenancy_expiry: 'calendar-outline',
  rent_reminder: 'cash-outline',
};

function NotificationIcon({ type }: { type: string }) {
  const iconName = NOTIFICATION_ICONS[type] ?? 'information-circle-outline';

  return (
    <View
      style={[
        styles.iconCircle,
        type === 'tenancy_expiry' && styles.iconExpiry,
        type === 'rent_reminder' && styles.iconRent,
        !NOTIFICATION_ICONS[type] && styles.iconDefault,
      ]}
    >
      <Ionicons
        color={
          type === 'tenancy_expiry'
            ? colors.warning
            : type === 'rent_reminder'
              ? colors.accent
              : colors.textSecondary
        }
        name={iconName}
        size={22}
      />
    </View>
  );
}

export function NotificationsScreen({}: StackScreenProps<
  RootStackParamList,
  'Notifications'
>) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const notifications = data?.notifications ?? [];

  function handleTap(n: AppNotification) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    navigation.navigate('NotificationDetail', { notification: n });
  }

  if (isLoading) {
    return <LoadingState message="Loading notifications" />;
  }

  if (isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            error instanceof Error ? error.message : 'Please try again.'
          }
          onRetry={() => {
            void refetch();
          }}
          title="Could not load notifications"
        />
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void refetch();
          }}
          refreshing={isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          description="When your house manager sends important updates, they will appear here."
          title="No notifications yet"
        />
      ) : (
        notifications.map((notification) => {
          const isUnread = !notification.is_read;
          return (
            <Pressable
              key={notification.id}
              onPress={() => { handleTap(notification); }}
              style={[
                styles.card,
                isUnread ? styles.unreadCard : styles.readCard,
              ]}
            >
              <View style={styles.cardRow}>
                <NotificationIcon type={notification.type} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text
                      style={[
                        styles.cardTitle,
                        isUnread && styles.unreadTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    <Text style={styles.cardTime}>
                      {formatDateLabel(notification.created_at)}
                    </Text>
                  </View>
                  <View style={styles.cardBodyRow}>
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {notification.body}
                    </Text>
                    {isUnread ? <View style={styles.unreadDot} /> : null}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardBody: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  cardBodyRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardTime: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    flexShrink: 0,
  },
  cardTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  content: {
    gap: spacing.lg,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconDefault: {
    backgroundColor: colors.surfaceMuted,
  },
  iconExpiry: {
    backgroundColor: colors.primarySoft,
  },
  iconRent: {
    backgroundColor: colors.accentSoft,
  },
  readCard: {
    borderColor: colors.border,
  },
  unreadCard: {
    borderColor: colors.primary,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    marginBottom: 4,
    width: 10,
  },
  unreadTitle: {
    fontFamily: typography.bodyStrong,
  },
});
