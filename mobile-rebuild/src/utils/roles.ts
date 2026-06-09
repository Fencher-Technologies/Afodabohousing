import type { AppRole } from '../types/database';

export function isAppRole(value: unknown): value is AppRole {
  return value === 'tenant' || value === 'house_manager' || value === 'admin';
}
