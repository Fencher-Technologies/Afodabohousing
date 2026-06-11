import { createStackNavigator } from '@react-navigation/stack';
import { AdminLiteHomeScreen } from '../screens/admin-lite/AdminLiteHomeScreen';
import { colors, typography } from '../theme';
import type { AdminLiteStackParamList } from '../types/navigation.types';

const AdminLiteStack = createStackNavigator<AdminLiteStackParamList>();

export function AdminLiteNavigator() {
  return (
    <AdminLiteStack.Navigator
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
      <AdminLiteStack.Screen
        component={AdminLiteHomeScreen}
        name="AdminLiteHome"
        options={{ title: 'Admin' }}
      />
    </AdminLiteStack.Navigator>
  );
}
