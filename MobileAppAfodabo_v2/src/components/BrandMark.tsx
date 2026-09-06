import { Image, ImageStyle } from "expo-image";
import React from "react";
import { StyleProp } from "react-native";

// Single logo implementation for the whole app. Every header renders the
// brand through this component so sizing, caching and accessibility stay
// consistent. The logo is decorative: the brand is already announced by
// screen titles and header text, so it is hidden from screen readers.

const SIZES = {
  sm: { width: 96, height: 30 },
  md: { width: 124, height: 38 },
} as const;

const SOURCES = {
  dark: require("@/assets/images/axis-logo.png"),
  light: require("@/assets/images/axis-logo-white.png"),
} as const;

type Props = {
  size?: keyof typeof SIZES;
  /** "dark" (default) for light backgrounds, "light" for dark/brand headers. */
  tone?: keyof typeof SOURCES;
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = "md", tone = "dark", style }: Props) {
  const dims = SIZES[size];
  return (
    <Image
      source={SOURCES[tone]}
      style={[{ width: dims.width, height: dims.height }, style]}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
