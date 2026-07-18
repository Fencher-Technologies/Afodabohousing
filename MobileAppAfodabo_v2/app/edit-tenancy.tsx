import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, FileText } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import { useTenancy, useUpdateTenancy } from "@/src/hooks/useTenancies";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useResolveTenantByEmail } from "@/src/hooks/useTenants";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Terminated", value: "terminated" },
];

function pad2(n: string): string {
  return n.length === 1 ? "0" + n : n;
}

function splitDate(iso?: string): { day: string; month: string; year: string } {
  if (!iso) return { day: "", month: "", year: "" };
  const [year, month, day] = iso.split("-");
  return { day: day || "", month: month || "", year: year || "" };
}

export default function EditTenancyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: lease, isLoading } = useTenancy(id || "");
  const { data: propertiesData } = usePropertyList();
  const updateTenancy = useUpdateTenancy();
  const resolveTenant = useResolveTenantByEmail();

  const initial = useMemo(() => {
    if (!lease) return null;
    const start = splitDate(lease.start_date);
    const end = splitDate(lease.end_date);
    return {
      tenantEmail: lease.tenant_email ?? "",
      propertyId: lease.property_id,
      unitLabel: lease.unit_label ?? "",
      rentAmount: String(lease.monthly_rent ?? ""),
      startDay: start.day,
      startMonth: start.month,
      startYear: start.year,
      endDay: end.day,
      endMonth: end.month,
      endYear: end.year,
      initialBalance: String(lease.security_deposit ?? ""),
      status: lease.status,
    };
  }, [lease]);

  const [tenantEmail, setTenantEmail] = useState(initial?.tenantEmail ?? "");
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? "");
  const [unitLabel, setUnitLabel] = useState(initial?.unitLabel ?? "");
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount ?? "");
  const [startDay, setStartDay] = useState(initial?.startDay ?? "");
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? "");
  const [startYear, setStartYear] = useState(initial?.startYear ?? "");
  const [endDay, setEndDay] = useState(initial?.endDay ?? "");
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? "");
  const [endYear, setEndYear] = useState(initial?.endYear ?? "");
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");

  const properties = propertiesData?.items || [];

  const startDate = useMemo(() => {
    if (startDay && startMonth && startYear) return `${startYear}-${startMonth}-${pad2(startDay)}`;
    return "";
  }, [startDay, startMonth, startYear]);

  const endDate = useMemo(() => {
    if (endDay && endMonth && endYear) return `${endYear}-${endMonth}-${pad2(endDay)}`;
    return "";
  }, [endDay, endMonth, endYear]);

  const isDirty = !!initial && (
    tenantEmail !== (initial.tenantEmail ?? "") ||
    propertyId !== initial.propertyId ||
    unitLabel !== (initial.unitLabel ?? "") ||
    rentAmount !== initial.rentAmount ||
    startDay !== initial.startDay ||
    startMonth !== initial.startMonth ||
    startYear !== initial.startYear ||
    endDay !== initial.endDay ||
    endMonth !== initial.endMonth ||
    endYear !== initial.endYear ||
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

  const handleSubmit = async () => {
    if (!tenantEmail.trim() || !propertyId || !rentAmount.trim()) {
      Alert.alert("Missing fields", "Please fill in tenant email, property, and rent amount.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Missing dates", "Please provide both a start and end date.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      Alert.alert("Invalid dates", "The end date must be after the start date.");
      return;
    }

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
      Alert.alert("Success", "Tenancy updated successfully!", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not update tenancy. Please try again.");
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
          onChangeText={setTenantEmail}
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
          onSelect={setPropertyId}
          placeholder="Select property"
        />
        <View style={{ height: Spacing.md }} />
        <InputField label="Unit Label" value={unitLabel} onChangeText={setUnitLabel} placeholder="e.g. A1, Shop 1" />

        <View style={{ height: Spacing.lg }} />
        <Text style={styles.sectionLabel}>Lease Terms</Text>
        <InputField label="Rent Amount (UGX)" value={rentAmount} onChangeText={setRentAmount} placeholder="0" keyboardType="numeric" />

        <View style={{ height: Spacing.md }} />
        <Text style={styles.dateSectionLabel}>Start Date</Text>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <InputField label="Day" value={startDay} onChangeText={setStartDay} placeholder="DD" keyboardType="numeric" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 2 }}>
            <SelectField label="Month" value={startMonth} options={MONTHS} onSelect={setStartMonth} placeholder="Month" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 1.2 }}>
            <InputField label="Year" value={startYear} onChangeText={setStartYear} placeholder="YYYY" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ height: Spacing.md }} />
        <Text style={styles.dateSectionLabel}>End Date</Text>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <InputField label="Day" value={endDay} onChangeText={setEndDay} placeholder="DD" keyboardType="numeric" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 2 }}>
            <SelectField label="Month" value={endMonth} options={MONTHS} onSelect={setEndMonth} placeholder="Month" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 1.2 }}>
            <InputField label="Year" value={endYear} onChangeText={setEndYear} placeholder="YYYY" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ height: Spacing.md }} />
        <InputField label="Initial Balance / Deposit (UGX)" value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />

        <View style={{ height: Spacing.md }} />
        <SelectField label="Status" value={status} options={STATUS_OPTIONS} onSelect={setStatus} placeholder="Status" />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSubmit} fullWidth size="lg" loading={updateTenancy.isPending} disabled={updateTenancy.isPending} />
        <View style={{ height: Spacing.md }} />
        <Button label="Cancel" onPress={handleBack} variant="outline" fullWidth />
      </View>

      <View style={{ height: 100 }} />
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
  dateSectionLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
});
