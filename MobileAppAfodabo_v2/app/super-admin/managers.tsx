/**
 * Super Admin — managers list with approval and suspension.
 *
 * Matches the manager-management half of the web SuperAdminDashboard: filter
 * by status, approve pending signups, suspend or reactivate an account, and
 * reset a password.
 */

import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Search, ShieldCheck, ShieldOff, KeyRound, Users } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { InputField } from "@/src/components/InputField";
import { LoadingState } from "@/src/components/LoadingState";
import {
  useAdminUsers,
  useResetUserPassword,
  useSetUserStatus,
} from "@/src/hooks/useAdmin";
import type { AdminUser } from "@/src/services/admin";

type Filter = "all" | "pending" | "active" | "suspended";

export default function SuperAdminManagers() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>(
    params.filter === "pending" ? "pending" : "all",
  );
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers("house_manager");
  const setStatus = useSetUserStatus();
  const resetPassword = useResetUserPassword();

  const managers = useMemo(() => {
    const all = data ?? [];
    const byStatus =
      filter === "all" ? all : all.filter((m) => (m.status || "").toLowerCase() === filter);
    if (!query.trim()) return byStatus;
    const q = query.toLowerCase();
    return byStatus.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [data, filter, query]);

  function confirmStatus(manager: AdminUser, next: string, verb: string) {
    Alert.alert(
      `${verb} manager`,
      `${verb} ${manager.full_name || manager.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: verb,
          style: next === "suspended" ? "destructive" : "default",
          onPress: async () => {
            try {
              await setStatus.mutateAsync({ userId: manager.user_id, status: next });
            } catch {
              Alert.alert("Failed", `Could not ${verb.toLowerCase()} this manager.`);
            }
          },
        },
      ],
    );
  }

  function confirmReset(manager: AdminUser) {
    Alert.alert(
      "Reset password",
      `Generate a new password for ${manager.full_name || manager.email}? You will need to pass it on to them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              const result = await resetPassword.mutateAsync(manager.user_id);
              Alert.alert("New password", result.password ?? "Password reset.");
            } catch {
              Alert.alert("Failed", "Could not reset this password.");
            }
          },
        },
      ],
    );
  }

  if (isLoading) return <LoadingState message="Loading managers…" />;
  if (isError) return <ErrorState description="Could not load managers." onRetry={() => refetch()} />;

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Active", value: "active" },
    { label: "Suspended", value: "suspended" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Managers</Text>
        <InputField
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          leftIcon={<Search size={18} color={Colors.textMuted} />}
        />
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
      </View>

      <FlatList
        data={managers}
        keyExtractor={(m) => m.user_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={40} color={Colors.textMuted} />}
            title="No managers found"
            description="Try a different filter or search term."
          />
        }
        renderItem={({ item }) => {
          const status = (item.status || "").toLowerCase();
          return (
            <Card
              padding="md"
              style={styles.card}
              onPress={() => router.push(`/super-admin-manager?id=${item.user_id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.name}>{item.full_name || "Unnamed manager"}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <Badge
                  label={status || "unknown"}
                  tone={
                    status === "active" ? "success" : status === "pending" ? "warning" : "danger"
                  }
                  size="sm"
                />
              </View>

              <View style={styles.metaRow}>
                <Building2 size={14} color={Colors.textMuted} />
                <Text style={styles.meta}>
                  {item.property_count} propert{item.property_count === 1 ? "y" : "ies"}
                  {item.subscription_plan ? ` · ${item.subscription_plan}` : ""}
                </Text>
              </View>

              <View style={styles.actions}>
                {status === "pending" || status === "suspended" ? (
                  <Button
                    label={status === "pending" ? "Approve" : "Reactivate"}
                    variant="outline"
                    leftIcon={<ShieldCheck size={16} color={Colors.success} />}
                    onPress={() =>
                      confirmStatus(item, "active", status === "pending" ? "Approve" : "Reactivate")
                    }
                    flex
                  />
                ) : (
                  <Button
                    label="Suspend"
                    variant="outline"
                    tone="danger"
                    leftIcon={<ShieldOff size={16} color={Colors.danger} />}
                    onPress={() => confirmStatus(item, "suspended", "Suspend")}
                    flex
                  />
                )}
                <Button
                  label="Reset password"
                  variant="ghost"
                  leftIcon={<KeyRound size={16} color={Colors.primary} />}
                  onPress={() => confirmReset(item)}
                  flex
                />
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: Spacing.lg, gap: Spacing.sm },
  heading: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
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
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  cardTitleWrap: { flex: 1 },
  name: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  email: { fontSize: FontSize.caption, color: Colors.textSecondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  meta: { fontSize: FontSize.caption, color: Colors.textMuted },
  actions: { flexDirection: "row", gap: Spacing.sm },
});
