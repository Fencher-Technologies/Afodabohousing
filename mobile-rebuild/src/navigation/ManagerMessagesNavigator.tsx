import { createStackNavigator } from '@react-navigation/stack';
import { ManagerConversationScreen } from '../screens/manager/ManagerConversationScreen';
import { ManagerMessagesScreen } from '../screens/manager/ManagerMessagesScreen';
import { colors, typography } from '../theme';
import type { ManagerMessagesStackParamList } from '../types/navigation.types';

const ManagerMessagesStack = createStackNavigator<ManagerMessagesStackParamList>();

export function ManagerMessagesNavigator() {
  return (
    <ManagerMessagesStack.Navigator
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
      <ManagerMessagesStack.Screen
        component={ManagerMessagesScreen}
        name="ManagerMessagesList"
        options={{ headerShown: false }}
      />
      <ManagerMessagesStack.Screen
        component={ManagerConversationScreen}
        name="ManagerConversationDetail"
        options={{ title: 'Conversation' }}
      />
    </ManagerMessagesStack.Navigator>
  );
}
