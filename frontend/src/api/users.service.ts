import apiClient from './axios.config';
import type {
  User,
  UserListParams,
  UserListResponse,
  UserCreatePayload,
  UserUpdatePayload,
  Turno,
  TurnoPayload,
} from '../types/auth.types';

const BASE = '/auth/users';

export const usersService = {
  list(params?: UserListParams): Promise<UserListResponse> {
    return apiClient
      .get(`${BASE}/`, { params })
      .then((r) => r.data);
  },

  get(id: number): Promise<{ success: boolean; data: User }> {
    return apiClient.get(`${BASE}/${id}/`).then((r) => r.data);
  },

  create(payload: UserCreatePayload): Promise<{ success: boolean; message: string; data: User }> {
    return apiClient.post(`${BASE}/`, payload).then((r) => r.data);
  },

  update(
    id: number,
    payload: UserUpdatePayload
  ): Promise<{ success: boolean; message: string; data: User }> {
    return apiClient.put(`${BASE}/${id}/`, payload).then((r) => r.data);
  },

  setActive(id: number, is_active: boolean): Promise<{ success: boolean; message: string; data: User }> {
    return apiClient.put(`${BASE}/${id}/`, { is_active }).then((r) => r.data);
  },

  remove(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`${BASE}/${id}/`).then((r) => r.data);
  },
};

const TURNO_BASE = '/auth/turnos';

export const turnosService = {
  list(params?: { sede_id?: number; user_id?: number; dia_semana?: number; is_active?: boolean }): Promise<{ success: boolean; data: Turno[] }> {
    return apiClient.get(`${TURNO_BASE}/`, { params }).then((r) => r.data);
  },

  get(id: number): Promise<{ success: boolean; data: Turno }> {
    return apiClient.get(`${TURNO_BASE}/${id}/`).then((r) => r.data);
  },

  create(payload: TurnoPayload): Promise<{ success: boolean; message: string; data: Turno }> {
    return apiClient.post(`${TURNO_BASE}/`, payload).then((r) => r.data);
  },

  update(id: number, payload: Partial<TurnoPayload>): Promise<{ success: boolean; message: string; data: Turno }> {
    return apiClient.put(`${TURNO_BASE}/${id}/`, payload).then((r) => r.data);
  },

  remove(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`${TURNO_BASE}/${id}/`).then((r) => r.data);
  },
};
