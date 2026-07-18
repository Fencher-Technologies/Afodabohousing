/**
 * LoadingState — full-screen and inline loading variants.
 */

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";

interface LoadingStateProps {
  message?: string;
  inline?: boolean;
}

export function LoadingState({ message, inline = false }: LoadingStateProps) {
  if (inline) {
    return (
      <View style={styles.inline}>
        <ActivityIndicator size="small" color={Colors.primary} />
        {message && <Text style={styles.inlineText}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.fullText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  fullText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  inlineText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
});
