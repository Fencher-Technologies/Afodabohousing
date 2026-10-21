import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom implements neither of these, and the command palette the phone
// country picker is built on uses both. Without them any test that opens a
// dropdown fails with "ResizeObserver is not defined".
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// Modules that build the Supabase client at import time need a URL and key.
// A real .env wins; these placeholders only let tests load without one.
import { vi } from "vitest";
if (!import.meta.env.VITE_SUPABASE_URL) vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:54321");
if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
