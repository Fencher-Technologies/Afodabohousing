/**
 * Maintenance requests.
 *
 * Tenants raise them, managers triage them: open -> scheduled -> completed,
 * with cancelled as a terminal exit. Cost and notes are recorded by the
 * manager and redacted server-side before a tenant sees the request.
 */

import { api } from "../lib/api-client";

export type MaintenanceStatus = "open" | "scheduled" | "completed" | "cancelled";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduled_date: string | null;
  completed_date: string | null;
  /** Manager-only; always null when a tenant reads the request. */
  cost: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export const maintenanceService = {
  /** Requests visible to the caller: a manager's queue, or a tenant's own. */
  list: (status?: MaintenanceStatus) =>
    api.get<Paginated<MaintenanceRequest>>(
      `/maintenance${status ? `?status=${status}` : ""}`,
    ),

  create: (data: {
    property_id: string;
    tenant_id?: string | null;
    title: string;
    description: string;
    priority: MaintenancePriority;
    /** A photo of the problem — the web tenant form has always offered this. */
    photo_url?: string | null;
  }) => api.post<MaintenanceRequest>("/maintenance", data),

  update: (
    id: string,
    data: Partial<{
      status: MaintenanceStatus;
      priority: MaintenancePriority;
      scheduled_date: string | null;
      completed_date: string | null;
      cost: number | null;
      notes: string | null;
      description: string;
    }>,
  ) => api.patch<MaintenanceRequest>(`/maintenance/${id}`, data),
};

/** What a request may move to next. Mirrors the backend's rules. */
export const NEXT_STATUSES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open: ["scheduled", "completed", "cancelled"],
  scheduled: ["completed", "cancelled", "open"],
  completed: [],
  cancelled: [],
};
