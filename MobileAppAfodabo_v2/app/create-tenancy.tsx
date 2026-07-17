import { useState, useMemo } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { PageHeader } from "@/src/components/PageHeader";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { useAuth } from "@/src/context/auth-context";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useCreateTenancy } from "@/src/hooks/useTenancies";
import { useResolveTenantByEmail } from "@/src/hooks/useTenants";

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

function pad2(n: string): string {
  return n.length === 1 ? "0" + n : n;
}

export default function CreateTenancyScreen() {
  const { subscription } = useAuth();
  const { data: propertiesData } = usePropertyList();
  const createTenancy = useCreateTenancy();
  const resolveTenant = useResolveTenantByEmail();

  const [showGate, setShowGate] = useState(false);
  const [tenantEmail, setTenantEmail] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [startDay, setStartDay] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endDay, setEndDay] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  const properties = propertiesData?.items || [];
  const isExpired = subscription?.status !== "active";

  const startDate = useMemo(() => {
    if (startDay && startMonth && startYear) {
      return `${startYear}-${startMonth}-${pad2(startDay)}`;
    }
    return "";
  }, [startDay, startMonth, startYear]);

  const endDate = useMemo(() => {
    if (endDay && endMonth && endYear) {
      return `${endYear}-${endMonth}-${pad2(endDay)}`;
    }
    return "";
  }, [endDay, endMonth, endYear]);

  const handleSubmit = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!tenantEmail.trim() || !propertyId || !rentAmount.trim()) {
      Alert.alert("Missing fields", "Please fill in tenant email, property, and rent amount.");
      return;
    }

    try {
      const tenant = await resolveTenant.mutateAsync(tenantEmail.trim());

      await createTenancy.mutateAsync({
        property_id: propertyId,
        tenant_id: tenant.id,
        monthly_rent: parseInt(rentAmount, 10) || 0,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        unit_label: unitLabel || undefined,
        security_deposit: parseInt(initialBalance, 10) || 0,
        status: "active",
      });

      Alert.alert("Success", "Tenancy created successfully!", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Could not create tenancy. Make sure the tenant email is registered.");
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Create Tenancy" onBack={() => router.back()} />

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
            <InputField label="Day" value={startDay} onChangeText={setStartDay} placeholder="DD" keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 2 }}>
            <SelectField label="Month" value={startMonth} options={MONTHS} onSelect={setStartMonth} placeholder="Month" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 1.2 }}>
            <InputField label="Year" value={startYear} onChangeText={setStartYear} placeholder="YYYY" keyboardType="number-pad" maxLength={4} />
          </View>
        </View>

        <View style={{ height: Spacing.md }} />
        <Text style={styles.dateSectionLabel}>End Date</Text>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <InputField label="Day" value={endDay} onChangeText={setEndDay} placeholder="DD" keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 2 }}>
            <SelectField label="Month" value={endMonth} options={MONTHS} onSelect={setEndMonth} placeholder="Month" />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={{ flex: 1.2 }}>
            <InputField label="Year" value={endYear} onChangeText={setEndYear} placeholder="YYYY" keyboardType="number-pad" maxLength={4} />
          </View>
        </View>

        <View style={{ height: Spacing.md }} />
        <InputField label="Initial Balance / Deposit (UGX)" value={initialBalance} onChangeText={setInitialBalance} placeholder="0" keyboardType="numeric" />

        <View style={{ height: Spacing.xl }} />
        <Button label="Create Tenancy" onPress={handleSubmit} fullWidth size="lg" />
      </View>

      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="creating tenancies"
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
