/**
 * TenancyCard — rich card for tenancy list items: full details, status,
 * health, and a days-left progress bar. Tapping opens the tenancy detail.
 */

import { AlarmClock, CalendarClock, MessageCircle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Badge } from "./Badge";
import { HealthBorder, HealthLabel, daysLeft, leaseProgress } from "@/src/utils/tenancy-health";
import { formatUGX, formatDateShort, formatPeriod } from "@/src/utils/format";
import type { Tenancy, TenancyStatus } from "@/src/types";

interface TenancyCardProps {
  tenancy: Tenancy;
  onPress: () => void;
  onRecordPayment?: () => void;
  onSendReminder?: () => void;
  showActions?: boolean;
}

const STATUS_META: Record<TenancyStatus, { label: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  active: { label: "Active", tone: "success" },
  expired: { label: "Expired", tone: "warning" },
  terminated: { label: "Terminated", tone: "danger" },
};

export function TenancyCard({ tenancy, onPress, onRecordPayment, onSendReminder, showActions = true }: TenancyCardProps) {
  const borderColor = HealthBorder[tenancy.health];
  const hasBalance = tenancy.balance_due > 0;
  const remaining = daysLeft(tenancy.rent_end_date);
  const progress = leaseProgress(tenancy.rent_start_date, tenancy.rent_end_date);
  const statusMeta = STATUS_META[tenancy.status] ?? { label: tenancy.status, tone: "muted" as const };

  const progressColor =
    tenancy.health === "good" ? Colors.healthGood : tenancy.health === "warn" ? Colors.healthWarn : Colors.healthBad;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderLeftColor: borderColor }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Tenancy: ${tenancy.tenant_name}, ${tenancy.property_title}`}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.tenantName} numberOfLines={1}>{tenancy.tenant_name}</Text>
          <Text style={styles.property} numberOfLines={1}>
            {tenancy.property_title}
            {tenancy.unit_label ? ` · ${tenancy.unit_label}` : ""}
          </Text>
        </View>
        <Badge label={HealthLabel[tenancy.health]} tone={tenancy.health === "good" ? "success" : tenancy.health === "warn" ? "warning" : "danger"} dot />
      </View>

      <View style={styles.metaRow}>
        <Badge label={statusMeta.label} tone={statusMeta.tone} />
        <Text style={styles.metaText}>
          {formatDateShort(tenancy.rent_start_date)} – {formatDateShort(tenancy.rent_end_date)}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Rent</Text>
          <Text style={styles.statValue}>{formatUGX(tenancy.rent_amount)}{formatPeriod(tenancy.rent_period)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={[styles.statValue, hasBalance && styles.balanceDue]}>{formatUGX(tenancy.balance_due)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Standing</Text>
          <Text style={[styles.statValue, tenancy.is_overdue ? styles.balanceDue : styles.paidText]}>
            {tenancy.is_overdue ? "Overdue" : "Paid up"}
          </Text>
        </View>
      </View>

      <View style={styles.daysRow}>
        <CalendarClock size={14} color={Colors.textMuted} />
        <Text style={styles.daysLabel}>{remaining === null ? "No end date" : remaining >= 0 ? `${remaining} days left` : `${-remaining} days over`}</Text>
        <Text style={styles.lastPaid}>{tenancy.last_payment_date ? `Last paid ${formatDateShort(tenancy.last_payment_date)}` : "No payments yet"}</Text>
      </View>
      {progress !== null && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: progressColor }]} />
        </View>
      )}

      {showActions && hasBalance && (
        <View style={styles.actions}>
          {onRecordPayment && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onRecordPayment(); }}
              style={[styles.actionBtn, styles.recordBtn]}
              accessibilityRole="button"
              accessibilityLabel="Record payment"
            >
              <Text style={styles.recordBtnText}>Record Payment</Text>
            </Pressable>
          )}
          {onSendReminder && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onSendReminder?.(); }}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Send WhatsApp reminder"
            >
              <MessageCircle size={18} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Remind</Text>
            </Pressable>
          )}
        </View>
      )}

      {showActions && !hasBalance && (
        <View style={styles.actions}>
          <View style={styles.paidBadge}>
            <AlarmClock size={14} color={Colors.success} />
            <Text style={styles.paidText}>Paid Up</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.9 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  headerLeft: { flex: 1 },
  tenantName: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  property: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaText: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: { flex: 1 },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  statValue: {
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  balanceDue: { color: Colors.danger },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  daysLabel: {
    fontSize: FontSize.micro,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  lastPaid: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginLeft: "auto",
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radii.pill,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
  },
  recordBtn: {
    backgroundColor: Colors.primary,
    flex: 1,
    justifyContent: "center",
  },
  recordBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  actionBtnText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paidText: {
    fontSize: FontSize.caption,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
});
