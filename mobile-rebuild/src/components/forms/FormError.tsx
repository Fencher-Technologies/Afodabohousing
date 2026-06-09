import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export function FormError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.error,
    borderRadius: radii.input,
    borderWidth: 1,
    padding: spacing.md,
  },
  text: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
});
