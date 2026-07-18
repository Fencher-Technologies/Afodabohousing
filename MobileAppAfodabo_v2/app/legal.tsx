/**
 * LegalScreen — static legal content (about, contact, privacy, terms).
 */

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { PageHeader } from "@/src/components/PageHeader";

const content: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "About Afodabo",
    body: [
      "Afodabo Housing is a subscription-based SaaS platform that empowers house managers in Uganda to run their rental business from their phone.",
      "Founded in 2024, Afodabo helps managers collect rent, track tenants, generate professional reports, and stay compliant — all without transaction fees.",
      "Tenants get a simple, transparent view of their tenancy with direct WhatsApp communication to their manager.",
      "Our mission is to make rental management effortless for African landlords and property managers.",
    ],
  },
  contact: {
    title: "Contact Support",
    body: [
      "We're here to help! Reach us through any of these channels:",
      "Email: support@afodabo.ug",
      "Phone: +256 700 000 000",
      "WhatsApp: +256 700 000 000",
      "Hours: Monday–Friday, 9am–6pm EAT",
      "For urgent issues, please use WhatsApp for fastest response.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "Afodabo Housing respects your privacy and is committed to protecting your personal data.",
      "We collect: your name, email, phone number, and property/tenancy data you enter into the app.",
      "We use your data to: provide rental management services, send rent reminders via WhatsApp, generate reports, and process subscription payments.",
      "We do not: sell your data to third parties, share tenant information without manager consent, or use your data for advertising.",
      "You can request data deletion at any time by contacting support.",
      "Payments are processed by NylonPay. We do not store your financial details.",
    ],
  },
  terms: {
    title: "Terms of Service",
    body: [
      "By using Afodabo Housing, you agree to these terms:",
      "1. Subscriptions: Plans are billed upfront for 3, 6, or 12 months. No refunds for partial periods.",
      "2. Data Accuracy: Managers are responsible for accurate payment recording and tenant information.",
      "3. WhatsApp: Communication is via WhatsApp deep links. Afodabo is not responsible for messages sent outside the platform.",
      "4. Acceptable Use: You may not use the app for illegal activities or to harass tenants.",
      "5. Liability: Afodabo is a management tool. We are not liable for disputes between managers and tenants.",
      "6. Changes: We may update these terms with 30 days notice.",
    ],
  },
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const data = useMemo(() => content[type] ?? content.about, [type]);

  return (
    <Screen scroll>
      <PageHeader title={data.title} onBack={() => router.back()} />

      <View style={styles.content}>
        <Card padding="lg">
          {data.body.map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>{paragraph}</Text>
          ))}
        </Card>
        <Text style={styles.updated}>Last updated: January 2025</Text>
      </View>
      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  paragraph: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  updated: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
