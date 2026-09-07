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

export const adminService = {
  /** Platform-wide counts for the overview screen. */
  stats: () => api.get<AdminStats>("/admin/stats"),

  boostStats: () => api.get<BoostStats>("/boosts/stats"),

  /** All users, optionally filtered by role. */
  listUsers: (role?: string) =>
    api.get<AdminUser[]>(`/admin/users${role ? `?role=${encodeURIComponent(role)}` : ""}`),

  /** Managers awaiting approval. */
  pendingManagers: () => api.get<AdminUser[]>("/admin/pending-managers"),

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
