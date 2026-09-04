import { Image } from "expo-image";
import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";

// Single brand lockup for the whole app: burgundy badge + "Axis Housing"
// wordmark, composed exactly like the web navbar so both platforms carry the
// same logo. The badge asset keeps its white ring, so it stays readable on
// cream headers and burgundy hero headers alike. The lockup is decorative:
// the brand is already announced by screen titles and header text, so it is
// hidden from screen readers.

const SIZES = {
  sm: { icon: 24, fontSize: 15, gap: 7 },
  md: { icon: 30, fontSize: 18, gap: 9 },
} as const;

const BADGE = require("@/assets/images/axis-badge-ring.png");

type Props = {
  size?: keyof typeof SIZES;
  /** "dark" (default) for light backgrounds, "light" for dark/brand headers. */
  tone?: "dark" | "light";
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({ size = "md", tone = "dark", style }: Props) {
  const dims = SIZES[size];
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: dims.gap }, style]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image
        source={BADGE}
        style={{ width: dims.icon, height: dims.icon }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <Text
        style={{
          fontSize: dims.fontSize,
          fontWeight: "700",
          letterSpacing: -0.2,
          color: tone === "light" ? Colors.textOnPrimary : Colors.primary,
        }}
      >
        Axis Housing
      </Text>
    </View>
  );
}
