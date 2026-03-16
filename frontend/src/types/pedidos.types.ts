export type PedidoStatus = 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';

export interface PedidoBodegaItem {
  id:            number;
  producto_id:   number;
  producto_sku:  string;
  producto_name: string;
  codigo_barras: string;
  cantidad:      number;
  ubicacion:     string;
}

export interface PedidoBodega {
  id:          number;
  sede_id:     number;
  sede_name:   string;
  cajero_name: string;
  notas:       string;
  status:      PedidoStatus;
  items:       PedidoBodegaItem[];
  created_at:  string;
  updated_at:  string;
}
