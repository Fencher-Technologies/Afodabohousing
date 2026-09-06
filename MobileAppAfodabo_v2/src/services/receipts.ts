import {
  cacheDirectory,
  writeAsStringAsync,
  makeDirectoryAsync,
  StorageAccessFramework,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { API_BASE_URL } from "../../constants/config";
import { api, getStoredToken } from "../lib/api-client";

const RECEIPTS_DIR = `${cacheDirectory}receipts/`;

/**
 * Fetch the server-rendered receipt PDF and save it to the device.
 *
 * The backend already renders receipts with ReportLab at
 * GET /receipts/{id}/pdf, but nothing in the app called it, which is why
 * receipts were listable but not downloadable. Mirrors the save/share
 * behaviour in agreements.ts: Android Downloads via SAF where available,
 * share sheet everywhere else.
 */
async function downloadPdf(receiptId: string, receiptNumber?: string): Promise<boolean> {
  try {
    const token = await getStoredToken();
    const response = await fetch(`${API_BASE_URL}/receipts/${receiptId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Receipt PDF request failed: ${response.status}`);

    // RN's fetch has no arrayBuffer->base64 helper, so go through FileReader.
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the receipt PDF"));
      reader.onloadend = () => {
        const result = String(reader.result || "");
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.readAsDataURL(blob);
    });
    if (!base64) throw new Error("Receipt PDF was empty");

    const filename = `receipt-${receiptNumber || receiptId}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");

    try {
      await makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
    } catch {
      // already exists
    }
    const localUri = `${RECEIPTS_DIR}${filename}`;
    await writeAsStringAsync(localUri, base64, { encoding: "base64" });

    if (Platform.OS === "android") {
      try {
        const downloadsUri = StorageAccessFramework.getUriForDirectoryInRoot("Downloads");
        const safUri = await StorageAccessFramework.createFileAsync(
          downloadsUri,
          filename.replace(/\.pdf$/, ""),
          "application/pdf",
        );
        await StorageAccessFramework.writeAsStringAsync(safUri, base64, { encoding: "base64" });
        return true;
      } catch {
        // SAF unavailable — fall through to the share sheet
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        mimeType: "application/pdf",
        dialogTitle: `Save ${filename}`,
        UTI: "com.adobe.pdf",
      });
    }
    return true;
  } catch (error) {
    console.error("Receipt PDF download failed:", error);
    return false;
  }
}

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  lease_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  property_title: string | null;
  property_address: string | null;
  unit_label: string | null;
  manager_name: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_type: string;
  payment_date: string | null;
  transaction_reference: string | null;
  coverage_days: number | null;
  status: "active" | "voided";
  created_at: string;
}

interface ReceiptListResponse {
  items: Receipt[];
  total: number;
}

export const receiptsService = {
  /** Receipts for the signed-in tenant. */
  listMine: (status?: string) =>
    api.get<ReceiptListResponse>(`/receipts/my${status ? `?status=${status}` : ""}`),

  /** Receipts across the signed-in manager's leases. */
  listOwner: (status?: string) =>
    api.get<ReceiptListResponse>(`/receipts${status ? `?status=${status}` : ""}`),

  getById: (id: string) => api.get<Receipt>(`/receipts/${id}`),

  void: (id: string) => api.post<Receipt>(`/receipts/${id}/void`, {}),

  /** Download the receipt PDF to the device. Returns false on failure. */
  downloadPdf,
};
