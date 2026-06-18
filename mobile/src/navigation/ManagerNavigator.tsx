import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManagerMessagesNavigator } from './ManagerMessagesNavigator';
import { ManagerProfileNavigator } from './ManagerProfileNavigator';
import { ManagerPropertiesNavigator } from './ManagerPropertiesNavigator';
import { ManagerTenanciesNavigator } from './ManagerTenanciesNavigator';
import { ManagerDrawerMenu } from '../components/manager/ManagerDrawerMenu';
import { ManagerMenuButton } from '../components/manager/ManagerMenuButton';
import { ManagerHomeScreen } from '../screens/manager/ManagerHomeScreen';
import { ManagerPaymentsScreen } from '../screens/manager/ManagerPaymentsScreen';
import { AboutScreen } from '../screens/support/AboutScreen';
import { ContactScreen } from '../screens/support/ContactScreen';
import { PrivacyScreen } from '../screens/support/PrivacyScreen';
import { TermsScreen } from '../screens/support/TermsScreen';
import { ManagerShellProvider } from '../context/ManagerShellContext';
import { colors, typography } from '../theme';
import type { ManagerTabParamList } from '../types/navigation.types';

const ManagerTabs = createBottomTabNavigator<ManagerTabParamList>();

const tabIcons: Record<keyof ManagerTabParamList, keyof typeof Ionicons.glyphMap> = {
  About: 'information-circle-outline',
  Contact: 'help-circle-outline',
  Home: 'home-outline',
  Messages: 'chatbubbles-outline',
  Payments: 'card-outline',
  Privacy: 'shield-checkmark-outline',
  Profile: 'person-circle-outline',
  Properties: 'business-outline',
  Tenancies: 'key-outline',
  Terms: 'document-text-outline',
};

const activeTabIcons: Record<keyof ManagerTabParamList, keyof typeof Ionicons.glyphMap> = {
  About: 'information-circle',
  Contact: 'help-circle',
  Home: 'home',
  Messages: 'chatbubbles',
  Payments: 'card',
  Privacy: 'shield-checkmark',
  Profile: 'person-circle',
  Properties: 'business',
  Tenancies: 'key',
  Terms: 'document-text',
};

const tabLabels: Record<keyof ManagerTabParamList, string> = {
  About: 'About',
  Contact: 'Contact',
  Home: 'Home',
  Messages: 'Messages',
  Payments: 'Payments',
  Privacy: 'Privacy',
  Profile: 'Profile',
  Properties: 'Properties',
  Tenancies: 'Tenancies',
  Terms: 'Terms',
};

export function ManagerNavigator() {
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeRoute, setActiveRoute] = useState<keyof ManagerTabParamList>('Home');
  const tabNavigationRef = useRef<BottomTabNavigationProp<ManagerTabParamList> | null>(null);
  const bottomInset = Math.max(insets.bottom, 10);
  const drawerResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          !drawerVisible &&
          gestureState.x0 <= 24 &&
          gestureState.dx > 12 &&
          Math.abs(gestureState.dy) < 22,
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx > 42) {
            setDrawerVisible(true);
          }
        },
      }),
    [drawerVisible],
  );

  return (
    <View style={styles.shell}>
      <ManagerShellProvider openMenu={() => setDrawerVisible(true)}>
        <ManagerTabs.Navigator
          screenOptions={({ navigation, route }) => {
            tabNavigationRef.current = navigation;

            return {
              headerShadowVisible: false,
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerLeft: () => <ManagerMenuButton onPress={() => setDrawerVisible(true)} />,
              headerTitleStyle: {
                color: colors.textPrimary,
                fontFamily: typography.displayStrong,
                fontSize: 26,
              },
              headerTintColor: colors.primary,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  color={color}
                  name={focused ? activeTabIcons[route.name] : tabIcons[route.name]}
                  size={focused ? 23 : 21}
                />
              ),
              tabBarLabel: ({ color, focused }) => (
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[styles.tabLabel, { color }, focused && styles.activeTabLabel]}
                >
                  {tabLabels[route.name]}
                </Text>
              ),
              tabBarActiveTintColor: colors.primary,
              tabBarActiveBackgroundColor: colors.surfaceMuted,
              tabBarAllowFontScaling: false,
              tabBarInactiveTintColor: colors.textSecondary,
              tabBarIconStyle: {
                marginBottom: 1,
              },
              tabBarItemStyle: {
                alignItems: 'center',
                borderRadius: 16,
                justifyContent: 'center',
                marginHorizontal: 5,
                marginVertical: 8,
                paddingHorizontal: 0,
                paddingVertical: 3,
              },
              tabBarLabelPosition: 'below-icon',
              tabBarShowLabel: true,
              sceneStyle: {
                backgroundColor: colors.background,
              },
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: 64 + bottomInset,
                paddingBottom: bottomInset,
                paddingHorizontal: 6,
                paddingTop: 7,
              },
            };
          }}
          screenListeners={{
            state: (event) => {
              const nextState = event.data.state;
              const nextRoute = nextState.routes[nextState.index]?.name as
                | keyof ManagerTabParamList
                | undefined;

              if (nextRoute) {
                setActiveRoute(nextRoute);
              }
            },
          }}
        >
          <ManagerTabs.Screen name="Home" options={{ headerShown: false }}>
            {() => <ManagerHomeScreen />}
          </ManagerTabs.Screen>
          <ManagerTabs.Screen
            component={ManagerPaymentsScreen}
            name="Payments"
            options={{ headerShown: false }}
          />
          <ManagerTabs.Screen
            component={ManagerMessagesNavigator}
            name="Messages"
            options={{ headerShown: false }}
          />
          <ManagerTabs.Screen
            component={ManagerProfileNavigator}
            name="Profile"
            options={{ headerShown: false }}
          />
          <ManagerTabs.Screen
            component={ManagerPropertiesNavigator}
            name="Properties"
            options={{
              headerShown: false,
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
            }}
          />
          <ManagerTabs.Screen
            component={ManagerTenanciesNavigator}
            name="Tenancies"
            options={{
              headerShown: false,
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
            }}
          />
          <ManagerTabs.Screen
            component={AboutScreen}
            name="About"
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
              title: 'About',
            }}
          />
          <ManagerTabs.Screen
            component={ContactScreen}
            name="Contact"
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
              title: 'Contact Support',
            }}
          />
          <ManagerTabs.Screen
            component={PrivacyScreen}
            name="Privacy"
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
              title: 'Privacy',
            }}
          />
          <ManagerTabs.Screen
            component={TermsScreen}
            name="Terms"
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: styles.hiddenTabItem,
              title: 'Terms',
            }}
          />
        </ManagerTabs.Navigator>
      </ManagerShellProvider>
      <View pointerEvents="box-only" style={styles.edgeGesture} {...drawerResponder.panHandlers} />
      <ManagerDrawerMenu
        activeRoute={activeRoute}
        onClose={() => setDrawerVisible(false)}
        onNavigate={(routeName) => {
          setActiveRoute(routeName);
          tabNavigationRef.current?.navigate(routeName);
        }}
        visible={drawerVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edgeGesture: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 24,
  },
  shell: {
    flex: 1,
  },
  hiddenTabItem: {
    display: 'none',
  },
  activeTabLabel: {
    fontFamily: typography.bodyStrong,
  },
  tabLabel: {
    fontFamily: typography.bodyStrong,
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 14,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
