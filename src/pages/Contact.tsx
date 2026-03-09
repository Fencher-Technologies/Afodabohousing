import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, HeadphonesIcon } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I list my property on Afodabo Housing?',
    a: 'Register as a House Manager, then go to your Manager Dashboard and click "Add Property". Fill in the details, upload photos and publish your listing. It goes live immediately after review.',
  },
  {
    q: 'How do I pay rent online?',
    a: 'Log in as a Tenant, go to your Dashboard and click "Pay Online". You will be redirected to PesaPal where you can pay via Visa, Mastercard, MTN Mobile Money or Airtel Money.',
  },
  {
    q: 'Is Afodabo Housing available across Uganda?',
    a: 'Yes. We cover all 135 districts of Uganda. You can search by district name in the search bar or browse from the properties page.',
  },
  {
    q: 'What happens after I upload payment proof?',
    a: 'Your house manager receives an instant notification and reviews the proof within 24 hours. Once confirmed, you receive an SMS confirmation and your payment history is updated.',
  },
  {
    q: 'How do I get a tenancy agreement?',
    a: 'Once your house manager creates your tenancy on the platform, a digital agreement is generated automatically. Contact info@afodabohousing.com to request a printed copy.',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending (in a real deployment this would call an edge function to send email)
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast({
      title: 'Message received!',
      description: 'Thank you for reaching out. Our support team will respond within 24 hours via email.',
    });
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Get in Touch</p>
          <h1 className="font-display text-5xl font-bold text-primary-foreground mb-4">Contact Support</h1>
          <p className="text-primary-foreground/80 text-xl max-w-xl mx-auto">
            Our team is here to help you with any questions about listings, payments or your account.
          </p>
        </div>
      </section>

      <div className="container py-16">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">How to Reach Us</h2>
              {[
                {
                  icon: <Mail className="h-5 w-5" />,
                  label: 'Email',
                  value: 'info@afodabohousing.com',
                  href: 'mailto:info@afodabohousing.com',
                  sub: 'We respond within 24 hours',
                },
                {
                  icon: <Phone className="h-5 w-5" />,
                  label: 'Phone',
                  value: '+256 700 000 000',
                  href: 'tel:+256700000000',
                  sub: 'Monday to Friday, 8am to 6pm EAT',
                },
                {
                  icon: <MapPin className="h-5 w-5" />,
                  label: 'Address',
                  value: 'Kampala, Uganda',
                  href: null,
                  sub: 'East Africa',
                },
                {
                  icon: <Clock className="h-5 w-5" />,
                  label: 'Support Hours',
                  value: 'Mon to Fri: 8am to 6pm',
                  href: null,
                  sub: 'East Africa Time (EAT)',
                },
              ].map(c => (
                <div key={c.label} className="flex items-start gap-4 p-5 bg-card border border-border rounded-2xl">
                  <div className="bg-primary/10 text-primary rounded-xl w-11 h-11 flex items-center justify-center shrink-0">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">{c.label}</p>
                    {c.href ? (
                      <a href={c.href} className="font-semibold text-foreground hover:text-primary transition-colors">{c.value}</a>
                    ) : (
                      <p className="font-semibold text-foreground">{c.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HeadphonesIcon className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-lg">Quick Links</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'Browse Properties', href: '/properties' },
                  { label: 'Register as Tenant', href: '/register' },
                  { label: 'Register as House Manager', href: '/register' },
                  { label: 'Sign In to Dashboard', href: '/login' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 rounded-xl p-2.5">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Send Us a Message</h2>
                  <p className="text-muted-foreground text-sm">Fill in the form below and we will get back to you shortly.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Mukasa"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+256 700 000000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Subject *</Label>
                    <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="listing">Property Listing</SelectItem>
                        <SelectItem value="payment">Payment Issue</SelectItem>
                        <SelectItem value="tenancy">Tenancy Problem</SelectItem>
                        <SelectItem value="account">Account Support</SelectItem>
                        <SelectItem value="report">Report a Problem</SelectItem>
                        <SelectItem value="fraud">Report Suspected Fraud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={6}
                    required
                    placeholder="Please describe your question or issue in detail. Include property names, dates or reference numbers if relevant."
                    className="mt-1.5"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !form.subject}
                  className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2"
                >
                  {loading ? (
                    'Sending message...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Or email us directly at{' '}
                  <a href="mailto:info@afodabohousing.com" className="text-primary font-semibold hover:underline">
                    info@afodabohousing.com
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">Quick Answers</p>
            <h2 className="font-display text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-semibold text-foreground">{f.q}</span>
                  <span className={`text-muted-foreground font-bold text-lg transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
