import type { StackScreenProps } from '@react-navigation/stack';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerEmptyState } from '../../components/manager/ManagerEmptyState';
import { ManagerScreenHeader } from '../../components/manager/ManagerScreenHeader';
import { ManagerConversationCard } from '../../components/messaging/ManagerConversationCard';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { useManagerMessages } from '../../hooks/manager/useManagerMessages';
import { colors, spacing } from '../../theme';
import type { ManagerMessagesStackParamList } from '../../types/navigation.types';
import { getManagerBottomContentPadding } from '../../utils/manager-layout';

export function ManagerMessagesScreen({
  navigation,
}: StackScreenProps<ManagerMessagesStackParamList, 'ManagerMessagesList'>) {
  const { user } = useAuth();
  const preview = useManagerPreview();
  const insets = useSafeAreaInsets();
  const messagesQuery = useManagerMessages(user?.id);

  if (!user && preview.enabled) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
        ]}
        style={styles.screen}
      >
        <ManagerScreenHeader
          icon="chatbubbles-outline"
          subtitle="Open a thread to read tenant messages and send a reply."
          title="Messages"
        />
        <ManagerEmptyState
          description="Tenant conversations will appear here once the manager account is live."
          icon="chatbubbles-outline"
          title="Messages preview"
        />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="Sign in as a house manager to reply to tenants."
          icon="chatbubbles-outline"
          title="Messages unavailable"
        />
      </View>
    );
  }

  if (messagesQuery.isLoading) {
    return <LoadingState message="Loading manager messages" />;
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

  const conversations = messagesQuery.data?.conversations ?? [];

  return (
    <FlatList
      ListEmptyComponent={
        <ManagerEmptyState
          description="Tenant conversations will appear here when messages are sent."
          icon="chatbubbles-outline"
          title="No conversations yet"
        />
      }
      ListHeaderComponent={
        <ManagerScreenHeader
          icon="chatbubbles-outline"
          subtitle="Open a thread to read tenant messages and send a reply."
          title="Messages"
        />
      }
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
      ]}
      data={conversations}
      keyExtractor={(conversation) => conversation.id}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void messagesQuery.refetch();
          }}
          refreshing={messagesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      renderItem={({ item }) => (
        <ManagerConversationCard
          conversation={item}
          onPress={() => {
            navigation.navigate('ManagerConversationDetail', {
              participantId: item.participantId,
            });
          }}
        />
      )}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
