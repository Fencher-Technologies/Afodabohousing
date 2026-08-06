/**
 * TermHelpSheet — bottom sheet explaining the financial terms shown in the
 * tenancy summary. Role-aware wording for managers and tenants.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

export type TermHelpRole = "manager" | "tenant";

interface TermHelpSheetProps {
  visible: boolean;
  role: TermHelpRole;
  onClose: () => void;
}

interface TermCopy {
  term: string;
  description: string;
}

const TERMS: Record<TermHelpRole, TermCopy[]> = {
  manager: [
    {
      term: "Monthly Rent",
      description: "The agreed rent amount for this tenancy that the tenant pays every 30 days.",
    },
    {
      term: "Expected Rent So Far",
      description: "How much rent should have been collected from the Rent Effective Date up to today.",
    },
    {
      term: "Total Paid",
      description: "The total confirmed rent payments received from the tenant.",
    },
    {
      term: "Credit",
      description: "Extra money the tenant has paid in advance. The system automatically applies this amount toward future rent.",
    },
    {
      term: "Outstanding",
      description: "Rent that is currently due but has not yet been paid by the tenant.",
    },
    {
      term: "Days Remaining",
      description: "Approximately how many rent days are covered by the tenant's current payments.",
    },
    {
      term: "Next Payment Due",
      description: "The next scheduled rent payment date calculated from the Rent Effective Date.",
    },
  ],
  tenant: [
    {
      term: "Monthly Rent",
      description: "Your agreed rent amount that you are expected to pay every 30 days.",
    },
    {
      term: "Expected Rent So Far",
      description: "How much rent you should have paid from your Rent Effective Date up to today.",
    },
    {
      term: "Total Paid",
      description: "The total confirmed rent payments you have made.",
    },
    {
      term: "Credit",
      description: "Money you have already paid that will be used to cover your future rent payments.",
    },
    {
      term: "Outstanding",
      description: "Rent that is currently unpaid based on your rent schedule.",
    },
    {
      term: "Days Remaining",
      description: "Approximately how many rent days your current payments cover.",
    },
    {
      term: "Next Payment Due",
      description: "The next date your rent payment is expected.",
    },
  ],
};

const NOTE =
  "The system automatically calculates rent status, credit, and outstanding amounts using the Rent Effective Date and confirmed rent payments.";

export function TermHelpSheet({ visible, role, onClose }: TermHelpSheetProps) {
  const terms = TERMS[role];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Understanding your summary</Text>
              <Text style={styles.subtitle}>
                {role === "manager" ? "Tenant payment status explained" : "Your rent details explained"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <X size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {terms.map((item, index) => (
              <View key={item.term} style={[styles.termBlock, index > 0 && styles.termDivider]}>
                <Text style={styles.termTitle}>{item.term}</Text>
                <Text style={styles.termDescription}>{item.description}</Text>
              </View>
            ))}
            <View style={styles.noteWrap}>
              <Text style={styles.noteText}>{NOTE}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.modal,
    borderTopRightRadius: Radii.modal,
    paddingBottom: Spacing.xl,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: Spacing.lg,
  },
  termBlock: {
    paddingVertical: Spacing.md,
  },
  termDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  termTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  termDescription: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  noteWrap: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  noteText: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
  },
});
