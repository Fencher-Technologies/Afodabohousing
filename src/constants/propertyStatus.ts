/**
 * Single frontend source of truth for properties.status.
 *
 * Must match the database CHECK constraint exactly:
 *   properties_status_check CHECK (status = ANY (ARRAY[
 *     'available', 'occupied', 'maintenance', 'unlisted'
 *   ]))
 * There is deliberately no 'inactive' — a manager-hidden listing is
 * 'unlisted', and visibility for quota purposes is properties.is_active.
 * Writing any other value makes Postgres reject the whole statement.
 */
export const PROPERTY_STATUSES = [
  'available',
  'occupied',
  'maintenance',
  'unlisted',
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** Status written when a manager hides a listing (paired with is_active: false). */
export const HIDDEN_STATUS: PropertyStatus = 'unlisted';

/** Status written when a manager re-lists a hidden property. */
export const VISIBLE_STATUS: PropertyStatus = 'available';
