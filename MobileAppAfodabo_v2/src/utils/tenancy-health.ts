/**
 * Tenancy health calculation — based on the lease term (time remaining),
 * NOT on payments. A tenant's payment standing is tracked separately via
 * `is_overdue` / `balance_due`.
 *
 *  - bad:  lease has ended (expired/terminated) or no end date set
 *  - good: lease is still running
 *
 * A tenancy is either Active or Expired. There was previously a third
 * "Expiring" state for leases with under 30 days left, which read as a
 * status of its own and confused managers. Time remaining is still shown
 * by the days-left progress bar on the tenancy card.
 */

import type { HealthStatus } from "@/src/types";

export function calculateHealth(tenancy: {
  status: string;
  rent_end_date: string | null;
}): HealthStatus {
  if (tenancy.status === "terminated") return "bad";
  const remaining = daysLeft(tenancy.rent_end_date);
  if (remaining === null) return "bad";
  if (remaining < 0) return "bad"; // expired
  return "good";
}

export const HealthLabel: Record<HealthStatus, string> = {
  good: "Active",
  // "warn" is retained in the HealthStatus union for backwards compatibility
  // but calculateHealth no longer returns it.
  warn: "Active",
  bad: "Expired",
};

export const HealthBorder: Record<HealthStatus, string> = {
  good: "#2E7D52",
  warn: "#D97706",
  bad: "#C0392B",
};

export const HealthText: Record<HealthStatus, string> = {
  good: "#2E7D52",
  warn: "#D97706",
  bad: "#C0392B",
};

/** Days remaining until the tenancy end date (can be negative when expired). */
export function daysLeft(rentEndDate: string | null | undefined): number | null {
  if (!rentEndDate) return null;
  const end = new Date(rentEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Progress through the tenancy term as a 0..1 fraction (0 = just started,
 * 1 = fully elapsed). Uses start/end date when both present, otherwise null.
 */
export function leaseProgress(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (end <= start) return null;
  const now = Date.now();
  const ratio = (now - start) / (end - start);
  return Math.min(1, Math.max(0, ratio));
}
