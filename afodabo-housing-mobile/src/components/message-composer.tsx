import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Button } from './button';
import { InputField } from './input-field';

interface MessageComposerProps {
  disabled?: boolean;
  helperText?: string;
  loading?: boolean;
  onSend: (message: string) => Promise<void>;
}

export function MessageComposer({
  disabled = false,
  helperText,
  loading = false,
  onSend,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Send a Message</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      <InputField
        label="Message"
        multiline
        onChangeText={setMessage}
        placeholder="Write your message..."
        value={message}
      />
      <Button
        disabled={disabled || loading || !message.trim()}
        onPress={async () => {
          const value = message.trim();
          if (!value) {
            return;
          }

          await onSend(value);
          setMessage('');
        }}
      >
        {loading ? 'Sending...' : 'Send Message'}
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
  helper: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
});
