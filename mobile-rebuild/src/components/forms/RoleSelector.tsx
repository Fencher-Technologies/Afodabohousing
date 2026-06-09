import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import type { AppRole } from '../../types/database';

type RegisterableRole = Exclude<AppRole, 'admin'>;

interface RoleSelectorProps {
  onChange: (role: RegisterableRole) => void;
  value: RegisterableRole;
}

const roleOptions: {
  label: string;
  value: RegisterableRole;
}[] = [
  { label: 'Tenant', value: 'tenant' },
  { label: 'House Manager', value: 'house_manager' },
];

export function RoleSelector({ onChange, value }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      {roleOptions.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    textAlign: 'center',
  },
  optionTextActive: {
    color: colors.primaryForeground,
  },
});
