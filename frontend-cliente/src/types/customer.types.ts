export interface ClienteProfile {
  id:         number;
  email:      string;
  first_name: string;
  last_name:  string;
  telefono:   string;
  fecha_nac:  string | null;
  foto_url:   string;
  puntos:     number;
  qr_token:   string;
  created_at: string;
}

export interface AuthTokens {
  access:  string;
  refresh: string;
}

export interface VentaItem {
  id:          number;
  producto_id: number;
  producto_sku:  string;
  producto_name: string;
  quantity:    number;
  unit_price:  string;
  subtotal:    string;
}

export interface Venta {
  id:           number;
  sede_id:      number;
  sede_name:    string;
  cajero_name:  string;
  subtotal:     string;
  descuento:    string;
  total:        string;
  metodo_pago:  'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  monto_pagado: string;
  cambio:       string;
  status:       'COMPLETADA' | 'CANCELADA';
  puntos_ganados: number;
  items:        VentaItem[];
  created_at:   string;
}

export interface MisComprasResponse {
  ventas:      Venta[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}
