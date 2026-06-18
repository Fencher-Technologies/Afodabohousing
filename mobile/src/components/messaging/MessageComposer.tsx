import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../common/Button';
import { TextInputField } from '../forms/TextInputField';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface MessageComposerProps {
  disabled?: boolean;
  helperText: string;
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
  const trimmedMessage = message.trim();

  const handleSend = async () => {
    if (!trimmedMessage) {
      return;
    }

    await onSend(trimmedMessage);
    setMessage('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Send Message</Text>
      <Text style={styles.helper}>{helperText}</Text>
      <TextInputField
        editable={!disabled && !loading}
        label="Message"
        multiline
        onChangeText={setMessage}
        placeholder="Write a short message..."
        value={message}
      />
      <Button
        disabled={disabled || !trimmedMessage}
        loading={loading}
        onPress={() => void handleSend()}
      >
        Send Message
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  helper: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
});
