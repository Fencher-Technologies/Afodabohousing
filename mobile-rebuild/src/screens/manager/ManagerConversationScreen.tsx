import type { StackScreenProps } from '@react-navigation/stack';
import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { MessageBubble } from '../../components/messaging/MessageBubble';
import { MessageComposer } from '../../components/messaging/MessageComposer';
import { useAuth } from '../../context/AuthContext';
import {
  useManagerMessages,
  useMarkManagerMessagesRead,
  useSendManagerMessage,
} from '../../hooks/manager/useManagerMessages';
import { colors, spacing, typography } from '../../theme';
import type { ManagerMessagesStackParamList } from '../../types/navigation.types';

export function ManagerConversationScreen({
  route,
}: StackScreenProps<ManagerMessagesStackParamList, 'ManagerConversationDetail'>) {
  const { user } = useAuth();
  const messagesQuery = useManagerMessages(user?.id);
  const sendMessageMutation = useSendManagerMessage(user?.id);
  const markReadMutation = useMarkManagerMessagesRead(user?.id);
  const participantId = route.params.participantId;

  const conversation = useMemo(
    () =>
      messagesQuery.data?.conversations.find((item) => item.participantId === participantId) ??
      null,
    [messagesQuery.data, participantId],
  );

  useEffect(() => {
    if (!user || !conversation) {
      return;
    }

    const unreadIncomingIds = conversation.messages
      .filter((message) => !message.is_read && message.receiver_id === user.id)
      .map((message) => message.id);

    if (unreadIncomingIds.length > 0) {
      markReadMutation.mutate({
        managerId: user.id,
        messageIds: unreadIncomingIds,
      });
    }
  }, [conversation, markReadMutation, user]);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a house manager to reply to tenants."
          title="Conversation unavailable"
        />
      </View>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading conversation" />;
  }

  if (messagesQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            messagesQuery.error instanceof Error ? messagesQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void messagesQuery.refetch();
          }}
          title="Could not load conversation"
        />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="This conversation could not be found for your manager account."
          title="Conversation not found"
        />
      </View>
    );
  }

  return (
    <ScrollView
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
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Conversation</Text>
        <Text style={styles.title}>{conversation.participantName}</Text>
        <Text style={styles.subtitle}>
          {conversation.propertyTitle
            ? `Related to ${conversation.propertyTitle}.`
            : 'Reply to this tenant conversation.'}
        </Text>
      </View>

      <View style={styles.thread}>
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} userId={user.id} />
        ))}
      </View>

      <MessageComposer
        helperText={`Send a short reply to ${conversation.participantName}.`}
        loading={sendMessageMutation.isPending}
        onSend={async (message) => {
          await sendMessageMutation.mutateAsync({
            content: message,
            propertyId: conversation.propertyId,
            receiverId: conversation.participantId,
            senderId: user.id,
          });
        }}
      />

      {sendMessageMutation.isError ? (
        <Text style={styles.error}>
          {sendMessageMutation.error instanceof Error
            ? sendMessageMutation.error.message
            : 'Could not send message.'}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  thread: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 34,
  },
});
