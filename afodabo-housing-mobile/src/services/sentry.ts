import * as Sentry from '@sentry/react-native';

let initialized = false;

export interface SentryUserContext {
  email: string;
  id: string;
  role?: string | null;
  username?: string | null;
}

export function initializeSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn || initialized) {
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

export function setSentryUser(user: SentryUserContext | null) {
  if (!initialized) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    email: user.email,
    id: user.id,
    username: user.username ?? undefined,
    role: user.role ?? undefined,
  });
}
