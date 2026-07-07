import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchManagerDashboard } from '../../services/manager';
import type { ListFilters } from '../../components/advanced-filter-modal';

export function useManagerTenancies(userId?: string, filters: ListFilters = {}) {
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchManagerDashboard(userId as string, filters),
    queryKey: ['manager-dashboard', userId, 'tenancies', filters],
  });

  const tenancies = query.data?.tenancies ?? [];

  return {
    ...query,
    tenancies,
  };
}

export function useManagerTenancy(userId: string | undefined, tenancyId: string) {
  const query = useManagerTenancies(userId);

  const tenancy = useMemo(
    () => query.tenancies.find((item) => item.id === tenancyId) ?? null,
    [query.tenancies, tenancyId],
  );

  return {
    ...query,
    tenancy,
  };
}
