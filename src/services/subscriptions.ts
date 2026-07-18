import { apiGet, apiPost } from './api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features?: string[];
}

export interface SubscriptionData {
  id: string;
  plan_id: string;
  manager_id: string;
  status: string;
  start_date: string;
  end_date: string;
  plan?: SubscriptionPlan;
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return apiGet('/subscriptions/plans');
}

export async function getCurrentSubscription(): Promise<SubscriptionData | null> {
  return apiGet('/subscriptions/current');
}

export async function createSubscription(planId: string): Promise<SubscriptionData> {
  return apiPost('/subscriptions/create', { plan_id: planId });
}
