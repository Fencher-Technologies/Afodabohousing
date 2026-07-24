import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth-context";

const { width } = Dimensions.get("window");
const AUTO_SLIDE_MS = 4000;

interface Slide {
  image: any;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    image: require("@/assets/images/visitor.png"),
    title: "Find Your Perfect Rental Home",
    description:
      "Browse rental properties without creating an account.\nExplore prices, photos, amenities and locations.\nDiscover verified listings before signing in.\nStart your property search with confidence.",
  },
  {
    image: require("@/assets/images/tenant.png"),
    title: "Manage Your Tenancy with Confidence",
    description:
      "View your tenancy details anytime.\nTrack rent payments and balances.\nAccess and consent to tenancy agreements.\nReceive reminders and important notifications.\nSubmit payment confirmations for manager verification.",
  },
  {
    image: require("@/assets/images/manager.png"),
    title: "Manage Your Properties Professionally",
    description:
      "List and manage rental properties.\nManage tenants and tenancy agreements.\nRecord and verify rent payments.\nGenerate reports and monitor occupancy.\nBoost property visibility to reach more renters.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { markOnboardingSeen } = useAuth();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);

  const isLast = index === slides.length - 1;

  const stopAutoSlide = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const startAutoSlide = useCallback(() => {
    if (isLast) return;
    stopAutoSlide();
    autoTimer.current = setInterval(() => {
      if (userInteracted.current) return;
      const next = index + 1;
      if (next >= slides.length) return;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_SLIDE_MS);
  }, [isLast, index, stopAutoSlide]);

  useEffect(() => {
    startAutoSlide();
    return stopAutoSlide;
  }, [startAutoSlide, stopAutoSlide]);

  const goNext = useCallback(() => {
    if (isLast) return;
    userInteracted.current = true;
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setTimeout(() => {
      userInteracted.current = false;
    }, AUTO_SLIDE_MS);
  }, [isLast, index]);

  const goTo = useCallback(
    (i: number) => {
      if (i === index) return;
      userInteracted.current = true;
      setIndex(i);
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
      setTimeout(() => {
        userInteracted.current = false;
      }, AUTO_SLIDE_MS);
    },
    [index]
  );

  const handleFinish = useCallback(async () => {
    await markOnboardingSeen();
    router.replace("/guest/explore");
  }, [markOnboardingSeen]);

  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (i !== index) {
        userInteracted.current = true;
        setIndex(i);
        setTimeout(() => {
          userInteracted.current = false;
        }, AUTO_SLIDE_MS);
      }
    },
    [index]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip */}
      <View style={styles.skipRow}>
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <View style={styles.slidesContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          bounces={false}
          style={styles.scrollView}
          onTouchStart={() => {
            userInteracted.current = true;
          }}
          onTouchEnd={() => {
            setTimeout(() => {
              userInteracted.current = false;
            }, AUTO_SLIDE_MS);
          }}
        >
          {slides.map((slide, i) => (
            <View key={i} style={styles.slide}>
              <View style={styles.imageWrap}>
                <Image
                  source={slide.image}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.textWrap}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {/* Page indicators */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => goTo(i)}
              style={[styles.dot, i === index && styles.dotActive]}
            >
              <View
                style={[
                  styles.dotFill,
                  i === index && styles.dotFillActive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Next / Get Started */}
        <View style={styles.buttonWrap}>
          {isLast ? (
            <Button
              label="Get Started"
              onPress={handleFinish}
              variant="solid"
              tone="primary"
              fullWidth
              size="lg"
            />
          ) : (
            <Button
              label="Next"
              onPress={goNext}
              variant="solid"
              tone="primary"
              fullWidth
              size="lg"
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
  },
  skipText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  slidesContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
  },
  imageWrap: {
    flex: 0.65,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textWrap: {
    flex: 0.35,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.xl,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  dot: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotFill: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotFillActive: {
    backgroundColor: Colors.primary,
  },
  buttonWrap: {
    paddingHorizontal: Spacing.xs,
  },
});
