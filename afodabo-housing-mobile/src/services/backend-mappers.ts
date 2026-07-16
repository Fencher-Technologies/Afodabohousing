import type {
  PaymentRow,
  ProfileRow,
  PropertyInsert,
  PropertyRow,
  RentalUnitInsert,
  RentalUnitRow,
  TenancyInsert,
  TenancyRow,
} from '../types/supabase';

type BackendProperty = {
  address: string;
  amenities?: string[] | null;
  bathrooms: number;
  bedrooms: number;
  city: string;
  created_at: string;
  description?: string | null;
  id: string;
  images?: string[] | null;
  is_boosted?: boolean | null;
  manager_email?: string | null;
  manager_phone?: string | null;
  boosted_until?: string | null;
  monthly_rent: number | string;
  owner_id: string;
  property_type: string;
  security_deposit?: number | string;
  state: string;
  status: string;
  title?: string | null;
  updated_at: string;
  zip_code?: string;
};

type BackendRentalUnit = {
  amenities?: string[] | null;
  bathrooms: number;
  bedrooms: number;
  created_at: string;
  description?: string | null;
  floor_level?: string | null;
  id: string;
  is_active?: boolean;
  kitchens?: number;
  owner_id: string;
  property_id: string;
  rent_amount: number | string;
  rent_currency?: string;
  sitting_rooms?: number;
  status: string;
  unit_number: string;
  updated_at: string;
};

type BackendLease = {
  created_at: string;
  end_date: string;
  id: string;
  monthly_rent: number | string;
  owner_id: string;
  property_id: string;
  start_date: string;
  status: string;
  tenant_id: string;
  termination_date?: string | null;
  updated_at: string;
};

type BackendPayment = {
  amount: number | string;
  created_at: string;
  due_date: string;
  id: string;
  lease_id: string;
  notes?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  payment_type?: string;
  status: string;
  tenant_id: string;
  transaction_id?: string | null;
  updated_at: string;
};

type BackendMessage = {
  content: string | null;
  created_at: string;
  id: string;
  is_read: boolean;
  property_id?: string | null;
  receiver_id: string;
  receiver_name?: string | null;
  sender_id: string;
  sender_name?: string | null;
};

type BackendProfile = {
  avatar_url?: string | null;
  created_at: string;
  email?: string;
  full_name?: string | null;
  id: string;
  phone?: string | null;
  role?: string | null;
  updated_at?: string;
  user_id: string;
};

type BackendTenant = {
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  phone?: string | null;
  user_id?: string | null;
};

const DEFAULT_RENT_PERIOD = 'monthly';

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  return Number(value || 0);
}

function toPropertyStatus(status?: string | null): PropertyRow['status'] {
  if (status === 'occupied' || status === 'inactive') {
    return status;
  }

  return 'available';
}

function toPropertyType(type?: string | null): PropertyRow['property_type'] {
  if (type === 'Office Space' || type === 'office_space' || type === 'office' || type === 'commercial') {
    return 'Office Space';
  }

  if (type === 'Residential') {
    return 'Residential';
  }

  return 'Residential';
}

function toTenancyStatus(status?: string | null): TenancyRow['status'] {
  if (status === 'active' || status === 'terminated') {
    return status;
  }

  return 'expired';
}

function buildPropertyTitle(property: BackendProperty) {
  if (property.title?.trim()) {
    return property.title.trim();
  }

  if (property.description?.trim()) {
    return property.description.trim();
  }

  if (property.address?.trim()) {
    return property.address.trim();
  }

  if (property.city?.trim()) {
    return `${property.city.trim()} ${property.property_type}`.trim();
  }

  return 'Afodabo Property';
}

