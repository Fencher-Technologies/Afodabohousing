/**
 * TenantAccountScreen — simplified account for tenants.
 */

import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import {
  User,
  Lock,
  Info,
  ChevronRight,
  LogOut,
  ShieldCheck,
  FileText,
  Headphones,
  Mail,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { CollapsibleSection } from "@/src/components/CollapsibleSection";
import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/auth-context";

export default function TenantAccountScreen() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <Card padding="lg" style={styles.profileCard}>
          <Avatar
            name={user.full_name}
            backgroundColor={user.email_verified ? Colors.accent : Colors.primary}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.full_name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.profileMeta}>
              <Badge label="Tenant" tone="primary" />
              {user.email_verified && <Badge label="Verified" tone="success" dot />}
            </View>
          </View>
        </Card>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <Card padding="none">
            <ActionRow icon={<User size={20} color={Colors.textSecondary} />} label="Edit Profile" onPress={() => router.push("/edit-profile")} />
            <Divider />
            <ActionRow icon={<Lock size={20} color={Colors.textSecondary} />} label="Change Password" onPress={() => router.push("/change-password")} />
          </Card>
        </View>

        {/* Support & Policies */}
        <View style={styles.section}>
          <CollapsibleSection title="Support & Policies">
            <ActionRow icon={<Info size={20} color={Colors.textSecondary} />} label="About Afodabo" onPress={() => router.push("/legal?type=about")} />
            <Divider />
            <ActionRow icon={<Headphones size={20} color={Colors.textSecondary} />} label="Contact Support" onPress={() => router.push("/legal?type=contact")} />
            <Divider />
            <ActionRow icon={<ShieldCheck size={20} color={Colors.textSecondary} />} label="Privacy Policy" onPress={() => router.push("/legal?type=privacy")} />
            <Divider />
            <ActionRow icon={<FileText size={20} color={Colors.textSecondary} />} label="Terms of Service" onPress={() => router.push("/legal?type=terms")} />
          </CollapsibleSection>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Afodabo Housing v1.0.0</Text>
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

function ActionRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
      <ChevronRight size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.display, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
  profileMeta: { flexDirection: "row", gap: Spacing.xs, marginTop: Spacing.sm },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  signOutText: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.danger },
  version: { fontSize: FontSize.caption, color: Colors.textMuted, textAlign: "center", marginTop: Spacing.lg },
});
