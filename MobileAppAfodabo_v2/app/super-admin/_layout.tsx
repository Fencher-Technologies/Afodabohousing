/**
 * Super Admin Tab Layout — 4 tabs: Overview, Managers, Browse, Account.
 *
 * The mobile app previously had no super-admin role: platform administration
 * was only possible from the web dashboard. These screens call the same
 * /admin endpoints the web uses.
 */

import { Tabs } from "expo-router";
import { LayoutDashboard, Search, Settings, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontSize, FontWeight } from "@/constants/theme";

export default function SuperAdminTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 4);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 62 + bottomInset,
          paddingBottom: Math.max(bottomInset, 10),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.micro,
          fontWeight: FontWeight.semibold,
          marginTop: 2,
        },
        tabBarIconStyle: { marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="managers"
        options={{
          title: "Managers",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
