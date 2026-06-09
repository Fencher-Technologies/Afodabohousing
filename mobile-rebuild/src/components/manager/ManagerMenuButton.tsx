import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface ManagerMenuButtonProps {
  onPress: () => void;
  variant?: 'brand' | 'light';
}

export function ManagerMenuButton({ onPress, variant = 'light' }: ManagerMenuButtonProps) {
  const brand = variant === 'brand';

  return (
    <Pressable
      accessibilityLabel="Open manager menu"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        brand ? styles.brandButton : styles.lightButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={brand ? colors.primaryForeground : colors.primary} name="menu" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    width: 40,
  },
  brandButton: {
    backgroundColor: colors.primary,
  },
  lightButton: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
