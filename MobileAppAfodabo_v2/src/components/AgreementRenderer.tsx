import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import type { AgreementContent } from "@/src/types";

interface Props {
  content: AgreementContent;
  mode?: "preview" | "view" | "summary";
}

const SMALL_CAPS = { letterSpacing: 1.2, textTransform: "lowercase" as const };

export function AgreementRenderer({ content, mode = "view" }: Props) {
  const isCompact = mode === "summary";
  const { tenant, manager, property, tenancy, standard_clauses, custom_clauses, signatures } = content;

  const tenantSig = signatures?.tenant;
  const managerSig = signatures?.manager;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>TENANCY AGREEMENT</Text>
        {content.agreement_number && (
          <Text style={styles.agreementNumber}>No. {content.agreement_number}</Text>
        )}
        <Text style={styles.version}>Version {content.version}</Text>
        {content.generated_at && (
          <Text style={styles.date}>Generated: {new Date(content.generated_at).toLocaleDateString()}</Text>
        )}
      </View>

      {/* Section 1: Party & Property Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
          1. PARTIES AND PROPERTY
        </Text>

        <Text style={styles.subheading}>Tenant</Text>
        <Text style={styles.body}>{tenant.full_name}</Text>
        {tenant.email && !isCompact && <Text style={styles.body}>Email: {tenant.email}</Text>}
        {tenant.phone && !isCompact && <Text style={styles.body}>Phone: {tenant.phone}</Text>}

        <Text style={[styles.subheading, { marginTop: Spacing.sm }]}>Landlord / Manager</Text>
        <Text style={styles.body}>{manager.full_name}</Text>
        {manager.email && !isCompact && <Text style={styles.body}>Email: {manager.email}</Text>}
        {manager.phone && !isCompact && <Text style={styles.body}>Phone: {manager.phone}</Text>}

        <Text style={[styles.subheading, { marginTop: Spacing.sm }]}>Property</Text>
        <Text style={styles.body}>{property.title}</Text>
        {property.address && <Text style={styles.body}>{property.address}</Text>}
        {property.city && <Text style={styles.body}>{property.city}</Text>}
        {property.description && !isCompact && (
          <Text style={styles.body}>{property.description}</Text>
        )}

        {property.amenities.length > 0 && (
          <>
            <Text style={styles.subheading}>Amenities</Text>
            <Text style={styles.body}>{property.amenities.join(", ")}</Text>
          </>
        )}
      </View>

      {/* Section 2: Tenancy Terms */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
          2. TENANCY TERMS
        </Text>

        <View style={styles.termRow}>
          <Text style={styles.termLabel}>Monthly Rent:</Text>
          <Text style={styles.termValue}>UGX {parseInt(tenancy.monthly_rent).toLocaleString()}</Text>
        </View>
        <View style={styles.termRow}>
          <Text style={styles.termLabel}>Security Deposit:</Text>
          <Text style={styles.termValue}>UGX {parseInt(tenancy.security_deposit).toLocaleString()}</Text>
        </View>
        <View style={styles.termRow}>
          <Text style={styles.termLabel}>Payment Frequency:</Text>
          <Text style={styles.termValue}>{tenancy.payment_frequency}</Text>
        </View>
        <View style={styles.termRow}>
          <Text style={styles.termLabel}>Start Date:</Text>
          <Text style={styles.termValue}>{tenancy.start_date}</Text>
        </View>
        <View style={styles.termRow}>
          <Text style={styles.termLabel}>End Date:</Text>
          <Text style={styles.termValue}>{tenancy.end_date}</Text>
        </View>
      </View>

      {/* Section 3: Standard Clauses */}
      {standard_clauses.filter((c) => c.enabled).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
            3. STANDARD TERMS AND CONDITIONS
          </Text>
          {standard_clauses
            .filter((c) => c.enabled)
            .map((clause, i) => (
              <View key={clause.key || i} style={styles.clauseBlock}>
                <Text style={styles.clauseTitle}>
                  {i + 1}. {clause.title}
                </Text>
                <Text style={styles.body}>{clause.content}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Section 4: Custom Clauses */}
      {custom_clauses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
            4. ADDITIONAL TERMS
          </Text>
          {custom_clauses.map((clause, i) => (
            <View key={i} style={styles.clauseBlock}>
              <Text style={styles.clauseTitle}>{clause.title}</Text>
              <Text style={styles.body}>{clause.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Section 5: Signatures */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
          5. SIGNATURES
        </Text>
        <Text style={styles.body}>
          By signing below, the parties acknowledge that they have read and agree to the terms of this
          tenancy agreement.
        </Text>

        <View style={styles.signatureRow}>
          {/* Tenant Signature */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>TENANT</Text>
            <View style={styles.signatureLine}>
              {tenantSig?.signed_name ? (
                <Text style={[styles.signatureName, SMALL_CAPS]}>
                  {tenantSig.signed_name}
                </Text>
              ) : (
                <Text style={styles.signaturePending}>__________________________</Text>
              )}
            </View>
            {tenantSig?.signed_name && tenantSig?.signed_at && (
              <Text style={styles.signatureMeta}>
                Signed: {new Date(tenantSig.signed_at).toLocaleString()}
              </Text>
            )}
            {tenantSig?.signed_name && (
              <Text style={styles.signatureMeta}>
                Consent v{tenantSig.consent_version} | Agreement v{content.version}
              </Text>
            )}
            {!tenantSig?.signed_name && (
              <Text style={styles.signaturePending}>Awaiting signature</Text>
            )}
          </View>

          {/* Manager Signature */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>LANDLORD / MANAGER</Text>
            <View style={styles.signatureLine}>
              {managerSig?.signed_name ? (
                <Text style={[styles.signatureName, SMALL_CAPS]}>
                  {managerSig.signed_name}
                </Text>
              ) : (
                <Text style={styles.signaturePending}>__________________________</Text>
              )}
            </View>
            {managerSig?.signed_name && managerSig?.signed_at && (
              <Text style={styles.signatureMeta}>
                Signed: {new Date(managerSig.signed_at).toLocaleString()}
              </Text>
            )}
            {managerSig?.signed_name && (
              <Text style={styles.signatureMeta}>
                Consent v{managerSig.consent_version} | Agreement v{content.version}
              </Text>
            )}
            {!managerSig?.signed_name && (
              <Text style={styles.signaturePending}>Awaiting signature</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  header: { alignItems: "center", gap: 4, paddingBottom: Spacing.md, borderBottomWidth: 2, borderBottomColor: Colors.textPrimary },
  title: { fontSize: FontSize.h1, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: "center" },
  titleCompact: { fontSize: FontSize.h2 },
  agreementNumber: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  version: { fontSize: FontSize.caption, color: Colors.textMuted },
  date: { fontSize: FontSize.micro, color: Colors.textMuted },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.accent, marginBottom: Spacing.xs },
  sectionTitleCompact: { fontSize: FontSize.caption },
  subheading: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginTop: Spacing.xs },
  body: { fontSize: FontSize.caption, color: Colors.textPrimary, lineHeight: 18 },
  termRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  termLabel: { fontSize: FontSize.caption, color: Colors.textMuted },
  termValue: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  clauseBlock: { gap: 2, marginTop: Spacing.xs },
  clauseTitle: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  signatureRow: { flexDirection: "row", gap: Spacing.lg, marginTop: Spacing.lg },
  signatureBlock: { flex: 1, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.xs },
  signatureLabel: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  signatureLine: { paddingVertical: Spacing.sm },
  signatureName: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  signaturePending: { fontSize: FontSize.caption, color: Colors.textMuted, fontStyle: "italic" },
  signatureMeta: { fontSize: FontSize.micro, color: Colors.textMuted },
});
