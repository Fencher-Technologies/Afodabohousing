import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/badge';
import { Screen } from '../components/screen';
import logoImage from '../../assets/brand/logo.png';
import { colors, radii, spacing, typography } from '../theme/tokens';

const values = [
  {
    description:
      'Every listing is reviewed before it goes live so families can make confident housing decisions.',
    title: 'Trust and Transparency',
  },
  {
    description:
      'We serve students, families, workers, and property owners across Uganda with the same care.',
    title: 'Community First',
  },
  {
    description:
      'From rent tracking to tenancy support, we aim to make every step clear and dependable.',
    title: 'Excellence in Service',
  },
  {
    description:
      'We cover all 135 districts of Uganda so people can relocate with confidence wherever life takes them.',
    title: 'Nationwide Coverage',
  },
];

const team = [
  { initials: 'AT', name: 'Afodabo Team', role: 'Founders' },
  { initials: 'SD', name: 'Support Desk', role: 'Customer Care' },
  { initials: 'FA', name: 'Field Agents', role: 'Property Verification' },
  { initials: 'OC', name: 'Operations Crew', role: 'Daily Service' },
];

export function AboutScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={logoImage} style={styles.logo} />
        <Badge tone="accent">Our Story</Badge>
        <Text style={styles.title}>Built for Every Ugandan</Text>
        <Text style={styles.subtitle}>
          Afodabo Housing exists to make finding and managing a home in Uganda simpler, safer, and
          more dignified.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.bodyText}>
          Millions of Ugandans relocate for work, education, and family every year. Safe and fairly
          priced accommodation should not be hard to find.
        </Text>
        <Text style={styles.bodyText}>
          We connect tenants directly with trusted house managers across the country so housing can
          feel more transparent, more respectful, and more reliable.
        </Text>
        <View style={styles.badgeWrap}>
          <Badge tone="gold">135 Districts Covered</Badge>
          <Badge tone="gold">Verified Listings</Badge>
          <Badge tone="gold">Secure Payments</Badge>
          <Badge tone="gold">Digital Agreements</Badge>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>135+</Text>
          <Text style={styles.statLabel}>Districts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>24/7</Text>
          <Text style={styles.statLabel}>Support</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What We Stand For</Text>
        {values.map((value) => (
          <View key={value.title} style={styles.valueCard}>
            <Text style={styles.valueTitle}>{value.title}</Text>
            <Text style={styles.bodyText}>{value.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>The People Behind the Work</Text>
        <View style={styles.teamGrid}>
          {team.map((member) => (
            <View key={member.name} style={styles.teamCard}>
              <View style={styles.teamBadge}>
                <Text style={styles.teamInitials}>{member.initials}</Text>
              </View>
              <Text style={styles.teamName}>{member.name}</Text>
              <Text style={styles.teamRole}>{member.role}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  logo: {
    borderRadius: 22,
    height: 84,
    width: 84,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  statValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 30,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  teamBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  teamCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    flexBasis: '47%',
    gap: 6,
    padding: spacing.md,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teamInitials: {
    color: colors.primaryForeground,
    fontFamily: typography.display,
    fontSize: 20,
  },
  teamName: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
    textAlign: 'center',
  },
  teamRole: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
    textAlign: 'center',
  },
  valueCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: 8,
    padding: spacing.md,
  },
  valueTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
});
