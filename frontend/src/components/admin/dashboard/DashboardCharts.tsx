import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { SedeSnapshot, DashboardStats } from '../../../types/auth.types';
import type { SedeResumenVentas } from '../../../types/sales.types';

interface Props {
  sedes:   SedeSnapshot[];
  stats:   DashboardStats;
  resumen: SedeResumenVentas[];
}

const cardStyle: React.CSSProperties = {
  background:   'var(--color-bg-card)',
  borderRadius: 'var(--radius-lg)',
  padding:      '18px 20px',
  boxShadow:    'var(--shadow-sm)',
  border:       '1px solid var(--color-border)',
};

const fmt = (n: string | number) =>
  parseFloat(String(n)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

type Periodo = 'hoy' | 'semana' | 'mes' | 'anio';

const PERIODO_LABELS: Record<Periodo, string> = {
  hoy:    'Hoy',
  semana: 'Esta semana',
  mes:    'Este mes',
  anio:   'Este año',
};

const DashboardCharts: React.FC<Props> = ({ sedes, resumen }) => {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');

  // Stock alert chart
  const stockData = sedes.map(s => ({
    name:       s.name.length > 14 ? s.name.substring(0, 13) + '…' : s.name,
    'Sin stock':  s.out_of_stock_count,
    'Stock bajo': s.low_stock_count,
  }));

  const ingresosKey: Record<Periodo, keyof SedeResumenVentas> = {
    hoy:    'ingresos_hoy',
    semana: 'ingresos_semana',
    mes:    'ingresos_mes',
    anio:   'ingresos_anio',
  };

  const totalIngresos = resumen.reduce(
    (s, r) => s + parseFloat(String(r[ingresosKey[periodo]] ?? 0)),
    0,
  );
  const totalDevMes = resumen.reduce((s, r) => s + r.devoluciones_mes, 0);
  const totalMontoDevMes = resumen.reduce(
    (s, r) => s + parseFloat(String(r.monto_devoluciones_mes ?? 0)),
    0,
  );
  const totalCajasAbiertas = resumen.reduce((s, r) => s + r.cajas_abiertas.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI ingresos strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {(['hoy', 'semana', 'mes', 'anio'] as Periodo[]).map(p => {
          const total = resumen.reduce(
            (s, r) => s + parseFloat(String(r[ingresosKey[p]] ?? 0)),
            0,
          );
          return (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                ...cardStyle,
                cursor:     'pointer',
                textAlign:  'left',
                outline:    periodo === p ? '2px solid var(--color-primary)' : 'none',
                background: periodo === p ? 'var(--color-primary-50, #EFF6FF)' : 'var(--color-bg-card)',
                padding:    '14px 16px',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Ingresos · {PERIODO_LABELS[p]}
              </p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>
                {fmt(total)}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Tabla ingresos por sede ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 className="dashboard-chart-title" style={{ margin: 0 }}>
            Ingresos por sede — {PERIODO_LABELS[periodo]}
          </h4>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Total: <strong style={{ color: 'var(--color-primary)' }}>{fmt(totalIngresos)}</strong>
          </span>
        </div>

        {resumen.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Sin datos de ventas disponibles.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Sede</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Ingresos</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Dev. hoy</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Dev. mes (cant.)</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Monto dev. mes</th>
                  <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cajas abiertas</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map(r => (
                  <tr key={r.sede_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.sede_name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {fmt(r[ingresosKey[periodo]] as string)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {r.devoluciones_hoy > 0
                        ? <span style={{ color: '#c53030', fontWeight: 600 }}>{r.devoluciones_hoy}</span>
                        : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {r.devoluciones_mes > 0
                        ? <span style={{ color: '#c53030', fontWeight: 600 }}>{r.devoluciones_mes}</span>
                        : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {parseFloat(r.monto_devoluciones_mes) > 0
                        ? <span style={{ color: '#c53030' }}>−{fmt(r.monto_devoluciones_mes)}</span>
                        : <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {r.cajas_abiertas.length > 0 ? (
                        <span style={{
                          display: 'inline-block', background: '#f0fff4', color: '#22543d',
                          border: '1px solid #c6f6d5', borderRadius: 6, padding: '2px 10px',
                          fontWeight: 700, fontSize: 12,
                        }}>
                          {r.cajas_abiertas.length}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {resumen.length > 1 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-main)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12, color: 'var(--color-text-secondary)' }}>TOTAL</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(totalIngresos)}</td>
                    <td />
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: totalDevMes > 0 ? '#c53030' : 'var(--color-text-secondary)' }}>{totalDevMes || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: totalMontoDevMes > 0 ? '#c53030' : 'var(--color-text-secondary)' }}>
                      {totalMontoDevMes > 0 ? `−${fmt(totalMontoDevMes)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{totalCajasAbiertas || '—'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Cajas activas por sede ── */}
      {resumen.some(r => r.cajas_abiertas.length > 0) && (
        <div style={cardStyle}>
          <h4 className="dashboard-chart-title" style={{ marginBottom: 14 }}>Cajas abiertas ahora</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {resumen.filter(r => r.cajas_abiertas.length > 0).map(r => (
              <div key={r.sede_id} style={{ minWidth: 160 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {r.sede_name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {r.cajas_abiertas.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', background: '#f0fff4',
                      borderRadius: 8, border: '1px solid #c6f6d5',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#22543d', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {c.cajero_name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{c.cajero_name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#718096' }}>Desde {c.desde}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trabajadores en turno por sede ── */}
      {sedes.some(s => s.on_shift_now > 0) && (
        <div style={cardStyle}>
          <h4 className="dashboard-chart-title" style={{ marginBottom: 14 }}>Empleados en turno ahora</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {sedes.filter(s => s.on_shift_now > 0).map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', background: '#EFF6FF',
                borderRadius: 10, border: '1px solid #BFDBFE',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#1E40AF', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700,
                }}>
                  {s.on_shift_now}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#1D4ED8' }}>en turno</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alertas de inventario ── */}
      <div style={cardStyle}>
        <h4 className="dashboard-chart-title" style={{ marginBottom: 14 }}>Alertas de inventario por sede</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stockData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Sin stock"  fill="#DC2626" radius={[4,4,0,0]} />
            <Bar dataKey="Stock bajo" fill="#F97316" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default DashboardCharts;
