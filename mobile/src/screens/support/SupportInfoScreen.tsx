import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface SupportInfoScreenProps {
  body: string;
  eyebrow: string;
  title: string;
}

export function SupportInfoScreen({ body, eyebrow, title }: SupportInfoScreenProps) {
  return (
    <ScreenContainer>
      <AppHeader
        eyebrow={eyebrow}
        icon="information-circle-outline"
        subtitle="Helpful information for using Afodabo Housing on mobile."
        title={title}
      />
      <View style={styles.card}>
        <Text style={styles.body}>{body}</Text>
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
});
