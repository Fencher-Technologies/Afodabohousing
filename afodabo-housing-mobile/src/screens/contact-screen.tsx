import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/tokens';

const faqs = [
  {
    answer:
      'Create a house manager account, then open your dashboard and add your listing details and photos.',
    question: 'How do I list my property?',
  },
  {
    answer:
      'Sign in as a tenant, open your dashboard, and choose the online payment option when it is available for your tenancy.',
    question: 'How do I pay rent online?',
  },
  {
    answer: 'Yes. We serve all 135 districts of Uganda and you can search by district or area.',
    question: 'Is Afodabo Housing available across Uganda?',
  },
  {
    answer:
      'Your house manager reviews the proof and you receive confirmation once it has been approved.',
    question: 'What happens after I upload payment proof?',
  },
];

const subjects = ['General Inquiry', 'Property Listing', 'Payment Issue', 'Tenancy Help'];

export function ContactScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const submitMessage = async () => {
    if (!fullName || !email || !subject || !message) {
      Alert.alert('Missing details', 'Please complete all required fields first.');
      return;
    }

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setFullName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      Alert.alert(
        'Message received',
        'Thank you for reaching out. Our support team will reply within 24 hours.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Contact Support</Text>
        <Text style={styles.subtitle}>
          Our team is here to help with listings, payments, tenancy questions, and account support.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How to Reach Us</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>Email</Text>
          <Text style={styles.contactValue}>info@afodabohousing.com</Text>
          <Button
            onPress={() => Linking.openURL('mailto:info@afodabohousing.com')}
            variant="outline"
          >
            Email Us
          </Button>
        </View>
        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>Phone</Text>
          <Text style={styles.contactValue}>+256 700 000 000</Text>
          <Button onPress={() => Linking.openURL('tel:+256700000000')} variant="outline">
            Call Support
          </Button>
        </View>
        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>Location</Text>
          <Text style={styles.contactValue}>Kampala, Uganda</Text>
          <Text style={styles.helperText}>Monday to Friday, 8am to 6pm EAT</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Send a Message</Text>
        <InputField
          label="Full name"
          onChangeText={setFullName}
          placeholder="John Mukasa"
          value={fullName}
        />
        <InputField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <InputField
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+256 700 000000"
          value={phone}
        />
        <Text style={styles.inputLabel}>Subject</Text>
        <View style={styles.subjectWrap}>
          {subjects.map((item) => (
            <Button
              key={item}
              onPress={() => setSubject(item)}
              variant={subject === item ? 'primary' : 'secondary'}
            >
              {item}
            </Button>
          ))}
        </View>
        <InputField
          label="Message"
          multiline
          onChangeText={setMessage}
          placeholder="Please describe your question or issue in detail."
          value={message}
        />
        <Button disabled={loading} onPress={submitMessage}>
          {loading ? 'Sending...' : 'Send Message'}
        </Button>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <Button onPress={() => navigation.navigate('About')} variant="outline">
          About Afodabo Housing
        </Button>
        <Button onPress={() => navigation.navigate('Privacy')} variant="outline">
          Privacy Policy
        </Button>
        <Button onPress={() => navigation.navigate('Terms')} variant="outline">
          Terms of Service
        </Button>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq, index) => (
          <View key={faq.question} style={styles.faqCard}>
            <Button onPress={() => setOpenFaq(openFaq === index ? null : index)} variant="ghost">
              {faq.question}
            </Button>
            {openFaq === index ? <Text style={styles.bodyText}>{faq.answer}</Text> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  contactCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: 6,
    padding: spacing.md,
  },
  contactLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  contactValue: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
  faqCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.modal,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  subjectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.primaryForeground,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.primaryForeground,
    fontFamily: typography.display,
    fontSize: 32,
  },
});
