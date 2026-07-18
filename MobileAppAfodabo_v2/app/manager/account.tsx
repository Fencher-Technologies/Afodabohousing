/**
 * ManagerAccountScreen — profile, subscription card, settings, sign out.
 */

import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import {
  User,
  Lock,
  Crown,
  Building2,
  Users,
  Mail,
  Info,
  ChevronRight,
  LogOut,
  Send,
  ShieldCheck,
  FileText,
  Headphones,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { CollapsibleSection } from "@/src/components/CollapsibleSection";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth-context";
import { formatUGX, formatDate } from "@/src/utils/format";

export default function ManagerAccountScreen() {
  const { user, subscription, signOut } = useAuth();

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const isActive = subscription?.status === "active";

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <Card padding="lg" style={styles.profileCard}>
          <Avatar name={user.full_name} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.full_name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.profileMeta}>
              <Badge label="House Manager" tone="primary" />
              {user.email_verified && (
                <Badge label="Verified" tone="accent" dot />
              )}
            </View>
          </View>
        </Card>

        {/* Subscription Card */}
        <Card padding="lg" style={styles.subCard}>
          <View style={styles.subHeader}>
            <View style={styles.subIconWrap}>
              <Crown size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subTitle}>Subscription</Text>
              <Text style={styles.subPlan}>{subscription?.plan_name ?? "No plan"}</Text>
            </View>
            <Badge
              label={isActive ? "Active" : "Expired"}
              tone={isActive ? "success" : "danger"}
              dot
            />
          </View>
          {isActive && subscription && (
            <View style={styles.subDetails}>
              <View style={styles.subDetailItem}>
                <Text style={styles.subDetailLabel}>Expires</Text>
                <Text style={styles.subDetailValue}>{formatDate(subscription.expires_at)}</Text>
              </View>
              <View style={styles.subDetailItem}>
                <Text style={styles.subDetailLabel}>Days left</Text>
                <Text style={styles.subDetailValue}>{subscription.days_remaining} days</Text>
              </View>
            </View>
          )}
          <Button
            label={isActive ? "Manage Subscription" : "Renew Now"}
            onPress={() => router.push("/subscription")}
            variant={isActive ? "outline" : "solid"}
            tone={isActive ? "accent" : "gold"}
            fullWidth
            size="sm"
          />
        </Card>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Manage</Text>
          <Card padding="none">
            <ActionRow icon={<Building2 size={20} color={Colors.primary} />} label="Properties" onPress={() => router.push("/manager/properties")} />
            <Divider />
            <ActionRow icon={<Users size={20} color={Colors.primary} />} label="Tenancies" onPress={() => router.push("/manager/tenancies")} />
            <Divider />
            <ActionRow icon={<FileText size={20} color={Colors.primary} />} label="Reports" onPress={() => router.push("/manager/reports")} />
            <Divider />
            <ActionRow icon={<Send size={20} color={Colors.primary} />} label="Send Invite" onPress={() => Alert.alert("Send Invite", "Enter tenant email to send an invitation.")} />
          </Card>
        </View>

        {/* Account Settings */}
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
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  profileMeta: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  subCard: {
    marginBottom: Spacing.lg,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  subIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  subTitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  subPlan: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginVertical: Spacing.md,
  },
  subDetailItem: { flex: 1 },
  subDetailLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  subDetailValue: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
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
  signOutText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
  version: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
