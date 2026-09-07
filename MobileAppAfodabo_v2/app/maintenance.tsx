/**
 * Maintenance — one screen, two jobs.
 *
 * A tenant sees the requests they raised and can add another. A manager sees
 * the queue across their properties and moves each one along
 * open -> scheduled -> completed (cancelled exits from either live state).
 *
 * Cost and notes are stripped server-side for tenants, so this screen renders
 * whatever it is given without needing to know the caller's role for that.
 */

import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Plus, Wrench } from "lucide-react-native";
import { Image } from "react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import {
  useMaintenanceRequests,
  useUpdateMaintenanceRequest,
} from "@/src/hooks/useMaintenance";
import {
  NEXT_STATUSES,
  type MaintenanceRequest,
  type MaintenanceStatus,
} from "@/src/services/maintenance";
import { formatDate, formatMoney } from "@/src/utils/format";

const STATUS_TONE: Record<MaintenanceStatus, "warning" | "primary" | "success" | "muted"> = {
  open: "warning",
  scheduled: "primary",
  completed: "success",
  cancelled: "muted",
};

const PRIORITY_TONE: Record<string, "muted" | "primary" | "warning" | "danger"> = {
  low: "muted",
  medium: "primary",
  high: "warning",
  urgent: "danger",
};

type Filter = "all" | MaintenanceStatus;

export default function MaintenanceScreen() {
  const { user } = useAuth();
  const isTenant = user?.role === "tenant";
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useMaintenanceRequests();
  const updateRequest = useUpdateMaintenanceRequest();

  const requests = useMemo(() => {
    const all = data?.items ?? [];
    return filter === "all" ? all : all.filter((r) => r.status === filter);
  }, [data, filter]);

  function moveTo(request: MaintenanceRequest, next: MaintenanceStatus) {
    Alert.alert(
      "Update request",
      `Mark “${request.title}” as ${next}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setBusyId(request.id);
            try {
              await updateRequest.mutateAsync({
                id: request.id,
                data: {
                  status: next,
                  ...(next === "completed"
                    ? { completed_date: new Date().toISOString().slice(0, 10) }
                    : {}),
                },
              });
            } catch {
              Alert.alert("Could not update", "Please try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  if (isLoading) return <LoadingState message="Loading maintenance requests…" />;
  if (isError) {
    return <ErrorState description="Could not load maintenance requests." onRetry={() => refetch()} />;
  }

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Maintenance" onBack={() => router.back()} />

      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.pill, filter === f.value && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f.value && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Wrench size={40} color={Colors.textMuted} />}
            title="No maintenance requests"
            description={
              isTenant
                ? "Report a problem with your home and your manager will see it here."
                : "Requests raised by your tenants will appear here."
            }
            actionLabel={isTenant ? "Report an issue" : undefined}
            onAction={isTenant ? () => router.push("/report-maintenance") : undefined}
          />
        }
        renderItem={({ item }) => {
          const next = NEXT_STATUSES[item.status] ?? [];
          return (
            <Card padding="md" style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.title}</Text>
                <Badge label={item.status} tone={STATUS_TONE[item.status]} size="sm" />
              </View>
              <Text style={styles.description}>{item.description}</Text>
              {!!item.photo_url && (
                <Image source={{ uri: item.photo_url }} style={styles.photo} />
              )}

              <View style={styles.metaRow}>
                <Badge label={item.priority} tone={PRIORITY_TONE[item.priority] ?? "muted"} size="sm" />
                <Text style={styles.meta}>Raised {formatDate(item.created_at)}</Text>
              </View>

              {!!item.scheduled_date && (
                <Text style={styles.meta}>Scheduled for {formatDate(item.scheduled_date)}</Text>
              )}
              {!!item.completed_date && (
                <Text style={styles.meta}>Completed {formatDate(item.completed_date)}</Text>
              )}

              {/* Only ever present for the manager — the API redacts these for tenants. */}
              {item.cost != null && (
                <Text style={styles.meta}>Cost {formatMoney(item.cost, "UGX")}</Text>
              )}
              {!!item.notes && <Text style={styles.notes}>{item.notes}</Text>}

              {!isTenant && next.length > 0 && (
                <View style={styles.actions}>
                  {busyId === item.id ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    next.map((s) => (
                      <Button
                        key={s}
                        label={s === "open" ? "Reopen" : s.charAt(0).toUpperCase() + s.slice(1)}
                        variant={s === "cancelled" ? "ghost" : "outline"}
                        tone={s === "cancelled" ? "danger" : undefined}
                        onPress={() => moveTo(item, s)}
                        flex
                      />
                    ))
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      {isTenant && (
        <View style={styles.footer}>
          <Button
            label="Report an issue"
            leftIcon={<Plus size={18} color={Colors.textOnPrimary} />}
            onPress={() => router.push("/report-maintenance")}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: FontSize.caption, color: Colors.textSecondary },
  pillTextActive: { color: Colors.textOnPrimary, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: { gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  title: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  description: { fontSize: FontSize.caption, color: Colors.textSecondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  meta: { fontSize: FontSize.caption, color: Colors.textMuted },
  notes: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  photo: { width: "100%", height: 160, borderRadius: 8, marginTop: 4, backgroundColor: Colors.surfaceAlt },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
