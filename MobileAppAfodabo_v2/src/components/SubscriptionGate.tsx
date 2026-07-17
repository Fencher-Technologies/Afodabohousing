/**
 * SubscriptionGate — modal alert that blocks gated actions when subscription is expired.
 */

import { Crown, X } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";

interface SubscriptionGateProps {
  visible: boolean;
  actionLabel: string;
  onClose: () => void;
  onRenew: () => void;
}

export function SubscriptionGate({ visible, actionLabel, onClose, onRenew }: SubscriptionGateProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <X size={20} color={Colors.textMuted} />
          </Pressable>
          <View style={styles.iconWrap}>
            <Crown size={32} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Subscription Required</Text>
          <Text style={styles.description}>
            Your subscription has expired. Renew to continue {actionLabel}.
          </Text>
          <View style={styles.actions}>
            <Button label="Cancel" onPress={onClose} variant="ghost" fullWidth />
            <Button label="Renew Now" onPress={onRenew} tone="gold" fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.modal,
    padding: Spacing.xl,
    width: "100%",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
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
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: "100%",
  },
});
