/**
 * OnboardingScreen — 3-slide auto-carousel intro.
 */

import { useRef, useState, useEffect } from "react";
import { StyleSheet, Text, View, Dimensions, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { ImageBackground } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Home, Receipt, MessageCircle } from "lucide-react-native";
import type { ReactNode } from "react";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth-context";

const { width } = Dimensions.get("window");

interface Slide {
  icon: ReactNode;
  title: string;
  description: string;
  gradient: [string, string];
}

const slides: Slide[] = [
  {
    icon: <Home size={52} color="#FFFFFF" />,
    title: "Manage rentals\nfrom your phone",
    description: "Collect rent, track tenants, and stay on top of your properties — all from one app.",
    gradient: ["#1B4A38", "#2E7D52"],
  },
  {
    icon: <Receipt size={52} color="#FFFFFF" />,
    title: "Record payments,\ngenerate reports",
    description: "Log cash, bank, and mobile money payments. Export professional reports in one tap.",
    gradient: ["#236048", "#388E5A"],
  },
  {
    icon: <MessageCircle size={52} color="#FFFFFF" />,
    title: "Tenants message\nyou on WhatsApp",
    description: "No in-app messaging clutter. Send reminders and receipts straight to WhatsApp.",
    gradient: ["#1B4A38", "#2E7D52"],
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const { markOnboardingSeen } = useAuth();
  const scrollRef = useRef<import("react-native").ScrollView>(null);

  const isLast = index === slides.length - 1;

  const goNext = () => {
    if (isLast) return;
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const goToSlide = (i: number) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  const handleFinish = async () => {
    await markOnboardingSeen();
    router.replace("/guest/explore");
  };

  const handleSkip = handleFinish;

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isLast) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        if (next >= slides.length) return prev;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isLast]);

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  return (
    <View style={styles.container}>
      <View style={styles.skipRow}>
        <Pressable onPress={handleSkip} style={styles.skipBtn} accessibilityLabel="Skip onboarding">
          <Text style={styles.skipText}>{isLast ? "Browse as Guest" : "Skip"}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {slides.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <ImageBackground
              source={undefined}
              style={styles.bgImage}
            >
              <LinearGradient
                colors={slide.gradient}
                style={styles.gradient}
              >
                <View style={styles.slideContent}>
                  <View style={styles.iconWrap}>{slide.icon}</View>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {isLast ? (
          <View style={styles.actions}>
            <Button label="Create Account" onPress={() => { markOnboardingSeen(); router.replace("/register"); }} variant="gold" fullWidth size="lg" />
            <Pressable onPress={() => { markOnboardingSeen(); router.replace("/login"); }} style={styles.signInBtn}>
              <Text style={styles.signInText}>Already have an account? <Text style={styles.signInBold}>Sign In</Text></Text>
            </Pressable>
          </View>
        ) : (
          <Button label="Next" onPress={goNext} fullWidth size="lg" tone="accent" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
  },
  skipText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
  },
  bgImage: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  slideContent: {
    alignItems: "center",
    gap: Spacing.xl,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 36,
  },
  description: {
    fontSize: FontSize.body,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 48,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    width: 28,
    backgroundColor: "#FFFFFF",
  },
  actions: {
    gap: Spacing.md,
  },
  signInBtn: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  signInText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  signInBold: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
