import React, { useState } from 'react';
import type { CartItem, MetodoPago, Venta } from '../../types/sales.types';
import { salesService } from '../../api/sales.service';

interface Props {
  sedeId:      number;
  items:       CartItem[];
  descuento:   number;
  metodoPago:  MetodoPago;
  montoPagado: number;
  onClose:     () => void;
  onSuccess:   () => void;  // limpia carrito + cierra modal
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const PaymentModal: React.FC<Props> = ({
  sedeId, items, descuento, metodoPago, montoPagado, onClose, onSuccess,
}) => {
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [venta,   setVenta]     = useState<Venta | null>(null);

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total    = Math.max(0, subtotal - descuento);
  const cambio   = metodoPago === 'EFECTIVO' ? Math.max(0, montoPagado - total) : 0;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        sede:         sedeId,
        items:        items.map(i => ({
          producto:   i.producto_id,
          quantity:   i.quantity,
          unit_price: i.unit_price,
        })),
        descuento,
        metodo_pago:  metodoPago,
        monto_pagado: metodoPago === 'EFECTIVO' ? montoPagado : total,
        notas:        '',
      };
      const res = await salesService.createVenta(payload);
      setVenta(res.data);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        // collect all field errors
        const msgs: string[] = [];
        for (const key of Object.keys(data.errors)) {
          const val = data.errors[key];
          if (Array.isArray(val)) msgs.push(...val);
          else msgs.push(String(val));
        }
        setError(msgs.join(' | '));
      } else {
        setError(data?.message || 'Error al registrar la venta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">

        {/* Header */}
        <div className="payment-modal-header">
          <h2>{venta ? 'Venta registrada' : 'Confirmar cobro'}</h2>
          {!loading && (
            <button
              className="payment-modal-close"
              onClick={venta ? onSuccess : onClose}
              title="Cerrar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="payment-modal-body">
          {!venta ? (
            <>
              {/* Items list */}
              <div className="payment-items-list">
                {items.map(item => (
                  <div key={item.producto_id} className="payment-item-row">
                    <span>{item.quantity}× {item.producto_name}</span>
                    <span>{fmt(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <hr className="payment-divider" />

              <div className="payment-summary-row">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="payment-summary-row">
                  <span>Descuento</span><span>−{fmt(descuento)}</span>
                </div>
              )}
              <div className="payment-summary-row payment-summary-row--total">
                <span>Total</span><span>{fmt(total)}</span>
              </div>

              {metodoPago === 'EFECTIVO' && (
                <>
                  <hr className="payment-divider" />
                  <div className="payment-summary-row">
                    <span>Recibido</span><span>{fmt(montoPagado)}</span>
                  </div>
                  <div className="payment-summary-row">
                    <span>Cambio</span>
                    <span style={{ fontWeight: 700, color: '#276749' }}>{fmt(cambio)}</span>
                  </div>
                </>
              )}

              <div className="payment-summary-row" style={{ marginTop: 12 }}>
                <span>Método de pago</span>
                <span style={{ fontWeight: 600 }}>{metodoPago}</span>
              </div>

              {error && (
                <p style={{
                  marginTop: 12, padding: '10px 14px',
                  background: '#fff5f5', border: '1px solid #fed7d7',
                  borderRadius: 8, color: '#c53030', fontSize: 13,
                }}>
                  {error}
                </p>
              )}
            </>
          ) : (
            /* Ticket de éxito */
            <div className="payment-ticket">
              <div className="payment-ticket-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>¡Venta completada!</h3>
              <p className="payment-ticket-id">Folio # {venta.id}</p>

              <div className="payment-ticket-details">
                <div className="payment-ticket-row">
                  <span>Total cobrado</span>
                  <span style={{ fontWeight: 700 }}>{fmt(parseFloat(venta.total))}</span>
                </div>
                <div className="payment-ticket-row">
                  <span>Método</span>
                  <span>{venta.metodo_pago}</span>
                </div>
                {venta.metodo_pago === 'EFECTIVO' && (
                  <>
                    <div className="payment-ticket-row">
                      <span>Recibido</span>
                      <span>{fmt(parseFloat(venta.monto_pagado))}</span>
                    </div>
                    <div className="payment-ticket-cambio">
                      <span>Cambio</span>
                      <span>{fmt(parseFloat(venta.cambio))}</span>
                    </div>
                  </>
                )}
                <div className="payment-ticket-row" style={{ marginTop: 8 }}>
                  <span>Cajero</span>
                  <span>{venta.cajero_name}</span>
                </div>
                <div className="payment-ticket-row">
                  <span>Sede</span>
                  <span>{venta.sede_name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="payment-modal-footer">
          {!venta ? (
            <>
              <button className="btn-cancel-modal" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                className="btn-confirm-sale"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Procesando…' : `Confirmar ${fmt(total)}`}
              </button>
            </>
          ) : (
            <button className="btn-nueva-venta" onClick={onSuccess}>
              Nueva venta
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
