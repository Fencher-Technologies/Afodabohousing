import { api } from "../lib/api-client";
import type { BoostInitiateResponse, BoostPackage } from "@/src/types";
import { API_BASE_URL } from "@/constants/config";

export const boostsService = {
  fetchPackages: () => api.get<BoostPackage[]>("/boosts/packages"),

  initiateBoost: (propertyId: string, durationDays: number, phoneNumber: string, callbackUrl?: string) =>
    api.post<BoostInitiateResponse>("/boosts/initiate", {
      property_id: propertyId,
      duration_days: durationDays,
      phone_number: phoneNumber,
      callback_url: callbackUrl || API_BASE_URL,
    }),
};
