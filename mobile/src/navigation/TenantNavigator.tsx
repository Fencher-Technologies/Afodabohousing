import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileNavigator } from './ProfileNavigator';
import { TenantHomeScreen } from '../screens/tenant/TenantHomeScreen';
import { TenantMessagesScreen } from '../screens/tenant/TenantMessagesScreen';
import { TenantPaymentsScreen } from '../screens/tenant/TenantPaymentsScreen';
import { colors, typography } from '../theme';
import type { TenantTabParamList } from '../types/navigation.types';

const TenantTabs = createBottomTabNavigator<TenantTabParamList>();

const tabIcons: Record<keyof TenantTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Messages: 'chatbubbles-outline',
  Payments: 'card-outline',
  Profile: 'person-circle-outline',
};

const activeTabIcons: Record<keyof TenantTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Messages: 'chatbubbles',
  Payments: 'card',
  Profile: 'person-circle',
};

const tabLabels: Record<keyof TenantTabParamList, string> = {
  Home: 'Home',
  Messages: 'Messages',
  Payments: 'Payments',
  Profile: 'Profile',
};

export function TenantNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const tabBarHeight = 66 + bottomInset;

  return (
    <TenantTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
        tabBarActiveTintColor: colors.primary,
        tabBarActiveBackgroundColor: colors.surfaceMuted,
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            color={color}
            name={focused ? activeTabIcons[route.name] : tabIcons[route.name]}
            size={focused ? 23 : 21}
          />
        ),
        tabBarIconStyle: {
          marginBottom: 1,
        },
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarItemStyle: {
          alignItems: 'center',
          borderRadius: 16,
          justifyContent: 'center',
          marginHorizontal: 5,
          marginVertical: 8,
          paddingHorizontal: 0,
          paddingVertical: 3,
        },
        tabBarLabel: ({ color, focused }) => (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.tabLabel, { color }, focused && styles.activeTabLabel]}
          >
            {tabLabels[route.name]}
          </Text>
        ),
        tabBarLabelPosition: 'below-icon',
        tabBarShowLabel: true,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingHorizontal: 8,
          paddingTop: 8,
        },
      })}
    >
      <TenantTabs.Screen component={TenantHomeScreen} name="Home" />
      <TenantTabs.Screen component={TenantPaymentsScreen} name="Payments" />
      <TenantTabs.Screen component={TenantMessagesScreen} name="Messages" />
      <TenantTabs.Screen
        component={ProfileNavigator}
        name="Profile"
        options={{ headerShown: false }}
      />
    </TenantTabs.Navigator>
  );
}

const styles = StyleSheet.create({
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
