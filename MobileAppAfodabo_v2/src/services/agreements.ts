import { api } from "../lib/api-client";

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
  version: number;
  status: string;
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
    file_name: string;
    agreement_url: string;
  } | null;
  manager?: { consented: boolean };
  tenant?: { consented: boolean };
  version?: number;
  status?: string;
}

export const agreementsService = {
  getState: (leaseId: string) =>
    api.get<BackendAgreementState>(`/agreements/${leaseId}`),

  uploadDocument: (leaseId: string, fileUri: string, fileName: string, mimeType: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    return api.upload<BackendAgreementState>(`/agreements/${leaseId}/upload`, formData);
  },

  consent: (leaseId: string) =>
    api.post<{ state: BackendAgreementState }>(`/agreements/${leaseId}/consent`),

  listVersions: (leaseId: string) =>
    api.get<AgreementVersions>(`/agreements/${leaseId}/versions`),
};
