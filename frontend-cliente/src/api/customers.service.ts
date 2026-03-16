import apiClient from './axios.config';
import type { ClienteProfile, AuthTokens, MisComprasResponse } from '../types/customer.types';

interface RegisterPayload {
  first_name: string;
  last_name:  string;
  email:      string;
  password:   string;
  telefono?:  string;
  fecha_nac?: string | null;
}

interface LoginPayload {
  email:    string;
  password: string;
}

export const customersService = {
  async register(payload: RegisterPayload): Promise<{ tokens: AuthTokens; profile: ClienteProfile }> {
    const r = await apiClient.post('/customers/registro/', payload);
    return r.data.data;
  },

  async login(payload: LoginPayload): Promise<{ access: string; refresh: string }> {
    const r = await apiClient.post('/auth/token/', {
      email:    payload.email,
      password: payload.password,
    });
    return r.data;
  },

  async getPerfil(): Promise<ClienteProfile> {
    const r = await apiClient.get('/customers/perfil/');
    return r.data.data;
  },

  async updatePerfil(data: Partial<ClienteProfile>): Promise<ClienteProfile> {
    const r = await apiClient.patch('/customers/perfil/', data);
    return r.data.data;
  },

  async getMiQR(): Promise<{ qr_token: string; qr_base64: string }> {
    const r = await apiClient.get('/customers/mi-qr/');
    return r.data.data;
  },

  async getMisCompras(page = 1, pageSize = 20): Promise<MisComprasResponse> {
    const r = await apiClient.get('/customers/mis-compras/', {
      params: { page, page_size: pageSize },
    });
    return r.data.data;
  },
};
