import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ErrorStateProps {
  description: string;
  onRetry: () => void;
  title: string;
}

export function ErrorState({ description, onRetry, title }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons color={colors.error} name="alert-circle-outline" size={22} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button onPress={onRetry} variant="outline">
        Try Again
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 21,
    lineHeight: 26,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
