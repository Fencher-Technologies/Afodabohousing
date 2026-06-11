import { useQuery } from '@tanstack/react-query';
import { fetchManagerTenancies, fetchManagerTenancy } from '../../services/tenancies.service';

export function useManagerTenancies(managerId?: string) {
  return useQuery({
    enabled: Boolean(managerId),
    queryFn: () => fetchManagerTenancies(managerId as string),
    queryKey: ['manager-tenancies', managerId],
  });
}

export function useManagerTenancy(managerId?: string, tenancyId?: string) {
  return useQuery({
    enabled: Boolean(managerId && tenancyId),
    queryFn: () => fetchManagerTenancy(managerId as string, tenancyId as string),
    queryKey: ['manager-tenancy', managerId, tenancyId],
  });
}
