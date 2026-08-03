/**
 * Afodabo Housing — Type Definitions
 */

export type UserRole = "guest" | "tenant" | "manager" | "admin";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
  avatar_url?: string;
}

export type PropertyType = "apartment" | "house" | "studio" | "shop" | "single_room";
export type PropertyStatus = "active" | "inactive";
export type RentPeriod = "monthly" | "quarterly" | "annually";
export type Amenity =
  | "water"
  | "electricity"
  | "parking"
  | "security"
  | "wifi"
  | "garden"
  | "balcony"
  | "furnished"
  | "borehole"
  | "solar";

/** Raw property shape from the backend API. */
export interface BackendProperty {
  id: string;
  owner_id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  monthly_rent: number;
  rent_amount?: number;
  security_deposit: number;
  status: string;
  description: string | null;
  amenities: string[] | null;
  images: string[] | null;
  manager_email: string | null;
  manager_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_boosted?: boolean;
  boosted_until?: string | null;
  boost_days_remaining?: number;
  boost_package_label?: string | null;
}

export interface RentalUnit {
  id: string;
  property_id: string;
  unit_label: string;
  rent_amount: number;
  rent_period: RentPeriod;
  beds: number;
  baths: number;
  occupied: boolean;
}

export interface Property {
  id: string;
  manager_id: string;
  title: string;
  district: string;
  address: string;
  city: string;
  area: string;
  type: PropertyType;
  rent_amount: number;
  rent_period: RentPeriod;
  beds: number;
  baths: number;
  sitting_rooms: number;
  kitchens: number;
  description: string;
  amenities: Amenity[];
  images: string[];
  status: PropertyStatus;
  lat?: number;
  lng?: number;
  manager_email?: string;
  manager_phone?: string;
  square_feet?: number;
  security_deposit?: number;
  units: RentalUnit[];
  created_at: string;
  occupancy_status?: string;
  is_boosted?: boolean;
  boosted_until?: string | null;
  boost_days_remaining?: number;
  boost_package_label?: string | null;
}

export type TenancyStatus = "active" | "expired" | "terminated";
export type HealthStatus = "good" | "warn" | "bad";

export interface Tenancy {
  id: string;
  manager_id: string;
  property_id: string;
  property_title: string;
  property_image: string | null;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string;
  unit_label: string;
  rent_amount: number;
  rent_period: RentPeriod;
  deposit_amount?: number;
  rent_start_date: string;
  rent_end_date: string;
  status: TenancyStatus;
  balance_due: number;
  is_overdue: boolean;
  expected_rent: number;
  tenant_credit: number;
  effective_status: TenancyStatus;
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  last_payment_method: PaymentMethod | null;
  agreement_status: "pending" | "consented" | "uploaded";
  agreement_document: string | null;
  health: HealthStatus;
  manager_name: string | null;
  manager_phone: string | null;
  manager_email: string | null;
  days_remaining: number;
}

// ─── Agreement Types ────────────────────────────────────────────────────

