import { api } from "../lib/api-client";

interface TenantResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  owner_id: string;
  created_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

interface TenantCreateData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status?: string;
}

export const tenantsService = {
  list: (skip = 0, limit = 100, search?: string) => {
    let endpoint = `/tenants?skip=${skip}&limit=${limit}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    return api.get<PaginatedResponse<TenantResponse>>(endpoint);
  },

  getById: (id: string) =>
    api.get<TenantResponse>(`/tenants/${id}`),

  create: (data: TenantCreateData) =>
    api.post<TenantResponse>("/tenants", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<TenantResponse>(`/tenants/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/tenants/${id}`),

  resolveByEmail: (email: string) =>
    api.get<TenantResponse>(`/tenants/resolve-by-email?email=${encodeURIComponent(email)}`),
};
