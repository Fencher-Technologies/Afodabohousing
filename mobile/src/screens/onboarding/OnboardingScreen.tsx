import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common/Button';
import { BrandMark } from '../../components/common/BrandMark';
import { OnboardingIllustration } from '../../components/onboarding/OnboardingIllustration';
import { colors, radii, spacing, typography } from '../../theme';

const slides = [
  {
    id: 'overview',
    illustration: 'overview',
    subtitle: 'Keep rentals, payments, leases, and communication organized in one mobile app.',
    title: 'Manage Housing Easily',
  },
  {
    id: 'tenant',
    illustration: 'tenant',
    subtitle: 'View your lease, track rent, upload payment proof, and message your house manager.',
    title: 'For Tenants',
  },
  {
    id: 'manager',
    illustration: 'manager',
    subtitle:
      'View properties, check leases, review payment proofs, and respond to tenant messages.',
    title: 'For House Managers',
  },
] as const;

interface OnboardingScreenProps {
  onComplete: () => Promise<void> | void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const lastIndex = slides.length - 1;

  const goToIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({
      animated: true,
      index,
    });
    setCurrentIndex(index);
  }, []);

  const finishOnboarding = useCallback(async () => {
    if (finishing) {
      return;
    }

    try {
      setFinishing(true);
      await onComplete();
    } finally {
      setFinishing(false);
    }
  }, [finishing, onComplete]);

  useEffect(() => {
    if (finishing) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentIndex((index) => {
        const nextIndex = index === lastIndex ? 0 : index + 1;
        listRef.current?.scrollToIndex({
          animated: true,
          index: nextIndex,
        });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [finishing, lastIndex]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(Math.min(Math.max(nextIndex, 0), lastIndex));
  };

  const handleNext = () => {
    if (currentIndex === lastIndex) {
      void finishOnboarding();
      return;
    }

    goToIndex(currentIndex + 1);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.topBar}>
        <BrandMark compact />
        <Pressable
          accessibilityRole="button"
          disabled={finishing}
          hitSlop={8}
          onPress={() => void finishOnboarding()}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        bounces={false}
        data={slides}
        getItemLayout={(_data, index) => ({
          index,
          length: width,
          offset: width * index,
        })}
        horizontal
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        pagingEnabled
        ref={listRef}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.illustrationCard}>
              <OnboardingIllustration variant={item.illustration} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>Afodabo Housing</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <Button loading={finishing} onPress={handleNext}>
          {currentIndex === lastIndex ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  dot: {
    borderRadius: radii.pill,
    height: 8,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 34,
  },
  dotInactive: {
    backgroundColor: colors.border,
    width: 8,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  illustrationCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  skipButton: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skipText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  slide: {
    gap: spacing.xl,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 330,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
