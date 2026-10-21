/**
 * Client-side checks that mirror the limits on the storage buckets and the
 * API's /uploads routes. They exist to give people a clear message up front;
 * the buckets enforce the same rules, so skipping these is never a bypass.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Formats every browser can display, which is what the public buckets serve. */
export const WEB_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Receipts and maintenance photos also accept what iPhones produce by default. */
export const PHOTO_TYPES = [...WEB_IMAGE_TYPES, 'image/heic', 'image/heif'] as const;

export const WEB_IMAGE_ACCEPT = WEB_IMAGE_TYPES.join(',');
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',');

/** Returns a user-facing problem with the file, or null if it is acceptable. */
export function imageFileProblem(file: File, allowed: readonly string[] = WEB_IMAGE_TYPES): string | null {
  if (!allowed.includes(file.type)) {
    const names = allowed.map(t => t.replace('image/', '').toUpperCase()).join(', ');
    return `Unsupported file type. Please choose one of: ${names}.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}
