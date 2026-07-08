import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../hooks/use-notifications';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme/tokens';

export function NotificationBell() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('Notifications')}
      style={styles.container}
    >
      <Ionicons
        color={colors.textPrimary}
        name={hasUnread ? 'notifications' : 'notifications-outline'}
        size={24}
      />
      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 10,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  container: {
    marginRight: spacing.sm,
    padding: 4,
    position: 'relative',
  },
});
