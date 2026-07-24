import { api } from "../lib/api-client";
import type { PaymentVerification, PaymentVerificationCreate } from "../types";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export const paymentVerificationsService = {
  create: (data: PaymentVerificationCreate) =>
    api.post<PaymentVerification>("/payment-verifications", data),

  getMySubmissions: (status?: string) =>
    api.get<PaymentVerification[]>(
      `/payment-verifications/my${status ? `?status=${status}` : ""}`
    ),

  getOwnerSubmissions: (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const qs = params.toString();
    return api.get<PaymentVerification[]>(
      `/payment-verifications${qs ? `?${qs}` : ""}`
    );
  },

  approve: (id: string) =>
    api.patch<PaymentVerification>(`/payment-verifications/${id}/approve`, {}),

  reject: (id: string, rejectionReason: string) =>
    api.patch<PaymentVerification>(`/payment-verifications/${id}/reject`, {
      rejection_reason: rejectionReason,
    }),

  uploadScreenshot: async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split("/").pop() || "screenshot.jpg";
    formData.append("file", {
      uri,
      name: filename,
      type: "image/jpeg",
    } as unknown as Blob);
    return api.upload<{ path: string; url: string }>(
      "/uploads/payment-proof",
      formData
    );
  },
};
