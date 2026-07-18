/**
 * PageHeader — consistent screen header with title, optional back, and action.
 */

import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  large?: boolean;
}

export function PageHeader({ title, subtitle, onBack, rightAction, large = false }: PageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.row}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -Spacing.sm,
  },
  titleWrap: { flex: 1 },
  title: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  titleLarge: {
    fontSize: FontSize.display,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rightAction: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