export function mapBackendPropertyToPropertyRow(property: BackendProperty): PropertyRow {
  return {
    address: property.address || null,
    amenities: property.amenities ?? null,
    area: property.zip_code || null,
    bathrooms: toNumber(property.bathrooms),
    bedrooms: toNumber(property.bedrooms),
    city: property.city || null,
    created_at: property.created_at,
    description: property.description ?? null,
    district: property.state || property.city || 'Unknown',
    id: property.id,
    images: property.images ?? null,
    is_boosted: property.is_boosted ?? null,
    kitchens: 1,
    manager_email: property.manager_email ?? null,
    manager_id: property.owner_id,
    manager_phone: property.manager_phone ?? null,
    boosted_until: property.boosted_until ?? null,
    property_type: toPropertyType(property.property_type),
    rent_amount: toNumber(property.monthly_rent),
    rent_currency: 'UGX',
    rent_period: DEFAULT_RENT_PERIOD,
    sitting_rooms: 0,
    status: toPropertyStatus(property.status),
    title: buildPropertyTitle(property),
    updated_at: property.updated_at,
  };
}

export function mapBackendRentalUnitToRentalUnitRow(unit: BackendRentalUnit): RentalUnitRow {
  return {
    amenities: unit.amenities ?? null,
    bathrooms: toNumber(unit.bathrooms),
    bedrooms: toNumber(unit.bedrooms),
    created_at: unit.created_at,
    description: unit.description ?? null,
    floor_level: unit.floor_level ?? null,
    id: unit.id,
    kitchens: unit.kitchens ?? 1,
    property_id: unit.property_id,
    rent_amount: toNumber(unit.rent_amount),
    rent_currency: unit.rent_currency || 'UGX',
    sitting_rooms: unit.sitting_rooms ?? 0,
    status: toPropertyStatus(unit.status),
    unit_number: unit.unit_number,
    updated_at: unit.updated_at,
  };
}

export function mapBackendLeaseToTenancyRow(lease: BackendLease): TenancyRow {
  return {
    agreement_url: null,
    created_at: lease.created_at,
    id: lease.id,
    manager_id: lease.owner_id,
    property_id: lease.property_id,
    rent_amount: toNumber(lease.monthly_rent),
    rent_end_date: lease.end_date,
    rent_period: DEFAULT_RENT_PERIOD,
    rent_start_date: lease.start_date,
    status: toTenancyStatus(lease.status),
    tenant_id: lease.tenant_id,
    updated_at: lease.updated_at,
  };
}

export function buildProofNote(baseNotes: string | null | undefined, proofUrl?: string | null) {
  const note = (baseNotes || '').trim();

  if (!proofUrl) {
    return note || null;
  }

  return [`Payment proof: ${proofUrl}`, note].filter(Boolean).join('\n');
}

export function extractProofUrl(notes?: string | null) {
  if (!notes) {
    return null;
  }

  const match = notes.match(/Payment proof:\s*(https?:\/\/\S+|\S+)/i);
  return match?.[1] ?? null;
}

export function mapBackendPaymentToPaymentRow(
  payment: BackendPayment,
  options?: {
    managerId?: string;
    proofUrl?: string | null;
    tenancy?: TenancyRow | null;
  },
): PaymentRow {
  const tenancy = options?.tenancy;

  return {
    amount: toNumber(payment.amount),
    created_at: payment.created_at,
    currency: 'UGX',
    id: payment.id,
    manager_id: options?.managerId ?? tenancy?.manager_id ?? '',
    notes: payment.notes ?? null,
    period_end: tenancy?.rent_end_date ?? payment.due_date,
    period_start: tenancy?.rent_start_date ?? payment.paid_date ?? payment.due_date,
    proof_url: options?.proofUrl ?? extractProofUrl(payment.notes),
    receipt_url: payment.transaction_id ?? null,
    status:
      payment.status === 'confirmed' ||
      payment.status === 'rejected' ||
      payment.status === 'uploaded'
        ? payment.status
        : 'pending',
    tenancy_id: payment.lease_id,
    tenant_id: payment.tenant_id,
    updated_at: payment.updated_at,
  };
}

