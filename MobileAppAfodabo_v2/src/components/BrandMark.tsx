import { Image } from "expo-image";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";

// Single logo implementation for the whole app. Every header renders the
// brand through this component so sizing, caching and accessibility stay
// consistent. The logo is decorative: the brand is already announced by
// screen titles and header text, so it is hidden from screen readers.

const SIZES = {
  sm: { width: 84, height: 26 },
  md: { width: 108, height: 34 },
} as const;

type Props = {
  size?: keyof typeof SIZES;
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({ size = "md", style }: Props) {
  const dims = SIZES[size];
  return (
    <Image
      source={require("@/assets/images/axis-logo.png")}
      style={[{ width: dims.width, height: dims.height }, style]}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
