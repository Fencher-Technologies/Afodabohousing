/**
 * Mock data for Afodabo Housing.
 * Simulates backend responses for all entities.
 */

import type {
  User,
  Property,
  Tenancy,
  Payment,
  SubscriptionPlan,
  Subscription,
  DashboardStats,
  AlertItem,
} from "@/src/types";

// ---------- Users ----------

export const mockUsers: Record<string, User> = {
  manager: {
    id: "mgr-001",
    full_name: "David Okello",
    email: "david@afodabo.ug",
    phone: "256772123456",
    role: "manager",
    email_verified: true,
    created_at: "2024-03-15T10:00:00Z",
  },
  tenant: {
    id: "tnt-001",
    full_name: "John Mukasa",
    email: "john.mukasa@gmail.com",
    phone: "256701234567",
    role: "tenant",
    email_verified: true,
    created_at: "2024-06-01T10:00:00Z",
  },
};

// ---------- Subscription Plans ----------

export const mockPlans: SubscriptionPlan[] = [
  {
    id: "3mo",
    name: "Quarterly",
    duration_days: 90,
    price_usd: 10,
    price_ugx: 37000,
    benefits: ["List unlimited properties", "Record payments", "Generate reports", "WhatsApp reminders"],
    is_active: true,
    sort_order: 1,
  },
  {
    id: "6mo",
    name: "Bi-Quarterly",
    duration_days: 180,
    price_usd: 20,
    price_ugx: 74000,
    benefits: ["All 3-month features", "Priority support", "Save 10%"],
    is_active: true,
    sort_order: 2,
    popular: true,
  },
  {
    id: "12mo",
    name: "Annual",
    duration_days: 365,
    price_usd: 35,
    price_ugx: 129500,
    benefits: ["All 6-month features", "Branded PDF reports", "Save 20%"],
    is_active: true,
    sort_order: 3,
  },
];

export const mockSubscription: Subscription = {
  id: "sub-001",
  manager_id: "mgr-001",
  plan_id: "6mo",
  plan_name: "Bi-Quarterly",
  status: "active",
  started_at: "2025-05-01T10:00:00Z",
  expires_at: "2025-11-01T10:00:00Z",
  auto_renew: true,
  days_remaining: 42,
  payment_reference: "NLX-8842-2025",
};

export const mockSubscriptionExpired: Subscription = {
  id: "sub-002",
  manager_id: "mgr-001",
  plan_id: "3mo",
  plan_name: "Quarterly",
  status: "expired",
  started_at: "2025-01-01T10:00:00Z",
  expires_at: "2025-04-01T10:00:00Z",
  auto_renew: false,
  days_remaining: -15,
  payment_reference: null,
};

// ---------- Properties ----------

