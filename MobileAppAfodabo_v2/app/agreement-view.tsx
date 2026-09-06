import { useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, Clock, Download, MessageSquareWarning, XCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { AgreementRenderer } from "@/src/components/AgreementRenderer";
import { agreementsService } from "@/src/services/agreements";
import {
  useAgreementContent,
  useConsentState,
  useRejectAgreement,
} from "@/src/hooks/useAgreements";
import { useAuth } from "@/src/context/auth-context";
import type { AgreementStatus } from "@/src/types";

const STATUS_CONFIG: Record<AgreementStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
  draft: { label: "Draft", tone: "muted" },
  awaiting_tenant_consent: { label: "Awaiting Tenant Consent", tone: "warning" },
  awaiting_manager_consent: { label: "Awaiting Manager Consent", tone: "warning" },
  executed: { label: "Executed", tone: "success" },
  superseded: { label: "Superseded", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
  changes_requested: { label: "Changes Requested", tone: "danger" },
};

export default function AgreementViewScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();
  const { user } = useAuth();
  const rejectAgreement = useRejectAgreement();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const {
    data: content,
    isLoading: contentLoading,
    isError: contentError,
  } = useAgreementContent(leaseId);

  const {
    data: consentState,
    isLoading: consentLoading,
    isError: consentError,
  } = useConsentState(leaseId);

  const isLoading = contentLoading && consentLoading;
  const displayContent = content || consentState?.content || null;

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Agreement" onBack={() => router.back()} />
        <LoadingState message="Loading agreement…" />
      </Screen>
    );
  }

  if (!displayContent) {
    return (
      <Screen>
        <PageHeader title="Agreement" onBack={() => router.back()} />
        <ErrorState title="Could not load agreement" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const status: AgreementStatus =
    (consentState?.current_document?.status as AgreementStatus) || "draft";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const rejectionReason =
    (consentState?.current_document as { rejection_reason?: string } | undefined)?.rejection_reason ||
    (displayContent?.signatures?.tenant as { rejection_reason?: string } | undefined)?.rejection_reason ||
    null;

  const isTenant = user?.role === "tenant";
  const canReject = status !== "executed" && status !== "cancelled" && status !== "superseded";

  async function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("Add a comment", "Please describe what you would like changed.");
      return;
    }
    if (!leaseId) return;
    try {
      await rejectAgreement.mutateAsync({ leaseId, reason });
      setRejectOpen(false);
      setRejectReason("");
      Alert.alert(
        "Changes requested",
        "Your comment has been sent to the property manager. They will review and adjust the agreement.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Could not submit", "Please check your connection and try again.");
    }
  }

  const tenantConsent = consentState?.tenant;
  const managerConsent = consentState?.manager;
  const tenantSigned = !!tenantConsent?.signed_name;
  const managerSigned = !!managerConsent?.signed_name;

  return (
    <Screen scroll>
      <PageHeader
        title={`Agreement #${displayContent.agreement_number || "—"}`}
        subtitle={`Version ${displayContent.version}`}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <Card padding="md" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <Badge label={statusCfg.label} tone={statusCfg.tone} size="md" dot />
          </View>
        </Card>

        {rejectionReason ? (
          <Card padding="md" style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <MessageSquareWarning size={18} color={Colors.danger} />
              <Text style={styles.rejectionTitle}>Changes requested by tenant</Text>
            </View>
            <Text style={styles.rejectionBody}>{rejectionReason}</Text>
            <Text style={styles.rejectionHint}>
              Edit the agreement to address this. Both parties will need to sign again.
            </Text>
          </Card>
        ) : null}

        <Card padding="md">
          <Text style={styles.sectionTitle}>Signature Status</Text>

          <View style={styles.sigRow}>
            <View style={styles.sigIconWrap}>
              {tenantSigned ? (
                <CheckCircle size={20} color={Colors.success} />
              ) : (
                <Clock size={20} color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.sigInfo}>
              <Text style={styles.sigLabel}>Tenant</Text>
              {tenantSigned ? (
                <Text style={styles.sigName}>{tenantConsent!.signed_name}</Text>
              ) : (
                <Text style={styles.sigPending}>Not yet signed</Text>
              )}
            </View>
            {tenantSigned && tenantConsent?.signed_at && (
              <Text style={styles.sigDate}>
                {new Date(tenantConsent.signed_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.sigDivider} />

          <View style={styles.sigRow}>
            <View style={styles.sigIconWrap}>
              {managerSigned ? (
                <CheckCircle size={20} color={Colors.success} />
              ) : (
                <Clock size={20} color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.sigInfo}>
              <Text style={styles.sigLabel}>Manager</Text>
              {managerSigned ? (
                <Text style={styles.sigName}>{managerConsent!.signed_name}</Text>
              ) : (
                <Text style={styles.sigPending}>Not yet signed</Text>
              )}
            </View>
            {managerSigned && managerConsent?.signed_at && (
              <Text style={styles.sigDate}>
                {new Date(managerConsent.signed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Card>

        <Text style={styles.docTitle}>Agreement Document</Text>
        <AgreementRenderer content={displayContent} mode="view" />

        <View style={styles.buttonGroup}>
          <Button
            label="Download PDF"
            variant="solid"
            leftIcon={<Download size={16} color={Colors.textOnPrimary} />}
            onPress={async () => {
              if (!displayContent) return;
              const ok = await agreementsService.downloadPdf(displayContent);
              if (!ok) Alert.alert("Download failed", "Could not save the agreement PDF.");
              else Alert.alert("Saved", "Agreement has been saved to your device.");
            }}
            fullWidth
          />
          <Button
            label="View Version History"
            variant="outline"
            onPress={() => router.push(`/agreement-history?leaseId=${leaseId}`)}
            fullWidth
          />
          {isTenant && canReject ? (
            <Button
              label="Request Changes"
              variant="outline"
              tone="danger"
              leftIcon={<XCircle size={16} color={Colors.danger} />}
              onPress={() => setRejectOpen(true)}
              fullWidth
            />
          ) : null}
        </View>

      <Modal
        visible={rejectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request changes</Text>
            <Text style={styles.modalSubtitle}>
              Tell your property manager what you would like adjusted. They will see
              this comment and can revise the agreement.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. The notice period in clause 5 should be two months, not one."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
              editable={!rejectAgreement.isPending}
            />
            <Text style={styles.modalCounter}>{rejectReason.length}/2000</Text>
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setRejectOpen(false)}
                disabled={rejectAgreement.isPending}
                flex
              />
              {rejectAgreement.isPending ? (
                <View style={styles.modalSpinner}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : (
                <Button
                  label="Send to manager"
                  variant="danger"
                  onPress={handleReject}
                  disabled={!rejectReason.trim()}
                  flex
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sigIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sigInfo: {
    flex: 1,
  },
  sigLabel: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  sigPending: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    marginTop: 1,
  },
  sigDate: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  sigDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
    marginLeft: 44,
  },
  docTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rejectionCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    gap: Spacing.xs,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rejectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.danger,
  },
  rejectionBody: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  rejectionHint: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    minHeight: 120,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bg,
  },
  modalCounter: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "right",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalSpinner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGroup: {
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
});
