import { useState, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { DatePickerField } from "@/src/components/DatePickerField";
import { FormSteps } from "@/src/components/FormSteps";
import { PageHeader } from "@/src/components/PageHeader";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/auth-context";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useCreateTenancy } from "@/src/hooks/useTenancies";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { useResolveTenantByEmail, useResolveTenantByPhone } from "@/src/hooks/useTenants";
import { plusDaysLocalISO, todayLocalISO } from "@/src/lib/dates";
import { formatUGX } from "@/src/utils/format";

const STEPS = ["Tenant & Property", "Lease Terms"];

type FieldKey = "contact" | "property" | "rent" | "dates";
type FieldErrors = Partial<Record<FieldKey, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateTenancyScreen() {
  const { subscription } = useAuth();
  const { data: propertiesData } = usePropertyList();
  const createTenancy = useCreateTenancy();
  const resolveTenantByEmail = useResolveTenantByEmail();
  const resolveTenantByPhone = useResolveTenantByPhone();
  const toast = useToast();

  const [showGate, setShowGate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [contactMethod, setContactMethod] = useState("email");
  const [tenantContact, setTenantContact] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [startDate, setStartDate] = useState(todayLocalISO());
  const [endDate, setEndDate] = useState(plusDaysLocalISO(365));
  const [initialBalance, setInitialBalance] = useState("");

  const properties = propertiesData?.items || [];
  const isExpired = subscription?.status !== "active";

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId]
  );

  const handleSelectProperty = (id: string) => {
    setPropertyId(id);
    if (id) setErrors((prev) => ({ ...prev, property: undefined }));
    const prop = properties.find((p) => p.id === id);
    if (prop) {
      setRentAmount(prop.rent_amount ? String(prop.rent_amount) : "");
      setInitialBalance(prop.security_deposit ? String(prop.security_deposit) : "");
    }
  };

  const setFieldError = (key: FieldKey, message?: string) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const validateContact = () => {
    const v = tenantContact.trim();
    const msg = !v
      ? `Enter the tenant's ${contactMethod === "email" ? "email address" : "phone number"}.`
      : contactMethod === "email" && !EMAIL_RE.test(v)
        ? "That does not look like a valid email address."
        : undefined;
    setFieldError("contact", msg);
    return !msg;
  };

  const validateRent = () => {
    const n = Number(rentAmount);
    const msg = !rentAmount.trim()
      ? "Enter the monthly rent."
      : !(n > 0)
        ? "Rent must be a number greater than 0."
        : undefined;
    setFieldError("rent", msg);
    return !msg;
  };

  const validateDates = () => {
    const msg =
      startDate && endDate && endDate <= startDate
        ? "The end date must be after the start date."
        : undefined;
    setFieldError("dates", msg);
    return !msg;
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      const okContact = validateContact();
      const propertyMsg = propertyId ? undefined : "Select the property this tenancy belongs to.";
      setFieldError("property", propertyMsg);
      return okContact && !propertyMsg;
    }
    const okRent = validateRent();
    const okDates = validateDates();
    return okRent && okDates;
  };

  const goNext = () => {
    if (validateStep(0)) setStep(1);
  };

  const handleSubmit = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) return;

    try {
      setSubmitting(true);
      const resolve =
        contactMethod === "email" ? resolveTenantByEmail : resolveTenantByPhone;
      const tenant = await resolve.mutateAsync(tenantContact.trim());

      await createTenancy.mutateAsync({
        property_id: propertyId,
        tenant_id: tenant.id,
        monthly_rent: parseInt(rentAmount, 10) || 0,
        start_date: startDate,
        end_date: endDate,
        unit_label: unitLabel || undefined,
        security_deposit: parseInt(initialBalance, 10) || 0,
        status: "active",
      });

      toast.show("Tenancy created successfully.", "success");
      router.back();
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Could not create tenancy. Make sure the tenant is registered.";
      toast.show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Create Tenancy" onBack={() => router.back()} />
      <FormSteps steps={STEPS} current={step} />

      <View style={styles.content}>
        {step === 0 && (
          <>
            <Text style={styles.sectionLabel}>Tenant</Text>
            <SegmentedControl
              segments={[
                { label: "Email", value: "email" },
                // PHONE-AUTH HIDDEN: adding tenant by phone temporarily removed from UI. Kept for restore.
                // { label: "Phone", value: "phone" },
              ]}
              value={contactMethod}
              onChange={setContactMethod}
            />
            <View style={{ height: Spacing.md }} />
            <InputField
              label={contactMethod === "email" ? "Tenant Email" : "Tenant Phone"}
              value={tenantContact}
              onChangeText={(v) => {
                setTenantContact(v);
                if (errors.contact && v.trim()) setFieldError("contact");
              }}
              onBlur={validateContact}
              error={errors.contact}
              placeholder={contactMethod === "email" ? "tenant@example.com" : "+2567XXXXXXXX"}
              keyboardType={contactMethod === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              Enter the tenant's registered {contactMethod === "email" ? "email address" : "phone number"}.
            </Text>

            <View style={{ height: Spacing.lg }} />
            <Text style={styles.sectionLabel}>Property & Unit</Text>
            <SelectField
              label="Property"
              value={propertyId}
              options={properties.map((p) => ({ label: p.title, value: p.id }))}
              onSelect={handleSelectProperty}
              placeholder="Select property"
              error={errors.property}
            />

            <View style={{ height: Spacing.md }} />
            <InputField label="Unit Label" value={unitLabel} onChangeText={setUnitLabel} placeholder="e.g. A1, Shop 1" />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionLabel}>Lease Terms</Text>
            <InputField
              label="Rent Amount (UGX)"
              value={rentAmount}
              onChangeText={(v) => {
                setRentAmount(v);
                if (errors.rent && Number(v) > 0) setFieldError("rent");
              }}
              onBlur={validateRent}
              error={errors.rent}
              placeholder="0"
              keyboardType="numeric"
            />
            {selectedProperty && (
              <Text style={styles.hint}>
                Auto-filled from {selectedProperty.title} ({formatUGX(selectedProperty.rent_amount)}/month). You can adjust it.
              </Text>
            )}

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
            {selectedProperty && (
              <Text style={styles.hint}>
                Auto-filled with {selectedProperty.title}'s security deposit ({formatUGX(selectedProperty.security_deposit ?? 0)}). You can adjust it.
              </Text>
            )}
          </>
        )}

        <View style={{ height: Spacing.xl }} />
        <View style={styles.navRow}>
          {step > 0 && (
            <Button label="Back" onPress={() => setStep(0)} variant="outline" flex />
          )}
          {step === 0 ? (
            <Button label="Continue" onPress={goNext} fullWidth size="lg" />
          ) : (
            <Button
              label="Create Tenancy"
              onPress={handleSubmit}
              flex
              size="lg"
              loading={submitting}
            />
          )}
        </View>
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
  navRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
