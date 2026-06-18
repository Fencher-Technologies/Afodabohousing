import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'afodabo_housing_onboarding_seen_v1';
const KEYCHAIN_SERVICE = 'afodabo-housing-rebuild-onboarding';

let webMemorySeen = false;

export async function hasSeenOnboarding() {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage.getItem(ONBOARDING_KEY) === 'true';
    }

    return webMemorySeen;
  }

  const value = await SecureStore.getItemAsync(ONBOARDING_KEY, {
    keychainService: KEYCHAIN_SERVICE,
  });

  return value === 'true';
}

export async function markOnboardingSeen() {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(ONBOARDING_KEY, 'true');
      return;
    }

    webMemorySeen = true;
    return;
  }

  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    keychainService: KEYCHAIN_SERVICE,
  });
}
