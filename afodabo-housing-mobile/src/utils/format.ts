import { format } from 'date-fns';
import type { Database } from '../types/supabase';

export function formatUGX(amount: number) {
  if (amount >= 1000000) {
    return `UGX ${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `UGX ${(amount / 1000).toFixed(0)}K`;
  }

  return `UGX ${amount.toLocaleString()}`;
}

export function formatUGXFull(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export function formatDateLabel(value: string) {
  return format(new Date(value), 'MMM dd, yyyy');
}

export function formatDateTimeLabel(value: string) {
  return format(new Date(value), "MMM dd, yyyy 'at' HH:mm");
}

export function propertyTypeLabel(value: Database['public']['Enums']['property_type']) {
  return (
    {
      house: 'House',
      apartment: 'Apartment',
      self_contained: 'Self-Contained',
      room: 'Room',
      studio: 'Studio',
      bungalow: 'Bungalow',
    }[value] ?? value
  );
}

export function rentPeriodSuffix(value: Database['public']['Enums']['rent_period']) {
  return (
    {
      monthly: '/mo',
      quarterly: '/qtr',
      annually: '/yr',
    }[value] ?? ''
  );
}

export function titleCaseRole(role: string | null) {
  if (!role) {
    return 'Guest';
  }

  return role.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
