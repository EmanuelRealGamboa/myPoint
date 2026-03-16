import apiClient from './axios.config';
import type { LoginCredentials, LoginResponse, DashboardResponse } from '../types/auth.types';
import { tokenStore } from '../utils/tokenStore';

export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', credentials);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  },

  /**
   * Get admin dashboard summary
   */
  getDashboardSummary: async (): Promise<DashboardResponse> => {
    const response = await apiClient.get<DashboardResponse>('/auth/admin/dashboard/summary/');
    return response.data;
  },

  /**
   * User requests admin to unlock their blocked account.
   */
  requestUnlock: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/request-unlock/', { email });
    return response.data;
  },

  /**
   * Send password-reset email link.
   */
  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/password-reset/', { email });
    return response.data;
  },

  /**
   * Confirm password reset with token from email link.
   */
  confirmPasswordReset: async (
    token: string,
    password: string,
    password_confirm: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/password-reset/confirm/', {
      token,
      password,
      password_confirm,
    });
    return response.data;
  },

  /**
   * Admin unlocks a user account.
   */
  adminUnlock: async (userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/auth/admin/unlock/${userId}/`);
    return response.data;
  },

  /**
   * Fetch accounts that are currently locked or have a pending unlock request.
   */
  getLockedAccounts: async () => {
    const response = await apiClient.get('/auth/locked-accounts/');
    return response.data;
  },

  /**
   * Fetch the security audit log (paginated).
   */
  getAuditLog: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/auth/audit-log/', { params });
    return response.data;
  },

  /**
   * Logout user — clears this tab's session only (sessionStorage + memory).
   * Other tabs keep their own independent sessions.
   */
  logout: () => {
    tokenStore.clear();
  },
};
