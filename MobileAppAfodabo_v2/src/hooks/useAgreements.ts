import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { agreementsService, type AgreementState, type AgreementVersions } from "../services/agreements";

export function useAgreementState(leaseId: string) {
  return useQuery({
    queryKey: ["agreements", leaseId],
    queryFn: () => agreementsService.getState(leaseId),
    enabled: !!leaseId,
    select: (data): AgreementState => ({
      document: data.current_document
        ? {
            id: data.current_document.id,
            file_name: data.current_document.file_name,
            agreement_url: data.current_document.agreement_url,
          }
        : null,
      manager_consented: data.manager?.consented ?? false,
      tenant_consented: data.tenant?.consented ?? false,
      both_consented: (data.manager?.consented ?? false) && (data.tenant?.consented ?? false),
      version: data.version ?? 1,
      status: data.status ?? (data.current_document ? "active" : "none"),
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
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ["agreements", variables.leaseId] });
    },
  });
}

export function useConsentAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leaseId: string) => agreementsService.consent(leaseId),
    onSuccess: (_data, leaseId) => {
      queryClient.invalidateQueries({ queryKey: ["agreements", leaseId] });
    },
  });
}
