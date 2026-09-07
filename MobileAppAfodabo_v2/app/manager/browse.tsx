/**
 * Manager Browse Properties — reuses the public browsing experience.
 *
 * Managers previously had no way to reach the public marketplace once signed
 * in: their tabs were Home, Properties, Tenants, Reports and Account, and the
 * guest explore screen was only reachable while logged out. Tenants already
 * had this via app/tenant/browse.tsx.
 */

export { default } from "../guest/explore";
