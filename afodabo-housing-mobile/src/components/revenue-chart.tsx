import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatUGXFull } from '../utils/format';

interface RevenueDataPoint {
  amount: number;
  label: string;
}

interface RevenueChartProps {
  data: { amount: number; created_at: string }[];
}

const CHART_HEIGHT = 160;
const BAR_GAP = 6;
const BAR_MIN_HEIGHT = 4;

export function RevenueChart({ data }: RevenueChartProps) {
  const monthlyData = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const item of data) {
      let date: Date;
      try {
        date = parseISO(item.created_at);
      } catch {
        continue;
      }
      if (Number.isNaN(date.getTime())) continue;
      const key = format(date, 'MMM');
      grouped[key] = (grouped[key] || 0) + item.amount;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const result: RevenueDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const label = months[monthIndex];
      result.push({
        amount: grouped[label] || 0,
        label,
      });
    }

    return result;
  }, [data]);

  const maxAmount = Math.max(...monthlyData.map((d) => d.amount), 1);
  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.total}>{formatUGXFull(totalRevenue)}</Text>
      <Text style={styles.subtitle}>Last 6 months</Text>

      <View style={styles.barsContainer}>
        {monthlyData.map((point) => {
          const barHeight = Math.max(
            (point.amount / maxAmount) * (CHART_HEIGHT - 20),
            BAR_MIN_HEIGHT,
          );

          return (
            <View key={point.label} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {point.amount > 0 ? formatUGXFull(point.amount) : '—'}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: point.amount > 0 ? colors.primary : colors.border,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radii.pill,
    width: 28,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  barValue: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 10,
    textAlign: 'center',
  },
  barsContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: BAR_GAP,
    height: CHART_HEIGHT,
    paddingTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  total: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 28,
  },
  wrapper: {
    gap: 4,
  },
});
