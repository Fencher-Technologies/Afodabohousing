/**
 * Tenancy health calculation — based on the lease term (time remaining),
 * NOT on payments. A tenant's payment standing is tracked separately via
 * `is_overdue` / `balance_due`.
 *
 *  - bad:    lease has ended (expired/terminated) or no end date set
 *  - warn:   fewer than 30 days remaining on the lease
 *  - good:   otherwise (plenty of time left)
 */

import type { HealthStatus } from "@/src/types";
import { daysUntil } from "./format";

export function calculateHealth(tenancy: {
  status: string;
  rent_end_date: string | null;
}): HealthStatus {
  if (tenancy.status === "terminated") return "bad";
  const remaining = daysUntil(tenancy.rent_end_date);
  if (remaining === null) return "bad";
  if (remaining < 0) return "bad"; // expired
  if (remaining < 30) return "warn";
  return "good";
}

export const HealthLabel: Record<HealthStatus, string> = {
  good: "Current",
  warn: "Expiring",
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
