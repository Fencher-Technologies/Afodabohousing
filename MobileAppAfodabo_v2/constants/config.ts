const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";

// Normalize: strip trailing slashes so `${API_BASE_URL}/endpoint` never
// produces a double-slash URL (the backend 404s on `//path`).
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Add it to your .env file."
  );
}
