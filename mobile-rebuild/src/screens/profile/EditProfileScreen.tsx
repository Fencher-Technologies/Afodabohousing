import type { StackScreenProps } from '@react-navigation/stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { PageHeader } from '../../components/common/PageHeader';
import { FormError } from '../../components/forms/FormError';
import { TextInputField } from '../../components/forms/TextInputField';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/profile.service';
import { colors, shadows, spacing } from '../../theme';
import type { ProfileStackParamList } from '../../types/navigation.types';

export function EditProfileScreen({
  navigation,
}: StackScreenProps<ProfileStackParamList, 'EditProfile'>) {
  const { profile, refresh, user } = useAuth();
  const [formError, setFormError] = useState('');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(profile?.phone ?? '');

  const handleSave = async () => {
    setFormError('');

    if (!user) {
      setFormError('You need to be signed in to update your profile.');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        fullName,
        phone,
        userId: user.id,
      });
      await refresh();
      navigation.goBack();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not update your profile. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen>
      <PageHeader
        label="Profile Details"
        onBack={() => navigation.goBack()}
        subtitle="Keep your name and phone number current for tenant and manager workflows."
        title="Edit Profile"
      />

      <View style={styles.card}>
        <TextInputField
          autoComplete="name"
          label="Full name"
          onChangeText={setFullName}
          placeholder="Your full name"
          returnKeyType="next"
          textContentType="name"
          value={fullName}
        />
        <TextInputField
          autoComplete="tel"
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+256 700 000000"
          returnKeyType="done"
          textContentType="telephoneNumber"
          value={phone}
        />
        <FormError message={formError} />
        <Button loading={loading} onPress={handleSave}>
          Save Profile
        </Button>
      </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
});
