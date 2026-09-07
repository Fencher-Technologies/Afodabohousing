/**
 * Super Admin — one manager in detail.
 *
 * The list gives status and quick actions; this gives the fuller picture the
 * web ManagerDetail page shows: their properties, subscription, and arrears
 * across their portfolio.
 */

import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Mail, Phone, ShieldCheck, ShieldOff } from "lucide-react-native";
import { Alert } from "react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { PageHeader } from "@/src/components/PageHeader";
import { useAdminUsers, useSetUserStatus } from "@/src/hooks/useAdmin";
import { formatMoney } from "@/src/utils/format";

export default function SuperAdminManagerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers("house_manager");
  const setStatus = useSetUserStatus();

  const manager = (data ?? []).find((m) => m.user_id === id);

  if (isLoading) return <LoadingState message="Loading manager…" />;
  if (isError || !manager) {
    return <ErrorState description="Could not load this manager." onRetry={() => refetch()} />;
  }

  const status = (manager.status || "").toLowerCase();

  function changeStatus(next: string, verb: string) {
    Alert.alert(`${verb} manager`, `${verb} ${manager!.full_name || manager!.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: verb,
        style: next === "suspended" ? "destructive" : "default",
        onPress: async () => {
          try {
            await setStatus.mutateAsync({ userId: manager!.user_id, status: next });
          } catch {
            Alert.alert("Failed", `Could not ${verb.toLowerCase()} this manager.`);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Manager" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        <Card padding="lg" style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{manager.full_name || "Unnamed manager"}</Text>
            <Badge
              label={status || "unknown"}
              tone={status === "active" ? "success" : status === "pending" ? "warning" : "danger"}
              size="sm"
            />
          </View>
          <View style={styles.metaRow}>
            <Mail size={14} color={Colors.textMuted} />
            <Text style={styles.meta}>{manager.email}</Text>
          </View>
          {!!manager.subscription_plan && (
            <Text style={styles.meta}>
              Subscription: {manager.subscription_plan}
              {manager.subscription_status ? ` (${manager.subscription_status})` : ""}
            </Text>
          )}
        </Card>

        <Card padding="lg" style={styles.card}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <View style={styles.statRow}>
            <Building2 size={16} color={Colors.primary} />
            <Text style={styles.stat}>
              {manager.property_count} propert{manager.property_count === 1 ? "y" : "ies"}
            </Text>
          </View>
          <Text style={styles.meta}>{manager.boosted_count} boosted</Text>
          <Text style={styles.meta}>{manager.overdue_tenants} tenants in arrears</Text>
          {manager.total_outstanding > 0 && (
            <Text style={styles.outstanding}>
              {formatMoney(manager.total_outstanding, "UGX")} outstanding
            </Text>
          )}
          <Text style={styles.footnote}>
            Outstanding is summed across this manager&apos;s tenancies. Properties may
            be listed in different currencies, so treat it as indicative.
          </Text>
        </Card>

        {status === "pending" || status === "suspended" ? (
          <Button
            label={status === "pending" ? "Approve manager" : "Reactivate manager"}
            variant="outline"
            leftIcon={<ShieldCheck size={16} color={Colors.success} />}
            onPress={() => changeStatus("active", status === "pending" ? "Approve" : "Reactivate")}
            fullWidth
          />
        ) : (
          <Button
            label="Suspend manager"
            variant="outline"
            tone="danger"
            leftIcon={<ShieldOff size={16} color={Colors.danger} />}
            onPress={() => changeStatus("suspended", "Suspend")}
            fullWidth
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { gap: Spacing.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { flex: 1, fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  meta: { fontSize: FontSize.caption, color: Colors.textMuted },
  statRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  stat: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  outstanding: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.danger },
  footnote: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: Spacing.xs },
});
