/**
 * Manager Reports — single, backend-connected Reports module.
 * All figures reuse the canonical tenancy enrichment/balance logic via the
 * /reports endpoints. No mock data.
 *
 * UX:
 *  - Report tabs are horizontal scrollable pills (WhatsApp-style) with an
 *    orange (accent) active state so labels never get clipped.
 *  - Status & Property filters use dropdowns (SelectField) instead of tap-to-cycle.
 *  - CSV export opens an action sheet with two explicit choices: Share and Download.
 *  - Outstanding never falsely reports "All caught up": the empty state only
 *    appears when the server genuinely returns total === 0, and the outstanding
 *    total is always surfaced as a KPI.
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Share, Modal } from "react-native";
import { Paths, File, Directory } from "expo-file-system";
import { router } from "expo-router";
import {
  FileText,
  Users,
  AlertTriangle,
  Receipt,
  PieChart,
  Download,
  Share2,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing, Shadows } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { SelectField } from "@/src/components/SelectField";
import { LoadingState } from "@/src/components/LoadingState";
import { EmptyState } from "@/src/components/EmptyState";
import { ErrorState } from "@/src/components/ErrorState";
import {
  useFinancialSummary,
  useOutstandingReport,
  usePaymentHistory,
  useRentCollection,
  useTenantsReport,
  useTenantStatement,
} from "@/src/hooks/useReports";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useRefresh } from "@/src/hooks/useRefresh";
import { formatUGX, formatUGXShort, formatDate, formatMethod } from "@/src/utils/format";
import type { ReportType, TenancyStatus } from "@/src/types";

type ReportKey =
  | "tenants"
  | "outstanding"
  | "rent_collection"
  | "summary"
  | "payment_history";

const REPORT_TABS: { label: string; value: ReportKey; icon: ReactNode }[] = [
  { label: "Tenants", value: "tenants", icon: <Users size={16} color={Colors.textPrimary} /> },
  { label: "Outstanding", value: "outstanding", icon: <AlertTriangle size={16} color={Colors.textPrimary} /> },
  { label: "Collection", value: "rent_collection", icon: <PieChart size={16} color={Colors.textPrimary} /> },
  { label: "Summary", value: "summary", icon: <PieChart size={16} color={Colors.textPrimary} /> },
  { label: "Payments", value: "payment_history", icon: <Receipt size={16} color={Colors.textPrimary} /> },
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Terminated", value: "terminated" },
];

const PAGE = 25;

export default function ReportsScreen() {
  const [tab, setTab] = useState<ReportKey>("outstanding");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [statementTenantId, setStatementTenantId] = useState<string | null>(null);
  const [exportSheet, setExportSheet] = useState(false);
  const [statementExport, setStatementExport] = useState(false);
  const [statementExportData, setStatementExportData] = useState<import("@/src/types").TenantStatement | null>(null);

  const { data: propertiesData } = usePropertyList();
  const properties = propertiesData?.items ?? [];

  const propertyOptions = useMemo(
    () => [
      { label: "All properties", value: "" },
      ...properties.map((p) => ({ label: p.title ?? "Property", value: p.id })),
    ],
    [properties]
  );

  const query = useMemo(
    () => ({
      status: statusFilter || undefined,
      property_id: propertyId || undefined,
      limit: PAGE,
    }),
    [statusFilter, propertyId]
  );

  const tenants = useTenantsReport(query);
  const outstanding = useOutstandingReport(query);
  const rent = useRentCollection(query);
  const summary = useFinancialSummary();
  const history = usePaymentHistory();
  const statement = useTenantStatement(statementTenantId);

  const active = {
    tenants,
    outstanding,
    rent_collection: rent,
    summary,
    payment_history: history,
  }[tab];

  const refetchAll = () => {
    tenants.refetch();
    outstanding.refetch();
    rent.refetch();
    summary.refetch();
    history.refetch();
  };

  const { refreshing, onRefresh } = useRefresh({
    refetches: [tenants.refetch, outstanding.refetch, rent.refetch, summary.refetch, history.refetch, statement.refetch],
  });

  const buildCsv = (): { rows: (string | number | null)[][]; filename: string } | null => {
    let rows: (string | number | null)[][] = [];
    let filename = "report";
    if (tab === "tenants" && tenants.data) {
      filename = "all-tenants";
      rows = [
        ["Tenant", "Phone", "Email", "Property", "Unit", "Start", "End", "Status", "Expected", "Paid", "Balance", "Credit"],
        ...tenants.data.items.map((t) => [
          t.tenant_name, t.tenant_phone, t.tenant_email, t.property_title, t.unit_label,
          t.start_date, t.end_date, t.status, t.expected_rent, t.total_paid, t.balance_due, t.tenant_credit,
        ]),
      ];
    } else if (tab === "outstanding" && outstanding.data) {
      filename = "outstanding";
      rows = [
        ["Tenant", "Phone", "Property", "Unit", "Status", "Expected", "Paid", "Balance", "Last Paid", "Method"],
        ...outstanding.data.items.map((t) => [
          t.tenant_name, t.tenant_phone, t.property_title, t.unit_label, t.status,
          t.expected_rent, t.total_paid, t.balance_due, t.last_payment_date, t.last_payment_method,
        ]),
      ];
    } else if (tab === "rent_collection" && rent.data) {
      filename = "rent-collection";
      rows = [
        ["Metric", "Value"],
        ["Total Expected", rent.data.total_expected],
        ["Total Collected", rent.data.total_collected],
        ["Total Outstanding", rent.data.total_outstanding],
        ["Total Tenant Credit", rent.data.total_tenant_credit],
        ["Collection %", rent.data.collection_percentage],
        ["Paid In Full", rent.data.tenants_paid_in_full],
        ["With Balances", rent.data.tenants_with_balance],
        ["Total Tenants", rent.data.total_tenants],
      ];
    } else if (tab === "payment_history" && history.data) {
      filename = "payment-history";
      rows = [
        ["Date", "Tenant", "Property", "Amount", "Method", "Status"],
        ...history.data.items.map((p) => [
          p.date, p.tenant_name, p.property_title, p.amount, p.method, p.status,
        ]),
      ];
    } else if (tab === "summary" && summary.data) {
      filename = "financial-summary";
      rows = [
        ["Metric", "Value"],
        ["Total Expected", summary.data.total_expected],
        ["Total Collected", summary.data.total_collected],
        ["Total Outstanding", summary.data.total_outstanding],
        ["Total Tenant Credit", summary.data.total_tenant_credit],
        ["Active Tenancies", summary.data.active_tenancies],
        ["Expired Tenancies", summary.data.expired_tenancies],
        ["Terminated Tenancies", summary.data.terminated_tenancies],
        ["Occupancy Rate %", summary.data.occupancy_rate],
      ];
    } else if (statementExport && statementExportData) {
      const s = statementExportData;
      filename = `statement-${(s.tenant_name ?? "tenant").toString().replace(/\s+/g, "-").toLowerCase()}`;
      rows = [
        ["Field", "Value"],
        ["Tenant", s.tenant_name],
        ["Phone", s.tenant_phone],
        ["Email", s.tenant_email],
        ["Property", s.property_title],
        ["Unit", s.unit_label],
        ["Status", s.status],
        ["Start Date", s.start_date],
        ["End Date", s.end_date],
        ["Monthly Rent", s.monthly_rent],
        ["Expected Rent", s.expected_rent],
        ["Total Paid", s.total_paid],
        ["Balance Due", s.balance_due],
        ["Tenant Credit", s.tenant_credit],
        ["Is Overdue", s.is_overdue ? "Yes" : "No"],
        [],
        ["Payment History"],
        ["Date", "Amount", "Method", "Status", "Type"],
        ...s.payment_history.map((p) => [p.date, p.amount, p.method, p.status, p.type]),
        [],
        ["Renewal History"],
        ["Previous End", "New End", "Monthly Rent", "Notes", "Renewed At"],
        ...s.renewal_history.map((r) => [
          r.previous_end_date, r.new_end_date, r.monthly_rent, r.notes, r.renewed_at,
        ]),
      ];
    } else {
      return null;
    }
    return { rows, filename };
  };

  const csvToString = (rows: (string | number | null)[][]) =>
    rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

  const shareCsv = async () => {
    const built = buildCsv();
    if (!built) {
      Alert.alert("Export", "This report cannot be exported to CSV yet.");
      return;
    }
    const csv = csvToString(built.rows);
    try {
      await Share.share({ message: `${built.filename}.csv\n\n${csv}`, title: `${built.filename}.csv` });
    } catch {
      Alert.alert("Export failed", "Could not share the CSV.");
    }
  };

  const downloadCsv = async () => {
    const built = buildCsv();
    if (!built) {
      Alert.alert("Export", "This report cannot be exported to CSV yet.");
      return;
    }
    const csv = csvToString(built.rows);
    const name = `${built.filename}.csv`;
    try {
      // Prompt the user to choose where to save the file via the OS directory
      // picker (Android SAF / iOS). This writes into a location the user can
      // actually access afterwards (e.g. Downloads), instead of a private
      // app cache path that other apps can't open.
      const dir = await Directory.pickDirectoryAsync();
      const file = dir.createFile(name, "text/csv");
      file.write(csv);
      Alert.alert(
        "Saved",
        `CSV saved as “${name}” in the folder you selected.`,
        [{ text: "OK", style: "default" }]
      );
    } catch (e: unknown) {
      // User cancelled the picker (no directory chosen) — not an error.
      const cancelled = e instanceof Error && /cancel|user/i.test(e.message);
      if (!cancelled) {
        Alert.alert("Download failed", "Could not save the CSV file to the selected location.");
      }
    }
  };

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.content}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Financial overview of the tenancies you manage.</Text>

        {/* Horizontal scrollable pill tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {REPORT_TABS.map((t) => {
            const selected = t.value === tab;
            return (
              <Pressable
                key={t.value}
                onPress={() => setTab(t.value)}
                style={[styles.tab, selected && styles.tabActive]}
              >
                <View style={styles.tabIcon}>{t.icon}</View>
                <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filters (dropdowns) */}
        {(tab === "tenants" || tab === "outstanding") && (
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <SelectField
                label="Status"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onSelect={(v) => setStatusFilter(v)}
                placeholder="All statuses"
              />
            </View>
            <View style={styles.filterCol}>
              <SelectField
                label="Property"
                value={propertyId}
                options={propertyOptions}
                onSelect={(v) => setPropertyId(v)}
                placeholder="All properties"
              />
            </View>
          </View>
        )}

        {/* Export */}
        <Card padding="md" style={styles.exportCard}>
          <View style={styles.exportRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportTitle}>Export report</Text>
              <Text style={styles.exportSubtitle}>Save or share the displayed report as CSV</Text>
            </View>
            <Button
              label="Export CSV"
              variant="outline"
              tone="accent"
              size="sm"
              leftIcon={<Download size={16} color={Colors.accent} />}
              onPress={() => setExportSheet(true)}
            />
          </View>
        </Card>

        {/* Content */}
        <View style={styles.reportSection}>
          {!active ? (
            <LoadingState message="Generating report…" />
          ) : active.isLoading ? (
            <LoadingState message="Generating report…" />
          ) : active.isError ? (
            <ErrorState title="Could not load report" onRetry={() => active.refetch()} />
          ) : (
            <>
              {tab === "tenants" && (
                <TenantsReport data={tenants.data} onOpenStatement={(tid) => setStatementTenantId(tid)} />
              )}
              {tab === "outstanding" && <OutstandingReport data={outstanding.data} />}
              {tab === "rent_collection" && <RentCollectionReport data={rent.data} />}
              {tab === "summary" && <SummaryReport data={summary.data} />}
              {tab === "payment_history" && <PaymentHistoryReport data={history.data} />}
            </>
          )}
        </View>

        <Pressable style={styles.refreshRow} onPress={refetchAll}>
          <RefreshCw size={16} color={Colors.accent} />
          <Text style={styles.refreshText}>Refresh reports</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </View>

      {statementTenantId && (
        <StatementSheet
          data={statement.data}
          isLoading={statement.isLoading}
          isError={statement.isError}
          onClose={() => setStatementTenantId(null)}
          onRetry={() => statement.refetch()}
          onExport={(d) => { setStatementExportData(d); setStatementExport(true); setExportSheet(true); }}
        />
      )}

      {/* Export action sheet (Share / Download) */}
      <Modal visible={exportSheet} transparent animationType="slide" onRequestClose={() => { setExportSheet(false); setStatementExport(false); setStatementExportData(null); }}>
        <Pressable style={styles.sheetOverlay} onPress={() => { setExportSheet(false); setStatementExport(false); setStatementExportData(null); }}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Export {statementExport ? "tenant statement" : `“${REPORT_TABS.find((t) => t.value === tab)?.label}” report`}
            </Text>
            <Text style={styles.sheetSubtitle}>Choose how you want to use the CSV file.</Text>

            <Pressable style={styles.sheetOption} onPress={() => { setExportSheet(false); setStatementExport(false); setStatementExportData(null); shareCsv(); }}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: Colors.accentSoft }]}>
                <Share2 size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Share</Text>
                <Text style={styles.sheetOptionSub}>Send via WhatsApp, email, or any app</Text>
              </View>
              <ChevronDown size={18} color={Colors.textMuted} style={{ transform: [{ rotate: "270deg" }] }} />
            </Pressable>

            <Pressable style={styles.sheetOption} onPress={() => { setExportSheet(false); setStatementExport(false); setStatementExportData(null); downloadCsv(); }}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Download size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Save to device</Text>
                <Text style={styles.sheetOptionSub}>Store the CSV file, then open/share it</Text>
              </View>
              <ChevronDown size={18} color={Colors.textMuted} style={{ transform: [{ rotate: "270deg" }] }} />
            </Pressable>

            <Button label="Cancel" variant="ghost" tone="muted" onPress={() => { setExportSheet(false); setStatementExport(false); setStatementExportData(null); }} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/* ----------------------------- Sub-views ----------------------------- */

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" | "accent" }) {
  return (
    <Card padding="sm" style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, tone === "danger" && styles.danger, tone === "success" && styles.success, tone === "accent" && styles.accent]}>
        {value}
      </Text>
    </Card>
  );
}

