import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerMessages } from '../hooks/manager/use-manager-messages';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatDateTimeLabel } from '../utils/format';

export function ManagerMessagesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const messagesQuery = useManagerMessages(user?.id);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to reply to tenants."
          title="Messages unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading manager messages" />;
  }

  if (messagesQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            messagesQuery.error instanceof Error ? messagesQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void messagesQuery.refetch();
          }}
          title="Could not load messages"
        />
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void messagesQuery.refetch();
          }}
          refreshing={messagesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      {messagesQuery.conversations.length === 0 ? (
        <View style={styles.card}>
          <EmptyState
            description="Tenant conversations will appear here once messages are sent through the live backend."
            title="No conversations yet"
          />
        </View>
      ) : (
        messagesQuery.conversations.map((conversation) => (
          <View
            key={conversation.id}
            style={[styles.messageCard, conversation.unreadCount > 0 ? styles.unreadCard : null]}
          >
            <View style={styles.messageHeader}>
              <View style={styles.messageMeta}>
                <Text style={styles.messageTitle}>{conversation.participantName}</Text>
                {conversation.propertyTitle ? (
                  <Text style={styles.smallText}>{conversation.propertyTitle}</Text>
                ) : null}
              </View>
              {conversation.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{conversation.unreadCount} new</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={2} style={styles.messageBody}>
              {conversation.latestMessage.content}
            </Text>
            <Text style={styles.messageTime}>
              {formatDateTimeLabel(conversation.latestMessage.created_at)}
            </Text>
            <Button
              onPress={() =>
                navigation.navigate('ManagerConversation', {
                  participantId: conversation.participantId,
                })
              }
              variant="outline"
            >
              Open Conversation
            </Button>
          </View>
        ))
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  messageBody: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  messageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.md,
  },
  messageMeta: {
    flex: 1,
    gap: 4,
  },
  messageTime: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  messageTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  smallText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unreadBadgeText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  unreadCard: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
});
