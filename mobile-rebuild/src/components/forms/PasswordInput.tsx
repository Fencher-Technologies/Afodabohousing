import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';
import { TextInputField } from './TextInputField';
import { colors, radii, spacing } from '../../theme';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  error?: string;
  helperText?: string;
  label: string;
}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInputField
        {...props}
        rightAccessory={
          <Pressable
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setVisible((current) => !current)}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          >
            <Ionicons
              color={colors.primary}
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={21}
            />
          </Pressable>
        }
        secureTextEntry={!visible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  toggle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
