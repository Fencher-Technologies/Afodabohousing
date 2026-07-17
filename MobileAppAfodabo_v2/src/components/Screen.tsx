/**
 * Screen — base wrapper providing safe area, background, and scroll.
 */

import { StyleSheet, ScrollView, View, ViewStyle, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import type { ReactNode } from "react";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  /** Optional pull-to-refresh handler. When provided, renders a RefreshControl. */
  onRefresh?: () => void | Promise<void>;
  /** Spinner state for the RefreshControl. Required when `onRefresh` is set. */
  refreshing?: boolean;
}

export function Screen({ children, scroll = true, style, contentContainerStyle, onRefresh, refreshing }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.inner, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
});
