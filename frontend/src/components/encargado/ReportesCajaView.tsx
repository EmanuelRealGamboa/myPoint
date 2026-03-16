import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../api/axios.config';

interface ReporteCaja {
  id: number;
  sede_name: string;
  cajero_name: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  total_ventas: number;
  total_canceladas: number;
  monto_total: string;
  monto_efectivo: string;
  monto_tarjeta: string;
  monto_transferencia: string;
  total_descuentos: string;
  tiene_archivo: boolean;
  created_at: string;
}

interface Props {
  sedeId?: number;      // encargado scope; undefined = admin (all sedes)
  showSede?: boolean;   // show sede column (admin view)
}

const fmt = (v: string | number) =>
  Number(v).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDT = (dt: string | null) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const ReportesCajaView: React.FC<Props> = ({ sedeId, showSede = false }) => {
  const [reportes, setReportes]     = useState<ReporteCaja[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloading, setDownloading] = useState<number | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, page_size: 15 };
      if (sedeId) params.sede_id = sedeId;
      const r = await apiClient.get('/sales/reportes-caja/', { params });
      setReportes(r.data.data.reportes);
      setTotalPages(r.data.data.pagination.total_pages);
    } catch {
      setReportes([]);
    } finally {
      setLoading(false);
    }
  }, [sedeId]);

  useEffect(() => { load(page); }, [load, page]);

  const handleDownload = async (reporte: ReporteCaja) => {
    setDownloading(reporte.id);
    try {
      const r = await apiClient.get(`/sales/reportes-caja/${reporte.id}/descargar/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      const cajero  = reporte.cajero_name.replace(/ /g, '_');
      const fecha   = reporte.fecha_cierre
        ? new Date(reporte.fecha_cierre).toISOString().slice(0, 10)
        : new Date(reporte.created_at).toISOString().slice(0, 10);
      a.download = `reporte_caja_${cajero}_${fecha}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar el reporte.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <h2 className="section-title">Reportes de cierre de caja</h2>
        <p className="section-subtitle">
          Se genera automáticamente al cerrar cada turno de caja.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Cargando reportes…
        </div>
      ) : reportes.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <FileText size={40} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Sin reportes todavía</p>
          <p style={{ fontSize: 13 }}>Los reportes aparecerán aquí cuando se cierre una caja.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-primary-bg)', textAlign: 'left' }}>
                  {showSede && <Th>Sede</Th>}
                  <Th>Cajero/a</Th>
                  <Th>Apertura</Th>
                  <Th>Cierre</Th>
                  <Th right>Ventas</Th>
                  <Th right>Canceladas</Th>
                  <Th right>Total neto</Th>
                  <Th right>Descuentos</Th>
                  <Th center>PDF</Th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r, i) => (
                  <tr key={r.id} style={{
                    background: i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-main)',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    {showSede && <Td>{r.sede_name}</Td>}
                    <Td><strong>{r.cajero_name}</strong></Td>
                    <Td>{fmtDT(r.fecha_apertura)}</Td>
                    <Td>{fmtDT(r.fecha_cierre)}</Td>
                    <Td right>
                      <span style={{
                        background: 'var(--color-success-bg)',
                        color: 'var(--color-success)',
                        borderRadius: 999, padding: '2px 8px', fontWeight: 600,
                      }}>
                        {r.total_ventas}
                      </span>
                    </Td>
                    <Td right>
                      {r.total_canceladas > 0 ? (
                        <span style={{
                          background: 'var(--color-error-bg)',
                          color: 'var(--color-error)',
                          borderRadius: 999, padding: '2px 8px', fontWeight: 600,
                        }}>
                          {r.total_canceladas}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>0</span>
                      )}
                    </Td>
                    <Td right><strong>{fmt(r.monto_total)}</strong></Td>
                    <Td right style={{ color: 'var(--color-text-secondary)' }}>
                      {Number(r.total_descuentos) > 0 ? fmt(r.total_descuentos) : '—'}
                    </Td>
                    <Td center>
                      {r.tiene_archivo ? (
                        <button
                          onClick={() => handleDownload(r)}
                          disabled={downloading === r.id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'var(--color-primary)', color: '#fff',
                            border: 'none', borderRadius: 'var(--radius-sm)',
                            padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                            opacity: downloading === r.id ? 0.6 : 1,
                          }}
                        >
                          <Download size={13} />
                          {downloading === r.id ? '…' : 'PDF'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                          No disponible
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ width: 'auto', padding: '6px 12px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary"
                style={{ width: 'auto', padding: '6px 12px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Cell helpers ──────────────────────────────────────────────────────────────

const Th: React.FC<{ children: React.ReactNode; right?: boolean; center?: boolean }> = ({ children, right, center }) => (
  <th style={{
    padding: '10px 12px',
    color: 'var(--color-primary)',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: right ? 'right' : center ? 'center' : 'left',
    borderBottom: '2px solid var(--color-border)',
    whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; right?: boolean; center?: boolean; style?: React.CSSProperties }> = ({ children, right, center, style }) => (
  <td style={{
    padding: '10px 12px',
    textAlign: right ? 'right' : center ? 'center' : 'left',
    whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </td>
);

export default ReportesCajaView;
