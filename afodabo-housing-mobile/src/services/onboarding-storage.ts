import { sessionStorage } from './session-storage';

const ONBOARDING_STORAGE_KEY = 'mobile_onboarding_seen';

export async function hasSeenOnboarding() {
  const value = await sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
  return value === 'true';
}

export async function markOnboardingSeen() {
  await sessionStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}
