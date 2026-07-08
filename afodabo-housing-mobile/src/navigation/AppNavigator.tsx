import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logoImage from '../../assets/brand/logo.png';
import { useAuth } from '../context/auth-context';
import { hasSeenOnboarding } from '../services/onboarding-storage';
import { colors, typography } from '../theme/tokens';
import { AccountScreen } from '../screens/account-screen';
import { AboutScreen } from '../screens/about-screen';
import { AdminDashboardScreen } from '../screens/admin-dashboard-screen';
import { ContactScreen } from '../screens/contact-screen';
import { EditProfileScreen } from '../screens/edit-profile-screen';
import { ExploreScreen } from '../screens/explore-screen';
import { LoginScreen } from '../screens/login-screen';
import { ManagerCreatePropertyScreen } from '../screens/manager-create-property-screen';
import { ManagerCreateTenancyScreen } from '../screens/manager-create-tenancy-screen';
import { ManagerConversationScreen } from '../screens/manager-conversation-screen';
import { ManagerDashboardScreen } from '../screens/manager-dashboard-screen';
import { ManagerEditPropertyScreen } from '../screens/manager-edit-property-screen';
import { ManagerMessagesScreen } from '../screens/manager-messages-screen';
import { ManagerPropertiesScreen } from '../screens/manager-properties-screen';
import { ManagerPropertyDetailsScreen } from '../screens/manager-property-details-screen';
import { ManagerTenanciesScreen } from '../screens/manager-tenancies-screen';
import { ManagerTenancyDetailsScreen } from '../screens/manager-tenancy-details-screen';
import { OnboardingScreen } from '../screens/onboarding-screen';
import { PropertyDetailsScreen } from '../screens/property-details-screen';
import { PrivacyScreen } from '../screens/privacy-screen';
import { RegisterScreen } from '../screens/register-screen';
import { RoleUnavailableScreen } from '../screens/role-unavailable-screen';
import { TenantDashboardScreen } from '../screens/tenant-dashboard-screen';
import { TenantConversationScreen } from '../screens/tenant-conversation-screen';
import { TenantMessagesScreen } from '../screens/tenant-messages-screen';
import { useTenantMessages } from '../hooks/tenant/use-tenant-messages';
import { TenantPaymentsScreen } from '../screens/tenant-payments-screen';
import { TermsScreen } from '../screens/terms-screen';
import { NotificationBell } from '../components/notification-bell';
import { NotificationsScreen } from '../screens/notifications-screen';
import type { RootStackParamList } from './types';

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <Image source={logoImage} style={styles.logo} />
      <Text style={styles.loadingTitle}>Afodabo Housing</Text>
      <Text style={styles.loadingSubtitle}>Opening your account</Text>
      <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
    </View>
  );
}

function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();

  return {
    headerShown: true,
    headerShadowVisible: false,
    headerTintColor: colors.textPrimary,
    headerStyle: {
      backgroundColor: colors.background,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      color: colors.textPrimary,
      fontFamily: typography.displayStrong,
      fontSize: 28,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderLeftWidth: 1,
      elevation: 0,
      height: 70 + insets.bottom,
      marginHorizontal: -1,
      paddingBottom: insets.bottom,
      paddingHorizontal: 20,
      paddingTop: 10,
      shadowOpacity: 0,
    },
    tabBarLabelStyle: {
      fontFamily: typography.bodyStrong,
      fontSize: 12,
    },
  };
}

