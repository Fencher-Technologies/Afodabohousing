import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MessageRow } from '../types/supabase';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateTimeLabel } from '../utils/format';

interface DisplayMessage extends MessageRow {
  receiver_name?: string;
  sender_name?: string;
}

interface MessageBubbleProps {
  message: DisplayMessage;
  userId: string;
}

export function MessageBubble({ message, userId }: MessageBubbleProps) {
  const outgoing = message.sender_id === userId;

  return (
    <View style={[styles.card, outgoing ? styles.outgoing : styles.incoming]}>
      <Text style={styles.title}>{outgoing ? 'You' : message.sender_name || 'House Manager'}</Text>
      <Text style={styles.body}>{message.content}</Text>
      <Text style={styles.time}>{formatDateTimeLabel(message.created_at)}</Text>
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
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.md,
  },
  incoming: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outgoing: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  time: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
});
