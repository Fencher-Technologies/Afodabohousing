import { Feather } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface SelectFieldProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder: string;
  value: T;
}

interface DropdownLayout {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  placeholder,
  value,
}: SelectFieldProps<T>) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout>({
    left: spacing.md,
    maxHeight: 280,
    top: 0,
    width: 0,
  });
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? placeholder,
    [options, placeholder, value],
  );
  const closeDropdown = useCallback(() => setOpen(false), []);
  const openDropdown = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const horizontalMargin = spacing.md;
      const verticalMargin = spacing.lg;
      const preferredHeight = 280;
      const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
      const left = Math.max(horizontalMargin, Math.min(x, windowWidth - width - horizontalMargin));
      const dropdownOffset = spacing.sm;
      const triggerTop = Math.max(verticalMargin, y + statusBarOffset);
      const triggerBottom = triggerTop + height;
      const spaceBelow = windowHeight - triggerBottom - verticalMargin;
      const spaceAbove = triggerTop - verticalMargin;
      const shouldOpenUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(preferredHeight, shouldOpenUp ? spaceAbove : spaceBelow),
      );
      const top = shouldOpenUp
        ? Math.max(verticalMargin, triggerTop - maxHeight - dropdownOffset)
        : triggerBottom + dropdownOffset;

      setDropdownLayout({
        left,
        maxHeight,
        top,
        width,
      });
      setOpen(true);
    });
  }, [windowHeight, windowWidth]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View collapsable={false} ref={triggerRef}>
        <Pressable onPress={() => (open ? closeDropdown() : openDropdown())} style={styles.trigger}>
          <Text style={[styles.triggerText, value ? styles.valueText : styles.placeholderText]}>
            {selectedLabel}
          </Text>
          <Feather color={colors.textMuted} name={open ? 'chevron-up' : 'chevron-down'} size={18} />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeDropdown}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={open}
      >
        <View style={styles.modalRoot}>
          <Pressable onPress={closeDropdown} style={styles.backdrop} />
          <View
            style={[
              styles.dropdown,
              {
                left: dropdownLayout.left,
                maxHeight: dropdownLayout.maxHeight,
                top: dropdownLayout.top,
                width: dropdownLayout.width,
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.optionList}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const selected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      closeDropdown();
                    }}
                    style={[styles.optionRow, selected ? styles.optionRowSelected : null]}
                  >
                    <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                      {option.label}
                    </Text>
                    {selected ? <Feather color={colors.primary} name="check" size={18} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdown: {
    ...shadows.floating,
    position: 'absolute',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'hidden',
    padding: 10,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    marginBottom: 8,
  },
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  optionList: {
    gap: spacing.xs,
    padding: 0,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
  },
  optionTextSelected: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  triggerText: {
    fontFamily: typography.body,
    fontSize: 15,
  },
  valueText: {
    color: colors.textPrimary,
  },
  wrapper: {
    gap: 2,
  },
});
