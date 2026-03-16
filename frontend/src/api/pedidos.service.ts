import apiClient from './axios.config';
import type { PedidoBodega } from '../types/pedidos.types';

interface CrearPedidoPayload {
  items: { producto_id: number; cantidad: number }[];
  notas?: string;
}

export const pedidosService = {
  async listar(sedeId?: number): Promise<PedidoBodega[]> {
    const params: Record<string, any> = {};
    if (sedeId) params.sede_id = sedeId;
    const r = await apiClient.get('/pedidos/', { params });
    return r.data.data;
  },

  async crear(payload: CrearPedidoPayload): Promise<PedidoBodega> {
    const r = await apiClient.post('/pedidos/', payload);
    return r.data.data;
  },

  async marcarEntregado(id: number): Promise<PedidoBodega> {
    const r = await apiClient.patch(`/pedidos/${id}/`, { status: 'ENTREGADO' });
    return r.data.data;
  },

  async cancelar(id: number): Promise<PedidoBodega> {
    const r = await apiClient.patch(`/pedidos/${id}/`, { status: 'CANCELADO' });
    return r.data.data;
  },
};
