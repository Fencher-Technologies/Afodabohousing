import React, { useState } from 'react';
import { Alert, Clipboard, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { sendInvite, type SendInviteResponse } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function SendInviteScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [invite, setInvite] = useState<SendInviteResponse | null>(null);

  async function handleGenerate() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Valid email required', 'Enter the email address of the person you want to invite.');
      return;
    }

    try {
      setSending(true);
      setInvite(null);
      const result = await sendInvite({ email: trimmed, role: 'tenant' });
      setInvite(result);
    } catch (error) {
      Alert.alert('Could not create invite', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleCopy() {
    if (!invite) return;
    Clipboard.setString(invite.token);
    Alert.alert('Copied!', 'Invitation token copied. Share it with the tenant.');
  }

  function handleReset() {
    setInvite(null);
    setEmail('');
  }

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Invite a Tenant</Text>
        <Text style={styles.body}>
          Generate an invitation token for a new tenant. Share the token with them so they can create
          their account and link to you as their house manager.
        </Text>
      </View>

      {!invite ? (
        <View style={styles.card}>
          <InputField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Tenant Email"
            onChangeText={setEmail}
            placeholder="tenant@example.com"
            value={email}
          />
          <Button disabled={sending || !email.trim()} onPress={handleGenerate}>
            {sending ? 'Generating...' : 'Generate Invite'}
          </Button>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Invitation Created</Text>
          <Text style={styles.body}>Share this token with the tenant:</Text>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenText}>{invite.token}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{invite.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>Tenant</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expires</Text>
            <Text style={styles.infoValue}>{new Date(invite.expires_at).toLocaleDateString()}</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Button onPress={handleCopy}>Copy Token</Button>
            <Button onPress={handleReset} variant="outline">
              Invite Another
            </Button>
          </View>

          <Text style={styles.hint}>
            After accepting the token, the tenant will appear in your tenant list. You can then
            create a tenancy to assign them to a property.
          </Text>
        </View>
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  buttonGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hint: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    width: 80,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  infoValue: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 18,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
  tokenBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  tokenText: {
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
