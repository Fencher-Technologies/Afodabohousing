import { api } from "../lib/api-client";
import type { BoostInitiateResponse, BoostPackage } from "@/src/types";
import { API_BASE_URL } from "@/constants/config";

export const boostsService = {
  fetchPackages: () => api.get<BoostPackage[]>("/boosts/packages"),

  initiateBoost: (propertyId: string, durationDays: number, callbackUrl?: string) =>
    api.post<BoostInitiateResponse>("/boosts/initiate", {
      property_id: propertyId,
      duration_days: durationDays,
      callback_url: callbackUrl || API_BASE_URL,
    }),
};