export interface AgreementTenantInfo {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface AgreementManagerInfo {
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface AgreementPropertyInfo {
  title: string;
  address?: string | null;
  city?: string | null;
  description?: string | null;
  amenities: string[];
}

export interface AgreementTenancyInfo {
  monthly_rent: string;
  security_deposit: string;
  start_date: string;
  end_date: string;
  payment_frequency: string;
}

export interface AgreementStandardClause {
  key: string;
  title: string;
  content: string;
  enabled: boolean;
}

export interface AgreementCustomClause {
  title: string;
  content: string;
}

export interface AgreementSignatureInfo {
  signed_name: string | null;
  signed_at: string | null;
  consent_status: "pending" | "approved" | "declined";
  consent_version: number;
}

export interface AgreementContent {
  agreement_number: string;
  version: number;
  generated_at: string | null;
  tenant: AgreementTenantInfo;
  manager: AgreementManagerInfo;
  property: AgreementPropertyInfo;
  tenancy: AgreementTenancyInfo;
  standard_clauses: AgreementStandardClause[];
  custom_clauses: AgreementCustomClause[];
  signatures: Record<string, AgreementSignatureInfo>;
}

export type AgreementStatus =
  | "draft"
  | "awaiting_tenant_consent"
  | "awaiting_manager_consent"
  | "executed"
  | "superseded"
  | "cancelled";

export type AgreementType = "uploaded" | "generated";

export interface AgreementDocument {
  id: string;
  lease_id: string;
  agreement_type: AgreementType;
  agreement_number?: string | null;
  version: number;
  status: AgreementStatus;
  content?: AgreementContent | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AgreementTemplateClause {
  key: string;
  title: string;
  content: string;
  optional: boolean;
  enabled_by_default: boolean;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  standard_clauses: AgreementTemplateClause[];
}

export interface AgreementConsentState {
  signed_name: string | null;
  signed_at: string | null;
  consent_status: "pending" | "approved" | "declined";
  consent_version: number;
  user_id?: string | null;
}

export interface ConsentStateResponse {
  current_document: AgreementDocument | null;
  manager: AgreementConsentState;
  tenant: AgreementConsentState;
  content: AgreementContent | null;
}

export interface AgreementVersionMinimal {
  id: string;
  version: number;
  agreement_number?: string | null;
  status: AgreementStatus;
  tenant_signed: boolean;
  manager_signed: boolean;
  tenant_signed_name?: string | null;
  manager_signed_name?: string | null;
  created_at: string;
}

export interface AgreementVersionHistory {
  versions: AgreementVersionMinimal[];
  active_version: number | null;
}

export interface BuildAgreementRequest {
  standard_clauses: AgreementStandardClause[];
  custom_clauses: AgreementCustomClause[];
}

export interface BuildAgreementResponse {
  id: string;
  lease_id: string;
  version: number;
  agreement_number: string;
  status: AgreementStatus;
  content: AgreementContent;
  created_at: string;
}

export interface ConsentRequest {
  signed_name: string;
}

// ─── ─────────────────────────────────────────────────────────────────────

export type PaymentMethod = "cash" | "bank" | "mobile_money";
export type PaymentStatus = "confirmed" | "pending" | "rejected";
export type PaymentType = "rent" | "deposit" | "late_fee" | "maintenance" | "other";

export interface Payment {
  id: string;
  lease_id: string;
  tenant_id: string;
  manager_id: string;
  tenant_name: string;
  property_title: string;
  amount: number;
  currency: "UGX";
  status: PaymentStatus;
  payment_type: PaymentType;
  due_date: string;
  paid_date: string | null;
  method: PaymentMethod | null;
  notes: string | null;
  transaction_id: string | null;
  recorded_by: string;
  balance_after: number;
  created_at: string;
}

export interface BoostPackage {
  days: number;
  price: number;
  label: string;
  currency: string;
}

export interface BoostInitiateResponse {
  boost_id: string;
  reference: string;
  status: string;
  message: string;
  redirect_url: string;
}

export type SubscriptionPlanId = "3mo" | "6mo" | "12mo";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  duration_days: number;
  price_usd: number;
  price_ugx: number;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
  popular?: boolean;
}

export type SubscriptionStatus = "active" | "expired" | "pending" | "cancelled" | "grace";

export interface Subscription {
  id: string;
  manager_id: string;
  plan_id: SubscriptionPlanId;
  plan_name: string;
  status: SubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  days_remaining: number;
  payment_reference: string | null;
}

export interface DashboardStats {
  active_tenants: number;
  overdue_count: number;
  pending_review_count: number;
  collected_this_month: number;
  total_properties: number;
  total_tenancies: number;
}

export interface AlertItem {
  id: string;
  tone: "danger" | "warning" | "info";
  count: number;
  label: string;
  action_label: string;
}

export type ReportType =
  | "tenants"
  | "outstanding"
  | "statement"
  | "rent_collection"
  | "summary"
  | "due_payments"
  | "payment_history";

export interface ReportFilter {
  property_id?: string;
  status?: TenancyStatus;
  date_from?: string;
  date_to?: string;
  tenant_id?: string;
  method?: PaymentMethod;
}

export interface TenantReportItem {
  tenant_id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_title: string | null;
  unit_label: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  monthly_rent: number;
  expected_rent: number;
  total_paid: number;
  balance_due: number;
  tenant_credit: number;
  lease_id: string;
}

export interface TenantReportResponse {
  items: TenantReportItem[];
  total: number;
}

export interface OutstandingItem {
  tenant_id: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  property_title: string | null;
  unit_label: string | null;
  status: string;
  expected_rent: number;
  total_paid: number;
  balance_due: number;
  last_payment_date: string | null;
  last_payment_method: string | null;
  lease_id: string;
}

export interface OutstandingResponse {
  items: OutstandingItem[];
  total: number;
  total_outstanding: number;
}

export interface StatementPayment {
  id: string;
  date: string | null;
  amount: number;
  method: string | null;
  status: string;
  type: string | null;
}

export interface RenewalHistoryItem {
  previous_end_date: string | null;
  new_end_date: string | null;
  monthly_rent: number | null;
  notes: string | null;
  renewed_at: string | null;
}

export interface TenantStatement {
  lease_id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_title: string | null;
  unit_label: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  monthly_rent: number;
  expected_rent: number;
  total_paid: number;
  balance_due: number;
  tenant_credit: number;
  is_overdue: boolean;
  payment_history: StatementPayment[];
  renewal_history: RenewalHistoryItem[];
}

export interface RentCollectionResponse {
  period_from: string | null;
  period_to: string | null;
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  total_tenant_credit: number;
  collection_percentage: number;
  tenants_paid_in_full: number;
  tenants_with_balance: number;
  total_tenants: number;
}

export interface FinancialSummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  total_tenant_credit: number;
  active_tenancies: number;
  expired_tenancies: number;
  terminated_tenancies: number;
  occupancy_rate: number;
}

export interface DuePaymentItem {
  lease_id: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  property_title: string | null;
  unit_label: string | null;
  amount_due: number;
  balance_due: number;
  status: string;
  overdue: boolean;
}

export interface DuePaymentsResponse {
  items: DuePaymentItem[];
  total: number;
  filter: string;
}

export interface PaymentHistoryItem {
  id: string;
  date: string | null;
  tenant_name: string | null;
  property_title: string | null;
  amount: number;
  method: string | null;
  status: string;
  lease_id: string;
}

export interface PaymentHistorySummary {
  total_collected: number;
  payment_count: number;
  period_from: string | null;
  period_to: string | null;
}

export interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
  summary: PaymentHistorySummary;
  total: number;
}

export type PaymentVerificationStatus = "pending" | "approved" | "rejected";

export interface PaymentVerification {
  id: string;
  lease_id: string;
  tenant_id: string;
  owner_id: string;
  property_id: string;
  amount: number;
  payment_method: string;
  transaction_reference: string | null;
  payment_date: string;
  screenshot_url: string | null;
  notes: string | null;
  status: PaymentVerificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentVerificationCreate {
  amount: number;
  payment_method: string;
  transaction_reference?: string;
  payment_date: string;
  screenshot_url?: string;
  notes?: string;
}

export interface SearchResult {
  id: string;
  tenant_name: string;
  property_title: string;
  unit_label: string;
  balance_due: number;
  status: TenancyStatus;
  health: HealthStatus;
}

export interface PropertyListItem {
  id: string;
  title: string;
  district: string;
  city: string;
  type: PropertyType;
  rent_amount: number;
  rent_period: RentPeriod;
  beds: number;
  baths: number;
  images: string[];
  status: PropertyStatus;
  occupied_units: number;
  total_units: number;
  occupancy_status?: string;
  is_boosted?: boolean;
  boosted_until?: string | null;
  boost_days_remaining?: number;
  boost_package_label?: string | null;
}
