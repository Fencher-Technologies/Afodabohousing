import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Afodabohousing platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services. These terms apply to all users, including tenants, house managers and administrators.`,
  },
  {
    title: '2. Account Registration',
    content: `You must provide accurate, complete and current information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately at info@afodabohousing.com of any unauthorised use of your account.

You must be at least 18 years old to create an account. By registering, you represent that you meet this age requirement.`,
  },
  {
    title: '3. Property Listings',
    content: `House managers warrant that all property information submitted is accurate, truthful and not misleading. Listings must not include false addresses, fabricated amenities or photographs of other properties.

Afodabohousing reserves the right to remove any listing that violates these terms, contains misleading information, or is reported as fraudulent by multiple users, without prior notice or refund.`,
  },
  {
    title: '4. Tenancy Agreements',
    content: `Digital tenancy agreements created on Afodabohousing are binding between the tenant and house manager. Afodabohousing acts as a facilitating platform only and is not a party to any tenancy agreement. Disputes between tenants and house managers are to be resolved directly or through the appropriate Ugandan courts.`,
  },
  {
    title: '5. Payments',
    content: `Online rent payments are processed via PesaPal and are subject to PesaPal's terms of service. Payment proof uploads are reviewed by the house manager, not Afodabohousing. We do not guarantee the receipt of funds or the accuracy of payment confirmations provided by house managers.

Afodabohousing is not liable for payment disputes between tenants and house managers. All rent amounts are in Ugandan Shillings (UGX) unless otherwise stated.`,
  },
  {
    title: '6. SMS Notifications',
    content: `By providing a phone number, you consent to receive SMS messages from Afodabohousing via EgoSMS. Standard mobile carrier rates may apply. We send operational SMS messages only, including rent reminders, payment confirmations and account notices. We do not send promotional SMS without your explicit consent.`,
  },
  {
    title: '7. Prohibited Conduct',
    content: `You agree not to: use the platform to post fraudulent property listings; impersonate other users or persons; collect personal data of other users without consent; attempt to gain unauthorised access to any part of the platform; use automated scripts to scrape or harvest data; harass, threaten or abuse other users through the messaging system; or use the platform for any unlawful purpose under Ugandan law.

Violation of these rules will result in immediate account suspension and, where applicable, reporting to relevant Ugandan authorities.`,
  },
  {
    title: '8. Limitation of Liability',
    content: `Afodabohousing provides the platform on an "as is" basis. We make no warranties, express or implied, regarding the accuracy of listings, the conduct of house managers or tenants, or the security of any specific property.

To the maximum extent permitted by Ugandan law, Afodabohousing shall not be liable for any indirect, incidental or consequential damages arising from your use of the platform, including property damage, personal injury, financial loss resulting from rental fraud, or disputes between tenants and house managers.`,
  },
  {
    title: '9. Governing Law',
    content: `These Terms of Service are governed by and construed in accordance with the laws of the Republic of Uganda. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Uganda.`,
  },
  {
    title: '10. Changes to Terms',
    content: `We reserve the right to modify these Terms of Service at any time. Changes will be effective upon posting to the platform. Continued use after changes constitutes acceptance. We will notify registered users of material changes via email.`,
  },
  {
    title: '11. Contact',
    content: `For questions about these Terms of Service, contact us at info@afodabohousing.com or write to Afodabohousing Ltd, Kampala, Uganda.`,
  },
];

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-primary py-14">
        <div className="container text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground mb-3">Terms of Service</h1>
          <p className="text-primary-foreground/75 text-lg">Last updated: March 2026</p>
        </div>
      </section>

      <div className="container py-14 max-w-4xl">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card mb-8">
          <p className="text-muted-foreground leading-relaxed text-base">
            These Terms of Service govern your access to and use of the Afodabohousing platform, operated by Afodabohousing Ltd, a company registered in Uganda. Please read these terms carefully before using our services.
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

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="gradient-primary text-primary-foreground px-8" onClick={() => navigate('/register')}>
            Create an Account
          </Button>
          <Button variant="outline" className="px-8" onClick={() => navigate('/contact')}>
            Contact Support
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
