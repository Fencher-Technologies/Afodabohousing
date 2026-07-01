import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/screen';
import { colors, radii, spacing, typography } from '../theme/tokens';

const sections = [
  {
    content:
      'We collect the information you provide directly, including your full name, email address, phone number, and role when you create an account. We also collect listing details, payment references, and messages shared through the service.',
    title: '1. Information We Collect',
  },
  {
    content:
      'Your information helps us verify identity, support tenancy records, process payments, send important account notices, and provide customer support. We do not sell your personal information.',
    title: '2. How We Use Your Information',
  },
  {
    content:
      'If you provide a phone number, you may receive service-related SMS messages such as welcomes, rent reminders, payment updates, and urgent account notices.',
    title: '3. SMS Communications',
  },
  {
    content:
      'Online payments are handled by trusted payment providers. We do not store your bank card or mobile money secrets. Payment proof is only visible to the people handling that tenancy.',
    title: '4. Payment Security',
  },
  {
    content:
      'We share information only where needed, such as matching tenants with the relevant house manager or responding to lawful requests.',
    title: '5. Data Sharing',
  },
  {
    content:
      'We keep account, payment, and tenancy records for as long as needed to support active accounts and legal obligations. You may request account deletion through support.',
    title: '6. Data Retention',
  },
  {
    content:
      'We use common security practices to protect your information, but no internet service can promise absolute security. Please use a strong password and keep it private.',
    title: '7. Security',
  },
  {
    content:
      'You may request access to, correction of, or deletion of your personal information by contacting support.',
    title: '8. Your Rights',
  },
  {
    content:
      'We may update this policy from time to time. Important changes will be shared with users through the app, email, or SMS when needed.',
    title: '9. Changes to This Policy',
  },
  {
    content:
      'For privacy questions, contact info@afodabohousing.com or reach us in Kampala, Uganda.',
    title: '10. Contact',
  },
];

export function PrivacyScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Last updated: March 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.bodyText}>
          This policy explains how Afodabo Housing collects, uses, protects, and shares your
          information when you use our services.
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
