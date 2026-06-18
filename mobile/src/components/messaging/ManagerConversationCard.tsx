import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerConversation } from '../../services/messages.service';
import { toDisplayDate } from '../../utils/dates';

interface ManagerConversationCardProps {
  conversation: ManagerConversation;
  onPress: () => void;
}

export function ManagerConversationCard({ conversation, onPress }: ManagerConversationCardProps) {
  const { lastMessage } = conversation;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        conversation.unreadCount > 0 && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{conversation.participantName}</Text>
          {conversation.propertyTitle ? (
            <Text style={styles.property}>{conversation.propertyTitle}</Text>
          ) : null}
        </View>
        {conversation.unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.preview}>
        {lastMessage.sender_id === conversation.participantId ? '' : 'You: '}
        {lastMessage.content}
      </Text>
      <Text style={styles.meta}>{toDisplayDate(lastMessage.created_at)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 28,
    minWidth: 28,
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.accentForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 17,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  preview: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  property: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  unread: {
    borderColor: colors.primary,
  },
});
