/**
 * Debug logging gated on __DEV__. Compiled out of release bundles, so auth
 * diagnostics never reach production log collectors. Never pass secrets
 * (tokens, passwords, PINs) to these functions.
 */

export function debugAuth(...args: unknown[]): void {
  if (__DEV__) {
    console.log("[DEBUG_AUTH]", ...args);
  }
}
