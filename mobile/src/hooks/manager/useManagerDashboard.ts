import { useQuery } from '@tanstack/react-query';
import { fetchManagerDashboard } from '../../services/manager.service';

export function useManagerDashboard(managerId?: string) {
  return useQuery({
    enabled: Boolean(managerId),
    queryFn: () => fetchManagerDashboard(managerId as string),
    queryKey: ['manager-dashboard', managerId],
  });
}
