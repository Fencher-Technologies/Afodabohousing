import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateLabel } from '../utils/format';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tenancy_expiry: 'calendar-outline',
  rent_reminder: 'cash-outline',
};

export function NotificationDetailScreen({
  route,
}: StackScreenProps<RootStackParamList, 'NotificationDetail'>) {
  const { notification } = route.params;

  const iconName = NOTIFICATION_ICONS[notification.type] ?? 'information-circle-outline';

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconCircle,
              notification.type === 'tenancy_expiry' && styles.iconExpiry,
              notification.type === 'rent_reminder' && styles.iconRent,
              !NOTIFICATION_ICONS[notification.type] && styles.iconDefault,
            ]}
          >
            <Ionicons
              color={
                notification.type === 'tenancy_expiry'
                  ? colors.warning
                  : notification.type === 'rent_reminder'
                    ? colors.accent
                    : colors.textSecondary
              }
              name={iconName}
              size={28}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.time}>{formatDateLabel(notification.created_at)}</Text>
          </View>
        </View>
        <Text style={styles.body}>{notification.body}</Text>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
  time: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
  },
});
