/**
 * Toast: lightweight non-blocking feedback. Success confirmations and other
 * FYI messages belong here; Alert stays for destructive confirmations and
 * errors that demand a decision.
 */

import { CheckCircle2, AlertTriangle, Info } from "lucide-react-native";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

type ToastType = "success" | "error" | "info";

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<{ message: string; type: ToastType; key: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ message, type, key: Date.now() });
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setCurrent(null)
      );
    }, DURATION_MS);
  }, [opacity]);

  const Icon = current?.type === "success" ? CheckCircle2 : current?.type === "error" ? AlertTriangle : Info;
  const tint =
    current?.type === "success" ? Colors.success : current?.type === "error" ? Colors.danger : Colors.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {current && (
        <Animated.View
          key={current.key}
          pointerEvents="none"
          style={[styles.toast, { opacity, borderLeftColor: tint }]}
          accessibilityLiveRegion="polite"
        >
          <Icon size={18} color={tint} />
          <Text style={styles.text}>{current.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderLeftWidth: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
});
