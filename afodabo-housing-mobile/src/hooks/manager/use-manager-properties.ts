import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchManagerDashboard } from '../../services/manager';
import type { ListFilters } from '../../components/advanced-filter-modal';

export function useManagerProperties(userId?: string, filters: ListFilters = {}) {
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchManagerDashboard(userId as string, filters),
    queryKey: ['manager-dashboard', userId, 'properties', filters],
  });

  const properties = query.data?.properties ?? [];

  return {
    ...query,
    properties,
  };
}

export function useManagerProperty(userId: string | undefined, propertyId: string) {
  const query = useManagerProperties(userId);

  const property = useMemo(
    () => query.properties.find((item) => item.id === propertyId) ?? null,
    [propertyId, query.properties],
  );

  return {
    ...query,
    property,
  };
}
