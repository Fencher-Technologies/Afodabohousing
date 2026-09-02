/**
 * Backend role → app role mapping.
 *
 * This mapping previously existed as five separate copies — four identical
 * ternaries in `auth-context.tsx` (init-with-cache, init-without-cache, signIn,
 * refreshAuth) and a fifth with different rules in `phone-pin-setup.tsx`. They
 * had already drifted, and two backend roles fell through the `else` branch:
 *
 *   - `super_admin` → "guest", so a super admin signing in was routed to
 *     /guest/explore with no management surface at all.
 *   - `free` → "guest", which is the intended destination but arrived at by
 *     accident rather than by decision.
 *
 * Keep this as the only place the mapping lives.
 */

import type { UserRole } from "@/src/types";

/** Roles the backend can issue on `profiles.role`. */
export type BackendRole =
  | "super_admin"
  | "house_manager"
  | "landlord"
  | "tenant"
  | "free"
  | "admin";

export function toAppRole(backendRole: string | null | undefined): UserRole {
  switch (backendRole) {
    case "house_manager":
    case "landlord":
      return "manager";

    // TODO: super admins currently share the manager experience because the
    // app has no dedicated admin surface. They are *not* guests — routing them
    // to /guest/explore left them with no way to manage anything. Revisit when
    // an admin area exists.
    case "super_admin":
    case "admin":
      return "manager";

    case "tenant":
      return "tenant";

    // `free` is an authenticated browsing account with no management rights,
    // which is exactly the guest experience. Listed explicitly so it reads as
    // a decision rather than a fallthrough.
    case "free":
      return "guest";

    default:
      return "guest";
  }
}

/**
 * Normalise an app-or-backend role to the value the backend expects when
 * setting up phone/PIN auth. Mirrors `toAppRole` so the two cannot drift.
 */
export function toBackendRole(role: string | null | undefined): "house_manager" | "tenant" {
  return toAppRole(role) === "manager" ? "house_manager" : "tenant";
}
