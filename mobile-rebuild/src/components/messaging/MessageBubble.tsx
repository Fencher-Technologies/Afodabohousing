import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import type { TenantMessage } from '../../services/messages.service';
import { toDisplayDate } from '../../utils/dates';

export function MessageBubble({ message, userId }: { message: TenantMessage; userId: string }) {
  const outgoing = message.sender_id === userId;

  return (
    <View style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}>
      <Text style={[styles.sender, outgoing && styles.outgoingText]}>
        {outgoing ? 'You' : message.sender_name || 'House Manager'}
      </Text>
      <Text style={[styles.content, outgoing && styles.outgoingText]}>{message.content}</Text>
      <Text style={[styles.time, outgoing && styles.outgoingMeta]}>
        {toDisplayDate(message.created_at)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radii.card,
    gap: spacing.xs,
    maxWidth: '86%',
    padding: spacing.md,
  },
  content: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  incoming: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outgoing: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  outgoingMeta: {
    color: colors.primaryForeground,
    opacity: 0.76,
  },
  outgoingText: {
    color: colors.primaryForeground,
  },
  sender: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  time: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
  },
});
