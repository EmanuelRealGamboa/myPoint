import apiClient from './axios.config';
import type { ConfiguracionFiscal } from '../types/billing.types';

const BASE = '/billing';

export const billingService = {
  getConfigFiscal(sedeId: number): Promise<{ success: boolean; data: ConfiguracionFiscal | null }> {
    return apiClient.get(`${BASE}/config/${sedeId}/`).then(r => r.data);
  },

  saveConfigFiscal(sedeId: number, payload: Partial<ConfiguracionFiscal>): Promise<{ success: boolean; data: ConfiguracionFiscal }> {
    return apiClient.put(`${BASE}/config/${sedeId}/`, payload).then(r => r.data);
  },

  listConfigsFiscales(): Promise<{ success: boolean; data: ConfiguracionFiscal[] }> {
    return apiClient.get(`${BASE}/config/`).then(r => r.data);
  },
};
