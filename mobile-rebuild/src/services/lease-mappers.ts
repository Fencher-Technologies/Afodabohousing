import type { LeaseRow } from '../types/database';

export interface TenancyLikeRow extends LeaseRow {
  manager_id: string;
  rent_amount: number;
  rent_end_date: string;
  rent_period: 'monthly';
  rent_start_date: string;
}

export function mapLeaseToTenancyLike(lease: LeaseRow): TenancyLikeRow {
  return {
    ...lease,
    manager_id: lease.owner_id,
    rent_amount: lease.monthly_rent,
    rent_end_date: lease.end_date,
    rent_period: 'monthly',
    rent_start_date: lease.start_date,
  };
}
