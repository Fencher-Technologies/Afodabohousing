import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agreementsService } from "../services/agreements";
import type {
  BuildAgreementRequest,
  ConsentStateResponse,
  AgreementContent,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementResponse,
} from "@/src/types";

export function useConsentAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      signedName,
    }: {
      leaseId: string;
      signedName: string;
    }) => agreementsService.consent(leaseId, signedName),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agreements", variables.leaseId] });
    },
  });
}

export function useCancelAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaseId: string) => agreementsService.cancel(leaseId),
    onSuccess: (_data, leaseId) => {
      qc.invalidateQueries({ queryKey: ["agreements", leaseId] });
    },
  });
}

// ─── New hooks (builder flow) ──────────────────────────────────────────

export function useAgreementTemplate() {
  return useQuery<AgreementTemplate>({
    queryKey: ["agreement-template"],
    queryFn: () => agreementsService.getTemplate(),
    staleTime: 86_400_000, // 24h — templates rarely change
  });
}

export function useAgreementContent(leaseId: string | undefined) {
  return useQuery<AgreementContent>({
    queryKey: ["agreements", leaseId, "content"],
    queryFn: () => agreementsService.getContent(leaseId!),
    enabled: !!leaseId,
  });
}

export function useConsentState(leaseId: string | undefined) {
  return useQuery<ConsentStateResponse>({
    queryKey: ["agreements", leaseId, "consent-state"],
    queryFn: () => agreementsService.getConsentState(leaseId!),
    enabled: !!leaseId,
  });
}

export function useBuildAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      data,
    }: {
      leaseId: string;
      data: BuildAgreementRequest;
    }) => agreementsService.build(leaseId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agreements", variables.leaseId] });
    },
  });
}

export function useEditAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      data,
    }: {
      leaseId: string;
      data: BuildAgreementRequest;
    }) => agreementsService.edit(leaseId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agreements", variables.leaseId] });
    },
  });
}

export function useAgreementVersionHistory(leaseId: string | undefined) {
  return useQuery<AgreementVersionHistory>({
    queryKey: ["agreements", leaseId, "version-history"],
    queryFn: () => agreementsService.getVersionHistory(leaseId!),
    enabled: !!leaseId,
  });
}

export type {
  ConsentStateResponse,
  AgreementContent,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementResponse,
};
