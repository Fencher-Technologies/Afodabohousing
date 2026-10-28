/**
 * Super Admin — listings awaiting review.
 *
 * A listing stays hidden from house seekers until it is approved here. This is
 * the mobile counterpart of the web dashboard's Approvals tab: approve with one
 * tap, or reject with the reason the house manager will be sent.
 */

import { useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Building2, CheckCircle2, Eye, XCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import { InputField } from "@/src/components/InputField";
import { LoadingState } from "@/src/components/LoadingState";
import { usePendingProperties, useReviewProperty } from "@/src/hooks/useAdmin";
import type { PendingProperty } from "@/src/services/admin";
import { formatMoney } from "@/src/utils/format";

export default function SuperAdminListings() {
  const { data, isLoading, isError, refetch, isFetching } = usePendingProperties();
  const review = useReviewProperty();

  // Which listing is mid-rejection, and the reason typed so far.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(p: PendingProperty, decision: "approved" | "rejected", notes?: string) {
    setBusyId(p.id);
    try {
      await review.mutateAsync({ propertyId: p.id, decision, notes });
      setRejectingId(null);
      setReason("");
    } catch (e) {
      Alert.alert(
        "Failed",
        e instanceof Error && e.message ? e.message : `Could not ${decision === "approved" ? "approve" : "reject"} this listing.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  function confirmApprove(p: PendingProperty) {
    Alert.alert("Approve listing", `Make "${p.title || "this listing"}" visible to house seekers?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => decide(p, "approved") },
    ]);
  }

  function submitRejection(p: PendingProperty) {
    if (!reason.trim()) {
      Alert.alert("Reason needed", "Tell the house manager what to fix. They will receive this message.");
      return;
    }
    decide(p, "rejected", reason.trim());
  }

  if (isLoading) return <LoadingState message="Loading listings…" />;
  if (isError) return <ErrorState description="Could not load listings." onRetry={() => refetch()} />;

  const listings = data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Listings to review</Text>
        <Text style={styles.sub}>
          {listings.length} awaiting a decision. A listing is hidden from house seekers until approved.
        </Text>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <EmptyState
            icon={<CheckCircle2 size={40} color={Colors.textMuted} />}
            title="Nothing in the queue"
            description="Every listing has been reviewed."
          />
        }
        renderItem={({ item: p }) => {
          const rejecting = rejectingId === p.id;
          const busy = busyId === p.id;
          return (
            <Card padding="md" style={styles.card}>
              <View style={styles.row}>
                {p.images?.[0] ? (
                  <Image source={{ uri: p.images[0] }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Building2 size={24} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={1}>{p.title || "Untitled listing"}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[p.address, p.city].filter(Boolean).join(", ") || "No address given"}
                  </Text>
                  <Text style={styles.meta}>
                    {p.monthly_rent != null ? `${formatMoney(Number(p.monthly_rent), p.currency || "USD")}/month` : "No rent set"}
                    {p.bedrooms ? ` · ${p.bedrooms} bed` : ""}
                    {p.bathrooms != null ? ` · ${p.bathrooms} bath` : ""}
                  </Text>
                  <Text style={styles.by} numberOfLines={1}>
                    Listed by {p.manager_name || p.manager_email || "unknown manager"}
                  </Text>
                </View>
              </View>

              {p.description ? (
                <Text style={styles.description} numberOfLines={3}>{p.description}</Text>
              ) : null}

              {rejecting ? (
                <View style={styles.rejectBox}>
                  <InputField
                    label="Why is it being rejected?"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g. Photos are blurry; add a photo of the kitchen"
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.actions}>
                    <Button
                      label="Cancel"
                      variant="ghost"
                      onPress={() => { setRejectingId(null); setReason(""); }}
                      disabled={busy}
                      flex
                    />
                    <Button
                      label="Send rejection"
                      variant="danger"
                      onPress={() => submitRejection(p)}
                      loading={busy}
                      flex
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Button
                    label="View"
                    variant="ghost"
                    leftIcon={<Eye size={16} color={Colors.primary} />}
                    onPress={() => router.push(`/property-detail?id=${p.id}&role=manager`)}
                    disabled={busy}
                    flex
                  />
                  <Button
                    label="Reject"
                    variant="outline"
                    tone="danger"
                    leftIcon={<XCircle size={16} color={Colors.danger} />}
                    onPress={() => { setRejectingId(p.id); setReason(""); }}
                    disabled={busy}
                    flex
                  />
                  <Button
                    label="Approve"
                    leftIcon={<CheckCircle2 size={16} color={Colors.textOnPrimary} />}
                    onPress={() => confirmApprove(p)}
                    loading={busy}
                    flex
                  />
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: Spacing.lg, gap: Spacing.xs },
  heading: { fontSize: FontSize.title, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sub: { fontSize: FontSize.caption, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  card: { gap: Spacing.sm },
  row: { flexDirection: "row", gap: Spacing.md },
  thumb: { width: 88, height: 88, borderRadius: Radii.card, backgroundColor: Colors.border },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  meta: { fontSize: FontSize.caption, color: Colors.textSecondary },
  by: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
  description: { fontSize: FontSize.caption, color: Colors.textSecondary },
  rejectBox: { gap: Spacing.sm },
  actions: { flexDirection: "row", gap: Spacing.sm },
});
