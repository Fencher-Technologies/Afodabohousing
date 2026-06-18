import { createStackNavigator } from '@react-navigation/stack';
import { ManagerPropertiesScreen } from '../screens/manager/ManagerPropertiesScreen';
import { ManagerPropertyDetailScreen } from '../screens/manager/ManagerPropertyDetailScreen';
import { colors, typography } from '../theme';
import type { ManagerPropertiesStackParamList } from '../types/navigation.types';

const ManagerPropertiesStack = createStackNavigator<ManagerPropertiesStackParamList>();

export function ManagerPropertiesNavigator() {
  return (
    <ManagerPropertiesStack.Navigator
      screenOptions={{
        cardStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: typography.bodyStrong,
          fontSize: 18,
        },
        headerTintColor: colors.primary,
      }}
    >
      <ManagerPropertiesStack.Screen
        component={ManagerPropertiesScreen}
        name="ManagerPropertiesList"
        options={{ headerShown: false }}
      />
      <ManagerPropertiesStack.Screen
        component={ManagerPropertyDetailScreen}
        name="ManagerPropertyDetail"
        options={{ title: 'Property Preview' }}
      />
    </ManagerPropertiesStack.Navigator>
  );
}