export const mockProperties: Property[] = [
  {
    id: "prop-001",
    manager_id: "mgr-001",
    title: "Sunrise Apartments",
    district: "Kampala",
    address: "Plot 12, Acacia Avenue",
    city: "Kololo",
    area: "Kololo",
    type: "apartment",
    rent_amount: 850000,
    rent_period: "monthly",
    beds: 2,
    baths: 2,
    sitting_rooms: 1,
    kitchens: 1,
    description:
      "Modern 2-bedroom apartments in the heart of Kololo. Spacious living areas with balconies overlooking the city. Walking distance to Acacia Mall and international schools.",
    amenities: ["water", "electricity", "parking", "security", "wifi", "balcony"],
    images: [],
    status: "active",
    lat: 0.337,
    lng: 32.585,
    units: [
      { id: "u-001", property_id: "prop-001", unit_label: "A1", rent_amount: 850000, rent_period: "monthly", beds: 2, baths: 2, occupied: true },
      { id: "u-002", property_id: "prop-001", unit_label: "A2", rent_amount: 850000, rent_period: "monthly", beds: 2, baths: 2, occupied: false },
      { id: "u-003", property_id: "prop-001", unit_label: "B1", rent_amount: 900000, rent_period: "monthly", beds: 2, baths: 2, occupied: true },
    ],
    created_at: "2024-03-20T10:00:00Z",
  },
  {
    id: "prop-002",
    manager_id: "mgr-001",
    title: "Greenfield Villa",
    district: "Wakiso",
    address: "Plot 45, Greenfield Drive",
    city: "Kira",
    area: "Kira Municipality",
    type: "house",
    rent_amount: 1500000,
    rent_period: "monthly",
    beds: 3,
    baths: 3,
    sitting_rooms: 1,
    kitchens: 1,
    description:
      "Spacious 3-bedroom standalone villa with private garden and ample parking. Located in a quiet residential area of Kira. Perfect for families.",
    amenities: ["water", "electricity", "parking", "security", "garden", "borehole"],
    images: [],
    status: "active",
    lat: 0.352,
    lng: 32.638,
    units: [
      { id: "u-004", property_id: "prop-002", unit_label: "Main", rent_amount: 1500000, rent_period: "monthly", beds: 3, baths: 3, occupied: true },
    ],
    created_at: "2024-04-10T10:00:00Z",
  },
  {
    id: "prop-003",
    manager_id: "mgr-001",
    title: "Najjera Studios",
    district: "Kampala",
    address: "Plot 8, Najjera Road",
    city: "Najjera",
    area: "Najjera",
    type: "studio",
    rent_amount: 350000,
    rent_period: "monthly",
    beds: 1,
    baths: 1,
    sitting_rooms: 0,
    kitchens: 1,
    description:
      "Affordable modern studio units perfect for young professionals. Self-contained with kitchen and bathroom. Secure compound with ample parking.",
    amenities: ["water", "electricity", "parking", "security"],
    images: [],
    status: "active",
    lat: 0.367,
    lng: 32.608,
    units: [
      { id: "u-005", property_id: "prop-003", unit_label: "S1", rent_amount: 350000, rent_period: "monthly", beds: 1, baths: 1, occupied: true },
      { id: "u-006", property_id: "prop-003", unit_label: "S2", rent_amount: 350000, rent_period: "monthly", beds: 1, baths: 1, occupied: true },
      { id: "u-007", property_id: "prop-003", unit_label: "S3", rent_amount: 350000, rent_period: "monthly", beds: 1, baths: 1, occupied: false },
      { id: "u-008", property_id: "prop-003", unit_label: "S4", rent_amount: 350000, rent_period: "monthly", beds: 1, baths: 1, occupied: false },
    ],
    created_at: "2024-05-05T10:00:00Z",
  },
  {
    id: "prop-004",
    manager_id: "mgr-001",
    title: "Entebbe Road Shops",
    district: "Wakiso",
    address: "Plot 2, Entebbe Road",
    city: "Entebbe",
    area: "Entebbe",
    type: "shop",
    rent_amount: 600000,
    rent_period: "monthly",
    beds: 0,
    baths: 1,
    sitting_rooms: 0,
    kitchens: 0,
    description: "Commercial shop spaces along the busy Entebbe Road. High foot traffic, ideal for retail businesses.",
    amenities: ["electricity", "parking", "security"],
    images: [],
    status: "active",
    lat: 0.06,
    lng: 32.455,
    units: [
      { id: "u-009", property_id: "prop-004", unit_label: "Shop 1", rent_amount: 600000, rent_period: "monthly", beds: 0, baths: 1, occupied: true },
      { id: "u-010", property_id: "prop-004", unit_label: "Shop 2", rent_amount: 600000, rent_period: "monthly", beds: 0, baths: 1, occupied: false },
    ],
    created_at: "2024-06-01T10:00:00Z",
  },
];

// ---------- Tenancies ----------

