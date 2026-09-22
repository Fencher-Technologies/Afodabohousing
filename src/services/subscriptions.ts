import { apiGet, apiPost } from './api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  price_usd: number;
  price_ugx: number;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
  popular: boolean;
  max_properties?: number | null;
  max_tenants?: number | null;
}

/** "1 day", "3 months", "6 months", "1 year" from a plan's duration_days. */
export function formatPlanDuration(days: number): string {
  if (days >= 360 && days <= 366) return '1 year';
  if (days >= 28 && days % 30 <= 1) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatPlanPrice(plan: SubscriptionPlan, currency: 'UGX' | 'USD'): string {
  return currency === 'USD'
    ? `$${Number(plan.price_usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `UGX ${Number(plan.price_ugx).toLocaleString()}`;
}

export interface ManagerSubscription {
  id: string;
  manager_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  payment_reference: string | null;
  payment_status: string;
  days_remaining: number;
}

export interface SubscriptionCreateResponse {
  subscription_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_reference: string;
  redirect_url?: string;
  message: string;
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return apiGet('/subscriptions/plans');
}

export async function getCurrentSubscription(): Promise<ManagerSubscription | null> {
  return apiGet('/subscriptions/current');
}

export async function createSubscription(planId: string, phoneNumber?: string, callbackUrl?: string, currency?: string): Promise<SubscriptionCreateResponse> {
  return apiPost('/subscriptions/create', { plan_id: planId, phone_number: phoneNumber, callback_url: callbackUrl, currency });
}

export interface PropertyQuota {
  properties_used: number;
  max_properties: number | null;
  can_add_property: boolean;
  plan_id: string | null;
  plan_name: string | null;
  has_active_subscription: boolean;
}

export async function getPropertyQuota(): Promise<PropertyQuota> {
  return apiGet('/subscriptions/quota');
}
