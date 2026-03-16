import React, { useState, useCallback } from 'react';
import { salesService } from '../../../api/sales.service';
import type { ReportesData, VentaPorDia, TopProducto } from '../../../types/sales.types';
import type { SedeSnapshot } from '../../../types/auth.types';

interface Props {
  sedes: SedeSnapshot[];
}

// ── CSV helper ────────────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

const ReportesView: React.FC<Props> = ({ sedes }) => {
  const today     = toDateStr(new Date());
  const monthStart = toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [sedeId,     setSedeId]     = useState('');
  const [fechaDesde, setFechaDesde] = useState(monthStart);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [data,       setData]       = useState<ReportesData | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const handleLoad = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await salesService.reportes({
        sede_id:     sedeId ? Number(sedeId) : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      });
      setData(res.data);
    } catch {
      setError('Error al cargar el reporte. Verifica los filtros.');
    } finally {
      setLoading(false);
    }
  }, [sedeId, fechaDesde, fechaHasta]);

  // CSV downloaders
  const downloadVentas = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Fecha', 'Cantidad de ventas', 'Monto total'],
      ...data.ventas_por_dia.map((v: VentaPorDia) => [v.fecha, String(v.cantidad), v.monto]),
    ];
    downloadCsv(`ventas_por_dia_${fechaDesde}_${fechaHasta}.csv`, rows);
  };

  const downloadTopProductos = () => {
    if (!data) return;
    const rows: string[][] = [
      ['SKU', 'Producto', 'Unidades vendidas', 'Monto total'],
      ...data.top_productos.map((p: TopProducto) => [p.sku, p.producto_name, String(p.total_vendidos), p.monto_total]),
    ];
    downloadCsv(`top_productos_${fechaDesde}_${fechaHasta}.csv`, rows);
  };

  const downloadResumen = () => {
    if (!data) return;
    const { resumen } = data;
    const sede = sedes.find(s => String(s.id) === sedeId)?.name ?? 'Todas las sedes';
    const rows: string[][] = [
      ['Período', `${fechaDesde} al ${fechaHasta}`],
      ['Sede',    sede],
      [''],
      ['Métrica', 'Valor'],
      ['Total ventas completadas', String(resumen.total_ventas)],
      ['Monto total vendido',      resumen.monto_total],
      ['Total cancelaciones',      String(resumen.total_cancelaciones)],
      ['Monto cancelaciones',      resumen.monto_cancelaciones],
    ];
    downloadCsv(`resumen_${fechaDesde}_${fechaHasta}.csv`, rows);
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-card)', borderRadius: 'var(--radius-lg)',
    padding: '18px 20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)',
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <h2 className="section-title">Reportes de Ventas</h2>
      </div>

      {/* ── Filtros ── */}
      <div style={{ ...cardStyle, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
        <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
          <label className="form-label">Sede</label>
          <select className="form-input" value={sedeId} onChange={e => setSedeId(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Desde</label>
          <input className="form-input" type="date" value={fechaDesde} max={today} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Hasta</label>
          <input className="form-input" type="date" value={fechaHasta} max={today} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={handleLoad} disabled={loading} style={{ padding: '9px 20px' }}>
          {loading ? 'Cargando…' : 'Generar reporte'}
        </button>
        {data && (
          <button className="btn-secondary" onClick={downloadResumen} style={{ padding: '9px 16px' }}>
            ⬇ Resumen CSV
          </button>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
          Selecciona el período y haz clic en <strong>Generar reporte</strong>.
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── KPI resumen ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Ventas completadas', value: data.resumen.total_ventas,        color: 'var(--color-primary)',  isNum: true  },
              { label: 'Monto total',         value: fmt(data.resumen.monto_total),    color: 'var(--color-success)',  isNum: false },
              { label: 'Cancelaciones',        value: data.resumen.total_cancelaciones,color: '#c53030',               isNum: true  },
              { label: 'Monto cancelado',      value: fmt(data.resumen.monto_cancelaciones), color: '#c53030',         isNum: false },
            ].map(k => (
              <div key={k.label} style={cardStyle}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{k.label}</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── Ventas por día ── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 className="dashboard-chart-title" style={{ margin: 0 }}>Ventas por día</h4>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={downloadVentas}>
                ⬇ Descargar CSV
              </button>
            </div>
            {data.ventas_por_dia.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>Sin ventas en el período.</p>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'center' }}>Ventas</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ventas_por_dia.map((v: VentaPorDia) => (
                      <tr key={v.fecha}>
                        <td>{v.fecha}</td>
                        <td style={{ textAlign: 'center' }}>{v.cantidad}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(v.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-main)' }}>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{data.resumen.total_ventas}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(data.resumen.monto_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Top productos ── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 className="dashboard-chart-title" style={{ margin: 0 }}>Top 20 productos más vendidos</h4>
              <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={downloadTopProductos}>
                ⬇ Descargar CSV
              </button>
            </div>
            {data.top_productos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>Sin productos vendidos en el período.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>#</th>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Unidades</th>
                      <th style={{ textAlign: 'right' }}>Monto total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_productos.map((p: TopProducto, i: number) => (
                      <tr key={p.sku}>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                        <td style={{ fontWeight: 600 }}>{p.producto_name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.total_vendidos}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-primary)', fontWeight: 700 }}>{fmt(p.monto_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default ReportesView;
