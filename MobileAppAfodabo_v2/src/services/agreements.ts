import { api } from "../lib/api-client";
import type {
  AgreementContent,
  AgreementConsentState,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementRequest,
  BuildAgreementResponse,
  ConsentRequest,
  ConsentStateResponse,
} from "@/src/types";

export interface AgreementDocument {
  id: string;
  file_name: string;
  agreement_url: string;
}

export interface AgreementState {
  document: AgreementDocument | null;
  manager_consented: boolean;
  tenant_consented: boolean;
  both_consented: boolean;
  version?: number;
  status?: string;
}

export interface AgreementVersion {
  id: string;
  version: number;
  file_name: string;
  agreement_url: string;
  status: string;
  tenant_consented: boolean;
  manager_consented: boolean;
  created_at: string;
}

export interface AgreementVersions {
  versions: AgreementVersion[];
  active_version: number | null;
}

interface BackendAgreementState {
  current_document?: {
    id: string;
    agreement_url: string;
    file_name?: string;
  } | null;
  manager?: { consented: boolean; consented_at?: string; user_id?: string };
  tenant?: { consented: boolean; consented_at?: string; user_id?: string };
  version?: number;
  status?: string;
}

export const agreementsService = {
  getState: (leaseId: string) =>
    api.get<BackendAgreementState>(`/agreements/${leaseId}`),

  uploadDocument: (leaseId: string, fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();
    formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob);
    return api.upload<BackendAgreementState>(`/agreements/${leaseId}/upload`, formData);
  },

  consent: (leaseId: string, signedName: string) =>
    api.post<{ state: BackendAgreementState }>(`/agreements/${leaseId}/consent`, {
      signed_name: signedName,
    } as ConsentRequest),

  listVersions: (leaseId: string) =>
    api.get<AgreementVersions>(`/agreements/${leaseId}/versions`),

  // ─── New endpoints ─────────────────────────────────────────────────

  getTemplate: () =>
    api.get<AgreementTemplate>("/agreements/template"),

  getContent: (leaseId: string) =>
    api.get<AgreementContent>(`/agreements/${leaseId}/content`),

  getConsentState: (leaseId: string) =>
    api.get<ConsentStateResponse>(`/agreements/${leaseId}/consent-state`),

  build: (leaseId: string, data: BuildAgreementRequest) =>
    api.post<BuildAgreementResponse>(`/agreements/${leaseId}/build`, data),

  edit: (leaseId: string, data: BuildAgreementRequest) =>
    api.post<BuildAgreementResponse>(`/agreements/${leaseId}/edit`, data),

  getVersionHistory: (leaseId: string) =>
    api.get<AgreementVersionHistory>(`/agreements/${leaseId}/versions`),

  cancel: (leaseId: string) =>
    api.post<{ success: boolean; status: string }>(`/agreements/${leaseId}/cancel`, {}),
};
