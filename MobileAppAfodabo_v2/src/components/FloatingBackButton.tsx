import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";

interface FloatingBackButtonProps {
  onPress: () => void;
  tint?: "light" | "dark";
}

export function FloatingBackButton({ onPress, tint = "light" }: FloatingBackButtonProps) {
  const insets = useSafeAreaInsets();
  const isLight = tint === "light";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          top: insets.top + Spacing.sm,
          backgroundColor: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.86)",
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
    >
      <ChevronLeft
        size={24}
        color={isLight ? Colors.textOnPrimary : Colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
