import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { colors, shadows, spacing, typography } from '../../theme';

export function AdminLiteHomeScreen() {
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out of Afodabo Housing?', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          void signOut();
        },
        style: 'destructive',
        text: 'Sign Out',
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Admin Lite</Text>
        <Text style={styles.title}>Web dashboard recommended</Text>
        <Text style={styles.body}>
          Admin mobile access is intentionally lightweight for MVP. Full admin operations remain on
          the web dashboard.
        </Text>
        <Button onPress={handleLogout} variant="outline">
          Sign Out
        </Button>
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
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
