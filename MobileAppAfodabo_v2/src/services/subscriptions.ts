import { api } from "../lib/api-client";

interface SubscriptionPlanResponse {
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

interface ManagerSubscriptionResponse {
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

interface SubscriptionCreateResponse {
  subscription_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  payment_reference: string;
  message: string;
}

export const subscriptionsService = {
  getPlans: () =>
    api.get<SubscriptionPlanResponse[]>("/subscriptions/plans"),

  getCurrent: () =>
    api.get<ManagerSubscriptionResponse | null>("/subscriptions/current"),

  create: (plan_id: string, phone_number?: string) =>
    api.post<SubscriptionCreateResponse>("/subscriptions/create", { plan_id, phone_number }),
};
