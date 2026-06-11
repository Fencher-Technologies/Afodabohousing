import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ConversationListItem } from '../../components/messaging/ConversationListItem';
import { MessageBubble } from '../../components/messaging/MessageBubble';
import { MessageComposer } from '../../components/messaging/MessageComposer';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  useMarkTenantMessagesRead,
  useSendTenantMessage,
  useTenantMessages,
} from '../../hooks/tenant/useTenantMessages';
import { colors, spacing, typography } from '../../theme';

export function TenantMessagesScreen() {
  const { user } = useAuth();
  const messagesQuery = useTenantMessages(user?.id);
  const sendMessageMutation = useSendTenantMessage(user?.id);
  const markReadMutation = useMarkTenantMessagesRead(user?.id);

  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data]);
  const activeTenancy = messagesQuery.data?.activeTenancy ?? null;
  const latestMessage = messages[messages.length - 1] ?? null;

  useEffect(() => {
    if (!user || messages.length === 0) {
      return;
    }

    const unreadIncomingIds = messages
      .filter((message) => !message.is_read && message.receiver_id === user.id)
      .map((message) => message.id);

    if (unreadIncomingIds.length > 0) {
      markReadMutation.mutate(unreadIncomingIds);
    }
  }, [markReadMutation, messages, user]);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a tenant to view messages with your house manager."
          title="Messages unavailable"
        />
      </View>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading messages" />;
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
          title="Could not load messages"
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
      <PageHeader
        label="Conversations"
        subtitle="Keep in touch with your property manager."
        title="Messages"
      />

      <ConversationListItem message={latestMessage} userId={user.id} />

      <View style={styles.thread}>
        {messages.length === 0 ? (
          <EmptyState
            description="When you or your manager send messages, the conversation will appear here."
            title="No messages yet"
          />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} userId={user.id} />
          ))
        )}
      </View>

      <MessageComposer
        disabled={!activeTenancy}
        helperText={
          activeTenancy
            ? 'Send a short message to your current house manager.'
            : 'You need an active tenancy before messaging a house manager.'
        }
        loading={sendMessageMutation.isPending}
        onSend={async (message) => {
          if (!activeTenancy) {
            return;
          }

          await sendMessageMutation.mutateAsync({
            content: message,
            propertyId: activeTenancy.property_id,
            receiverId: activeTenancy.manager_id,
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
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  thread: {
    gap: spacing.sm,
  },
});
