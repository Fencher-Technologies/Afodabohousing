import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/screen';
import { colors, radii, spacing, typography } from '../theme/tokens';

const sections = [
  {
    content:
      'By using Afodabo Housing, you agree to these terms and to the related privacy policy. These terms apply to tenants, house managers, and administrators.',
    title: '1. Acceptance of Terms',
  },
  {
    content:
      'You must provide accurate information when creating an account and protect your password and access details.',
    title: '2. Account Registration',
  },
  {
    content:
      'House managers must provide accurate property details, real photographs, and truthful descriptions for every listing.',
    title: '3. Property Listings',
  },
  {
    content:
      'Tenancy agreements are created between the tenant and house manager. Afodabo Housing helps make the process easier but is not a party to the agreement itself.',
    title: '4. Tenancy Agreements',
  },
  {
    content:
      'Online rent payments follow the rules of the payment provider in use. Payment proofs are reviewed by the relevant house manager.',
    title: '5. Payments',
  },
  {
    content:
      'By sharing a phone number, you agree to receive service-related SMS messages such as reminders, confirmations, and account notices.',
    title: '6. SMS Notifications',
  },
  {
    content:
      'You may not post fraudulent listings, impersonate others, collect personal data without consent, abuse the messaging system, or use the service for unlawful activity.',
    title: '7. Prohibited Conduct',
  },
  {
    content:
      'Afodabo Housing is provided as a service to help people find and manage homes. We do not guarantee the conduct of users or outcomes of tenancy disputes.',
    title: '8. Limitation of Liability',
  },
  {
    content:
      'These terms are governed by the laws of Uganda, and disputes are handled by the courts of Uganda.',
    title: '9. Governing Law',
  },
  {
    content:
      'We may update these terms from time to time. Continued use after changes means you accept the updated version.',
    title: '10. Changes to Terms',
  },
  {
    content:
      'For questions about these terms, contact info@afodabohousing.com or reach us in Kampala, Uganda.',
    title: '11. Contact',
  },
];

export function TermsScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Last updated: March 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.bodyText}>
          These terms explain the rules for using Afodabo Housing and the responsibilities shared by
          tenants, house managers, and administrators.
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.bodyText}>{section.content}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.modal,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  subtitle: {
    color: colors.primaryForeground,
    fontFamily: typography.body,
    fontSize: 14,
  },
  title: {
    color: colors.primaryForeground,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
