/**
 * ErrorState — full-screen error with retry.
 */

import { RefreshCw, AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <AlertCircle size={32} color={Colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry && (
        <View style={styles.action}>
          <Button label="Try Again" onPress={onRetry} variant="outline" leftIcon={<RefreshCw size={18} color={Colors.primary} />} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  action: { marginTop: Spacing.xl },
});
