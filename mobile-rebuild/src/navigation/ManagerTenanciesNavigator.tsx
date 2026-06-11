import { createStackNavigator } from '@react-navigation/stack';
import { ManagerTenanciesScreen } from '../screens/manager/ManagerTenanciesScreen';
import { ManagerTenancyDetailScreen } from '../screens/manager/ManagerTenancyDetailScreen';
import { colors, typography } from '../theme';
import type { ManagerTenanciesStackParamList } from '../types/navigation.types';

const ManagerTenanciesStack = createStackNavigator<ManagerTenanciesStackParamList>();

export function ManagerTenanciesNavigator() {
  return (
    <ManagerTenanciesStack.Navigator
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
      <ManagerTenanciesStack.Screen
        component={ManagerTenanciesScreen}
        name="ManagerTenanciesList"
        options={{ headerShown: false }}
      />
      <ManagerTenanciesStack.Screen
        component={ManagerTenancyDetailScreen}
        name="ManagerTenancyDetail"
        options={{ title: 'Tenancy Preview' }}
      />
    </ManagerTenanciesStack.Navigator>
  );
}
