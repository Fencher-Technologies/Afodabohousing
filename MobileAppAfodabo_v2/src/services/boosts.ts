import { api } from "../lib/api-client";
import type { BoostInitiateResponse, BoostPackage } from "@/src/types";

export const boostsService = {
  fetchPackages: () => api.get<BoostPackage[]>("/boosts/packages"),

  initiateBoost: (propertyId: string, durationDays: number, phoneNumber: string) =>
    api.post<BoostInitiateResponse>("/boosts/initiate", {
      property_id: propertyId,
      duration_days: durationDays,
      phone_number: phoneNumber,
    }),
};