export const mockTenancies: Tenancy[] = [
  {
    id: "ten-001",
    manager_id: "mgr-001",
    property_id: "prop-001",
    property_title: "Sunrise Apartments",
    tenant_id: "tnt-001",
    tenant_name: "John Mukasa",
    tenant_phone: "256701234567",
    tenant_email: "john.mukasa@gmail.com",
    unit_label: "A1",
    rent_amount: 850000,
    rent_period: "monthly",
    rent_start_date: "2024-06-01",
    rent_end_date: "2025-12-01",
    status: "active",
    balance_due: 300000,
    total_paid: 5950000,
    last_payment_date: "2025-06-28",
    last_payment_amount: 550000,
    last_payment_method: "mobile_money",
    agreement_status: "consented",
    agreement_document: "agreement_ten_001.pdf",
    health: "warn",
  },
  {
    id: "ten-002",
    manager_id: "mgr-001",
    property_id: "prop-002",
    property_title: "Greenfield Villa",
    tenant_id: "tnt-002",
    tenant_name: "Sarah Nansubuga",
    tenant_phone: "256772987654",
    tenant_email: "sarah.n@gmail.com",
    unit_label: "Main",
    rent_amount: 1500000,
    rent_period: "monthly",
    rent_start_date: "2024-08-01",
    rent_end_date: "2026-08-01",
    status: "active",
    balance_due: 0,
    total_paid: 13500000,
    last_payment_date: "2025-07-01",
    last_payment_amount: 1500000,
    last_payment_method: "bank",
    agreement_status: "consented",
    agreement_document: "agreement_ten_002.pdf",
    health: "good",
  },
  {
    id: "ten-003",
    manager_id: "mgr-001",
    property_id: "prop-001",
    property_title: "Sunrise Apartments",
    tenant_id: "tnt-003",
    tenant_name: "Michael Otto",
    tenant_phone: "256781234567",
    tenant_email: "michael.otto@gmail.com",
    unit_label: "B1",
    rent_amount: 900000,
    rent_period: "monthly",
    rent_start_date: "2024-09-01",
    rent_end_date: "2025-09-01",
    status: "active",
    balance_due: 1800000,
    total_paid: 6300000,
    last_payment_date: "2025-05-15",
    last_payment_amount: 450000,
    last_payment_method: "cash",
    agreement_status: "consented",
    agreement_document: "agreement_ten_003.pdf",
    health: "bad",
  },
  {
    id: "ten-004",
    manager_id: "mgr-001",
    property_id: "prop-003",
    property_title: "Najjera Studios",
    tenant_id: "tnt-004",
    tenant_name: "Grace Akello",
    tenant_phone: "256758765432",
    tenant_email: "grace.akello@gmail.com",
    unit_label: "S1",
    rent_amount: 350000,
    rent_period: "monthly",
    rent_start_date: "2025-01-01",
    rent_end_date: "2026-01-01",
    status: "active",
    balance_due: 0,
    total_paid: 2450000,
    last_payment_date: "2025-07-02",
    last_payment_amount: 350000,
    last_payment_method: "mobile_money",
    agreement_status: "consented",
    agreement_document: "agreement_ten_004.pdf",
    health: "good",
  },
  {
    id: "ten-005",
    manager_id: "mgr-001",
    property_id: "prop-003",
    property_title: "Najjera Studios",
    tenant_id: "tnt-005",
    tenant_name: "Peter Wasswa",
    tenant_phone: "256776543210",
    tenant_email: "peter.wasswa@gmail.com",
    unit_label: "S2",
    rent_amount: 350000,
    rent_period: "monthly",
    rent_start_date: "2025-02-01",
    rent_end_date: "2026-02-01",
    status: "active",
    balance_due: 700000,
    total_paid: 1400000,
    last_payment_date: "2025-05-10",
    last_payment_amount: 350000,
    last_payment_method: "cash",
    agreement_status: "pending",
    agreement_document: null,
    health: "bad",
  },
  {
    id: "ten-006",
    manager_id: "mgr-001",
    property_id: "prop-004",
    property_title: "Entebbe Road Shops",
    tenant_id: "tnt-006",
    tenant_name: "Aisha Namatovu",
    tenant_phone: "256791234567",
    tenant_email: "aisha.namatovu@gmail.com",
    unit_label: "Shop 1",
    rent_amount: 600000,
    rent_period: "monthly",
    rent_start_date: "2025-03-01",
    rent_end_date: "2026-03-01",
    status: "active",
    balance_due: 600000,
    total_paid: 2400000,
    last_payment_date: "2025-06-15",
    last_payment_amount: 600000,
    last_payment_method: "bank",
    agreement_status: "consented",
    agreement_document: "agreement_ten_006.pdf",
    health: "warn",
  },
];

// ---------- Payments ----------

