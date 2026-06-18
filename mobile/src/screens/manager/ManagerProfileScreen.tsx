import type { StackScreenProps } from '@react-navigation/stack';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { ScrollableScreenContainer } from '../../components/common/ScrollableScreenContainer';
import { ManagerProfileCard } from '../../components/manager/ManagerProfileCard';
import { ManagerScreenHeader } from '../../components/manager/ManagerScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { spacing } from '../../theme';
import type { ProfileStackParamList } from '../../types/navigation.types';

export function ManagerProfileScreen({
  navigation,
}: StackScreenProps<ProfileStackParamList, 'ProfileHome'>) {
  const { profile, role, signOut, user } = useAuth();
  const preview = useManagerPreview();

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
    <ScrollableScreenContainer edges={['left', 'right', 'bottom']} padded={false}>
      <ManagerScreenHeader
        icon="person-circle-outline"
        subtitle="Manage your identity and account access."
        title="Profile"
      />
      <View style={styles.content}>
        <ManagerProfileCard
          email={preview.enabled ? 'preview@afodabo.app' : user?.email}
          fullName={preview.enabled ? 'Manager Preview' : profile?.full_name}
          phone={preview.enabled ? 'Not connected' : profile?.phone}
          role={preview.enabled ? 'house_manager' : role}
        />
        <View style={styles.actions}>
          {preview.enabled ? (
            <Button onPress={preview.exitPreview} variant="outline">
              Exit Preview
            </Button>
          ) : (
            <>
              <Button onPress={() => navigation.navigate('EditProfile')}>Edit Profile</Button>
              <Button onPress={handleLogout} variant="outline">
                Sign Out
              </Button>
            </>
          )}
        </View>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
});
