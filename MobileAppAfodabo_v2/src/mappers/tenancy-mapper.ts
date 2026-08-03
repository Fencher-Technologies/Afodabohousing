import type { HealthStatus, PaymentMethod, Tenancy, TenancyStatus } from "@/src/types";
import { calculateHealth } from "@/src/utils/tenancy-health";
import { daysLeft } from "@/src/utils/tenancy-health";

interface BackendLease {
  id: string;
  owner_id: string;
  property_id: string;
  tenant_id: string;
  monthly_rent: number;
  status: string;
  start_date: string;
  end_date: string;
  unit_label?: string | null;
  security_deposit?: number;
  created_at: string;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  property_title?: string | null;
  property_image?: string | null;
  balance_due?: number | null;
  is_overdue?: boolean | null;
  expected_rent?: number | null;
  tenant_credit?: number | null;
  // Coverage-first money fields (server-enriched)
  rent_accrued?: number | null;
  arrears_amount?: number | null;
  advance_amount?: number | null;
  contract_rent?: number | null;
  effective_status?: string | null;
  total_paid?: number | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  last_payment_method?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  // Rent coverage tracking (server-enriched)
  rent_effective_date?: string | null;
  paid_until_date?: string | null;
  rent_days_remaining?: number | null;
  rent_days_in_arrears?: number | null;
  next_payment_due_date?: string | null;
}

const METHOD_MAP: Record<string, PaymentMethod> = {
  cash: "cash",
  bank: "bank",
  bank_transfer: "bank",
  mobile_money: "mobile_money",
  credit_card: "bank",
};

function mapPaymentMethod(method?: string | null): PaymentMethod | null {
  if (!method) return null;
  return METHOD_MAP[method] ?? null;
}

/**
 * Single source of truth for converting a backend lease (already enriched
 * server-side) into the app's `Tenancy` shape. Replaces the duplicated inline
 * mapping previously scattered across the tenancies list, detail, dashboard
 * and tenant-detail screens.
 */
export function fromBackendLease(l: BackendLease): Tenancy {
  const status = (l.status as TenancyStatus) ?? "active";
  const effectiveStatus = (l.effective_status as TenancyStatus) ?? status;
  // Money ledger is the source of truth: `expected_rent` is the server alias
  // for `rent_accrued` (money accrued since the effective date), `contract_rent`
  // is informational only (contract months).
  const balanceDue = l.arrears_amount ?? l.balance_due ?? 0;
  const expectedRent = l.expected_rent ?? l.rent_accrued ?? 0;
  const tenantCredit = l.advance_amount ?? l.tenant_credit ?? 0;
  const contractRent = l.contract_rent ?? 0;
  const rentEndDate = l.end_date;
  const lastPaymentDate = l.last_payment_date ?? null;

  const health: HealthStatus = calculateHealth({
    status: effectiveStatus,
    rent_end_date: rentEndDate,
  });

  return {
    id: l.id,
    manager_id: l.owner_id,
    property_id: l.property_id,
    property_title: l.property_title ?? "",
    property_image: l.property_image ?? null,
    tenant_id: l.tenant_id,
    tenant_name: l.tenant_name ?? "",
    tenant_phone: l.tenant_phone ?? "",
    tenant_email: l.tenant_email ?? "",
    unit_label: l.unit_label ?? "",
    rent_amount: l.monthly_rent,
    rent_period: "monthly",
    deposit_amount: l.security_deposit ?? 0,
    rent_start_date: l.start_date,
    rent_end_date: l.end_date,
    status,
    balance_due: balanceDue,
    is_overdue: l.is_overdue ?? false,
    expected_rent: expectedRent,
    tenant_credit: tenantCredit,
    rent_accrued: expectedRent,
    arrears_amount: balanceDue,
    advance_amount: tenantCredit,
    contract_rent: contractRent,
    effective_status: effectiveStatus,
    total_paid: l.total_paid ?? 0,
    last_payment_date: lastPaymentDate,
    last_payment_amount: l.last_payment_amount ?? null,
    last_payment_method: mapPaymentMethod(l.last_payment_method),
    agreement_status: "pending",
    agreement_document: null,
    health,
    manager_name: l.manager_name ?? null,
    manager_phone: l.manager_phone ?? null,
    manager_email: l.manager_email ?? null,
    days_remaining: daysLeft(rentEndDate) ?? 0,
    rent_effective_date: l.rent_effective_date ?? null,
    paid_until_date: l.paid_until_date ?? null,
    rent_days_remaining: l.rent_days_remaining ?? null,
    rent_days_in_arrears: l.rent_days_in_arrears ?? null,
    next_payment_due_date: l.next_payment_due_date ?? null,
  };
}

export function fromBackendLeaseList(items: BackendLease[]): Tenancy[] {
  return (items || []).map(fromBackendLease);
}
