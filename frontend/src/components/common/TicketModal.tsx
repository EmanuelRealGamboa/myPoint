import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { billingService } from '../../api/billing.service';
import type { Venta } from '../../types/sales.types';
import type { ConfiguracionFiscal } from '../../types/billing.types';

interface Props {
  venta: Venta;
  onClose: () => void;
}

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      'Efectivo',
  TARJETA:       'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
};

// ── Generates standalone printable HTML for the ticket ────────────────────────

function buildTicketHtml(venta: Venta, config: ConfiguracionFiscal | null): string {
  const descuento  = parseFloat(venta.descuento);
  const hasDesc    = descuento > 0;
  const isEfectivo = venta.metodo_pago === 'EFECTIVO';
  const folio      = String(venta.id).padStart(6, '0');

  const logoHtml = config?.logo_url
    ? `<div style="text-align:center;margin-bottom:10px">
         <img src="${config.logo_url}" alt="Logo"
           style="max-height:60px;max-width:140px;object-fit:contain" />
       </div>`
    : '';

  const nombreLegalHtml = (config?.nombre_legal && config.nombre_legal !== config.nombre_comercial)
    ? `<p style="margin:2px 0 0;font-size:10px;color:#718096">${config.nombre_legal}</p>` : '';

  const rfcHtml     = config?.rfc       ? `<p style="margin:2px 0 0;font-size:10px;color:#718096">RFC: ${config.rfc}</p>` : '';
  const dirHtml     = config?.direccion ? `<p style="margin:4px 0 0;font-size:10px;color:#4a5568;line-height:1.4">${config.direccion}</p>` : '';
  const telHtml     = config?.telefono  ? `<p style="margin:2px 0 0;font-size:10px;color:#4a5568">Tel: ${config.telefono}</p>` : '';
  const emailHtml   = config?.email     ? `<p style="margin:2px 0 0;font-size:10px;color:#4a5568">${config.email}</p>` : '';

  const itemsHtml = venta.items.map(item => `
    <div style="margin-bottom:6px">
      <div style="font-size:11px;font-weight:600;word-break:break-word">${item.producto_name}</div>
      <div style="font-size:10px;color:#718096;margin-bottom:2px">SKU: ${item.producto_sku}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px">
        <span style="flex:1"></span>
        <span style="width:30px;text-align:center">${item.quantity}</span>
        <span style="width:70px;text-align:right">${fmt(item.unit_price)}</span>
        <span style="width:80px;text-align:right;font-weight:600">${fmt(item.subtotal)}</span>
      </div>
    </div>`).join('');

  const descHtml = hasDesc
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:3px">
         <span style="color:#718096">Descuento:</span>
         <span style="color:#c05621">−${fmt(venta.descuento)}</span>
       </div>` : '';

  const cambioHtml = isEfectivo
    ? `<div style="display:flex;justify-content:space-between;margin-bottom:3px">
         <span style="color:#718096">Pagado:</span>
         <span>${fmt(venta.monto_pagado)}</span>
       </div>
       <div style="display:flex;justify-content:space-between">
         <span style="color:#718096">Cambio:</span>
         <span>${fmt(venta.cambio)}</span>
       </div>` : '';

  const leyenda = config?.leyenda_ticket ?? 'Gracias por su compra.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ticket #${folio} — ${config?.nombre_comercial ?? venta.sede_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: monospace;
      font-size: 12px;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
      padding: 12px 10px;
      color: #1a202c;
    }
    hr.dashed { border: none; border-top: 1px dashed #a0aec0; margin: 10px 0; }
    hr.solid  { border: none; border-top: 1px solid #e2e8f0; margin: 4px 0 6px; }
    @media print {
      body { margin: 0; padding: 8px 6px; }
    }
  </style>
</head>
<body>

  ${logoHtml}

  <div style="text-align:center;margin-bottom:14px">
    <p style="font-size:15px;font-weight:700;font-family:sans-serif">
      ${config?.nombre_comercial ?? venta.sede_name}
    </p>
    ${nombreLegalHtml}${rfcHtml}${dirHtml}${telHtml}${emailHtml}
  </div>

  <hr class="dashed" />

  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between">
      <span style="color:#718096">Folio:</span>
      <span style="font-weight:700">#${folio}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:2px">
      <span style="color:#718096">Fecha:</span>
      <span style="text-align:right">${fmtDate(venta.created_at)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:2px">
      <span style="color:#718096">Cajero:</span>
      <span>${venta.cajero_name}</span>
    </div>
  </div>

  <hr class="dashed" />

  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;color:#718096;margin-bottom:4px">
      <span style="flex:1">Artículo</span>
      <span style="width:30px;text-align:center">Qty</span>
      <span style="width:70px;text-align:right">Precio</span>
      <span style="width:80px;text-align:right">Importe</span>
    </div>
    <hr class="solid" />
    ${itemsHtml}
  </div>

  <hr class="dashed" />

  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
      <span style="color:#718096">Subtotal:</span>
      <span>${fmt(venta.subtotal)}</span>
    </div>
    ${descHtml}
    <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px">
      <span style="font-weight:700;font-size:14px">TOTAL:</span>
      <span style="font-weight:700;font-size:14px">${fmt(venta.total)}</span>
    </div>
  </div>

  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
      <span style="color:#718096">Forma de pago:</span>
      <span>${METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</span>
    </div>
    ${cambioHtml}
  </div>

  <hr class="dashed" />

  <p style="text-align:center;font-size:10px;color:#718096;line-height:1.5;font-family:sans-serif">
    ${leyenda}
  </p>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const TicketModal: React.FC<Props> = ({ venta, onClose }) => {
  const [config, setConfig] = useState<ConfiguracionFiscal | null>(null);

  useEffect(() => {
    billingService.getConfigFiscal(venta.sede)
      .then(r => setConfig(r.data))
      .catch(() => {});
  }, [venta.sede]);

  const handlePrint = () => {
    const html = buildTicketHtml(venta, config);
    const win  = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const descuento  = parseFloat(venta.descuento);
  const hasDesc    = descuento > 0;
  const isEfectivo = venta.metodo_pago === 'EFECTIVO';
  const folio      = String(venta.id).padStart(6, '0');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,.15)',
          maxWidth: 400, width: '100%', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>
            Ticket #{folio}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
            >
              <Printer size={14} />
              Imprimir / PDF
            </button>
            <button className="modal-close" onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Ticket preview */}
        <div style={{ padding: '20px 24px', fontFamily: 'monospace', fontSize: 12, maxHeight: '75vh', overflowY: 'auto' }}>

          {config?.logo_url && (
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <img src={config.logo_url} alt="Logo"
                style={{ maxHeight: 60, maxWidth: 140, objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'sans-serif', color: '#1a202c' }}>
              {config?.nombre_comercial ?? venta.sede_name}
            </p>
            {config?.nombre_legal && config.nombre_legal !== config.nombre_comercial && (
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#718096' }}>{config.nombre_legal}</p>
            )}
            {config?.rfc       && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#718096' }}>RFC: {config.rfc}</p>}
            {config?.direccion && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#4a5568', lineHeight: 1.4 }}>{config.direccion}</p>}
            {config?.telefono  && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#4a5568' }}>Tel: {config.telefono}</p>}
            {config?.email     && <p style={{ margin: '2px 0 0', fontSize: 10, color: '#4a5568' }}>{config.email}</p>}
          </div>

          <div style={{ borderTop: '1px dashed #a0aec0', margin: '10px 0' }} />

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>Folio:</span>
              <span style={{ fontWeight: 700 }}>#{folio}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ color: '#718096' }}>Fecha:</span>
              <span style={{ textAlign: 'right', maxWidth: '65%' }}>{fmtDate(venta.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ color: '#718096' }}>Cajero:</span>
              <span>{venta.cajero_name}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed #a0aec0', margin: '10px 0' }} />

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', marginBottom: 4 }}>
              <span style={{ flex: 1 }}>Artículo</span>
              <span style={{ width: 30, textAlign: 'center' }}>Qty</span>
              <span style={{ width: 70, textAlign: 'right' }}>Precio</span>
              <span style={{ width: 80, textAlign: 'right' }}>Importe</span>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 6 }} />
            {venta.items.map(item => (
              <div key={item.id} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, wordBreak: 'break-word' }}>{item.producto_name}</div>
                <div style={{ fontSize: 10, color: '#718096', marginBottom: 2 }}>SKU: {item.producto_sku}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ flex: 1 }} />
                  <span style={{ width: 30, textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ width: 70, textAlign: 'right' }}>{fmt(item.unit_price)}</span>
                  <span style={{ width: 80, textAlign: 'right', fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px dashed #a0aec0', margin: '10px 0' }} />

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#718096' }}>Subtotal:</span>
              <span>{fmt(venta.subtotal)}</span>
            </div>
            {hasDesc && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#718096' }}>Descuento:</span>
                <span style={{ color: '#c05621' }}>−{fmt(venta.descuento)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>TOTAL:</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(venta.total)}</span>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: '#718096' }}>Forma de pago:</span>
              <span>{METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</span>
            </div>
            {isEfectivo && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#718096' }}>Pagado:</span>
                  <span>{fmt(venta.monto_pagado)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Cambio:</span>
                  <span>{fmt(venta.cambio)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ borderTop: '1px dashed #a0aec0', margin: '10px 0' }} />

          <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: '#718096', lineHeight: 1.5, fontFamily: 'sans-serif' }}>
            {config?.leyenda_ticket ?? 'Gracias por su compra.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