function TenantsReport({
  data,
  onOpenStatement,
}: {
  data: import("@/src/types").TenantReportResponse | undefined;
  onOpenStatement: (tenantId: string) => void;
}) {
  if (!data || data.items.length === 0) {
    return <EmptyState icon={<Users size={32} color={Colors.accent} />} title="No tenants" description="Tenancies you manage will appear here." />;
  }
  return (
    <View>
      <Text style={styles.sectionMeta}>{data.total} tenants</Text>
      <Card padding="none">
        {data.items.map((t, i) => (
          <View key={t.lease_id}>
            <Pressable style={styles.row} onPress={() => onOpenStatement(t.tenant_id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cellName}>{t.tenant_name ?? "Unknown"}</Text>
                <Text style={styles.cellSub}>
                  {t.property_title}
                  {t.unit_label ? ` · Unit ${t.unit_label}` : ""}
                </Text>
                <Text style={styles.cellSub}>{t.tenant_phone ?? t.tenant_email ?? "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.cellText, t.balance_due > 0 && styles.danger]}>
                  {formatUGXShort(t.balance_due)}
                </Text>
                <Text style={styles.cellSub}>{t.status}</Text>
              </View>
              <ChevronDown size={18} color={Colors.textMuted} style={{ marginLeft: Spacing.sm, transform: [{ rotate: "270deg" }] }} />
            </Pressable>
            {i < data.items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
      {data.items.length >= PAGE && (
        <Text style={styles.note}>Showing first {PAGE} — refine filters to narrow results.</Text>
      )}
    </View>
  );
}

function OutstandingReport({ data }: { data: import("@/src/types").OutstandingResponse | undefined }) {
  // Honest empty state: only when the server confirms total === 0.
  if (!data || data.total === 0) {
    if (!data) return <LoadingState message="Generating report…" />;
    return (
      <EmptyState
        icon={<AlertTriangle size={32} color={Colors.accent} />}
        title="All caught up"
        description="No tenants currently have outstanding balances."
      />
    );
  }
  return (
    <View>
      <Card padding="md" style={styles.outstandingBanner}>
        <View>
          <Text style={styles.outstandingBannerLabel}>Total outstanding</Text>
          <Text style={styles.outstandingBannerValue}>{formatUGX(data.total_outstanding)}</Text>
        </View>
        <View style={styles.outstandingBadge}>
          <Text style={styles.outstandingBadgeText}>{data.total} owing</Text>
        </View>
      </Card>
      <Text style={styles.sectionMeta}>{data.total} with balances</Text>
      <Card padding="none">
        {data.items.map((t, i) => (
          <View key={t.lease_id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cellName}>{t.tenant_name ?? "Unknown"}</Text>
                <Text style={styles.cellSub}>
                  {t.property_title}
                  {t.unit_label ? ` · Unit ${t.unit_label}` : ""}
                </Text>
                <Text style={styles.cellSub}>
                  Last: {t.last_payment_date ? formatDate(t.last_payment_date) : "—"}
                  {t.last_payment_method ? ` · ${formatMethod(t.last_payment_method)}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.cellText, styles.danger]}>{formatUGXShort(t.balance_due)}</Text>
                <Text style={styles.cellSub}>of {formatUGXShort(t.expected_rent)}</Text>
              </View>
            </View>
            {i < data.items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
      {data.items.length >= PAGE && (
        <Text style={styles.note}>Showing first {PAGE} — refine filters to narrow results.</Text>
      )}
    </View>
  );
}

function RentCollectionReport({ data }: { data: import("@/src/types").RentCollectionResponse | undefined }) {
  if (!data) return null;
  return (
    <View style={styles.gap}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Expected" value={formatUGXShort(data.total_expected)} />
        <KpiCard label="Collected" value={formatUGXShort(data.total_collected)} tone="success" />
        <KpiCard label="Outstanding" value={formatUGXShort(data.total_outstanding)} tone="danger" />
        <KpiCard label="Tenant Credit" value={formatUGXShort(data.total_tenant_credit)} />
        <KpiCard label="Paid in Full" value={String(data.tenants_paid_in_full)} />
        <KpiCard label="With Balances" value={String(data.tenants_with_balance)} />
      </View>
      <Card padding="lg" style={styles.collectionCard}>
        <Text style={styles.collectionPct}>{data.collection_percentage}%</Text>
        <Text style={styles.cellSub}>Collection rate</Text>
      </Card>
    </View>
  );
}

function SummaryReport({ data }: { data: import("@/src/types").FinancialSummary | undefined }) {
  if (!data) return null;
  return (
    <View style={styles.gap}>
      <View style={styles.kpiGrid}>
        <KpiCard label="Expected Rent" value={formatUGXShort(data.total_expected)} />
        <KpiCard label="Collected" value={formatUGXShort(data.total_collected)} tone="success" />
        <KpiCard label="Outstanding" value={formatUGXShort(data.total_outstanding)} tone="danger" />
        <KpiCard label="Tenant Credits" value={formatUGXShort(data.total_tenant_credit)} />
        <KpiCard label="Active" value={String(data.active_tenancies)} />
        <KpiCard label="Expired" value={String(data.expired_tenancies)} />
        <KpiCard label="Terminated" value={String(data.terminated_tenancies)} />
        <KpiCard label="Occupancy" value={`${data.occupancy_rate}%`} />
      </View>
    </View>
  );
}

function PaymentHistoryReport({ data }: { data: import("@/src/types").PaymentHistoryResponse | undefined }) {
  if (!data || data.items.length === 0) {
    return <EmptyState icon={<Receipt size={32} color={Colors.accent} />} title="No payments" description="Recorded payments will appear here." />;
  }
  return (
    <View>
      <Card padding="md" style={styles.summaryBar}>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Collected</Text>
          <Text style={styles.kpiValue}>{formatUGX(data.summary.total_collected)}</Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiLabel}>Payments</Text>
          <Text style={styles.kpiValue}>{data.summary.payment_count}</Text>
        </View>
      </Card>
      <View style={{ height: Spacing.md }} />
      <Card padding="none">
        {data.items.map((p, i) => (
          <View key={p.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cellName}>{formatDate(p.date)}</Text>
                <Text style={styles.cellSub}>{p.tenant_name ?? "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cellText}>{formatUGXShort(p.amount)}</Text>
                <Text style={styles.cellSub}>{p.method ? formatMethod(p.method) : "—"}</Text>
              </View>
            </View>
            {i < data.items.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

function StatementSheet({
  data,
  isLoading,
  isError,
  onClose,
  onRetry,
  onExport,
}: {
  data: import("@/src/types").TenantStatement | undefined;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
  onRetry: () => void;
  onExport: (data: import("@/src/types").TenantStatement) => void;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.statementHeader}>
          <Text style={styles.sheetTitle}>Tenant Statement</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            {!isLoading && !isError && data && (
              <Pressable onPress={() => onExport(data)} hitSlop={8} style={styles.statementExportBtn}>
                <Download size={18} color={Colors.accent} />
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
        {isLoading ? (
          <LoadingState message="Loading statement…" />
        ) : isError ? (
          <ErrorState title="Could not load statement" onRetry={onRetry} />
        ) : !data ? (
          <EmptyState icon={<FileText size={32} color={Colors.accent} />} title="No data" description="We could not find this tenant." />
        ) : (
          <ScrollView style={styles.sheetScroll}>
            <Text style={styles.cellName}>{data.tenant_name ?? "Unknown"}</Text>
            <Text style={styles.cellSub}>
              {data.tenant_phone ?? "—"} · {data.tenant_email ?? "—"}
            </Text>
            <Text style={styles.cellSub}>
              {data.property_title}
              {data.unit_label ? ` · Unit ${data.unit_label}` : ""}
            </Text>
            <View style={styles.kpiGrid}>
              <KpiCard label="Expected" value={formatUGXShort(data.expected_rent)} />
              <KpiCard label="Paid" value={formatUGXShort(data.total_paid)} tone="success" />
              <KpiCard label="Balance" value={formatUGXShort(data.balance_due)} tone="danger" />
              <KpiCard label="Credit" value={formatUGXShort(data.tenant_credit)} />
            </View>
            <Text style={styles.sheetSection}>Tenancy</Text>
            <Text style={styles.cellSub}>
              {formatDate(data.start_date)} → {formatDate(data.end_date)} · {data.status}
            </Text>

            <Text style={styles.sheetSection}>Payment History</Text>
            {data.payment_history.length === 0 ? (
              <Text style={styles.cellSub}>No payments recorded.</Text>
            ) : (
              data.payment_history.map((p) => (
                <View key={p.id} style={styles.subRow}>
                  <Text style={styles.cellText}>{formatDate(p.date)}</Text>
                  <Text style={styles.cellText}>{formatUGXShort(p.amount)}</Text>
                  <Text style={styles.cellSub}>{p.method ? formatMethod(p.method) : "—"}</Text>
                </View>
              ))
            )}

            <Text style={styles.sheetSection}>Renewal History</Text>
            {data.renewal_history.length === 0 ? (
              <Text style={styles.cellSub}>No renewals.</Text>
            ) : (
              data.renewal_history.map((r, i) => (
                <Text key={i} style={styles.cellSub}>
                  {formatDate(r.previous_end_date)} → {formatDate(r.new_end_date)}
                  {r.notes ? ` · ${r.notes}` : ""}
                </Text>
              ))
            )}
          </ScrollView>
        )}
      </Pressable>
    </Pressable>
  );
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  title: { fontSize: FontSize.display, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: -Spacing.xs },
  // Tabs (horizontal scrollable pills)
  tabs: { flexDirection: "row", gap: Spacing.sm, paddingVertical: Spacing.xs },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    ...Shadows.card,
  },
  tabIcon: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  tabLabelActive: { color: Colors.textOnPrimary },
  // Filters
  filterRow: { flexDirection: "row", gap: Spacing.sm },
  filterCol: { flex: 1 },
  // Export
  exportCard: { gap: Spacing.xs },
  exportRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.md },
  exportTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  exportSubtitle: { fontSize: FontSize.caption, color: Colors.textMuted },
  reportSection: { gap: Spacing.md },
  sectionMeta: { fontSize: FontSize.caption, color: Colors.textMuted, marginBottom: Spacing.xs },
  row: { flexDirection: "row", alignItems: "center", padding: Spacing.md },
  subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.xs },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  note: { fontSize: FontSize.caption, color: Colors.textMuted, textAlign: "center", paddingVertical: Spacing.sm },
  cellName: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  cellSub: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
  cellText: { fontSize: FontSize.body, color: Colors.textPrimary },
  danger: { color: Colors.danger, fontWeight: FontWeight.bold },
  success: { color: Colors.success, fontWeight: FontWeight.bold },
  accent: { color: Colors.accent, fontWeight: FontWeight.bold },
  summaryBar: { flexDirection: "row" },
  kpiItem: { flex: 1 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  kpiCard: { width: "48%", gap: 2 },
  kpiLabel: { fontSize: FontSize.micro, color: Colors.textMuted },
  kpiValue: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  collectionCard: { alignItems: "center" },
  collectionPct: { fontSize: FontSize.display, fontWeight: FontWeight.bold, color: Colors.accent, textAlign: "center" },
  gap: { gap: Spacing.sm },
  // Outstanding banner
  outstandingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  outstandingBannerLabel: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: FontWeight.semibold },
  outstandingBannerValue: { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.accent, marginTop: 2 },
  outstandingBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  outstandingBadgeText: { color: Colors.textOnPrimary, fontSize: FontSize.caption, fontWeight: FontWeight.bold },
  refreshRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.sm },
  refreshText: { fontSize: FontSize.caption, color: Colors.accent, fontWeight: FontWeight.medium },
  // Sheet (statement + export)
  sheetBackdrop: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    maxHeight: "85%",
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.sm },
  sheetTitle: { fontSize: FontSize.h2, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  sheetSubtitle: { fontSize: FontSize.caption, color: Colors.textMuted, marginBottom: Spacing.md },
  sheetScroll: { maxHeight: "75%" },
  sheetSection: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  statementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  statementExportBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  // Export action sheet options
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  sheetOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sheetOptionTitle: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sheetOptionSub: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
});
