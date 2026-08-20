/**
 * LoadingState — full-screen and inline loading variants.
 */

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
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
      <StatusBar style="dark" backgroundColor={Colors.bg} />
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
    backgroundColor: Colors.bg,
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
