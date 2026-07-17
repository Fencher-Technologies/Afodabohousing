import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "../../constants/config";

const STORAGE_KEY_TOKEN = "afodabo_access_token";
const STORAGE_KEY_REFRESH = "afodabo_refresh_token";

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
  return AsyncStorage.getItem(STORAGE_KEY_TOKEN);
}

async function setStoredToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
}

const _tokenListeners = new Set<() => void>();

export function onTokensCleared(listener: () => void) {
  _tokenListeners.add(listener);
  return () => _tokenListeners.delete(listener);
}

async function clearTokens(options?: { suppressNotification?: boolean }): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH]);
  if (!options?.suppressNotification) {
    _tokenListeners.forEach((fn) => fn());
  }
}

async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_REFRESH);
}

async function setRefreshToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_REFRESH, token);
}

async function refreshAccessToken(): Promise<string | null> {
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
): Promise<T> {
  const token = await getStoredToken();
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

  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
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
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

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

export { ApiError, clearTokens, getStoredToken, onTokensCleared, setRefreshToken, setStoredToken, STORAGE_KEY_REFRESH, STORAGE_KEY_TOKEN };
