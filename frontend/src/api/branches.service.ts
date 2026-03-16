import apiClient from './axios.config';
import type {
  SedeDetail,
  SedeListResponse,
  SedeCreatePayload,
  SedeUpdatePayload,
} from '../types/auth.types';

const BASE = '/branches';

export const branchesService = {
  list(): Promise<SedeListResponse> {
    return apiClient.get(`${BASE}/`).then((r) => r.data);
  },

  get(id: number): Promise<{ success: boolean; data: SedeDetail }> {
    return apiClient.get(`${BASE}/${id}/`).then((r) => r.data);
  },

  create(payload: SedeCreatePayload): Promise<{ success: boolean; message: string; data: SedeDetail }> {
    return apiClient.post(`${BASE}/`, payload).then((r) => r.data);
  },

  update(
    id: number,
    payload: SedeUpdatePayload
  ): Promise<{ success: boolean; message: string; data: SedeDetail }> {
    return apiClient.put(`${BASE}/${id}/`, payload).then((r) => r.data);
  },

  toggleActive(id: number): Promise<{ success: boolean; message: string; data: { is_active: boolean } }> {
    return apiClient.delete(`${BASE}/${id}/`).then((r) => r.data);
  },
};
