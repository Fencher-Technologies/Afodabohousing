import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/button';
import heroImage from '../../assets/brand/hero-bg.jpg';
import logoImage from '../../assets/brand/logo.png';
import { useAuth } from '../context/auth-context';
import type { RootStackParamList } from '../navigation/types';
import { markOnboardingSeen } from '../services/onboarding-storage';
import { colors, radii, spacing, typography } from '../theme/tokens';

const roleSlides = [
  {
    role: 'Tenants',
    icon: 'person',
    benefits: [
      'Browse and bookmark verified properties',
      'Pay rent via MTN/Airtel or card',
      'Track payments and tenancy progress',
      'Request maintenance and get updates',
      'Sign agreements digitally',
    ],
    accent: colors.accent,
    accentBg: '#F9E2D6' as const,
    borderAccent: 'rgba(218, 105, 49, 0.2)' as const,
  },
  {
    role: 'House Managers',
    icon: 'business',
    benefits: [
      'List properties with GPS and photos',
      'Manage tenants, leases, and units',
      'Review and confirm payments instantly',
      'Send SMS rent reminders automatically',
      'Export CSV/XLSX/PDF reports',
    ],
    accent: colors.primary,
    accentBg: '#DDEAE3' as const,
    borderAccent: 'rgba(35, 96, 72, 0.2)' as const,
  },
  {
    role: 'Free Users',
    icon: 'search',
    benefits: [
      'Browse all properties with full details',
      'Save bookmarks and compare listings',
      'Contact managers directly via phone/email',
      'Get GPS directions to any property',
      'Free to join — no commitment needed',
    ],
    accent: colors.gold,
    accentBg: '#FBF0D0' as const,
    borderAccent: 'rgba(243, 184, 24, 0.2)' as const,
  },
];

const AUTO_INTERVAL = 4000;

export function OnboardingScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'Onboarding'>) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slide = roleSlides[index];
  const isLast = index === roleSlides.length - 1;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        return next >= roleSlides.length ? 0 : next;
      });
    }, AUTO_INTERVAL);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  useEffect(() => {
    flatRef.current?.scrollToIndex({ animated: true, index });
  }, [index]);

  const handleManualScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      if (newIndex !== index) {
        setIndex(newIndex);
      }
      startTimer();
    },
    [index, startTimer],
  );

  const complete = async (target: 'Login' | 'Main' | 'Register') => {
    stopTimer();
    await markOnboardingSeen();

    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }, ...(target !== 'Main' ? [{ name: target } as const] : [])],
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image source={logoImage} style={styles.logo} />
            <Text style={styles.brand}>Afodabo Housing</Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => { void complete('Main'); }}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}
          >
            <Ionicons color={colors.textPrimary} name="close" size={20} />
          </Pressable>
        </View>

        <FlatList
          data={roleSlides}
          decelerationRate="fast"
          horizontal
          keyExtractor={(_item, i) => String(i)}
          onMomentumScrollEnd={handleManualScroll}
          onScrollBeginDrag={stopTimer}
          pagingEnabled
          ref={flatRef}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <ImageBackground
                imageStyle={styles.visualImage}
                source={heroImage}
                style={styles.visual}
              >
                <View style={styles.visualOverlay} />
                <View style={styles.visualInner}>
                  <View style={styles.visualOrb}>
                    <Image source={logoImage} style={styles.visualLogo} />
                  </View>
                </View>
              </ImageBackground>

              <View style={styles.copyBlock}>
                <View style={[styles.roleBadge, { backgroundColor: item.accentBg, borderColor: item.borderAccent }]}>
                  <Ionicons color={item.accent} name={item.icon as keyof typeof Ionicons.glyphMap} size={16} />
                  <Text style={[styles.roleLabel, { color: item.accent }]}>{item.role}</Text>
                </View>

                <View style={styles.benefitsList}>
                  {item.benefits.map((b, i) => (
                    <View key={i} style={styles.benefitRow}>
                      <Ionicons color={item.accent} name="checkmark-circle" size={18} style={styles.checkIcon} />
                      <Text style={styles.benefitText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.list}
        />

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            <Text style={styles.stepText}>
              {index + 1} / {roleSlides.length}
            </Text>
            <View style={styles.dots}>
              {roleSlides.map((_item, itemIndex) => (
                <View
                  key={itemIndex}
                  style={[
                    styles.dot,
                    itemIndex === index ? styles.dotActive : null,
                    itemIndex === index ? { backgroundColor: roleSlides[index].accent } : null,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionSide}>
              <Button onPress={() => { stopTimer(); void complete('Main'); }} variant="outline">
                Skip
              </Button>
            </View>
            <View style={styles.actionSide}>
              <Button
                onPress={() => {
                  stopTimer();
                  if (isLast) {
                    void complete('Main');
                    return;
                  }
                  setIndex((current) => current + 1);
                }}
              >
                {isLast ? 'Get Started' : 'Next'}
              </Button>
            </View>
          </View>

          {!user && isLast ? (
            <View style={styles.authRow}>
              <Pressable
                hitSlop={8}
                onPress={() => { stopTimer(); void complete('Login'); }}
              >
                <Text style={[styles.authLink, { color: colors.primary }]}>Sign In</Text>
              </Pressable>
              <View style={styles.authDivider} />
              <Pressable
                hitSlop={8}
                onPress={() => { stopTimer(); void complete('Register'); }}
              >
                <Text style={[styles.authLink, { color: colors.primary }]}>Create Account</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionSide: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  authDivider: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 4,
    width: 4,
  },
  authLink: {
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  authRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  benefitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  benefitText: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  benefitsList: {
    gap: spacing.md,
  },
  brand: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkIcon: {
    marginTop: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  closePressed: {
    opacity: 0.85,
  },
  copyBlock: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  dotActive: {
    width: 26,
  },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  list: {
    flex: 1,
  },
  logo: {
    borderRadius: 14,
    height: 38,
    width: 38,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  roleLabel: {
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  stepText: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  visual: {
    alignItems: 'center',
    borderRadius: 0,
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    minHeight: 220,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  visualImage: {
    borderRadius: radii.modal,
  },
  visualInner: {
    alignItems: 'center',
    zIndex: 1,
  },
  visualLogo: {
    borderRadius: 24,
    height: 82,
    width: 82,
  },
  visualOrb: {
    alignItems: 'center',
    backgroundColor: colors.primaryForeground,
    borderColor: colors.surfaceMuted,
    borderRadius: 999,
    borderWidth: 3,
    height: 128,
    justifyContent: 'center',
    width: 128,
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.heroOverlay,
    borderRadius: radii.modal,
  },
});
