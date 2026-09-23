import { Image, ImageStyle } from "expo-image";
import React from "react";
import { StyleProp, StyleSheet, View } from "react-native";

/**
 * The Axis logo, used by every header in the app.
 *
 * The artwork is the client's logo exactly as supplied, never recoloured or
 * rearranged. On dark or brand-coloured surfaces it sits on a white panel so
 * it stays legible, which is how the client asked for it to be handled.
 */

// The supplied logo is 1200x780, i.e. 1.538:1. These boxes keep that ratio so
// nothing is letterboxed or stretched.
const SIZES = {
  sm: { width: 52, height: 34 },
  md: { width: 68, height: 44 },
  lg: { width: 105, height: 68 },
} as const;

const LOGO = require("@/assets/images/axis-logo.png");

type Props = {
  size?: keyof typeof SIZES;
  /** "dark" (default) for light backgrounds, "light" for dark/brand headers. */
  tone?: "dark" | "light";
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = "md", tone = "dark", style }: Props) {
  const dims = SIZES[size];
  const logo = (
    <Image
      source={LOGO}
      style={[{ width: dims.width, height: dims.height }, style]}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );

  if (tone === "light") {
    return <View style={styles.panel}>{logo}</View>;
  }
  return logo;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
});
