/**
 * Notifications.
 *
 * notificationsService existed and called the API, but no screen rendered it —
 * so notifications created server-side (rent reminders, agreement changes,
 * maintenance updates) had nowhere to be read in the app.
 */

import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { PageHeader } from "@/src/components/PageHeader";
import { useMarkNotificationRead, useNotifications } from "@/src/hooks/useNotifications";
import { formatDate } from "@/src/utils/format";

export default function NotificationsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <LoadingState message="Loading notifications…" />;
  if (isError) {
    return <ErrorState description="Could not load notifications." onRetry={() => refetch()} />;
  }

  const items = data?.items ?? [];

  return (
    <View style={styles.container}>
      <PageHeader title="Notifications" onBack={() => router.back()} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={40} color={Colors.textMuted} />}
            title="No notifications"
            description="Rent reminders, agreement updates and maintenance progress will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => !item.is_read && markRead.mutate(item.id)}>
            <Card padding="md" style={item.is_read ? styles.card : { ...styles.card, ...styles.unread }}>
              <View style={styles.header}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { gap: 4 },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  title: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  body: { fontSize: FontSize.caption, color: Colors.textSecondary },
  meta: { fontSize: FontSize.caption, color: Colors.textMuted },
});
