import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

interface ScreenProps {
  children: React.ReactNode;
  padded?: boolean;
  scrollable?: boolean;
}

export function Screen({ children, padded = true, scrollable = true }: ScreenProps) {
  const content = <View style={[styles.content, padded ? styles.padded : null]}>{children}</View>;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing.lg,
  },
  padded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
