import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Button } from './button';

interface MessageComposerProps {
  disabled?: boolean;
  helperText?: string;
  phoneNumber?: string;
}

export function MessageComposer({
  disabled = false,
  helperText,
  phoneNumber,
}: MessageComposerProps) {
  function handleOpenWhatsApp() {
    const num = phoneNumber?.replace(/[^0-9]/g, '') || '256700000000';
    Linking.openURL(`https://wa.me/${num}`);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Contact Manager</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      <Button disabled={disabled} onPress={handleOpenWhatsApp}>
        Chat on WhatsApp
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  clearVoiceNote: {
    padding: 2,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  inputField: {
    flex: 1,
  },
  inputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  micActive: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  micButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  recordingDot: {
    backgroundColor: colors.textMuted,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  recordingDotActive: {
    backgroundColor: colors.error,
  },
  recordingStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recordingText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  voiceNotePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  voiceNotePillText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
});
