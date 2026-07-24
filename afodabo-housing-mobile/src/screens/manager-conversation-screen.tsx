import type { StackScreenProps } from '@react-navigation/stack';
import React, { useEffect, useMemo, useRef } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { MessageBubble } from '../components/message-bubble';
import { MessageComposer } from '../components/message-composer';
import { PageHeader } from '../components/page-header';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import {
  useManagerMessages,
  useMarkManagerMessagesRead,
  useSendManagerMessage,
} from '../hooks/manager/use-manager-messages';
import { colors, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function ManagerConversationScreen({
  route,
}: StackScreenProps<RootStackParamList, 'ManagerConversation'>) {
  const { user } = useAuth();
  const messagesQuery = useManagerMessages(user?.id);
  const markReadMutation = useMarkManagerMessagesRead(user?.id);
  const sendMessageMutation = useSendManagerMessage(user?.id);
  const lastMarkedIdsRef = useRef('');

  const conversation = useMemo(
    () =>
      messagesQuery.conversations.find(
        (item) => item.participantId === route.params.participantId,
      ) ?? null,
    [messagesQuery.conversations, route.params.participantId],
  );

  useEffect(() => {
    if (!user || !conversation) {
      lastMarkedIdsRef.current = '';
      return;
    }

    const unreadIncomingIds = conversation.messages
      .filter((message) => !message.is_read && message.receiver_id === user.id)
      .map((message) => message.id);

    if (unreadIncomingIds.length === 0) {
      lastMarkedIdsRef.current = '';
      return;
    }

    const idsKey = unreadIncomingIds.join(',');

    if (idsKey === lastMarkedIdsRef.current) {
      return;
    }

    lastMarkedIdsRef.current = idsKey;
    markReadMutation.mutate(unreadIncomingIds);
  }, [conversation, markReadMutation, user]);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to open this conversation."
          title="Conversation unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading conversation" />;
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
          title="Could not load conversation"
        />
      </ScrollableScreenContainer>
    );
  }

  if (!conversation) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="This tenant thread could not be found."
          title="Conversation not found"
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
      <PageHeader
        label="Manager Messages"
        subtitle={
          conversation.propertyTitle
            ? `Related to ${conversation.propertyTitle}.`
            : 'Reply to this tenant conversation.'
        }
        title={conversation.participantName}
      />

      <View style={styles.thread}>
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} userId={user.id} />
        ))}
      </View>

      <MessageComposer
        helperText={`Contact ${conversation.participantName} on WhatsApp.`}
        phoneNumber={conversation.participantPhone}
      />

      {sendMessageMutation.isError ? (
        <Text style={styles.error}>
          {sendMessageMutation.error instanceof Error
            ? sendMessageMutation.error.message
            : 'Could not send message.'}
        </Text>
      ) : null}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  thread: {
    gap: spacing.sm,
  },
});