export const mockPayments: Payment[] = [
  {
    id: "pay-001",
    lease_id: "ten-001",
    tenant_id: "tnt-001",
    manager_id: "mgr-001",
    tenant_name: "John Mukasa",
    property_title: "Sunrise Apartments",
    amount: 550000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-06-01",
    paid_date: "2025-06-28",
    method: "mobile_money",
    notes: "MTN Mobile Money",
    transaction_id: "TXN-8842",
    recorded_by: "mgr-001",
    balance_after: 300000,
    created_at: "2025-06-28T14:00:00Z",
  },
  {
    id: "pay-002",
    lease_id: "ten-001",
    tenant_id: "tnt-001",
    manager_id: "mgr-001",
    tenant_name: "John Mukasa",
    property_title: "Sunrise Apartments",
    amount: 850000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-05-01",
    paid_date: "2025-05-29",
    method: "mobile_money",
    notes: null,
    transaction_id: "TXN-8521",
    recorded_by: "mgr-001",
    balance_after: 850000,
    created_at: "2025-05-29T10:00:00Z",
  },
  {
    id: "pay-003",
    lease_id: "ten-001",
    tenant_id: "tnt-001",
    manager_id: "mgr-001",
    tenant_name: "John Mukasa",
    property_title: "Sunrise Apartments",
    amount: 850000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-04-01",
    paid_date: "2025-04-02",
    method: "bank",
    notes: "Stanbic Bank transfer",
    transaction_id: "TXN-8201",
    recorded_by: "mgr-001",
    balance_after: 1700000,
    created_at: "2025-04-02T10:00:00Z",
  },
  {
    id: "pay-004",
    lease_id: "ten-002",
    tenant_id: "tnt-002",
    manager_id: "mgr-001",
    tenant_name: "Sarah Nansubuga",
    property_title: "Greenfield Villa",
    amount: 1500000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-07-01",
    paid_date: "2025-07-01",
    method: "bank",
    notes: "Standing order",
    transaction_id: "TXN-9101",
    recorded_by: "mgr-001",
    balance_after: 0,
    created_at: "2025-07-01T09:00:00Z",
  },
  {
    id: "pay-005",
    lease_id: "ten-003",
    tenant_id: "tnt-003",
    manager_id: "mgr-001",
    tenant_name: "Michael Otto",
    property_title: "Sunrise Apartments",
    amount: 450000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-05-01",
    paid_date: "2025-05-15",
    method: "cash",
    notes: "Partial payment",
    transaction_id: null,
    recorded_by: "mgr-001",
    balance_after: 1800000,
    created_at: "2025-05-15T14:00:00Z",
  },
  {
    id: "pay-006",
    lease_id: "ten-004",
    tenant_id: "tnt-004",
    manager_id: "mgr-001",
    tenant_name: "Grace Akello",
    property_title: "Najjera Studios",
    amount: 350000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-07-01",
    paid_date: "2025-07-02",
    method: "mobile_money",
    notes: "Airtel Money",
    transaction_id: "TXN-9215",
    recorded_by: "mgr-001",
    balance_after: 0,
    created_at: "2025-07-02T10:00:00Z",
  },
  {
    id: "pay-007",
    lease_id: "ten-006",
    tenant_id: "tnt-006",
    manager_id: "mgr-001",
    tenant_name: "Aisha Namatovu",
    property_title: "Entebbe Road Shops",
    amount: 600000,
    currency: "UGX",
    status: "confirmed",
    payment_type: "rent",
    due_date: "2025-06-01",
    paid_date: "2025-06-15",
    method: "bank",
    notes: null,
    transaction_id: "TXN-8800",
    recorded_by: "mgr-001",
    balance_after: 600000,
    created_at: "2025-06-15T10:00:00Z",
  },
];

// ---------- Dashboard Stats ----------

export const mockDashboardStats: DashboardStats = {
  active_tenants: 6,
  overdue_count: 2,
  pending_review_count: 1,
  collected_this_month: 3050000,
  total_properties: 4,
  total_tenancies: 6,
};

export const mockAlerts: AlertItem[] = [
  { id: "alert-1", tone: "danger", count: 2, label: "Overdue tenancies", action_label: "Send Reminders" },
  { id: "alert-2", tone: "warning", count: 1, label: "Agreement pending", action_label: "Review" },
  { id: "alert-3", tone: "info", count: 1, label: "Expiring in 7 days", action_label: "Renew" },
];

// ---------- Search Results ----------

export const mockSearchResults = (query: string) => {
  const q = query.toLowerCase();
  return mockTenancies
    .filter(
      (t) =>
        t.tenant_name.toLowerCase().includes(q) ||
        t.tenant_phone.includes(q) ||
        t.property_title.toLowerCase().includes(q) ||
        t.unit_label.toLowerCase().includes(q)
    )
    .map((t) => ({
      id: t.tenant_id,
      tenant_name: t.tenant_name,
      property_title: t.property_title,
      unit_label: t.unit_label,
      balance_due: t.balance_due,
      status: t.status,
      health: t.health,
    }));
};

// ---------- Districts ----------

export const mockDistricts = ["Kampala", "Wakiso", "Mukono", "Entebbe", "Jinja", "Mbarara"];

// ---------- Helpers ----------

export function getPropertyById(id: string): Property | undefined {
  return mockProperties.find((p) => p.id === id);
}

export function getTenanciesByTenant(tenantId: string): Tenancy[] {
  return mockTenancies.filter((t) => t.tenant_id === tenantId);
}

export function getPaymentsByLease(leaseId: string): Payment[] {
  return mockPayments.filter((p) => p.lease_id === leaseId).sort((a, b) => new Date(b.paid_date ?? "").getTime() - new Date(a.paid_date ?? "").getTime());
}

export function getPaymentsByTenant(tenantId: string): Payment[] {
  return mockPayments.filter((p) => p.tenant_id === tenantId).sort((a, b) => new Date(b.paid_date ?? "").getTime() - new Date(a.paid_date ?? "").getTime());
}

export function getAllPayments(): Payment[] {
  return [...mockPayments].sort((a, b) => new Date(b.paid_date ?? "").getTime() - new Date(a.paid_date ?? "").getTime());
}

export function getTenancyById(id: string): Tenancy | undefined {
  return mockTenancies.find((t) => t.id === id);
}

export function getTenantTenancy(tenantId: string): Tenancy | undefined {
  return mockTenancies.find((t) => t.tenant_id === tenantId && t.status === "active");
}
