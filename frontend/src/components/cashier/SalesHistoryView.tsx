import React, { useState, useEffect, useCallback } from 'react';
import type { Venta } from '../../types/sales.types';
import { salesService } from '../../api/sales.service';
import TicketModal from '../common/TicketModal';

interface Props {
  sedeId:   number;
  cajeroId: number;
}

// Usa fecha local (no UTC) para evitar desfase de zona horaria
const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const metodoBadgeClass: Record<string, string> = {
  EFECTIVO:      'badge-metodo--efectivo',
  TARJETA:       'badge-metodo--tarjeta',
  TRANSFERENCIA: 'badge-metodo--transferencia',
};

const SalesHistoryView: React.FC<Props> = ({ sedeId, cajeroId }) => {
  const today = toDateStr(new Date());

  const [fechaDesde,   setFechaDesde]   = useState(today);
  const [fechaHasta,   setFechaHasta]   = useState(today);
  const [ventas,       setVentas]       = useState<Venta[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalVentas,  setTotalVentas]  = useState(0);
  const [cancelingId,  setCancelingId]  = useState<number | null>(null);
  const [confirmId,    setConfirmId]    = useState<number | null>(null);
  const [ticketVenta,  setTicketVenta]  = useState<Venta | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await salesService.listVentas({
        sede_id:     sedeId,
        cajero_id:   cajeroId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        page:        p,
        page_size:   20,
      });
      setVentas(res.data.ventas);
      setTotalPages(res.data.pagination.total_pages ?? 1);
      setTotalVentas(res.data.pagination.total);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [sedeId, cajeroId, fechaDesde, fechaHasta]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [fechaDesde, fechaHasta, load]);

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

  const totalDelDia = ventas
    .filter(v => v.status === 'COMPLETADA')
    .reduce((s, v) => s + parseFloat(v.total), 0);

  return (
    <div className="sales-history-wrap">

      {/* Filters */}
      <div className="sales-history-filters">
        <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Desde:</label>
        <input type="date" value={fechaDesde} max={today} onChange={e => setFechaDesde(e.target.value)} />
        <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Hasta:</label>
        <input type="date" value={fechaHasta} max={today} onChange={e => setFechaHasta(e.target.value)} />
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
          onClick={() => load(page)} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>

        {totalVentas > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {totalVentas} venta{totalVentas !== 1 ? 's' : ''} · Total: <strong>{fmt(totalDelDia)}</strong>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="sales-history-table-wrap">
        {loading ? (
          <div className="sales-history-empty">Cargando ventas…</div>
        ) : ventas.length === 0 ? (
          <div className="sales-history-empty">
            No hay ventas en el período seleccionado.
          </div>
        ) : (
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Hora</th>
                <th>Artículos</th>
                <th>Método</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} style={{ opacity: v.status === 'CANCELADA' ? 0.55 : 1 }}>
                  <td style={{ fontWeight: 600 }}># {v.id}</td>
                  <td>{fmtTime(v.created_at)}</td>
                  <td>{v.items.length} artículo{v.items.length !== 1 ? 's' : ''}</td>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pos-pagination">
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>← Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>Siguiente →</button>
        </div>
      )}

      {ticketVenta && (
        <TicketModal venta={ticketVenta} onClose={() => setTicketVenta(null)} />
      )}
    </div>
  );
};

export default SalesHistoryView;
