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
