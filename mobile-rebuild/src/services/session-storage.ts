import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_PREFIX = 'afodabo_housing_rebuild_session_';
const KEYCHAIN_SERVICE = 'afodabo-housing-rebuild-supabase-auth';
const SECURE_STORE_CHUNK_SIZE = 1500;
const CHUNK_META_SUFFIX = '__chunk_count';
const CHUNK_VALUE_SUFFIX = '__chunk_';

const webMemoryStorage = new Map<string, string>();

function encodeKeySegment(key: string) {
  return Array.from(key)
    .map((character) => character.codePointAt(0)?.toString(16).padStart(4, '0') ?? '0000')
    .join('_');
}

function toStorageKey(key: string) {
  return `${STORAGE_PREFIX}${encodeKeySegment(key)}`;
}

function toChunkMetaKey(storageKey: string) {
  return `${storageKey}${CHUNK_META_SUFFIX}`;
}

function toChunkValueKey(storageKey: string, index: number) {
  return `${storageKey}${CHUNK_VALUE_SUFFIX}${index}`;
}

function splitValue(value: string, chunkSize: number) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }

  return chunks;
}

async function getWebItem(key: string) {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage.getItem(key);
  }

  return webMemoryStorage.get(key) ?? null;
}

async function setWebItem(key: string, value: string) {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  webMemoryStorage.set(key, value);
}

async function removeWebItem(key: string) {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.removeItem(key);
    return;
  }

  webMemoryStorage.delete(key);
}

async function getSecureStoreItem(key: string) {
  return SecureStore.getItemAsync(key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    keychainService: KEYCHAIN_SERVICE,
  });
}

async function setSecureStoreItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    keychainService: KEYCHAIN_SERVICE,
  });
}

async function removeSecureStoreItem(key: string) {
  await SecureStore.deleteItemAsync(key, {
    keychainService: KEYCHAIN_SERVICE,
  });
}

async function removeChunkedSecureStoreItem(storageKey: string) {
  const chunkCountValue = await getSecureStoreItem(toChunkMetaKey(storageKey));
  const chunkCount = Number(chunkCountValue);

  await removeSecureStoreItem(storageKey);
  await removeSecureStoreItem(toChunkMetaKey(storageKey));

  if (!Number.isInteger(chunkCount) || chunkCount < 1) {
    return;
  }

  await Promise.all(
    Array.from({ length: chunkCount }, (_value, index) =>
      removeSecureStoreItem(toChunkValueKey(storageKey, index)),
    ),
  );
}

export const sessionStorage = {
  async getItem(key: string) {
    const storageKey = toStorageKey(key);

    if (Platform.OS === 'web') {
      return getWebItem(storageKey);
    }

    const directValue = await getSecureStoreItem(storageKey);

    if (directValue !== null) {
      return directValue;
    }

    const chunkCountValue = await getSecureStoreItem(toChunkMetaKey(storageKey));
    const chunkCount = Number(chunkCountValue);

    if (!Number.isInteger(chunkCount) || chunkCount < 1) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_value, index) =>
        getSecureStoreItem(toChunkValueKey(storageKey, index)),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },
  async removeItem(key: string) {
    const storageKey = toStorageKey(key);

    if (Platform.OS === 'web') {
      await removeWebItem(storageKey);
      return;
    }

    await removeChunkedSecureStoreItem(storageKey);
  },
  async setItem(key: string, value: string) {
    const storageKey = toStorageKey(key);

    if (Platform.OS === 'web') {
      await setWebItem(storageKey, value);
      return;
    }

    await removeChunkedSecureStoreItem(storageKey);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await setSecureStoreItem(storageKey, value);
      return;
    }

    const chunks = splitValue(value, SECURE_STORE_CHUNK_SIZE);

    await Promise.all(
      chunks.map((chunk, index) => setSecureStoreItem(toChunkValueKey(storageKey, index), chunk)),
    );
    await setSecureStoreItem(toChunkMetaKey(storageKey), String(chunks.length));
  },
};
