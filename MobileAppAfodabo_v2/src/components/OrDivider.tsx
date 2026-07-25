import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";

export function OrDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>OR</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.accent,
    letterSpacing: 1,
  },
});
