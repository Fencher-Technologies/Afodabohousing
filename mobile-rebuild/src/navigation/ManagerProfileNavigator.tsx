import { createStackNavigator } from '@react-navigation/stack';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ManagerProfileScreen } from '../screens/manager/ManagerProfileScreen';
import { colors, typography } from '../theme';
import type { ProfileStackParamList } from '../types/navigation.types';

const ManagerProfileStack = createStackNavigator<ProfileStackParamList>();

export function ManagerProfileNavigator() {
  return (
    <ManagerProfileStack.Navigator
      screenOptions={{
        cardStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: typography.bodyStrong,
          fontSize: 18,
        },
      }}
    >
      <ManagerProfileStack.Screen
        component={ManagerProfileScreen}
        name="ProfileHome"
        options={{ headerShown: false }}
      />
      <ManagerProfileStack.Screen
        component={EditProfileScreen}
        name="EditProfile"
        options={{ title: 'Edit Profile' }}
      />
    </ManagerProfileStack.Navigator>
  );
}
