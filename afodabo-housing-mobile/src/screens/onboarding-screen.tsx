import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/button';
import { useAuth } from '../context/auth-context';
import type { RootStackParamList } from '../navigation/types';
import { markOnboardingSeen } from '../services/onboarding-storage';
import { colors, radii, spacing, typography } from '../theme/tokens';

const slides = [
  {
    description:
      'Browse verified homes, compare districts, and open complete property details without getting lost in extra marketing pages.',
    eyebrow: 'Explore Faster',
    kicker: 'Property search made practical',
    title: 'Start with the homes that matter',
  },
  {
    description:
      'Track tenancy progress, upload payment proof, launch online payment when available, and keep every message with your house manager in one place.',
    eyebrow: 'Stay Organised',
    kicker: 'Rent and messages together',
    title: 'Manage your housing journey from your phone',
  },
  {
    description:
      'House managers can publish listings, create tenancies, review payments, and follow up with tenants through focused mobile workspaces.',
    eyebrow: 'Keep Work Moving',
    kicker: 'Built for the whole platform',
    title: 'Run listings and tenant follow-up with less friction',
  },
] as const;

export function OnboardingScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'Onboarding'>) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  const logo = useMemo(() => require('../../assets/brand/logo.png'), []);
  const hero = useMemo(() => require('../../assets/brand/hero-bg.jpg'), []);

  const complete = async (target: 'Login' | 'Main' | 'Register') => {
    await markOnboardingSeen();

    if (target === 'Main') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }, { name: target }],
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.brand}>Afodabo Housing</Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => {
              void complete('Main');
            }}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.closePressed : null]}
          >
            <Ionicons color={colors.textPrimary} name="close" size={20} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ImageBackground imageStyle={styles.visualImage} source={hero} style={styles.visual}>
            <View style={styles.visualOverlay} />
            <View style={styles.visualInner}>
              <View style={styles.visualBadge}>
                <Text style={styles.visualBadgeText}>{slide.kicker}</Text>
              </View>
              <View style={styles.visualOrb}>
                <Image source={logo} style={styles.visualLogo} />
              </View>
              <Text style={styles.visualCaption}>
                Trusted rentals, clearer next steps, real workflow depth.
              </Text>
            </View>
          </ImageBackground>

          <View style={styles.copyBlock}>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            <Text style={styles.stepText}>
              {index + 1} / {slides.length}
            </Text>
            <View style={styles.dots}>
              {slides.map((_item, itemIndex) => (
                <View
                  key={itemIndex}
                  style={[styles.dot, itemIndex === index ? styles.dotActive : null]}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionSide}>
              <Button
                onPress={() => {
                  if (isFirst) {
                    void complete('Main');
                    return;
                  }

                  setIndex((current) => current - 1);
                }}
                variant="outline"
              >
                {isFirst ? 'Skip' : 'Back'}
              </Button>
            </View>
            <View style={styles.actionSide}>
              <Button
                onPress={() => {
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
                onPress={() => {
                  void complete('Login');
                }}
              >
                <Text style={styles.authLink}>Sign In</Text>
              </Pressable>
              <View style={styles.authDivider} />
              <Pressable
                hitSlop={8}
                onPress={() => {
                  void complete('Register');
                }}
              >
                <Text style={styles.authLink}>Create Account</Text>
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
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  authRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
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
  content: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  copyBlock: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 340,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 26,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
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
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stepText: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
    lineHeight: 38,
    maxWidth: 360,
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
    minHeight: 300,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  visualBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  visualBadgeText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  visualCaption: {
    color: colors.heroText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 250,
    textAlign: 'center',
  },
  visualImage: {
    borderRadius: radii.modal,
  },
  visualInner: {
    alignItems: 'center',
    gap: spacing.md,
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
