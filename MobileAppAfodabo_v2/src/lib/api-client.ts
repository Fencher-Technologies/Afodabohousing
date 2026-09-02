import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL } from "../../constants/config";
import { debugAuth } from "./debug";

const STORAGE_KEY_TOKEN = "axis_access_token";
const STORAGE_KEY_REFRESH = "axis_refresh_token";

// Tokens live in the OS keychain/keystore via expo-secure-store. AsyncStorage
// is only a legacy fallback: values written before this change are migrated
// on first read, and SecureStore write failures (e.g. value over the ~2KB
// keychain limit) fall back to AsyncStorage rather than losing the session.

async function secureGet(key: string): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null) return value;
  } catch {
    // SecureStore unavailable (e.g. web); fall through to legacy storage
  }
  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) {
    try {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch {
      // migration is best-effort; the value is still readable
    }
    return legacy;
  }
  return null;
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
    return;
  } catch {
    // value too large for the keychain or store unavailable
  }
  await AsyncStorage.setItem(key, value);
}

async function secureDelete(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // already gone or store unavailable
    }
  }
  await AsyncStorage.multiRemove(keys);
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function getStoredToken(): Promise<string | null> {
  return secureGet(STORAGE_KEY_TOKEN);
}

async function setStoredToken(token: string): Promise<void> {
  await secureSet(STORAGE_KEY_TOKEN, token);
}

function buildErrorMessage(errorData: unknown): string | null {
  if (!errorData || typeof errorData !== "object") return null;
  const data = errorData as { detail?: unknown; extra?: { errors?: unknown } };
  const errors = data.extra?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors.map((e) => {
      const entry = e as { loc?: unknown[]; msg?: string };
      const loc = (entry.loc ?? [])
        .filter((s) => s !== "body")
        .map(String)
        .join(".");
      const msg = entry.msg ?? "invalid value";
      return loc ? `${loc}: ${msg}` : msg;
    });
    return `Validation error: ${parts.join("; ")}`;
  }
  if (typeof data.detail === "string" && data.detail) return data.detail;
  return null;
}

const _tokenListeners = new Set<() => void>();

export function onTokensCleared(listener: () => void) {
  _tokenListeners.add(listener);
  return () => _tokenListeners.delete(listener);
}

async function clearTokens(options?: { suppressNotification?: boolean }): Promise<void> {
  await secureDelete([STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH]);
  if (!options?.suppressNotification) {
    _tokenListeners.forEach((fn) => fn());
  }
}

async function getRefreshToken(): Promise<string | null> {
  return secureGet(STORAGE_KEY_REFRESH);
}

async function setRefreshToken(token: string): Promise<void> {
  await secureSet(STORAGE_KEY_REFRESH, token);
}

let _refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = doRefreshAccessToken().finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}

async function doRefreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const data = await response.json();
    await setStoredToken(data.access_token);
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }
    return data.access_token;
  } catch {
    await clearTokens();
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  _retry503 = 0,
): Promise<T> {
  const token = await getStoredToken();
  debugAuth("API request -", endpoint, "hasToken:", !!token);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 503 && _retry503 < 2) {
    await new Promise(r => setTimeout(r, 800 * (_retry503 + 1)));
    return request<T>(endpoint, options, _retry503 + 1);
  }

  if (response.status === 401 && token) {
    debugAuth("API request - 401, attempting token refresh for:", endpoint);
    const newToken = await refreshAccessToken();
    if (newToken) {
      debugAuth("API request - token refreshed, retrying:", endpoint);
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      debugAuth("API request - token refresh failed, throwing 401");
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message =
      buildErrorMessage(errorData) ?? `Request failed with status ${response.status}`;
    debugAuth("API response -", endpoint, "status:", response.status, "error:", message);
    throw new ApiError(message, response.status, errorData);
  }

  if (response.status === 204) {
    debugAuth("API response -", endpoint, "status: 204 (no content)");
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    debugAuth("API response -", endpoint, "status:", response.status, "content-type: json");
    return response.json() as Promise<T>;
  }

  debugAuth("API response -", endpoint, "status:", response.status, "content-type: non-json");
  return undefined as T;
}

async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
      });
    } else {
      throw new ApiError("Your session has expired. Please sign in again.", 401);
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message =
      (errorData as Record<string, unknown>)?.detail as string ??
      `Upload failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
  upload: <T>(endpoint: string, formData: FormData) =>
    uploadFile<T>(endpoint, formData),
};

// onTokensCleared is exported inline at its definition above.
export { ApiError, clearTokens, getStoredToken, setRefreshToken, setStoredToken, STORAGE_KEY_REFRESH, STORAGE_KEY_TOKEN };
