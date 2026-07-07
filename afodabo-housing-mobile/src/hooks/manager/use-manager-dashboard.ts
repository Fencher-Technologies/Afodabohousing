import { useQuery } from '@tanstack/react-query';
import { fetchManagerDashboard } from '../../services/manager';
import type { ListFilters } from '../../components/advanced-filter-modal';

export function useManagerDashboard(userId?: string, filters: ListFilters = {}) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchManagerDashboard(userId as string, filters),
    queryKey: ['manager-dashboard', userId, 'dashboard', filters],
  });
}
