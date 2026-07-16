import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useTenantMessages } from '../hooks/tenant/use-tenant-messages';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme/tokens';
export function TenantMessagesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const messagesQuery = useTenantMessages(user?.id);
  const conversations = messagesQuery.conversations;

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in to see your messages with your house manager."
          title="Messages unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading messages" />;
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
      {conversations.length === 0 ? (
        <View style={styles.card}>
          <EmptyState
            description="When your manager replies, messages will appear here."
            title="No messages yet"
          />
        </View>
      ) : (
        conversations.map((conversation) => (
          <Pressable
            key={conversation.id}
            onPress={() =>
              navigation.navigate('TenantConversation', {
                participantId: conversation.participantId,
              })
            }
            style={[styles.messageCard, conversation.unreadCount > 0 ? styles.unreadCard : null]}
          >
            <View style={styles.messageHeader}>
              <View style={styles.messageMeta}>
                <Text style={styles.messageTitle}>{conversation.participantName}</Text>
                {conversation.propertyId ? (
                  <Text style={styles.smallText}>Related property conversation</Text>
                ) : null}
              </View>
              {conversation.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{conversation.unreadCount} new</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  content: {
    gap: spacing.lg,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  messageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  messageMeta: {
    flex: 1,
    gap: 4,
  },
  messageTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
  smallText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
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
  },
});
