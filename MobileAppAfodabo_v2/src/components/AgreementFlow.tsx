import { useState } from "react";
import { Alert, StyleSheet, Text, View, Pressable, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import {
  FileSignature,
  CheckCircle,
  Eye,
  Square,
  CheckSquare,
  FileText,
  Plus,
  XCircle,
  History,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { Badge } from "@/src/components/Badge";
import {
  useConsentAgreement,
  useConsentState,
  useCancelAgreement,
} from "@/src/hooks/useAgreements";
import { useAuth } from "@/src/context/auth-context";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";

type Role = "tenant" | "manager";

interface AgreementFlowProps {
  leaseId: string;
  role: Role;
  readOnly?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; tone: "info" | "warning" | "success" | "muted" | "danger" }> = {
  draft: { label: "Draft", tone: "muted" },
  awaiting_tenant_consent: { label: "Awaiting Tenant Consent", tone: "warning" },
  awaiting_manager_consent: { label: "Awaiting Manager Consent", tone: "warning" },
  executed: { label: "Executed", tone: "success" },
  superseded: { label: "Superseded", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const SMALL_CAPS = { letterSpacing: 1.2, textTransform: "lowercase" as const };

export function AgreementFlow({
  leaseId,
  role,
  readOnly = false,
}: AgreementFlowProps) {
  const router = useRouter();
  const { user, subscription } = useAuth();

  const consentState = useConsentState(leaseId);
  const consentAgreement = useConsentAgreement();
  const cancelAgreement = useCancelAgreement();

  const isExpired = role === "manager" && subscription?.status !== "active";
  const [agreed, setAgreed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const consentDoc = consentState.data?.current_document ?? null;
  const consentContent = consentState.data?.content ?? null;
  const hasContent = !!consentContent;
  const hasDoc = !!consentDoc;

  const myConsentState = role === "manager"
    ? consentState.data?.manager ?? null
    : consentState.data?.tenant ?? null;
  const otherConsentState = role === "manager"
    ? consentState.data?.tenant ?? null
    : consentState.data?.manager ?? null;

  const hasConsented = myConsentState?.consent_status === "approved";
  const otherHasConsented = otherConsentState?.consent_status === "approved";

  const handleGeneratedConsent = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!agreed) {
      Alert.alert("Review Required", "Please read and agree to the terms before signing.");
      return;
    }
    setShowConfirmDialog(true);
  };

  // auth-context normalises full_name to "" (never null), so a `?? "Tenant"`
  // fallback never fires and an empty string would be posted, which the
  // backend rejects (signed_name has min_length=1).
  const signatureName = (user?.full_name ?? "").trim();

  const confirmSign = async () => {
    setShowConfirmDialog(false);
    if (!signatureName) {
      Alert.alert(
        "Add your name first",
        "A signature must carry your name, and your account does not have one set. Add it in your profile, then sign.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Edit Profile", onPress: () => router.push("/edit-profile") },
        ],
      );
      return;
    }
    try {
      await consentAgreement.mutateAsync({
        leaseId,
        signedName: signatureName,
      });
      Alert.alert("Signed", "Your signature has been recorded.");
    } catch (e) {
      Alert.alert(
        "Could not sign",
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Could not record your signature.",
      );
    }
  };

  const handleCancel = () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    Alert.alert(
      "Cancel Agreement",
      "This will cancel the current agreement and reset all consent statuses. This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () =>
            cancelAgreement.mutate(leaseId, {
              onError: () =>
                Alert.alert("Error", "Could not cancel the agreement. Please try again."),
            }),
        },
      ],
    );
  };

  const handleCancelAndCreateNew = () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    Alert.alert(
      "Cancel Agreement",
      "This will cancel the current agreement and reset all consent statuses. This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () =>
            cancelAgreement.mutate(leaseId, {
              onSuccess: () => router.push(`/create-agreement?leaseId=${leaseId}`),
              onError: () =>
                Alert.alert("Error", "Could not cancel the agreement. Please try again."),
            }),
        },
      ],
    );
  };

  const isLoading = consentState.isLoading;

  // A failed fetch must never masquerade as "no agreement": tenants were
  // shown "The manager has not yet created an agreement" when the request
  // simply errored. Offer an explicit retry instead.
  if (consentState.isError) {
    return (
      <Card padding="md">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <FileText size={18} color={Colors.info} />
            </View>
            <Text style={styles.title}>Tenancy Agreement</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <XCircle size={28} color={Colors.danger} />
          <Text style={styles.emptyTitle}>Could not load the agreement</Text>
          <Text style={styles.emptyBody}>
            Check your connection and try again.
          </Text>
          <Button
            label="Retry"
            variant="outline"
            size="sm"
            onPress={() => consentState.refetch()}
            loading={consentState.isRefetching}
          />
        </View>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card padding="md">
        <View style={styles.loadingRow}>
          <ActivityIndicator size={16} color={Colors.primary} />
          <Text style={styles.loadingText}>Loading agreement…</Text>
        </View>
      </Card>
    );
  }

  // ── No agreement yet ──────────────────────────────────────────────
  if (!hasDoc || !hasContent) {
    return (
      <>
        <Card padding="md">
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <FileText size={18} color={Colors.info} />
              </View>
              <Text style={styles.title}>Tenancy Agreement</Text>
            </View>
          </View>
          <View style={styles.emptyState}>
            <FileText size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {hasDoc && !hasContent ? "Incomplete Agreement" : "No Agreement Yet"}
            </Text>
            <Text style={styles.emptyBody}>
              {hasDoc && !hasContent
                ? "This agreement was created but the content is missing. Please cancel it and create a new one."
                : role === "manager"
                  ? "Create a digital agreement for this tenancy using the in-app builder."
                  : "The manager has not yet created an agreement for this tenancy."}
            </Text>
            {role === "manager" && !readOnly && (
              <Button
                label={hasDoc && !hasContent ? "Cancel & Create New" : "Create Agreement"}
                onPress={() => {
                  if (hasDoc && !hasContent) {
                    handleCancelAndCreateNew();
                  } else {
                    router.push(`/create-agreement?leaseId=${leaseId}`);
                  }
                }}
                leftIcon={<Plus size={16} color={Colors.textOnPrimary} />}
                loading={cancelAgreement.isPending}
              />
            )}
          </View>
        </Card>
        <SubscriptionGate
          visible={showGate}
          actionLabel="managing agreements"
          onClose={() => setShowGate(false)}
          onRenew={() => {
            setShowGate(false);
            router.push("/subscription");
          }}
        />
      </>
    );
  }

  // ── Agreement exists with content ────────────────────────────────
  const statusInfo = consentDoc?.status
    ? STATUS_LABEL[consentDoc.status] ?? { label: consentDoc.status, tone: "info" as const }
    : null;

  const content = consentContent;
  const agreementNumber = consentDoc?.agreement_number ?? content?.agreement_number ?? null;
  const genVersion = consentDoc?.version ?? content?.version ?? 1;

  return (
    <>
      <Card padding="md">
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <FileSignature size={18} color={Colors.info} />
          </View>
          <Text style={styles.title}>Tenancy Agreement</Text>
        </View>
        {statusInfo && (
          <Badge
            label={statusInfo.label}
            tone={statusInfo.tone}
            size="sm"
            dot={statusInfo.tone !== "success"}
          />
        )}
      </View>

      {/* Agreement number + version */}
      {(agreementNumber || genVersion) && (
        <View style={styles.metaRow}>
          {agreementNumber && (
            <Text style={styles.metaText}>No. {agreementNumber}</Text>
          )}
          <Text style={styles.metaText}>Version {genVersion}</Text>
        </View>
      )}

      {/* View Agreement */}
      <Button
        label="View Full Agreement"
        onPress={() => router.push(`/agreement-view?leaseId=${leaseId}`)}
        variant="outline"
        size="sm"
        leftIcon={<Eye size={16} color={Colors.primary} />}
      />

      {/* Consent section */}
      <View style={styles.consentSection}>
        <View style={styles.consentBlock}>
          <Text style={styles.consentRoleLabel}>
            {role === "manager" ? "Your Consent (Manager)" : "Your Consent (Tenant)"}
          </Text>
          {hasConsented ? (
            <View style={styles.signedInfo}>
              <CheckCircle size={16} color={Colors.success} />
              <View style={styles.signedDetails}>
                <Text style={[styles.signedName, SMALL_CAPS]}>
                  {myConsentState?.signed_name}
                </Text>
                {myConsentState?.signed_at && (
                  <Text style={styles.signedMeta}>
                    Signed {new Date(myConsentState.signed_at).toLocaleString()}
                  </Text>
                )}
                <Text style={styles.signedMeta}>
                  Consent v{myConsentState?.consent_version ?? "—"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.consentActions}>
              {readOnly ? (
                <Text style={styles.consentPending}>Not signed — consent is disabled for ended tenancies</Text>
              ) : (
                <>
                  <Text style={styles.consentPending}>Not yet signed</Text>
                  <Pressable
                    onPress={() => setAgreed((v) => !v)}
                    style={styles.checkboxRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: agreed }}
                  >
                    {agreed ? (
                      <CheckSquare size={18} color={Colors.primary} />
                    ) : (
                      <Square size={18} color={Colors.textMuted} />
                    )}
                    <Text style={styles.checkboxLabel}>
                      I have read and agree to the terms of this tenancy agreement
                    </Text>
                  </Pressable>
                  <Button
                    label="Agree & Sign"
                    onPress={handleGeneratedConsent}
                    size="sm"
                    disabled={!agreed || consentAgreement.isPending}
                    loading={consentAgreement.isPending}
                    leftIcon={<FileSignature size={16} color={Colors.textOnPrimary} />}
                  />
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.consentBlock}>
          <Text style={styles.consentRoleLabel}>
            {role === "manager" ? "Tenant" : "Manager"}
          </Text>
          {otherHasConsented ? (
            <View style={styles.signedInfo}>
              <CheckCircle size={16} color={Colors.success} />
              <View style={styles.signedDetails}>
                <Text style={[styles.signedName, SMALL_CAPS]}>
                  {otherConsentState?.signed_name}
                </Text>
                {otherConsentState?.signed_at && (
                  <Text style={styles.signedMeta}>
                    Signed {new Date(otherConsentState.signed_at).toLocaleString()}
                  </Text>
                )}
                <Text style={styles.signedMeta}>
                  Consent v{otherConsentState?.consent_version ?? "—"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.consentPending}>Awaiting signature</Text>
          )}
        </View>
      </View>

      {/* History + Edit + Cancel */}
      <View style={styles.agreementActions}>
        <Button
          label="History"
          variant="outline"
          size="sm"
          onPress={() => router.push(`/agreement-history?leaseId=${leaseId}`)}
          leftIcon={<History size={16} color={Colors.primary} />}
        />
        {role === "manager" && !readOnly && (
          <Button
            label="Edit"
            variant="outline"
            size="sm"
            onPress={() => router.push(`/create-agreement?leaseId=${leaseId}&mode=edit`)}
            leftIcon={<FileText size={16} color={Colors.primary} />}
          />
        )}
        {role === "manager" && !readOnly && (
          <Button
            label="Cancel"
            onPress={handleCancel}
            variant="outline"
            tone="danger"
            size="sm"
            loading={cancelAgreement.isPending}
            leftIcon={<XCircle size={16} color={Colors.danger} />}
          />
        )}
      </View>

      {/* Confirmation dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <FileSignature size={28} color={Colors.primary} />
            <Text style={styles.dialogTitle}>Confirm Signature</Text>
            <Text style={styles.dialogBody}>
              Your name will be recorded as:
            </Text>
            <Text style={[styles.dialogName, SMALL_CAPS]}>
              {signatureName || "No name on your account"}
            </Text>
            <Text style={styles.dialogHint}>
              This constitutes your electronic signature and is legally binding.
            </Text>
            <View style={styles.dialogActions}>
              <Button
                label="Cancel"
                onPress={() => setShowConfirmDialog(false)}
                variant="outline"
                size="sm"
                flex
              />
              <Button
                label="Confirm"
                onPress={confirmSign}
                size="sm"
                flex
                loading={consentAgreement.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
      </Card>

      <SubscriptionGate
        visible={showGate}
        actionLabel="managing agreements"
        onClose={() => setShowGate(false)}
        onRenew={() => {
          setShowGate(false);
          router.push("/subscription");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  loadingText: { fontSize: FontSize.caption, color: Colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  emptyState: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyBody: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
  },
  consentSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  consentBlock: {
    gap: Spacing.sm,
  },
  consentRoleLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  consentPending: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  consentActions: {
    gap: Spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  signedInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  signedDetails: {
    gap: 2,
    flex: 1,
  },
  signedName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  signedMeta: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  agreementActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // ── Dialog ───────────────────────────────────────────────────────
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.modal,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: Spacing.md,
  },
  dialogTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  dialogBody: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  dialogName: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  dialogHint: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  dialogActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
