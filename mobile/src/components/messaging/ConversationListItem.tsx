import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { TenantMessage } from '../../services/messages.service';
import { toDisplayDate } from '../../utils/dates';

export function ConversationListItem({
  message,
  userId,
}: {
  message: TenantMessage | null;
  userId: string;
}) {
  const unread = Boolean(message && !message.is_read && message.receiver_id === userId);

  return (
    <View style={[styles.card, unread && styles.unread]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBadge, unread && styles.unreadIcon]}>
          <Ionicons
            color={unread ? colors.primaryForeground : colors.primary}
            name="chatbubbles-outline"
            size={19}
          />
        </View>
        <Text style={styles.eyebrow}>Conversation</Text>
      </View>
      <Text style={styles.title}>
        {message ? message.sender_name || 'House Manager' : 'No messages yet'}
      </Text>
      <Text style={styles.body}>
        {message ? message.content : 'Messages with your house manager will appear here.'}
      </Text>
      {message ? <Text style={styles.meta}>{toDisplayDate(message.created_at)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  unread: {
    borderColor: colors.primary,
  },
  unreadIcon: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
