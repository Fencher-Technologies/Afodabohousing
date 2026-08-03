/**
 * RentCoverageCard — shows rent-day tracking (effective date, paid until,
 * days remaining / in arrears, next payment due). Independent of the tenancy
 * duration fields. When no effective date has been set, shows a call-to-action
 * for managers.
 */

import { StyleSheet, Text, View } from "react-native";
import { CalendarDays, Hourglass } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Card } from "./Card";
import { Button } from "./Button";
import { formatDate, formatDays } from "@/src/utils/format";
import type { Tenancy } from "@/src/types";

interface RentCoverageCardProps {
  tenancy: Tenancy;
  canSetDate?: boolean;
  onSetDate?: () => void;
}

export function RentCoverageCard({
  tenancy,
  canSetDate = false,
  onSetDate,
}: RentCoverageCardProps) {
  const hasAnchor = !!tenancy.rent_effective_date;

  if (!hasAnchor) {
    return (
      <Card padding="md">
        <View style={styles.header}>
          <CalendarDays size={18} color={Colors.primary} />
          <Text style={styles.title}>Rent Coverage</Text>
        </View>
        <Text style={styles.notStartedText}>
          Rent coverage tracking has not been started yet. Set an effective date to see how long
          payments cover the rent (paid until, days remaining, days in arrears).
        </Text>
        {canSetDate && onSetDate && (
          <View style={styles.ctaWrap}>
            <Button
              label="Set Effective Date"
              onPress={onSetDate}
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<CalendarDays size={16} color={Colors.primary} />}
            />
          </View>
        )}
      </Card>
    );
  }

  const inArrears = (tenancy.rent_days_in_arrears ?? 0) > 0;

  return (
    <Card padding="md">
      <View style={styles.header}>
        <CalendarDays size={18} color={Colors.primary} />
        <Text style={styles.title}>Rent Coverage</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.label}>Effective Date</Text>
          <Text style={styles.value}>{formatDate(tenancy.rent_effective_date)}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Paid Until</Text>
          <Text style={styles.value}>{formatDate(tenancy.paid_until_date)}</Text>
        </View>
      </View>

      <View style={styles.highlightRow}>
        <View style={[styles.highlight, inArrears ? styles.highlightArrears : styles.highlightOk]}>
          <Hourglass size={16} color={inArrears ? Colors.danger : Colors.success} />
          <View style={styles.highlightBody}>
            <Text style={styles.highlightLabel}>{inArrears ? "Days in Arrears" : "Days Remaining"}</Text>
            <Text style={[styles.highlightValue, { color: inArrears ? Colors.danger : Colors.success }]}>
              {formatDays(inArrears ? tenancy.rent_days_in_arrears : tenancy.rent_days_remaining)}
            </Text>
          </View>
        </View>
        <View style={[styles.highlight, styles.highlightMuted]}>
          <View style={styles.highlightBody}>
            <Text style={styles.highlightLabel}>Next Payment Due</Text>
            <Text style={styles.highlightValue}>{formatDate(tenancy.next_payment_due_date)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footnote}>
        Rent coverage uses 30-day months and is separate from the tenancy start/end dates.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  notStartedText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  ctaWrap: {
    marginTop: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  item: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  label: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  value: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  highlightRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  highlight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  highlightOk: {
    backgroundColor: Colors.successSoft,
  },
  highlightArrears: {
    backgroundColor: Colors.dangerSoft,
  },
  highlightMuted: {
    backgroundColor: Colors.surfaceAlt,
  },
  highlightBody: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  highlightValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  footnote: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
