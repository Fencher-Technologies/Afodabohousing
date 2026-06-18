import { useQuery } from '@tanstack/react-query';
import { fetchTenantDashboard } from '../../services/tenant.service';

export function useTenantDashboard(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantDashboard(userId as string),
    queryKey: ['tenant-dashboard', userId],
  });
}
