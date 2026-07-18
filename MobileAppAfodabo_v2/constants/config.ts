export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const NYLONPAY_DEEPLINK_URL =
  process.env.EXPO_PUBLIC_NYLONPAY_DEEPLINK;

if (!API_BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Add it to your .env file."
  );
}
