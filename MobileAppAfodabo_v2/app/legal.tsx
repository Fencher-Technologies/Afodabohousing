import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { PageHeader } from "@/src/components/PageHeader";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children}
    </Card>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bullet}>• {children}</Text>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

const privacyContent = {
  title: "Privacy Policy",
  version: "Version 1.0",
  effective: "Effective Date: July 25, 2026",
  lastUpdated: "Last Updated: July 25, 2026",
  sections: [
    {
      title: "1. Introduction",
      content:
        "Axis Housing is a property and tenancy management platform that provides technology tools for property managers, landlords, and tenants. This Privacy Policy explains how we collect, use, protect, and share your personal information when you use our platform.",
    },
    {
      title: "2. Information We Collect",
      content: "We collect the following information to provide and improve our services:",
      bullets: [
        "Full name",
        "Phone number",
        "Email address",
        "Profile information",
        "Authentication information",
        "PIN authentication information",
        "Property information",
        "Tenant information",
        "Lease and agreement information",
        "Uploaded documents",
        "Payment records",
        "Device and technical information",
      ],
    },
    {
      title: "3. Authentication",
      content:
        "Axis uses multiple authentication methods to protect your account, including email-based authentication, phone OTP (one-time password) verification, and PIN-based authentication. All credentials are handled securely in accordance with industry standards. We do not reveal internal security implementation details.",
    },
    {
      title: "4. How We Use Your Information",
      content: "We use your information for the following purposes:",
      bullets: [
        "Account management and verification",
        "Property management",
        "Tenancy management",
        "Agreement creation and management",
        "Payment processing and records",
        "Notifications and communication",
        "Security improvements",
        "Customer support",
      ],
    },
    {
      title: "5. User Roles and Access",
      content:
        "Different user roles have access to different information. Tenants can view their own tenancy, payment, and communication data. Property managers can access information related to their properties and associated tenants. Administrators have access to system-wide data for platform management and support purposes.",
    },
    {
      title: "6. Third-Party Services",
      content:
        "Axis may use trusted third-party service providers to deliver our services. These include hosting providers, authentication providers, SMS providers, and payment providers. These providers are contractually obligated to protect your data and may only use it to provide services on our behalf.",
    },
    {
      title: "7. Data Security",
      content:
        "We implement reasonable security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption, access controls, and secure data storage practices. However, no internet-based service can guarantee absolute security.",
    },
    {
      title: "8. Data Retention",
      content:
        "We retain your personal information for as long as your account is active or as needed to provide our services. We may also retain certain information to comply with legal obligations, resolve disputes, and enforce our agreements. When data is no longer needed, it is securely deleted or anonymized.",
    },
    {
      title: "9. Account Deletion",
      content:
        "You may request deletion of your account and associated personal data at any time by contacting our support team. We will process your request in accordance with applicable laws and our data retention policy. Some information may be retained as required by law or for legitimate business purposes.",
    },
    {
      title: "10. Your Rights",
      content:
        "You have the right to access, correct, update, or request deletion of your personal information. You may also object to processing of your data or request data portability where applicable. To exercise these rights, please contact our support team.",
    },
    {
      title: "11. Policy Updates",
      content:
        "We may update this Privacy Policy from time to time. When we make significant changes, we will notify you through the app, email, or other appropriate channels. Your continued use of the platform after changes take effect constitutes acceptance of the updated policy.",
    },
    {
      title: "12. Contact Information",
      content:
        "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our support team or reach us in Kampala, Uganda.",
    },
  ],
};

