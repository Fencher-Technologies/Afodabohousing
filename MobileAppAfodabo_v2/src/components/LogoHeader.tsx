/**
 * LogoHeader, brand header shown at the top of the app's main pages.
 * Renders the Axis logo with an optional page title beneath it.
 */

import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import type { ReactNode } from "react";

const AXIS_LOGO = require("@/assets/images/axis-logo.png");

interface LogoHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export function LogoHeader({ title, subtitle, rightAction }: LogoHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Image
          source={AXIS_LOGO}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityLabel="Axis Housing"
        />
        {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
      </View>
      {title ? (
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 108,
    height: 34,
  },
  right: {
    minWidth: 34,
    alignItems: "flex-end",
  },
  titleWrap: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
});
