import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly, including your full name, email address, phone number and role (tenant or house manager) when you register an account. We also collect property details and images uploaded by house managers, payment references and communications sent through the platform.

We automatically collect certain technical data when you use the platform, including your IP address, browser type, device information and pages visited, for security and analytics purposes.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `Your information is used to operate and improve Afodabohousing, including verifying your identity, facilitating tenancy agreements, processing payments through PesaPal, sending SMS notifications via EgoSMS (rent reminders, payment confirmations and welcome messages), and providing customer support.

We do not sell your personal data to third parties.`,
  },
  {
    title: '3. SMS Communications',
    content: `By providing your phone number, you consent to receive SMS notifications related to your account activity, including welcome messages upon registration, rent reminders when your payment due date approaches, payment confirmation or rejection notices, and important account alerts.

You may opt out of SMS notifications by contacting info@afodabohousing.com.`,
  },
  {
    title: '4. Payment Security',
    content: `Online payments are processed by PesaPal, a licensed payment service provider in Uganda and East Africa. Afodabohousing does not store your card or mobile money details. Payment proof images uploaded to the platform are stored securely and accessible only to the relevant tenant, house manager and platform administrators.`,
  },
  {
    title: '5. Data Sharing',
    content: `We share limited information only where necessary: tenant contact details are shared with the house manager for the property you are renting; house manager contact details are visible to registered tenants viewing their listings; and we may disclose information if required by Ugandan law or court order.`,
  },
  {
    title: '6. Data Retention',
    content: `We retain your account data for as long as your account is active. Payment records and tenancy agreements are retained for a minimum of 7 years in compliance with Ugandan financial regulations. You may request deletion of your account by contacting info@afodabohousing.com.`,
  },
  {
    title: '7. Security',
    content: `We use industry-standard security practices including encrypted connections (HTTPS), secure authentication and role-based access controls. Despite these measures, no internet transmission is 100% secure and we encourage you to use strong passwords and keep your login credentials private.`,
  },
  {
    title: '8. Your Rights',
    content: `You have the right to access, correct or request deletion of your personal data. To exercise these rights, contact info@afodabohousing.com with your request. We will respond within 14 business days.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. Significant changes will be communicated via email or SMS to registered users. Continued use of the platform after changes constitute acceptance of the updated policy.`,
  },
  {
    title: '10. Contact',
    content: `For any privacy-related questions or concerns, contact our Data Officer at info@afodabohousing.com or write to Afodabohousing Ltd, Kampala, Uganda.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-primary py-14">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground mb-3">Privacy Policy</h1>
          <p className="text-primary-foreground/75 text-lg">Last updated: March 2026</p>
        </div>
      </section>

      <div className="container py-14 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card mb-8">
          <p className="text-muted-foreground leading-relaxed text-base">
            Afodabohousing Ltd ("we", "us" or "our") operates the Afodabohousing platform at afodabohousing.com. This Privacy Policy explains how we collect, use, protect and share information about you when you use our services. By creating an account or using our platform, you agree to the practices described in this policy.
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.title} className="bg-card border border-border rounded-2xl p-7 shadow-card">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">{s.title}</h2>
              <div className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line">{s.content}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about this policy? Contact us at{' '}
            <a href="mailto:info@afodabohousing.com" className="text-primary font-semibold hover:underline">
              info@afodabohousing.com
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
