import * as Print from "expo-print";
import {
  cacheDirectory,
  writeAsStringAsync,
  makeDirectoryAsync,
  StorageAccessFramework,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { api } from "../lib/api-client";
import { buildAgreementHtml } from "../utils/agreement-html";
import type {
  AgreementContent,
  AgreementTemplate,
  AgreementVersionHistory,
  BuildAgreementRequest,
  BuildAgreementResponse,
  ConsentRequest,
  ConsentStateResponse,
  RejectAgreementResponse,
} from "@/src/types";

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

const AGREEMENTS_DIR = `${cacheDirectory}agreements/`;

async function ensureDir(): Promise<void> {
  try {
    await makeDirectoryAsync(AGREEMENTS_DIR, { intermediates: true });
  } catch {
    // exists
  }
}

/**
 * Generate a PDF from agreement content and save directly to device storage.
 * Returns true on success, false on failure.
 */
async function savePdfToDevice(
  content: AgreementContent,
  filename: string,
): Promise<boolean> {
  try {
    const html = buildAgreementHtml(content);
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    if (!base64) throw new Error("PDF generation returned no data");

    await ensureDir();
    const localUri = `${AGREEMENTS_DIR}${filename}`;
    await writeAsStringAsync(localUri, base64, { encoding: "base64" });

    // Try to save to public Downloads on Android
    if (Platform.OS === "android") {
      try {
        const downloadsUri = StorageAccessFramework.getUriForDirectoryInRoot("Downloads");
        const safUri = await StorageAccessFramework.createFileAsync(
          downloadsUri,
          filename.replace(/\.pdf$/, ""),
          "application/pdf",
        );
        await StorageAccessFramework.writeAsStringAsync(safUri, base64, {
          encoding: "base64",
        });
        return true;
      } catch {
        // SAF not available — fall through to share sheet
      }
    }

    // Fallback: open share sheet (works on iOS + Android without SAF)
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(localUri, {
        mimeType: "application/pdf",
        dialogTitle: `Save ${filename}`,
        UTI: "com.adobe.pdf",
      });
    }

    return true;
  } catch (error) {
    console.error("Agreement PDF save failed:", error);
    return false;
  }
}

export const agreementsService = {
  consent: (leaseId: string, signedName: string) =>
    api.post<{ state: BackendAgreementState }>(`/agreements/${leaseId}/consent`, {
      signed_name: signedName,
    } as ConsentRequest),

  /**
   * Decline the agreement and tell the other party what needs to change.
   * Moves the document to `changes_requested` and clears any consent already
   * given, since the other party signed a version now under objection.
   */
  reject: (leaseId: string, reason: string) =>
    api.post<RejectAgreementResponse>(`/agreements/${leaseId}/reject`, { reason }),

  // ─── Endpoints ─────────────────────────────────────────────────

  getTemplate: () =>
    api.get<AgreementTemplate>("/agreements/template"),

  getContent: (leaseId: string) =>
    api.get<AgreementContent>(`/agreements/${leaseId}/content`),

  getVersionContent: (leaseId: string, versionId: string) =>
    api.get<AgreementContent>(`/agreements/${leaseId}/versions/${versionId}/content`),

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

  // ─── PDF Download (HTML-based, matches on-screen layout) ───────────

  /**
   * Generate PDF from agreement content and auto-save to device.
   * Call this with content already loaded in the screen.
   */
  downloadPdf: async (content: AgreementContent): Promise<boolean> => {
    const anum = content.agreement_number || "agreement";
    const filename = `tenancy-agreement-${anum}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
    return savePdfToDevice(content, filename);
  },

  /**
   * Fetch a specific version's content then generate and save the PDF.
   * Used from the version history screen.
   */
  downloadVersionPdf: async (leaseId: string, versionId: string): Promise<boolean> => {
    try {
      const versionContent = await api.get<AgreementContent>(
        `/agreements/${leaseId}/versions/${versionId}/content`,
      );
      const anum = versionContent.agreement_number || "agreement";
      const v = versionContent.version || 1;
      const filename = `tenancy-agreement-${anum}-v${v}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
      return savePdfToDevice(versionContent, filename);
    } catch (error) {
      console.error("Agreement version PDF failed:", error);
      return false;
    }
  },
};
