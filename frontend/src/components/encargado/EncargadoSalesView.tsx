import React, { useState, useEffect, useCallback } from 'react';
import type { Venta } from '../../types/sales.types';
import type { User } from '../../types/auth.types';
import { salesService } from '../../api/sales.service';
import { usersService } from '../../api/users.service';
import TicketModal from '../common/TicketModal';

interface Props {
  sedeId: number;
}

// Fecha local (no UTC) para evitar desfase de zona horaria
const toDateStr = (d: Date) => {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const metodoBadgeClass: Record<string, string> = {
  EFECTIVO:      'badge-metodo--efectivo',
  TARJETA:       'badge-metodo--tarjeta',
  TRANSFERENCIA: 'badge-metodo--transferencia',
};

const EncargadoSalesView: React.FC<Props> = ({ sedeId }) => {
  const today = toDateStr(new Date());

  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [cajeroId,   setCajeroId]   = useState('');
  const [cajeros,    setCajeros]    = useState<User[]>([]);
  const [ventas,     setVentas]     = useState<Venta[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [pagination,  setPagination]  = useState({ total: 0 });
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [confirmId,   setConfirmId]   = useState<number | null>(null);
  const [ticketVenta, setTicketVenta] = useState<Venta | null>(null);

  // Totales del período (sobre la página actual)
  const totalEfectivo      = ventas.filter(v => v.metodo_pago === 'EFECTIVO').reduce((s, v) => s + parseFloat(v.total), 0);
  const totalTarjeta       = ventas.filter(v => v.metodo_pago === 'TARJETA').reduce((s, v) => s + parseFloat(v.total), 0);
  const totalTransferencia = ventas.filter(v => v.metodo_pago === 'TRANSFERENCIA').reduce((s, v) => s + parseFloat(v.total), 0);
  const totalGeneral       = ventas.reduce((s, v) => s + parseFloat(v.total), 0);

  // Cargar cajeros de la sede (CASHIER + ENCARGADO)
  useEffect(() => {
    usersService.list({ sede_id: sedeId, page_size: 100 } as any)
      .then(res => setCajeros(res.data.users.filter(u => u.role === 'CASHIER' || u.role === 'ENCARGADO')))
      .catch(() => {});
  }, [sedeId]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await salesService.listVentas({
        sede_id:     sedeId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        cajero_id:   cajeroId ? Number(cajeroId) : undefined,
        page:        p,
        page_size:   25,
      });
      setVentas(res.data.ventas);
      setTotalPages(res.data.pagination.total_pages ?? 1);
      setPagination({ total: res.data.pagination.total });
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [sedeId, fechaDesde, fechaHasta, cajeroId]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [fechaDesde, fechaHasta, cajeroId, load]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(newPage);
  };

  const handleCancelar = async (id: number) => {
    setCancelingId(id);
    try {
      await salesService.cancelarVenta(id);
      setConfirmId(null);
      load(page);
    } catch { /* ignore */ } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="section-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Resumen cards ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 4 }}>
        {[
          { label: 'Total general',    value: totalGeneral,       color: 'blue'   },
          { label: 'Efectivo',         value: totalEfectivo,      color: 'green'  },
          { label: 'Tarjeta',          value: totalTarjeta,       color: 'purple' },
          { label: 'Transferencia',    value: totalTransferencia, color: 'orange' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-content" style={{ padding: 0 }}>
              <p className="stat-label">{s.label}</p>
              <p className="stat-value" style={{ fontSize: 18, color: `var(--color-${s.color === 'blue' ? 'primary' : s.color === 'green' ? 'success' : s.color === 'purple' ? 'text' : 'warning'})` }}>
                {fmt(s.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="sales-history-filters">
        <label>Desde:</label>
        <input
          type="date"
          value={fechaDesde}
          max={today}
          onChange={e => setFechaDesde(e.target.value)}
        />
        <label>Hasta:</label>
        <input
          type="date"
          value={fechaHasta}
          max={today}
          onChange={e => setFechaHasta(e.target.value)}
        />
        <select
          value={cajeroId}
          onChange={e => setCajeroId(e.target.value)}
          style={{
            padding: '7px 11px', border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', fontSize: 13,
            background: 'var(--color-bg-main)', color: 'var(--color-text)',
          }}
        >
          <option value="">Todos los cajeros</option>
          {cajeros.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>

        <button
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: 13 }}
          onClick={() => load(page)}
          disabled={loading}
        >
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>

        {pagination.total > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {pagination.total} venta{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="sales-history-table-wrap">
        {loading ? (
          <div className="sales-history-empty">Cargando ventas…</div>
        ) : ventas.length === 0 ? (
          <div className="sales-history-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#cbd5e0" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            No hay ventas en el período seleccionado.
          </div>
        ) : (
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Hora</th>
                <th>Cajero</th>
                <th>Artículos</th>
                <th>Descuento</th>
                <th>Método</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} style={{ opacity: v.status === 'CANCELADA' ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}># {v.id}</td>
                  <td>{fmtTime(v.created_at)}</td>
                  <td>{v.cajero_name}</td>
                  <td>{v.items.length} art.</td>
                  <td>
                    {parseFloat(v.descuento) > 0
                      ? <span style={{ color: 'var(--color-warning)' }}>−{fmt(v.descuento)}</span>
                      : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                    }
                  </td>
                  <td>
                    <span className={`badge-metodo ${metodoBadgeClass[v.metodo_pago] ?? ''}`}>
                      {v.metodo_pago}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: v.status === 'COMPLETADA' ? '#f0fff4' : '#fff5f5',
                      color:      v.status === 'COMPLETADA' ? '#22543d' : '#c53030',
                      border:     `1px solid ${v.status === 'COMPLETADA' ? '#c6f6d5' : '#fed7d7'}`,
                    }}>
                      {v.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(v.total)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setTicketVenta(v)}
                        title="Ver ticket"
                        style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 6,
                          border: '1px solid #bee3f8', background: '#ebf8ff',
                          color: '#2b6cb0', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Ticket
                      </button>
                      {v.status === 'COMPLETADA' && (
                        confirmId === v.id ? (
                          <>
                            <button
                              onClick={() => handleCancelar(v.id)}
                              disabled={cancelingId === v.id}
                              style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none',
                                background: '#c53030', color: '#fff', cursor: 'pointer', fontWeight: 600,
                              }}
                            >
                              {cancelingId === v.id ? '…' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #cbd5e0',
                                background: '#fff', cursor: 'pointer',
                              }}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmId(v.id)}
                            title="Cancelar venta"
                            style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 6,
                              border: '1px solid #fed7d7', background: '#fff5f5',
                              color: '#c53030', cursor: 'pointer', fontWeight: 600,
                            }}
                          >
                            Cancelar
                          </button>
                        )
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="pos-pagination">
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>
            ← Anterior
          </button>
          <span>Página {page} de {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>
            Siguiente →
          </button>
        </div>
      )}

      {ticketVenta && (
        <TicketModal venta={ticketVenta} onClose={() => setTicketVenta(null)} />
      )}
    </div>
  );
};

export default EncargadoSalesView;
