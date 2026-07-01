import React from 'react';
import {
  ScrollView,
  StyleSheet,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

interface ScrollableScreenContainerProps {
  bottomPadding?: number;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function ScrollableScreenContainer({
  bottomPadding = spacing.xl,
  children,
  contentContainerStyle,
  edges = ['left', 'right'],
  padded = true,
  refreshControl,
}: ScrollableScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          padded ? styles.padded : null,
          { paddingBottom: bottomPadding + insets.bottom },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.lg,
  },
  padded: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
