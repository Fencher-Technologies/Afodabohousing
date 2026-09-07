/**
 * Super Admin account screen.
 *
 * Deliberately minimal: profile, legal links and sign-out. Manager-specific
 * items (subscription, boosts, property tools) don't apply to an admin, so
 * this doesn't reuse the manager account screen.
 */

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, FileText, LogOut, Shield, User } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Avatar } from "@/src/components/Avatar";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { useAuth } from "@/src/context/auth-context";

function Row({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Card padding="md" style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={18} color={Colors.textMuted} />
    </Card>
  );
}

export default function SuperAdminAccount() {
  const { user, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card padding="lg" style={styles.profile}>
        <Avatar name={user?.full_name || user?.email || "Admin"} size={56} />
        <View style={styles.profileText}>
          <Text style={styles.name}>{user?.full_name || "Super Admin"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <Badge label="Super Admin" tone="primary" size="sm" />
      </Card>

      <Row
        label="Edit profile"
        icon={<User size={18} color={Colors.primary} />}
        onPress={() => router.push("/edit-profile")}
      />
      <Row
        label="Change password"
        icon={<Shield size={18} color={Colors.primary} />}
        onPress={() => router.push("/change-password")}
      />
      <Row
        label="Legal"
        icon={<FileText size={18} color={Colors.primary} />}
        onPress={() => router.push("/legal")}
      />

      <View style={{ height: Spacing.lg }} />
      <Button
        label="Sign out"
        variant="outline"
        tone="danger"
        leftIcon={<LogOut size={18} color={Colors.danger} />}
        onPress={confirmSignOut}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  profile: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  profileText: { flex: 1 },
  name: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  email: { fontSize: FontSize.caption, color: Colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  rowIcon: { width: 24, alignItems: "center" },
  rowLabel: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
});
