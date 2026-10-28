/**
 * Super admin operations.
 *
 * The web app has a full super-admin dashboard; the mobile app had no
 * super-admin role at all, so platform administration was desktop-only. These
 * wrap the same /admin endpoints the web dashboard uses, so both clients
 * behave identically.
 */

import { api } from "../lib/api-client";

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  photo_url: string | null;
  role: string;
  status: string;
  created_at: string | null;
  property_count: number;
  overdue_tenants: number;
  total_outstanding: number;
  subscription_plan: string | null;
  subscription_status: string | null;
  boosted_count: number;
}

export interface AdminStats {
  total_managers: number;
  total_tenants: number;
  active_managers: number;
  active_tenants: number;
  new_this_month: number;
  total_properties: number;
  occupied_properties: number;
  vacant_properties: number;
  occupancy_rate: number;
  total_collected?: number;
  total_outstanding?: number;
  collection_rate?: number;
}

export interface BoostStats {
  active_boosts?: number;
  total_boosts?: number;
  total_revenue?: number;
}

/** A listing waiting on a quality decision before it can go public. */
export interface PendingProperty {
  id: string;
  title: string | null;
  description: string | null;
  images: string[] | null;
  address: string | null;
  city: string | null;
  monthly_rent: number | null;
  currency: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string | null;
  submitted_for_review_at: string | null;
  review_status: string;
  manager_name: string | null;
  manager_email: string | null;
  manager_phone: string | null;
}

export const adminService = {
  /** Platform-wide counts for the overview screen. */
  stats: () => api.get<AdminStats>("/admin/stats"),

  boostStats: () => api.get<BoostStats>("/boosts/stats"),

  /** All users, optionally filtered by role. */
  listUsers: (role?: string) =>
    api.get<AdminUser[]>(`/admin/users${role ? `?role=${encodeURIComponent(role)}` : ""}`),

  /** Managers awaiting approval. */
  pendingManagers: () => api.get<AdminUser[]>("/admin/pending-managers"),

  /** Listings awaiting review, oldest submission first. */
  pendingProperties: async () => {
    const res = await api.get<{ items?: PendingProperty[] } | PendingProperty[]>("/admin/properties/pending");
    return Array.isArray(res) ? res : res.items ?? [];
  },

  /** Approve a listing, or reject it with the reason the manager will see. */
  reviewProperty: (propertyId: string, decision: "approved" | "rejected", notes?: string) =>
    api.post<{ message: string }>(`/admin/properties/${propertyId}/review`, { decision, notes }),

  getUser: (userId: string) => api.get<AdminUser>(`/admin/users/${userId}`),

  /** Approve, suspend or reactivate an account. */
  setUserStatus: (userId: string, status: string) =>
    api.patch<{ message: string }>(`/admin/users/${userId}/status`, { status }),

  /** Reset a user's password; the new one comes back in the response. */
  resetPassword: (userId: string) =>
    api.post<{ password: string }>("/admin/reset-tenant-password", { user_id: userId }),

  removeUser: (userId: string) =>
    api.delete<{ message: string }>(`/admin/users/${userId}`),
};
