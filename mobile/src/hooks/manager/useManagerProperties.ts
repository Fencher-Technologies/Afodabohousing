import { useQuery } from '@tanstack/react-query';
import { fetchManagerProperties, fetchManagerProperty } from '../../services/properties.service';

export function useManagerProperties(managerId?: string) {
  return useQuery({
    enabled: Boolean(managerId),
    queryFn: () => fetchManagerProperties(managerId as string),
    queryKey: ['manager-properties', managerId],
  });
}

export function useManagerProperty(managerId?: string, propertyId?: string) {
  return useQuery({
    enabled: Boolean(managerId && propertyId),
    queryFn: () => fetchManagerProperty(managerId as string, propertyId as string),
    queryKey: ['manager-property', managerId, propertyId],
  });
}
