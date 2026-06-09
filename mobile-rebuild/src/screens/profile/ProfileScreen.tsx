import type { StackScreenProps } from '@react-navigation/stack';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { ScrollableScreenContainer } from '../../components/common/ScrollableScreenContainer';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileMenuItem } from '../../components/profile/ProfileMenuItem';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { spacing } from '../../theme';
import type { ProfileStackParamList } from '../../types/navigation.types';
import { formatRoleLabel } from '../../utils/format';

export function ProfileScreen({
  navigation,
}: StackScreenProps<ProfileStackParamList, 'ProfileHome'>) {
  const { profile, role, signOut, user } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Do you want to sign out of Afodabo Housing?', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          void signOut();
        },
        style: 'destructive',
        text: 'Sign Out',
      },
    ]);
  };

  return (
    <ScrollableScreenContainer>
      <PageHeader label="Account" subtitle="Manage your account." title="Profile" />

      <ProfileHeader
        email={user?.email}
        fullName={profile?.full_name}
        phone={profile?.phone}
        roleLabel={formatRoleLabel(role)}
      />

      <View style={styles.section}>
        <ProfileMenuItem onPress={() => navigation.navigate('EditProfile')} title="Edit Profile" />
      </View>

      <View style={styles.logoutSection}>
        <Button onPress={handleLogout} variant="outline">
          Sign Out
        </Button>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  logoutSection: {
    paddingTop: spacing.xs,
  },
});
