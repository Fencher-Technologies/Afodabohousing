import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { DatePickerField } from "@/src/components/DatePickerField";
import { PageHeader } from "@/src/components/PageHeader";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/auth-context";
import { useTenancy, useUpdateTenancy } from "@/src/hooks/useTenancies";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useResolveTenantByEmail } from "@/src/hooks/useTenants";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Terminated", value: "terminated" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = "email" | "property" | "rent" | "dates";
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function EditTenancyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscription } = useAuth();
  const { data: lease, isLoading } = useTenancy(id || "");
  const { data: propertiesData } = usePropertyList();
  const updateTenancy = useUpdateTenancy();
  const resolveTenant = useResolveTenantByEmail();
  const toast = useToast();

  const [showGate, setShowGate] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const initial = useMemo(() => {
    if (!lease) return null;
    return {
      tenantEmail: lease.tenant_email ?? "",
      propertyId: lease.property_id,
      unitLabel: lease.unit_label ?? "",
      rentAmount: String(lease.monthly_rent ?? ""),
      startDate: lease.start_date ?? "",
      endDate: lease.end_date ?? "",
      initialBalance: String(lease.security_deposit ?? ""),
      status: lease.status,
    };
  }, [lease]);

  const [tenantEmail, setTenantEmail] = useState(initial?.tenantEmail ?? "");
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? "");
  const [unitLabel, setUnitLabel] = useState(initial?.unitLabel ?? "");
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");

  const properties = propertiesData?.items || [];

  const isDirty = !!initial && (
    tenantEmail !== (initial.tenantEmail ?? "") ||
    propertyId !== initial.propertyId ||
    unitLabel !== (initial.unitLabel ?? "") ||
    rentAmount !== initial.rentAmount ||
    startDate !== initial.startDate ||
    endDate !== initial.endDate ||
    initialBalance !== initial.initialBalance ||
    status !== initial.status
  );

  if (isLoading) return <LoadingState message="Loading tenancy…" />;
  if (!lease || !initial) {
    return (
      <Screen scroll>
        <PageHeader title="Edit Tenancy" onBack={() => router.back()} />
        <ErrorState title="Tenancy not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const setFieldError = (key: FieldKey, message?: string) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const validateAll = (): boolean => {
    const emailMsg = !tenantEmail.trim()
      ? "Enter the tenant's email address."
      : !EMAIL_RE.test(tenantEmail.trim())
        ? "That does not look like a valid email address."
        : undefined;
    const propertyMsg = propertyId ? undefined : "Select the property this tenancy belongs to.";
    const n = Number(rentAmount);
    const rentMsg = !rentAmount.trim()
      ? "Enter the monthly rent."
      : !(n > 0)
        ? "Rent must be a number greater than 0."
        : undefined;
    const datesMsg = !startDate || !endDate
      ? "Both a start and an end date are required."
      : endDate <= startDate
        ? "The end date must be after the start date."
        : undefined;
    setErrors({ email: emailMsg, property: propertyMsg, rent: rentMsg, dates: datesMsg });
    return !emailMsg && !propertyMsg && !rentMsg && !datesMsg;
  };

  const handleSubmit = async () => {
    if (subscription?.status !== "active") {
      setShowGate(true);
      return;
    }
    if (!validateAll()) return;

    try {
      await resolveTenant.mutateAsync(tenantEmail.trim());
      await updateTenancy.mutateAsync({
        id: id!,
        data: {
          monthly_rent: parseInt(rentAmount, 10) || 0,
          start_date: startDate,
          end_date: endDate,
          security_deposit: parseInt(initialBalance, 10) || 0,
          status,
        },
      });
      toast.show("Tenancy updated successfully.", "success");
      router.back();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not update tenancy. Please try again.", "error");
    }
  };

  const handleBack = () => {
    if (isDirty) {
      Alert.alert("Discard changes?", "You have unsaved changes that will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll>
      <PageHeader title="Edit Tenancy" onBack={handleBack} />

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Tenant</Text>
        <InputField
          label="Tenant Email"
          value={tenantEmail}
          onChangeText={(v) => {
            setTenantEmail(v);
            if (errors.email && v.trim()) setFieldError("email");
          }}
          error={errors.email}
          placeholder="tenant@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>Enter the tenant's registered email address.</Text>

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Property & Unit</Text>
        <SelectField
          label="Property"
          value={propertyId}
          options={properties.map((p) => ({ label: p.title, value: p.id }))}
          onSelect={(v) => {
            setPropertyId(v);
            if (v) setFieldError("property");
          }}
          placeholder="Select property"
          error={errors.property}
        />
        <View style={{ height: Spacing.md }} />
        <InputField label="Unit Label" value={unitLabel} onChangeText={setUnitLabel} placeholder="e.g. A1, Shop 1" />

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Lease Terms</Text>
        <InputField
          label="Rent Amount (UGX)"
          value={rentAmount}
          onChangeText={(v) => {
            setRentAmount(v);
            if (errors.rent && Number(v) > 0) setFieldError("rent");
          }}
          error={errors.rent}
          placeholder="0"
          keyboardType="numeric"
        />

        <View style={{ height: Spacing.md }} />
        <DatePickerField
          label="Start Date"
          value={startDate}
          onChange={(v) => {
            setStartDate(v);
            if (errors.dates) setFieldError("dates");
          }}
        />
        <View style={{ height: Spacing.md }} />
        <DatePickerField
          label="End Date"
          value={endDate}
          onChange={(v) => {
            setEndDate(v);
            if (errors.dates) setFieldError("dates");
          }}
          error={errors.dates}
        />

        <View style={{ height: Spacing.md }} />
        <InputField label="Initial Balance / Deposit (UGX)" value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />

        <View style={{ height: Spacing.md }} />
        <SelectField label="Status" value={status} options={STATUS_OPTIONS} onSelect={setStatus} placeholder="Status" />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSubmit} fullWidth size="lg" loading={updateTenancy.isPending} disabled={updateTenancy.isPending} />
        <View style={{ height: Spacing.md }} />
        <Button label="Cancel" onPress={handleBack} variant="outline" fullWidth accessibilityHint="Discards unsaved changes and goes back" />
      </View>

      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="updating tenancies"
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
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
});
