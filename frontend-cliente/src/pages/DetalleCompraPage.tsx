import React from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import type { Venta } from '../types/customer.types';
import './DetalleCompraPage.css';

const fmt = (n: string | number) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia',
};

const DetalleCompraPage: React.FC = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const venta: Venta | undefined = location.state?.venta;

  if (!venta) {
    return (
      <div className="screen">
        <div className="page-header">
          <button className="btn-icon" onClick={() => navigate('/compras')}>
            <ChevronLeft size={24} />
          </button>
          <h1 className="page-title">Compra #{id}</h1>
        </div>
        <p style={{ padding: '24px 20px', color: 'var(--c-text-sec)' }}>
          Venta no encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="page-header">
        <button className="btn-icon" onClick={() => navigate('/compras')}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="page-title">Compra #{String(venta.id).padStart(5, '0')}</h1>
        <span className={`badge-${venta.status === 'COMPLETADA' ? 'success' : 'error'}`}>
          {venta.status === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
        </span>
      </div>

      <div className="detalle-body">
        {/* Meta */}
        <div className="card detalle-meta">
          <div className="detalle-meta-row">
            <span className="text-sec text-sm">Fecha</span>
            <span style={{ fontSize: 14 }}>{fmtDate(venta.created_at)}</span>
          </div>
          <div className="detalle-meta-row">
            <span className="text-sec text-sm">Sede</span>
            <span style={{ fontSize: 14 }}>{venta.sede_name}</span>
          </div>
          <div className="detalle-meta-row">
            <span className="text-sec text-sm">Pago</span>
            <span style={{ fontSize: 14 }}>{METODO_LABELS[venta.metodo_pago] ?? venta.metodo_pago}</span>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <p className="section-title" style={{ padding: 0, marginBottom: 12 }}>Productos</p>
          <div className="detalle-items">
            {venta.items.map(item => (
              <div key={item.id} className="detalle-item">
                <div className="detalle-item-info">
                  <p className="detalle-item-name">{item.producto_name}</p>
                  <p className="text-sec text-sm">{item.producto_sku} · ×{item.quantity}</p>
                </div>
                <p className="detalle-item-sub">{fmt(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="detalle-totals">
            <div className="detalle-total-row">
              <span className="text-sec">Subtotal</span>
              <span>{fmt(venta.subtotal)}</span>
            </div>
            {Number(venta.descuento) > 0 && (
              <div className="detalle-total-row">
                <span className="text-sec">Descuento</span>
                <span style={{ color: 'var(--c-success)' }}>−{fmt(venta.descuento)}</span>
              </div>
            )}
            <div className="detalle-total-row detalle-total-row--big">
              <span>Total</span>
              <span>{fmt(venta.total)}</span>
            </div>
          </div>
        </div>

        {/* Points earned */}
        {venta.puntos_ganados > 0 && (
          <div className="badge-points" style={{ alignSelf: 'flex-start', fontSize: 13 }}>
            <Star size={13} fill="#FFB800" />
            +{venta.puntos_ganados} puntos ganados en esta compra
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleCompraPage;
