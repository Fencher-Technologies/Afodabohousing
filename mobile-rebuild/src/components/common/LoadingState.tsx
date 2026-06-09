import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export function LoadingState({ message = 'Loading your account' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    textAlign: 'center',
  },
});
