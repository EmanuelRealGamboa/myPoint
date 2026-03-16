import apiClient from './axios.config';
import type {
  Categoria, CategoriaPayload, CategoriaListResponse,
  Subcategoria, SubcategoriaPayload, SubcategoriaListResponse,
  MarcaFabricante, MarcaFabricantePayload, MarcaFabricanteListResponse,
  MarcaMoto, MarcaMotoPayload, MarcaMotoListResponse,
  ModeloMoto, ModeloMotoPayload, ModeloMotoListResponse,
  CompatibilidadPayload,
  Producto, ProductoPayload, ProductoListParams, ProductoListResponse,
  StockItem, StockUpdatePayload,
  EntradaInventario, EntradaPayload, EntradaListResponse,
  AuditoriaInventario, AuditoriaPayload, AuditoriaListResponse,
} from '../types/inventory.types';

const BASE = '/inventory';

export const inventoryService = {
  // ── Categories ────────────────────────────────────────────────────────
  listCategories(params?: { is_active?: boolean; page?: number; page_size?: number }): Promise<CategoriaListResponse> {
    return apiClient.get(`${BASE}/categories/`, { params }).then(r => r.data);
  },
  getCategory(id: number): Promise<{ success: boolean; data: Categoria }> {
    return apiClient.get(`${BASE}/categories/${id}/`).then(r => r.data);
  },
  createCategory(payload: CategoriaPayload): Promise<{ success: boolean; message: string; data: Categoria }> {
    return apiClient.post(`${BASE}/categories/`, payload).then(r => r.data);
  },
  updateCategory(id: number, payload: Partial<CategoriaPayload>): Promise<{ success: boolean; message: string; data: Categoria }> {
    return apiClient.put(`${BASE}/categories/${id}/`, payload).then(r => r.data);
  },
  toggleCategory(id: number): Promise<{ success: boolean; message: string; data: { is_active: boolean } }> {
    return apiClient.delete(`${BASE}/categories/${id}/`).then(r => r.data);
  },

  // ── Subcategories ─────────────────────────────────────────────────────
  listSubcategories(params?: { categoria?: number; is_active?: boolean; page?: number; page_size?: number }): Promise<SubcategoriaListResponse> {
    return apiClient.get(`${BASE}/subcategories/`, { params }).then(r => r.data);
  },
  createSubcategory(payload: SubcategoriaPayload): Promise<{ success: boolean; message: string; data: Subcategoria }> {
    return apiClient.post(`${BASE}/subcategories/`, payload).then(r => r.data);
  },
  updateSubcategory(id: number, payload: Partial<SubcategoriaPayload>): Promise<{ success: boolean; message: string; data: Subcategoria }> {
    return apiClient.put(`${BASE}/subcategories/${id}/`, payload).then(r => r.data);
  },
  toggleSubcategory(id: number): Promise<{ success: boolean; message: string; data: { is_active: boolean } }> {
    return apiClient.delete(`${BASE}/subcategories/${id}/`).then(r => r.data);
  },

  // ── Manufacturer brands ───────────────────────────────────────────────
  listFabricanteBrands(params?: { is_active?: boolean; tipo?: string }): Promise<MarcaFabricanteListResponse> {
    return apiClient.get(`${BASE}/fabricante-brands/`, { params }).then(r => r.data);
  },
  createFabricanteBrand(payload: MarcaFabricantePayload): Promise<{ success: boolean; message: string; data: MarcaFabricante }> {
    return apiClient.post(`${BASE}/fabricante-brands/`, payload).then(r => r.data);
  },
  updateFabricanteBrand(id: number, payload: Partial<MarcaFabricantePayload>): Promise<{ success: boolean; data: MarcaFabricante }> {
    return apiClient.put(`${BASE}/fabricante-brands/${id}/`, payload).then(r => r.data);
  },

  // ── Motorcycle catalog ────────────────────────────────────────────────
  listMotoBrands(params?: { is_active?: boolean }): Promise<MarcaMotoListResponse> {
    return apiClient.get(`${BASE}/moto-brands/`, { params }).then(r => r.data);
  },
  createMotoBrand(payload: MarcaMotoPayload): Promise<{ success: boolean; data: MarcaMoto }> {
    return apiClient.post(`${BASE}/moto-brands/`, payload).then(r => r.data);
  },
  updateMotoBrand(id: number, payload: Partial<MarcaMotoPayload>): Promise<{ success: boolean; data: MarcaMoto }> {
    return apiClient.put(`${BASE}/moto-brands/${id}/`, payload).then(r => r.data);
  },
  listMotoModels(params?: { marca?: number; tipo_moto?: string; search?: string; page?: number; page_size?: number }): Promise<ModeloMotoListResponse> {
    return apiClient.get(`${BASE}/moto-models/`, { params }).then(r => r.data);
  },
  getMotoModel(id: number): Promise<{ success: boolean; data: ModeloMoto }> {
    return apiClient.get(`${BASE}/moto-models/${id}/`).then(r => r.data);
  },
  createMotoModel(payload: ModeloMotoPayload): Promise<{ success: boolean; data: ModeloMoto }> {
    return apiClient.post(`${BASE}/moto-models/`, payload).then(r => r.data);
  },
  updateMotoModel(id: number, payload: Partial<ModeloMotoPayload>): Promise<{ success: boolean; data: ModeloMoto }> {
    return apiClient.put(`${BASE}/moto-models/${id}/`, payload).then(r => r.data);
  },

  // ── Products ──────────────────────────────────────────────────────────
  listProducts(params?: ProductoListParams): Promise<ProductoListResponse> {
    return apiClient.get(`${BASE}/products/`, { params }).then(r => r.data);
  },
  getProduct(id: number): Promise<{ success: boolean; data: Producto }> {
    return apiClient.get(`${BASE}/products/${id}/`).then(r => r.data);
  },
  createProduct(payload: ProductoPayload): Promise<{ success: boolean; message: string; data: Producto }> {
    return apiClient.post(`${BASE}/products/`, payload).then(r => r.data);
  },
  updateProduct(id: number, payload: Partial<ProductoPayload>): Promise<{ success: boolean; message: string; data: Producto }> {
    return apiClient.put(`${BASE}/products/${id}/`, payload).then(r => r.data);
  },
  toggleProduct(id: number): Promise<{ success: boolean; message: string; data: { is_active: boolean } }> {
    return apiClient.delete(`${BASE}/products/${id}/`).then(r => r.data);
  },
  uploadProductImage(id: number, file: File): Promise<{ success: boolean; message: string; data: { imagen: string | null } }> {
    const form = new FormData();
    form.append('imagen', file);
    return apiClient.patch(`${BASE}/products/${id}/image/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // ── Product compatibility ─────────────────────────────────────────────
  addCompatibility(productId: number, payload: CompatibilidadPayload): Promise<{ success: boolean; message: string; data: any }> {
    return apiClient.post(`${BASE}/products/${productId}/compatibility/`, payload).then(r => r.data);
  },
  removeCompatibility(productId: number, compatId: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`${BASE}/products/${productId}/compatibility/${compatId}/`).then(r => r.data);
  },

  // ── Stock ─────────────────────────────────────────────────────────────
  getStockBySede(sedeId: number): Promise<{ success: boolean; data: StockItem[] }> {
    return apiClient.get(`${BASE}/stock/`, { params: { sede_id: sedeId } }).then(r => r.data);
  },
  updateStock(stockId: number, payload: StockUpdatePayload): Promise<{ success: boolean; message: string; data: StockItem }> {
    return apiClient.put(`${BASE}/stock/${stockId}/`, payload).then(r => r.data);
  },

  // ── Inventory entries ─────────────────────────────────────────────────
  listEntries(params?: { producto_id?: number; sede_id?: number; page?: number }): Promise<EntradaListResponse> {
    return apiClient.get(`${BASE}/entries/`, { params }).then(r => r.data);
  },
  createEntry(payload: EntradaPayload): Promise<{ success: boolean; message: string; data: EntradaInventario }> {
    return apiClient.post(`${BASE}/entries/`, payload).then(r => r.data);
  },

  // ── Audits ────────────────────────────────────────────────────────────
  listAudits(params?: { sede_id?: number; status?: string; page?: number }): Promise<AuditoriaListResponse> {
    return apiClient.get(`${BASE}/audits/`, { params }).then(r => r.data);
  },
  getAudit(id: number): Promise<{ success: boolean; data: AuditoriaInventario }> {
    return apiClient.get(`${BASE}/audits/${id}/`).then(r => r.data);
  },
  createAudit(payload: AuditoriaPayload): Promise<{ success: boolean; message: string; data: AuditoriaInventario }> {
    return apiClient.post(`${BASE}/audits/`, payload).then(r => r.data);
  },
  updateAuditItem(
    auditId: number,
    itemId: number,
    stockFisico: number
  ): Promise<{ success: boolean; data: any }> {
    return apiClient.patch(`${BASE}/audits/${auditId}/items/${itemId}/`, { stock_fisico: stockFisico }).then(r => r.data);
  },
  finalizeAudit(id: number): Promise<{ success: boolean; message: string; data: AuditoriaInventario }> {
    return apiClient.post(`${BASE}/audits/${id}/finalize/`).then(r => r.data);
  },
};
