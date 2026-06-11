import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { colors, typography } from '../theme';
import type { AuthStackParamList } from '../types/navigation.types';

const AuthStack = createStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onPreviewManager?: () => void;
}

export function AuthNavigator({ onPreviewManager }: AuthNavigatorProps) {
  return (
    <AuthStack.Navigator
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
      <AuthStack.Screen name="Login" options={{ headerShown: false }}>
        {(props) => <LoginScreen {...props} onPreviewManager={onPreviewManager} />}
      </AuthStack.Screen>
      <AuthStack.Screen
        component={RegisterScreen}
        name="Register"
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
}
