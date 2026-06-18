import { createStackNavigator } from '@react-navigation/stack';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AboutScreen } from '../screens/support/AboutScreen';
import { ContactScreen } from '../screens/support/ContactScreen';
import { PrivacyScreen } from '../screens/support/PrivacyScreen';
import { TermsScreen } from '../screens/support/TermsScreen';
import { colors, typography } from '../theme';
import type { ProfileStackParamList } from '../types/navigation.types';

const ProfileStack = createStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        cardStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: typography.displayStrong,
          fontSize: 26,
        },
        headerTintColor: colors.primary,
      }}
    >
      <ProfileStack.Screen
        component={ProfileScreen}
        name="ProfileHome"
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        component={EditProfileScreen}
        name="EditProfile"
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen component={AboutScreen} name="About" options={{ title: 'About' }} />
      <ProfileStack.Screen
        component={ContactScreen}
        name="Contact"
        options={{ title: 'Contact Support' }}
      />
      <ProfileStack.Screen
        component={PrivacyScreen}
        name="Privacy"
        options={{ title: 'Privacy' }}
      />
      <ProfileStack.Screen component={TermsScreen} name="Terms" options={{ title: 'Terms' }} />
    </ProfileStack.Navigator>
  );
}