export function mapBackendMessage<T extends { receiver_name?: string; sender_name?: string }>(
  message: BackendMessage,
): T & {
  content: string;
  created_at: string;
  id: string;
  is_read: boolean;
  property_id: string | null;
  receiver_id: string;
  sender_id: string;
} {
  return {
    content: message.content || '',
    created_at: message.created_at,
    id: message.id,
    is_read: message.is_read,
    property_id: message.property_id ?? null,
    receiver_id: message.receiver_id,
    receiver_name: message.receiver_name ?? undefined,
    sender_id: message.sender_id,
    sender_name: message.sender_name ?? undefined,
  } as T & {
    content: string;
    created_at: string;
    id: string;
    is_read: boolean;
    property_id: string | null;
    receiver_id: string;
    sender_id: string;
  };
}

export function mapBackendProfileToProfileRow(profile: BackendProfile): ProfileRow {
  return {
    avatar_url: profile.avatar_url ?? null,
    created_at: profile.created_at,
    full_name: profile.full_name ?? null,
    id: profile.id,
    phone: profile.phone ?? null,
    updated_at: profile.updated_at ?? profile.created_at,
    user_id: profile.user_id,
  };
}

export function buildTenantName(tenant: BackendTenant) {
  return `${tenant.first_name} ${tenant.last_name}`.trim() || tenant.email;
}

export function mapPropertyInsertToBackendPayload(payload: PropertyInsert) {
  return {
    address: payload.address || payload.title,
    amenities: payload.amenities ?? [],
    bathrooms: payload.bathrooms,
    bedrooms: payload.bedrooms,
    city: payload.city || payload.district,
    country: 'Uganda',
    description: payload.description || null,
    images: payload.images ?? [],
    is_active: payload.status !== 'inactive',
    manager_email: payload.manager_email || null,
    manager_phone: payload.manager_phone || null,
    monthly_rent: payload.rent_amount,
    property_type: payload.property_type,
    security_deposit: payload.rent_amount,
    square_feet: null,
    state: payload.district,
    status: payload.status,
    title: payload.title,
    zip_code: payload.area || '00000',
  };
}

export function mapPropertyUpdateToBackendPayload(payload: Partial<PropertyInsert>) {
  return {
    address: payload.address,
    amenities: payload.amenities,
    bathrooms: payload.bathrooms,
    bedrooms: payload.bedrooms,
    city: payload.city || payload.district,
    description: payload.description,
    images: payload.images,
    is_active: payload.status ? payload.status !== 'inactive' : undefined,
    manager_email: payload.manager_email,
    manager_phone: payload.manager_phone,
    monthly_rent: payload.rent_amount,
    property_type: payload.property_type,
    security_deposit: payload.rent_amount,
    state: payload.district,
    status: payload.status,
    title: payload.title,
    zip_code: payload.area,
  };
}

export function mapRentalUnitInsertToBackendPayload(payload: RentalUnitInsert) {
  return {
    amenities: payload.amenities ?? [],
    bathrooms: payload.bathrooms,
    bedrooms: payload.bedrooms,
    description: payload.description,
    floor_level: payload.floor_level,
    kitchens: payload.kitchens,
    property_id: payload.property_id,
    rent_amount: payload.rent_amount,
    rent_currency: payload.rent_currency || 'UGX',
    sitting_rooms: payload.sitting_rooms,
    status: payload.status,
    unit_number: payload.unit_number,
  };
}

export function mapTenancyInsertToBackendPayload(payload: TenancyInsert, tenantId: string) {
  return {
    end_date: payload.rent_end_date,
    monthly_rent: payload.rent_amount,
    property_id: payload.property_id,
    security_deposit: payload.rent_amount,
    start_date: payload.rent_start_date,
    status: payload.status || 'active',
    tenant_id: tenantId,
    terms: null,
  };
}
