/**
 * NotFoundScreen — fallback for unknown routes.
 */

import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Compass } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { Screen } from "@/src/components/Screen";

export default function NotFoundScreen() {
  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Compass size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.description}>
          The page you're looking for doesn't exist or may have moved.
        </Text>
        <View style={styles.action}>
          <Button label="Go Home" onPress={() => router.replace("/")} fullWidth size="lg" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.title,
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
  action: {
    marginTop: Spacing.xl,
    width: "100%",
  },
});
