import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { Screen } from '../components/screen';
import { useAuth } from '../context/auth-context';
import logoImage from '../../assets/brand/logo.png';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { titleCaseRole } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

export function AccountScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { profile, role, signOut, user } = useAuth();
  const resolvedRole = user ? role || 'tenant' : role;
  const emailVerified = Boolean(
    user?.user_metadata?.email_verified ||
    user?.user_metadata?.email_confirmed_at ||
    user?.user_metadata?.confirmed_at,
  );

  if (!user) {
    return (
      <Screen>
        <View style={styles.brandCard}>
          <Image source={logoImage} style={styles.logo} />
          <Text style={styles.title}>Afodabo Housing</Text>
          <Text style={styles.subtitle}>
            Sign in to manage rent, message house managers, and keep up with your home search.
          </Text>
        </View>

        <View style={styles.card}>
          <Button onPress={() => navigation.navigate('Login')}>Sign In</Button>
          <Button onPress={() => navigation.navigate('Register')} variant="outline">
            Create Account
          </Button>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Learn More</Text>
          <Button onPress={() => navigation.navigate('About')} variant="outline">
            About Afodabo Housing
          </Button>
          <Button onPress={() => navigation.navigate('Contact')} variant="outline">
            Contact Support
          </Button>
          <Button onPress={() => navigation.navigate('Privacy')} variant="outline">
            Privacy Policy
          </Button>
          <Button onPress={() => navigation.navigate('Terms')} variant="outline">
            Terms of Service
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {!emailVerified ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Verify your email</Text>
          <Text style={styles.mutedText}>
            Some account and tenancy workflows work best once your email has been confirmed. Check
            your inbox for the verification message tied to this account.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.title}>Your Account</Text>
        <Text style={styles.detailLine}>{profile?.full_name || user.email}</Text>
        <Text style={styles.mutedText}>{user.email}</Text>
        <Text style={styles.detailLine}>Role: {titleCaseRole(resolvedRole)}</Text>
        <Text style={styles.detailLine}>Phone: {profile?.phone || 'Not added yet'}</Text>
        <Button onPress={() => navigation.navigate('EditProfile')} variant="outline">
          Edit Profile
        </Button>
        {resolvedRole === 'tenant' ? (
          <Button onPress={() => navigation.navigate('TenantPayments')} variant="outline">
            Open Payment Centre
          </Button>
        ) : null}
        {resolvedRole === 'house_manager' ? (
          <>
            <Button onPress={() => navigation.navigate('ManagerProperties')} variant="outline">
              Open Properties
            </Button>
            <Button onPress={() => navigation.navigate('ManagerTenancies')} variant="outline">
              Open Tenancies
            </Button>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Support and Policies</Text>
        <Button onPress={() => navigation.navigate('Onboarding')} variant="outline">
          View Welcome Tour
        </Button>
        <Button onPress={() => navigation.navigate('About')} variant="outline">
          About Afodabo Housing
        </Button>
        <Button onPress={() => navigation.navigate('Contact')} variant="outline">
          Contact Support
        </Button>
        <Button onPress={() => navigation.navigate('Privacy')} variant="outline">
          Privacy Policy
        </Button>
        <Button onPress={() => navigation.navigate('Terms')} variant="outline">
          Terms of Service
        </Button>
      </View>

      <View style={styles.card}>
        <Button
          onPress={async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert(
                'Could not sign out',
                error instanceof Error ? error.message : 'Please try again.',
              );
            }
          }}
          variant="destructive"
        >
          Sign Out
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailLine: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  logo: {
    borderRadius: 24,
    height: 80,
    width: 80,
  },
  mutedText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
