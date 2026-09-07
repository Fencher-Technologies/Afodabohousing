/**
 * Super admin data hooks. Mirrors the queries behind the web dashboard.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/src/services/admin";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminService.stats(),
  });
}

export function useBoostStats() {
  return useQuery({
    queryKey: ["admin", "boost-stats"],
    queryFn: () => adminService.boostStats(),
  });
}

export function useAdminUsers(role?: string) {
  return useQuery({
    queryKey: ["admin", "users", role ?? "all"],
    queryFn: () => adminService.listUsers(role),
  });
}

export function usePendingManagers() {
  return useQuery({
    queryKey: ["admin", "pending-managers"],
    queryFn: () => adminService.pendingManagers(),
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      adminService.setUserStatus(userId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (userId: string) => adminService.resetPassword(userId),
  });
}
