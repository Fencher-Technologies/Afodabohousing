import type { Database } from '../types/supabase';

export const DISTRICTS = [
  'Kampala',
  'Wakiso',
  'Mukono',
  'Mbarara',
  'Gulu',
  'Jinja',
  'Entebbe',
  'Mbale',
  'Lira',
  'Arua',
  'Fort Portal',
  'Masaka',
  'Kabale',
  'Hoima',
  'Kasese',
  'Soroti',
  'Tororo',
] as const;

export const PROPERTY_TYPE_OPTIONS: {
  value: Database['public']['Enums']['property_type'];
  label: string;
}[] = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Office Space', label: 'Office Space' },
];

export const RENT_PERIOD_OPTIONS: {
  value: Database['public']['Enums']['rent_period'];
  label: string;
}[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const AMENITIES = [
  'Water',
  'Electricity',
  'WiFi',
  'Parking',
  'Security',
  'Garden',
  'Generator',
  'DSTV',
  'Borehole',
  'Tiled Floors',
] as const;

export const PROPERTY_IMAGE_MIN = 3;
export const PROPERTY_IMAGE_MAX = 10;

export const DEMO_ACCOUNTS = [
  { email: 'admin@afodabo.ug', role: 'Admin', description: 'Full platform control' },
  { email: 'john@afodabo.ug', role: 'Manager', description: 'Manage properties and tenants' },
  { email: 'sarah@afodabo.ug', role: 'Tenant', description: 'Pay rent and view tenancy' },
];
