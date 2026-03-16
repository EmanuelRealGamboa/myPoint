import React, { useState, useEffect, useCallback } from 'react';
import type { EntradaInventario } from '../../types/inventory.types';
import { inventoryService } from '../../api/inventory.service';
import InventoryEntryFormScoped from './InventoryEntryFormScoped';

interface Props {
  sedeId: number;
}

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const EncargadoEntradasView: React.FC<Props> = ({ sedeId }) => {
  const [entradas, setEntradas] = useState<EntradaInventario[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,    setTotal]    = useState(0);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await inventoryService.listEntries({ sede_id: sedeId, page: p });
      setEntradas(res.data.entries);
      const pg = res.data.pagination;
      setTotal(pg.total);
      setTotalPages(pg.total_pages ?? 1);
    } catch {
      setEntradas([]);
    } finally {
      setLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { load(1); }, [load]);

  const handleSaved = () => {
    setShowForm(false);
    setPage(1);
    load(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    load(newPage);
  };

  return (
    <div className="section-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Entradas de inventario</h2>
          {total > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {total} entrada{total !== 1 ? 's' : ''} registrada{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Registrar entrada
        </button>
      </div>

      {/* Tabla */}
      <div className="sales-history-table-wrap">
        {loading ? (
          <div className="sales-history-empty">Cargando entradas…</div>
        ) : entradas.length === 0 ? (
          <div className="sales-history-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#cbd5e0" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 3l-4 4-4-4" />
            </svg>
            No hay entradas de inventario registradas.
          </div>
        ) : (
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Costo unit.</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Registrado por</th>
                <th>Fecha</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.producto_name}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: 'var(--color-primary-bg)',
                      color: 'var(--color-primary)',
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {e.producto_sku}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                    +{e.quantity}
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmt(e.cost_unit)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {fmt(parseFloat(e.cost_unit) * e.quantity)}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{e.created_by_name}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmtDate(e.created_at)}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
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

      {/* Modal de nueva entrada (sede prefijada) */}
      {showForm && (
        <InventoryEntryFormScoped
          sedeId={sedeId}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default EncargadoEntradasView;
