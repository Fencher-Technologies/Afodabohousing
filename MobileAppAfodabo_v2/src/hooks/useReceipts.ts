import { useQuery } from "@tanstack/react-query";

import { receiptsService } from "../services/receipts";

export function useMyReceipts(status?: string) {
  return useQuery({
    queryKey: ["receipts", "my", status ?? "all"],
    queryFn: () => receiptsService.listMine(status),
    staleTime: 30_000,
  });
}

export function useOwnerReceipts(status?: string) {
  return useQuery({
    queryKey: ["receipts", "owner", status ?? "all"],
    queryFn: () => receiptsService.listOwner(status),
    staleTime: 30_000,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ["receipts", id],
    queryFn: () => receiptsService.getById(id!),
    enabled: !!id,
  });
}
