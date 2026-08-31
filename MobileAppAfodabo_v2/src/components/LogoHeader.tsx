import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandMark } from "@/src/components/BrandMark";
import { Colors } from "@/constants/theme";

// Branded page header: Axis logo on top, optional title/subtitle below.
// Used on screens that do not take PageHeader (e.g. full-bleed flows).

type Props = {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function LogoHeader({ title, subtitle, rightAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <BrandMark size="md" />
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
});