function GuestTabs() {
  const tabScreenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="search-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TenantTabs() {
  const tabScreenOptions = useTabScreenOptions();
  const { user } = useAuth();
  const messagesQuery = useTenantMessages(user?.id);
  const unreadCount = messagesQuery.conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={TenantDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          headerRight: () => <NotificationBell />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="grid-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="search-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Payments"
        component={TenantPaymentsScreen}
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="card-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={TenantMessagesScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="chatbubble-ellipses-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function ManagerTabs() {
  const tabScreenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={ManagerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerRight: () => <NotificationBell />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="grid-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Properties"
        component={ManagerPropertiesScreen}
        options={{
          title: 'Properties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="business-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tenancies"
        component={ManagerTenanciesScreen}
        options={{
          title: 'Tenancies',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="key-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ManagerMessagesScreen}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="chatbubble-ellipses-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const tabScreenOptions = useTabScreenOptions();

  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Admin Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="shield-checkmark-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="search-outline" size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="person-outline" size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RoleTabs() {
  const { role, user } = useAuth();
  const authKey = user?.id || 'guest';

  if (role === 'tenant') {
    return <TenantTabs key={`tenant-${authKey}`} />;
  }

  if (role === 'house_manager') {
    return <ManagerTabs key={`manager-${authKey}`} />;
  }

  if (role === 'admin') {
    return <AdminTabs key={`admin-${authKey}`} />;
  }

  if (user) {
    return <RoleUnavailableScreen />;
  }

  return <GuestTabs key="guest" />;
}

export function AppNavigator() {
  const { loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);

  useEffect(() => {
    let mounted = true;

    hasSeenOnboarding()
      .then((seen) => {
        if (!mounted) {
          return;
        }

        setOnboardingSeen(seen);
        setOnboardingChecked(true);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setOnboardingSeen(false);
        setOnboardingChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !onboardingChecked) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={onboardingSeen ? 'Main' : 'Onboarding'}
        screenOptions={{
          cardStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            color: colors.textPrimary,
            fontFamily: typography.displayStrong,
            fontSize: 28,
            includeFontPadding: false,
          },
        }}
      >
        <RootStack.Screen
          component={OnboardingScreen}
          name="Onboarding"
          options={{ headerShown: false }}
        />
        <RootStack.Screen component={RoleTabs} name="Main" options={{ headerShown: false }} />
        <RootStack.Screen component={AboutScreen} name="About" options={{ title: 'About' }} />
        <RootStack.Screen
          component={ContactScreen}
          name="Contact"
          options={{ title: 'Contact Support' }}
        />
        <RootStack.Screen
          component={EditProfileScreen}
          name="EditProfile"
          options={{ title: 'Edit Profile' }}
        />
        <RootStack.Screen
          component={ManagerConversationScreen}
          name="ManagerConversation"
          options={{ title: 'Conversation' }}
        />
        <RootStack.Screen
          component={ManagerCreatePropertyScreen}
          name="ManagerCreateProperty"
          options={{
            title: 'List New Property',
          }}
        />
        <RootStack.Screen
          component={ManagerCreateTenancyScreen}
          name="ManagerCreateTenancy"
          options={{ title: 'Create Tenancy' }}
        />
        <RootStack.Screen
          component={ManagerEditPropertyScreen}
          name="ManagerEditProperty"
          options={{ title: 'Edit Property' }}
        />
        <RootStack.Screen
          component={ManagerPropertiesScreen}
          name="ManagerProperties"
          options={{ title: 'Properties' }}
        />
        <RootStack.Screen
          component={ManagerPropertyDetailsScreen}
          name="ManagerPropertyDetails"
          options={{ title: 'Property Detail' }}
        />
        <RootStack.Screen
          component={ManagerTenanciesScreen}
          name="ManagerTenancies"
          options={{ title: 'Tenancies' }}
        />
        <RootStack.Screen
          component={ManagerTenancyDetailsScreen}
          name="ManagerTenancyDetails"
          options={{ title: 'Tenancy Detail' }}
        />
        <RootStack.Screen
          component={TenantConversationScreen}
          name="TenantConversation"
          options={{ title: 'Conversation' }}
        />
        <RootStack.Screen
          component={PropertyDetailsScreen}
          name="PropertyDetails"
          options={{ title: 'Property Details' }}
        />
        <RootStack.Screen
          component={PrivacyScreen}
          name="Privacy"
          options={{ title: 'Privacy Policy' }}
        />
        <RootStack.Screen component={LoginScreen} name="Login" options={{ title: 'Sign In' }} />
        <RootStack.Screen
          component={RegisterScreen}
          name="Register"
          options={{ title: 'Create Account' }}
        />
        <RootStack.Screen
          component={RoleUnavailableScreen}
          name="RoleUnavailable"
          options={{ title: 'Role Check' }}
        />
        <RootStack.Screen
          component={TenantPaymentsScreen}
          name="TenantPayments"
          options={{ title: 'Payments' }}
        />
        <RootStack.Screen
          component={TermsScreen}
          name="Terms"
          options={{ title: 'Terms of Service' }}
        />
        <RootStack.Screen
          component={NotificationsScreen}
          name="Notifications"
          options={{ title: 'Notifications' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
    marginBottom: 8,
    marginTop: 20,
  },
  logo: {
    borderRadius: 24,
    height: 82,
    width: 82,
  },
  spinner: {
    marginTop: 22,
  },
});
