/**
 * GuestAccountScreen — polished account entry point for guests.
 */

import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Info, ChevronRight, ShieldCheck, FileText, Headphones, Home } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { CollapsibleSection } from "@/src/components/CollapsibleSection";
import { useAuth } from "@/src/context/auth-context";

export default function GuestAccountScreen() {
  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Home size={32} color={Colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Browsing as Guest</Text>
        <Text style={styles.heroText}>
          Create an account or sign in to manage tenancies, track payments, and message landlords.
        </Text>
      </View>

      <View style={styles.content}>
        <Card padding="lg" style={styles.authCard}>
          <Button label="Sign In" onPress={() => router.push("/login")} fullWidth size="lg" />
          <View style={{ height: Spacing.sm }} />
          <Button label="Create Account" onPress={() => router.push("/register")} variant="outline" fullWidth size="lg" />
        </Card>

        <View style={styles.section}>
          <CollapsibleSection title="Quick Links">
            <ActionRow icon={<Info size={20} color={Colors.textSecondary} />} label="About Afodabo" onPress={() => router.push("/legal?type=about")} />
            <Divider />
            <ActionRow icon={<Headphones size={20} color={Colors.textSecondary} />} label="Contact Support" onPress={() => router.push("/legal?type=contact")} />
            <Divider />
            <ActionRow icon={<ShieldCheck size={20} color={Colors.textSecondary} />} label="Privacy Policy" onPress={() => router.push("/legal?type=privacy")} />
            <Divider />
            <ActionRow icon={<FileText size={20} color={Colors.textSecondary} />} label="Terms of Service" onPress={() => router.push("/legal?type=terms")} />
          </CollapsibleSection>
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
  hero: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 48,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  heroText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  content: { paddingHorizontal: Spacing.md },
  authCard: { alignItems: "center", marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  actionRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, gap: Spacing.md },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt, alignItems: "center", justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: FontSize.body, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
  version: { fontSize: FontSize.caption, color: Colors.textMuted, textAlign: "center", marginTop: Spacing.lg },
});
