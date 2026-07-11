import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { PageHeader } from '../components/page-header';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function RoleUnavailableScreen() {
  const { signOut, user } = useAuth();

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <PageHeader
        label="Account Check"
        subtitle="We could not match this sign-in to a supported mobile role yet."
        title="Role Not Ready"
      />

      <View style={styles.card}>
        <Text style={styles.title}>{user?.email || 'Your account'}</Text>
        <Text style={styles.description}>
          This mobile build currently supports tenant, house manager, and admin accounts that have
          been provisioned by the backend. Please contact support if this account should already be
          active.
        </Text>
        <Button
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { style: 'cancel', text: 'Cancel' },
              { onPress: () => void signOut(), style: 'destructive', text: 'Sign Out' },
            ]);
          }}
          variant="destructive"
        >
          Sign Out
        </Button>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
});
