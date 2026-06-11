import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useCallback, useEffect, useState } from 'react';
import { AdminLiteNavigator } from './AdminLiteNavigator';
import { AuthNavigator } from './AuthNavigator';
import { ManagerNavigator } from './ManagerNavigator';
import { TenantNavigator } from './TenantNavigator';
import { LoadingState } from '../components/common/LoadingState';
import { useAuth } from '../context/AuthContext';
import { ManagerPreviewProvider } from '../context/ManagerPreviewContext';
import { RoleUnavailableScreen } from '../screens/auth/RoleUnavailableScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { hasSeenOnboarding, markOnboardingSeen } from '../services/onboarding-storage';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation.types';

const RootStack = createStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { loading, role, session, user } = useAuth();
  const [managerPreviewEnabled, setManagerPreviewEnabled] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    hasSeenOnboarding()
      .then((seen) => {
        if (mounted) {
          setOnboardingSeen(seen);
        }
      })
      .catch(() => {
        if (mounted) {
          setOnboardingSeen(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingSeen();
    setOnboardingSeen(true);
  }, []);

  if (loading || (!managerPreviewEnabled && !session && !user && onboardingSeen === null)) {
    return <LoadingState message="Opening Afodabo Housing" />;
  }

  let routeName: keyof RootStackParamList = 'Auth';

  if (managerPreviewEnabled) {
    routeName = 'Manager';
  } else if (session && user) {
    if (role === 'tenant') {
      routeName = 'Tenant';
    } else if (role === 'house_manager') {
      routeName = 'Manager';
    } else if (role === 'admin') {
      routeName = 'AdminLite';
    } else {
      routeName = 'RoleUnavailable';
    }
  } else if (!onboardingSeen) {
    routeName = 'Onboarding';
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={routeName}
        screenOptions={{
          cardStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        {routeName === 'Onboarding' ? (
          <RootStack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={completeOnboarding} />}
          </RootStack.Screen>
        ) : routeName === 'Auth' ? (
          <RootStack.Screen name="Auth">
            {() => (
              <AuthNavigator
                onPreviewManager={() => {
                  setManagerPreviewEnabled(true);
                }}
              />
            )}
          </RootStack.Screen>
        ) : routeName === 'Tenant' ? (
          <RootStack.Screen component={TenantNavigator} name="Tenant" />
        ) : routeName === 'Manager' ? (
          <RootStack.Screen name="Manager">
            {() => (
              <ManagerPreviewProvider
                enabled={managerPreviewEnabled}
                exitPreview={() => {
                  setManagerPreviewEnabled(false);
                }}
              >
                <ManagerNavigator />
              </ManagerPreviewProvider>
            )}
          </RootStack.Screen>
        ) : routeName === 'AdminLite' ? (
          <RootStack.Screen component={AdminLiteNavigator} name="AdminLite" />
        ) : (
          <RootStack.Screen component={RoleUnavailableScreen} name="RoleUnavailable" />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
