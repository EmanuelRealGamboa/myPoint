// ── Categoria ──────────────────────────────────────────────────────────────

export interface SubcategoriaMinimal {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Categoria {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  product_count: number;
  subcategorias: SubcategoriaMinimal[];
  created_at: string;
}

export interface CategoriaPayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

// ── Subcategoria ────────────────────────────────────────────────────────────

export interface Subcategoria {
  id: number;
  categoria: number;
  categoria_name: string;
  name: string;
  description: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

export interface SubcategoriaPayload {
  categoria: number;
  name: string;
  description?: string;
  is_active?: boolean;
}

// ── MarcaFabricante ─────────────────────────────────────────────────────────

export type TipoMarca = 'OEM' | 'AFTERMARKET' | 'GENERICO';

export interface MarcaFabricante {
  id: number;
  name: string;
  tipo: TipoMarca;
  pais: string;
  is_active: boolean;
}

export interface MarcaFabricantePayload {
  name: string;
  tipo?: TipoMarca;
  pais?: string;
  is_active?: boolean;
}

// ── Catálogo de Motos ───────────────────────────────────────────────────────

export interface MarcaMoto {
  id: number;
  name: string;
  is_active: boolean;
  modelos_count: number;
}

export type TipoMotor = '2T' | '4T' | 'ELECTRICO';
export type TipoMoto = 'CARGO' | 'NAKED' | 'DEPORTIVA' | 'SCOOTER' | 'OFF_ROAD' | 'CRUCERO';

export interface ModeloMoto {
  id: number;
  marca: number;
  marca_name: string;
  modelo: string;
  año_desde: number;
  año_hasta: number | null;
  cilindraje: number | null;
  tipo_motor: TipoMotor;
  tipo_moto: TipoMoto;
  is_active: boolean;
}

export interface MarcaMotoPayload {
  name: string;
  is_active?: boolean;
}

export interface ModeloMotoPayload {
  marca: number;
  modelo: string;
  año_desde: number;
  año_hasta?: number | null;
  cilindraje?: number | null;
  tipo_motor?: TipoMotor;
  tipo_moto?: TipoMoto;
  is_active?: boolean;
}

// ── Compatibilidad ──────────────────────────────────────────────────────────

export interface CompatibilidadPieza {
  id: number;
  modelo_moto: number;
  modelo_moto_str: string;
  marca_name: string;
  año_desde: number | null;
  año_hasta: number | null;
  nota: string;
}

export interface CompatibilidadPayload {
  modelo_moto: number;
  año_desde?: number | null;
  año_hasta?: number | null;
  nota?: string;
}

// ── Stock ──────────────────────────────────────────────────────────────────

export interface StockItem {
  id: number;
  sede_id: number;
  sede_name: string;
  quantity: number;
  min_quantity: number;
  is_low_stock: boolean;
  updated_at: string;
}

export interface StockUpdatePayload {
  quantity?: number;
  min_quantity?: number;
}

// ── Producto ───────────────────────────────────────────────────────────────

export type TipoParte = 'OEM' | 'AFTERMARKET' | 'REMANUFACTURADO';
export type UnidadMedida = 'PIEZA' | 'PAR' | 'KIT' | 'LITRO' | 'METRO' | 'ROLLO';

export interface Producto {
  id: number;
  // Identification
  sku: string;
  name: string;
  description: string;
  codigo_barras: string;
  numero_parte_oem: string;
  numero_parte_aftermarket: string;
  imagen: string | null;
  // Classification
  categoria: number | null;
  categoria_name: string | null;
  subcategoria: number | null;
  subcategoria_name: string | null;
  marca_fabricante: number | null;
  marca_fabricante_name: string | null;
  tipo_parte: TipoParte;
  unidad_medida: UnidadMedida;
  // Pricing
  price: string;   // DecimalField comes as string from DRF
  cost: string;
  precio_mayoreo: string | null;
  // Warehouse
  ubicacion_almacen: string;
  peso_kg: string | null;
  // Fitment
  es_universal: boolean;
  compatibilidades: CompatibilidadPieza[];
  // Status
  is_active: boolean;
  es_descontinuado: boolean;
  stock_items: StockItem[];
  total_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductoPayload {
  sku?: string;
  name: string;
  description?: string;
  codigo_barras?: string;
  numero_parte_oem?: string;
  numero_parte_aftermarket?: string;
  categoria?: number | null;
  subcategoria?: number | null;
  marca_fabricante?: number | null;
  tipo_parte?: TipoParte;
  unidad_medida?: UnidadMedida;
  price: number | string;
  cost: number | string;
  precio_mayoreo?: number | string | null;
  ubicacion_almacen?: string;
  peso_kg?: number | string | null;
  es_universal?: boolean;
  is_active?: boolean;
  es_descontinuado?: boolean;
}

export interface ProductoListParams {
  search?: string;
  categoria?: number;
  subcategoria?: number;
  marca_fabricante?: number;
  tipo_parte?: string;
  moto_modelo_id?: number;
  barcode?: string;
  is_active?: boolean;
  sede_id?: number;
  low_stock?: boolean;
  page?: number;
  page_size?: number;
}

// ── Entrada de Inventario ──────────────────────────────────────────────────

export interface EntradaInventario {
  id: number;
  producto: number;
  producto_name: string;
  producto_sku: string;
  sede: number;
  sede_name: string;
  quantity: number;
  cost_unit: string;
  notes: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface EntradaPayload {
  producto: number;
  sede: number;
  quantity: number;
  cost_unit: number | string;
  notes?: string;
}

// ── Auditoría ──────────────────────────────────────────────────────────────

export type AuditoriaStatus = 'DRAFT' | 'FINALIZADA';

export interface AuditoriaItem {
  id: number;
  producto: number;
  producto_sku: string;
  producto_name: string;
  stock_sistema: number;
  stock_fisico: number | null;
  diferencia: number | null;
}

export interface AuditoriaInventario {
  id: number;
  sede: number;
  sede_name: string;
  fecha: string;
  status: AuditoriaStatus;
  created_by: number | null;
  created_by_name: string;
  items: AuditoriaItem[];
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuditoriaPayload {
  sede: number;
  fecha: string;
}

// ── Generic list responses ─────────────────────────────────────────────────

import type { Pagination } from './auth.types';

export interface CategoriaListResponse {
  success: boolean;
  data: { categories: Categoria[]; pagination: Pagination };
}

export interface SubcategoriaListResponse {
  success: boolean;
  data: { subcategories: Subcategoria[]; pagination: Pagination };
}

/** MarcaFabricante list returns a flat array (no pagination) */
export interface MarcaFabricanteListResponse {
  success: boolean;
  data: MarcaFabricante[];
}

/** MarcaMoto list returns a flat array (no pagination) */
export interface MarcaMotoListResponse {
  success: boolean;
  data: MarcaMoto[];
}

export interface ModeloMotoListResponse {
  success: boolean;
  data: { models: ModeloMoto[]; pagination: Pagination };
}

export interface ProductoListResponse {
  success: boolean;
  data: { products: Producto[]; pagination: Pagination };
}

export interface EntradaListResponse {
  success: boolean;
  data: { entries: EntradaInventario[]; pagination: Pagination };
}

export interface AuditoriaListResponse {
  success: boolean;
  data: { audits: AuditoriaInventario[]; pagination: Pagination };
}