const termsContent = {
  title: "Terms of Service",
  version: "Version 1.0",
  effective: "Effective Date: July 25, 2026",
  lastUpdated: "Last Updated: July 25, 2026",
  sections: [
    {
      title: "1. Introduction",
      content:
        "These Terms of Service constitute a legal agreement between you and Axis Housing governing your use of the Axis platform. By creating an account or using our services, you agree to be bound by these terms. If you do not agree, you may not use the platform.",
    },
    {
      title: "2. About Axis",
      content:
        "Axis provides technology tools for property management, tenant management, agreements and documentation, payment management, and maintenance management. Our platform is designed to help property managers, landlords, and tenants manage rental relationships more effectively.",
    },
    {
      title: "3. User Responsibilities",
      content: "As a user of the Axis platform, you agree to:",
      bullets: [
        "Provide accurate and complete information when creating your account and using our services.",
        "Protect your account credentials and not share them with others.",
        "Use the platform in compliance with all applicable laws and regulations.",
        "Notify us immediately of any unauthorized use of your account.",
        "The guest in search of a house has the responsibility to carry out further due diligence to verify the authenticity of the desired property before entering any contractual obligation.",
        "The house manager has a responsibility to verify the credibility of the intended tenant before entering any contractual obligation.",
      ],
    },
    {
      title: "4. Property Owner and Manager Responsibilities",
      content: "If you use Axis as a property owner or manager, you agree to:",
      bullets: [
        "Have proper authority to manage the properties you list on the platform.",
        "Be responsible for the accuracy of all information you provide about properties, tenancies, and financial records.",
        "Comply with all applicable laws, including landlord-tenant laws and data protection regulations.",
      ],
    },
    {
      title: "5. Tenant Responsibilities",
      content: "If you use Axis as a tenant, you agree to:",
      bullets: [
        "Provide accurate information about yourself and your tenancy.",
        "Follow the terms of your tenancy agreements and lease documents.",
        "Use the platform responsibly and respectfully when communicating with property managers.",
      ],
    },
    {
      title: "6. Agreements and Documents",
      content:
        "Axis provides tools to create, manage, and store agreements and documents related to your properties and tenancies. These tools are for management purposes only and do not replace formal legal agreements between parties. We recommend consulting with a legal professional for important agreements.",
    },
    {
      title: "7. Payments",
      content:
        "Axis helps manage payment information and records. Actual payment obligations and financial agreements remain between the involved parties. Axis only receives money for the services charged which includes subscriptions and property boosting. Axis Housing is not a financial institution and does not hold funds on behalf of users.",
    },
    {
      title: "8. Subscriptions",
      content:
        "Access to premium platform features for house managers is granted through paid subscriptions. All subscription payments are final and non-refundable once made.",
    },
    {
      title: "9. Prohibited Activities",
      content: "You may not use the Axis platform for any of the following activities:",
      bullets: [
        "Fraud or deceptive practices",
        "Unauthorized access to other users' accounts or data",
        "Abuse, harassment, or intimidation of other users",
        "Attempting to compromise platform security or integrity",
        "Any illegal activity",
      ],
    },
    {
      title: "10. Account Suspension and Termination",
      content:
        "We reserve the right to suspend or terminate accounts that violate these terms, engage in prohibited activities, or otherwise misuse the platform. We will make reasonable efforts to notify account holders of suspension or termination. You may also terminate your account at any time by contacting support.",
    },
    {
      title: "11. Intellectual Property",
      content:
        "The Axis platform, including its software, design, branding, and content is owned by ECOSOPAT CO LTD and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express permission.",
    },
    {
      title: "12. Limitation of Liability",
      content:
        "Axis provides its platform as a management tool. To the maximum extent permitted by law, we are not liable for disputes between property managers and tenants, financial losses resulting from use of the platform or indirect, incidental or unintended consequential damages arising from your use of our services. Subscription once made is non refundable.",
    },
    {
      title: "13. Governing Law",
      content:
        "These terms are governed by the laws of the Republic of Uganda and applicable international laws. Any disputes arising from these terms or your use of the platform shall be resolved in the courts of Uganda.",
    },
    {
      title: "14. Alternative Dispute Resolution",
      content:
        "In the event of any dispute arising from these terms or your use of the platform, the parties shall first attempt to resolve the matter amicably through good-faith negotiation. Where negotiation fails, the dispute shall be referred to alternative dispute resolution (mediation or arbitration) in accordance with the applicable laws of the Republic of Uganda before either party resorts to court litigation.",
    },
    {
      title: "15. Quality Assurance and Standards",
      content:
        "In the context of the Axis platform, a standard is the minimum requirement in terms of decency and hygiene that a property is supposed to have to be approved and posted on the platform. Before properties are posted on the forum, they are subject to review for approval and verification to ensure that they align with the minimum quality standard. House managers must adhere to these quality standards and list only properties that are of an acceptable standard and quality. The owners of the Axis platform retain the right to review and take down any property deemed below the required quality standard that may cause defamation of the platform.",
    },
    {
      title: "16. Changes to Terms",
      content:
        "We may update these Terms of Service from time to time. We will notify users of significant changes through the app, email, or other appropriate channels. Your continued use of the platform after changes take effect constitutes acceptance of the updated terms.",
    },
  ],
};

const aboutContent = {
  title: "About Axis",
  body: [
    "Axis is a digital application that seeks to proffer practical solutions in the housing space by linking potential tenants directly to property owners/managers affordably, safely and hustle free.",
    "Through our online platform, we help property managers to better manage their tenants with ease and convenience, providing both visibility and access to their properties.",
    "By doing so, we minimize financial losses, promote accountability and transparency, overcome geographical barriers in tenant management, provide legal protection, and warrant value for money.",
  ],
};

const contactContent = {
  title: "Contact Support",
  body: [
    "We're here to help! Reach us through any of these channels:",
    "Email: support@axishousing.com",
    "Phone: +256 700 000 000",
    "WhatsApp: +256 700 000 000",
    "Hours: Monday–Friday, 9am–6pm EAT",
    "For urgent issues, please use WhatsApp for fastest response.",
  ],
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();

  const data = useMemo(() => {
    if (type === "privacy") return privacyContent;
    if (type === "terms") return termsContent;
    if (type === "about") return aboutContent;
    if (type === "contact") return contactContent;
    return null;
  }, [type]);

  if (!data) {
    return (
      <Screen scroll>
        <PageHeader title="Not Found" onBack={() => router.back()} />
        <View style={styles.content}>
          <Text style={styles.body}>Page not found.</Text>
        </View>
      </Screen>
    );
  }

  const hasSections = "sections" in data;

  return (
    <Screen scroll>
      <PageHeader title={data.title} onBack={() => router.back()} />

      {hasSections ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{data.title}</Text>
            <Text style={styles.heroMeta}>{data.version}</Text>
            <Text style={styles.heroMeta}>{data.effective}</Text>
            <Text style={styles.heroMeta}>{data.lastUpdated}</Text>
          </View>
          <View style={styles.content}>
            {data.sections.map((section, i) => (
              <Section key={i} title={section.title}>
                {section.bullets ? (
                  <>
                    <Paragraph>{section.content}</Paragraph>
                    {section.bullets.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                  </>
                ) : (
                  <Paragraph>{section.content}</Paragraph>
                )}
              </Section>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.content}>
          <Card padding="lg">
            {data.body.map((paragraph, i) => (
              <Text key={i} style={styles.body}>{paragraph}</Text>
            ))}
          </Card>
        </View>
      )}

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
  hero: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  heroMeta: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  bullet: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});
