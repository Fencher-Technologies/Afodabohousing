export function getBackendApiEnv() {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error(
      'Missing backend API base URL. Set EXPO_PUBLIC_API_BASE_URL to your FastAPI server URL.',
    );
  }

  if (/https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(apiBaseUrl)) {
    console.warn(
      'EXPO_PUBLIC_API_BASE_URL points to localhost. Android emulators usually need http://10.0.2.2:8000 instead of http://127.0.0.1:8000.',
    );
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ''),
  };
}
