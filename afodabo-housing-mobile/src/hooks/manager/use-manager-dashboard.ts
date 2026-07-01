import { useQuery } from '@tanstack/react-query';
import { fetchManagerDashboard } from '../../services/manager';

export function useManagerDashboard(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchManagerDashboard(userId as string),
    queryKey: ['manager-dashboard', userId],
  });
}
