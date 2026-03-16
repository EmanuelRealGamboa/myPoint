import apiClient from './axios.config';
import type {
  VentaPayload,
  Venta,
  VentaListResponse,
  CodigoAperturaResponse,
  AperturaCaja,
  MiEstadoCajaResponse,
  SedeResumenVentas,
  ReportesData,
} from '../types/sales.types';

const BASE = '/sales';

export const salesService = {
  // ── Ventas ────────────────────────────────────────────────────────────────

  createVenta(payload: VentaPayload): Promise<{ success: boolean; message: string; data: Venta }> {
    return apiClient.post(`${BASE}/ventas/`, payload).then(r => r.data);
  },

  listVentas(params?: {
    sede_id?:     number;
    fecha_desde?: string;
    fecha_hasta?: string;
    cajero_id?:   number;
    status?:      string;
    page?:        number;
    page_size?:   number;
  }): Promise<VentaListResponse> {
    return apiClient.get(`${BASE}/ventas/`, { params }).then(r => r.data);
  },

  getVenta(id: number): Promise<{ success: boolean; data: Venta }> {
    return apiClient.get(`${BASE}/ventas/${id}/`).then(r => r.data);
  },

  cancelarVenta(id: number): Promise<{ success: boolean; message: string; data: Venta }> {
    return apiClient.patch(`${BASE}/ventas/${id}/cancelar/`).then(r => r.data);
  },

  // ── Apertura de Caja ──────────────────────────────────────────────────────

  generarCodigoApertura(): Promise<{ success: boolean; data: CodigoAperturaResponse }> {
    return apiClient.post(`${BASE}/cajas/generar-codigo/`).then(r => r.data);
  },

  abrirCaja(codigo: string): Promise<{ success: boolean; message: string; data: AperturaCaja }> {
    return apiClient.post(`${BASE}/cajas/abrir/`, { codigo }).then(r => r.data);
  },

  miEstadoCaja(): Promise<MiEstadoCajaResponse> {
    return apiClient.get(`${BASE}/cajas/mi-estado/`).then(r => r.data);
  },

  cerrarCaja(aperturaId: number): Promise<{ success: boolean; message: string; data: AperturaCaja }> {
    return apiClient.post(`${BASE}/cajas/${aperturaId}/cerrar/`).then(r => r.data);
  },

  cajasActivas(): Promise<{ success: boolean; data: AperturaCaja[] }> {
    return apiClient.get(`${BASE}/cajas/activas/`).then(r => r.data);
  },

  // ── Admin resumen ─────────────────────────────────────────────────────────

  adminResumen(): Promise<{ success: boolean; data: SedeResumenVentas[] }> {
    return apiClient.get(`${BASE}/admin/resumen/`).then(r => r.data);
  },

  reportes(params?: { sede_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<{ success: boolean; data: ReportesData }> {
    return apiClient.get(`${BASE}/reportes/`, { params }).then(r => r.data);
  },
};
