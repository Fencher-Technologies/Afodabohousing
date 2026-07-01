import { useQuery } from '@tanstack/react-query';
import { fetchAdminDashboard } from '../../services/admin';

export function useAdminDashboard(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchAdminDashboard,
    queryKey: ['admin-dashboard'],
  });
}
