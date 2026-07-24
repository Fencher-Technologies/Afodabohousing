import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agreementsService } from "../services/agreements";
import type {
  AgreementState,
  AgreementVersions,
} from "../services/agreements";
import type {
  BuildAgreementRequest,
  ConsentStateResponse,
  AgreementContent,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementResponse,
} from "@/src/types";

// ─── Legacy hooks (upload flow) ─────────────────────────────────────────

export function useAgreementState(leaseId: string) {
  return useQuery({
    queryKey: ["agreements", leaseId],
    queryFn: () => agreementsService.getState(leaseId),
    enabled: !!leaseId,
    select: (data): AgreementState => ({
      document: data.current_document
        ? {
            id: data.current_document.id,
            file_name: data.current_document.file_name || "Agreement",
            agreement_url: data.current_document.agreement_url,
          }
        : null,
      manager_consented: data.manager?.consented ?? false,
      tenant_consented: data.tenant?.consented ?? false,
      both_consented:
        (data.manager?.consented ?? false) &&
        (data.tenant?.consented ?? false),
      version: data.version,
      status: data.status,
    }),
  });
}

export function useAgreementVersions(leaseId: string) {
  return useQuery<AgreementVersions>({
    queryKey: ["agreements", leaseId, "versions"],
    queryFn: () => agreementsService.listVersions(leaseId),
    enabled: !!leaseId,
  });
}

export function useUploadAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      fileUri,
      fileName,
      mimeType,
    }: {
      leaseId: string;
      fileUri: string;
      fileName: string;
      mimeType: string;
    }) => agreementsService.uploadDocument(leaseId, fileUri, fileName, mimeType),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["agreements", variables.leaseId] });
    },
  });
}

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
  AgreementState,
  AgreementVersions,
  ConsentStateResponse,
  AgreementContent,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementResponse,
};
