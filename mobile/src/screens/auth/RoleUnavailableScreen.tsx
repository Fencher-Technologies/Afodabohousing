import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export function RoleUnavailableScreen() {
  const { error, signOut, user } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Account Setup</Text>
        <Text style={styles.title}>Role unavailable</Text>
        <Text style={styles.body}>
          We could not find a supported mobile role for {user?.email ?? 'this account'}. Please
          contact support or use the web dashboard while this is resolved.
        </Text>
        {error ? <Text style={styles.error}>{error.message}</Text> : null}
        <Text style={styles.link} onPress={() => void signOut()}>
          Sign out
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  link: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
