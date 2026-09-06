import { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  X,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { EmptyState } from "@/src/components/EmptyState";
import { SearchInput } from "@/src/components/SearchInput";
import { PageHeader } from "@/src/components/PageHeader";
import { useOwnerSubmissions, useApproveVerification, useRejectVerification } from "@/src/hooks/usePaymentVerifications";
import { useAuth } from "@/src/context/auth-context";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { formatMoney, formatDate, formatMethod } from "@/src/utils/format";
import type { PaymentVerification } from "@/src/types";

type FilterTab = "pending" | "approved" | "rejected";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function PaymentVerificationScreen() {
  const { subscription } = useAuth();
  const isExpired = subscription?.status !== "active";
  const [showGate, setShowGate] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("pending");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState<PaymentVerification | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [screenshotViewUrl, setScreenshotViewUrl] = useState<string | null>(null);

  const { data: submissions, isLoading } = useOwnerSubmissions(
    filterTab,
    search || undefined
  );
  const approveMutation = useApproveVerification();
  const rejectMutation = useRejectVerification();

  const handleApprove = useCallback(
    (item: PaymentVerification) => {
      if (isExpired) {
        setShowGate(true);
        return;
      }
      Alert.alert(
        "Approve Payment",
        `This will record an official rent payment of ${formatMoney(item.amount, item.currency)} and notify the tenant. It will count toward their rent coverage (paid until / days in arrears) and appear in reports, balances, and payment history.\n\nContinue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            style: "default",
            onPress: () =>
              approveMutation.mutate(item.id, {
                onSuccess: () => Alert.alert("Approved", "Payment has been verified and recorded."),
                onError: (err: unknown) => {
                  const msg =
                    err && typeof err === "object" && "message" in err
                      ? String((err as { message: string }).message)
                      : "Could not approve.";
                  Alert.alert("Error", msg);
                },
              }),
          },
        ]
      );
    },
    [approveMutation, isExpired]
  );

  const handleReject = useCallback(() => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for rejection.");
      return;
    }
    rejectMutation.mutate(
      { id: rejectModal.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          Alert.alert("Rejected", "Payment verification has been rejected.");
          setRejectModal(null);
          setRejectReason("");
        },
        onError: (err: unknown) => {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Could not reject.";
          Alert.alert("Error", msg);
        },
      }
    );
  }, [rejectModal, rejectReason, rejectMutation]);

  if (isLoading) {
    return <LoadingState message="Loading verification requests…" />;
  }

  return (
    <Screen scroll>
      <PageHeader
        title="Payment Verification"
        subtitle="Review tenant payment submissions"
        onBack={() => router.back()}
      />

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.value}
            onPress={() => setFilterTab(tab.value)}
            style={[
              styles.tab,
              filterTab === tab.value && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                filterTab === tab.value && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by tenant or property…"
        />
      </View>

      {/* Submissions list */}
      {!submissions || submissions.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={32} color={Colors.accent} />}
          title={
            filterTab === "pending"
              ? "No pending submissions"
              : filterTab === "approved"
              ? "No approved submissions"
              : "No rejected submissions"
          }
          description="Tenant payment submissions will appear here."
        />
      ) : (
        <View style={styles.list}>
          {submissions.map((item) => {
            const tenantName =
              item.tenants
                ? `${item.tenants.first_name ?? ""} ${item.tenants.last_name ?? ""}`.trim()
                : "Tenant";
            const propertyTitle = item.properties?.title ?? "Property";

            return (
              <Card key={item.id} padding="md" style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tenantName}>{tenantName}</Text>
                    <Text style={styles.propertyText}>{propertyTitle}</Text>
                  </View>
                  <Badge
                    label={
                      item.status === "pending"
                        ? "Pending Verification"
                        : item.status === "approved"
                        ? "Approved"
                        : "Rejected"
                    }
                    tone={
                      item.status === "approved"
                        ? "success"
                        : item.status === "rejected"
                        ? "danger"
                        : "warning"
                    }
                    size="sm"
                    dot={item.status === "pending"}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {formatMoney(item.amount, item.currency)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailValue}>
                    {formatMethod(item.payment_method)}
                  </Text>
                </View>
                {item.transaction_reference && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference</Text>
                    <Text style={styles.detailValue}>
                      {item.transaction_reference}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.payment_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>

                {item.notes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                )}

                {item.screenshot_url && (
                  <Pressable
                    style={styles.screenshotBtn}
                    onPress={() => setScreenshotViewUrl(item.screenshot_url!)}
                  >
                    <ImageIcon size={16} color={Colors.accent} />
                    <Text style={styles.screenshotBtnLabel}>
                      View Screenshot
                    </Text>
                  </Pressable>
                )}

                {item.status === "rejected" && item.rejection_reason && (
                  <View style={styles.rejectionBox}>
                    <XCircle size={16} color={Colors.danger} />
                    <Text style={styles.rejectionText}>
                      {item.rejection_reason}
                    </Text>
                  </View>
                )}

                {item.status === "approved" && item.reviewed_at && (
                  <Text style={styles.reviewedText}>
                    Reviewed {formatDate(item.reviewed_at)}
                  </Text>
                )}

                {/* Action buttons for pending */}
                {item.status === "pending" && (
                  <View style={styles.actions}>
                    <Button
                      label="Approve"
                      tone="success"
                      size="sm"
                      leftIcon={
                        <CheckCircle size={16} color={Colors.textOnPrimary} />
                      }
                      onPress={() => handleApprove(item)}
                      disabled={approveMutation.isPending}
                    />
                    <Button
                      label="Reject"
                      tone="danger"
                      size="sm"
                      leftIcon={
                        <XCircle size={16} color={Colors.textOnPrimary} />
                      }
                      onPress={() => {
                        if (isExpired) {
                          setShowGate(true);
                          return;
                        }
                        setRejectModal(item);
                      }}
                      disabled={rejectMutation.isPending}
                    />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Reject modal */}
      <Modal
        visible={!!rejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRejectModal(null)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <Text style={styles.modalSubtitle}>
              This will notify the tenant that their payment could not be
              verified. No payment record will be created.
            </Text>
            <Text style={styles.modalLabel}>Reason for rejection</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter the reason…"
              placeholderTextColor={Colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                tone="muted"
                onPress={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
              />
              <Button
                label="Confirm Rejection"
                tone="danger"
                onPress={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Screenshot image viewer modal */}
      <Modal
        visible={!!screenshotViewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setScreenshotViewUrl(null)}
      >
        <View style={styles.screenshotOverlay}>
          <TouchableOpacity
            style={styles.screenshotCloseBtn}
            onPress={() => setScreenshotViewUrl(null)}
          >
            <X size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>
          {screenshotViewUrl && (
            <Image
              source={{ uri: screenshotViewUrl }}
              style={styles.screenshotImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="verifying payments"
        onClose={() => setShowGate(false)}
        onRenew={() => {
          setShowGate(false);
          router.push("/subscription");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.textOnPrimary,
  },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  tenantName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  propertyText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  notesBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  notesLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
  },
  screenshotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    backgroundColor: Colors.surfaceAlt,
  },
  screenshotBtnLabel: {
    fontSize: FontSize.caption,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    backgroundColor: Colors.surfaceAlt,
  },
  rejectionText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.danger,
  },
  reviewedText: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    padding: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  screenshotOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  screenshotCloseBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  screenshotImage: {
    width: "100%",
    height: "100%",
  },
});
