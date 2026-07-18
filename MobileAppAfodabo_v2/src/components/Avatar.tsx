import { StyleSheet, Text, View } from "react-native";

import { Colors, FontSize, FontWeight } from "@/constants/theme";

interface AvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, size = 56, backgroundColor, textColor }: AvatarProps) {
  const initials = getInitials(name);
  const half = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: backgroundColor || Colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: size * 0.38,
            color: textColor || Colors.textOnPrimary,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: FontWeight.bold,
  },
});
