import React from 'react';
import type { SedeSnapshot } from '../../../types/auth.types';
import { X } from 'lucide-react';

interface Props {
  sede: SedeSnapshot;
  onClose: () => void;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SedeDetailPanel: React.FC<Props> = ({ sede, onClose }) => {
  const hasAlerts = sede.low_stock_count > 0 || sede.out_of_stock_count > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card sede-detail-panel"
        style={{ maxWidth: 560 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: 8 }}>
          <div>
            <h2 className="sede-detail-title">{sede.name}</h2>
            {sede.address && <p className="sede-detail-meta">{sede.address}</p>}
            {sede.phone  && <p className="sede-detail-meta" style={{ marginTop: 2 }}>{sede.phone}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {/* Employee grid */}
          <Section title="Personal">
            <div className="sede-detail-kpi-grid">
              <KpiBox label="Total empleados" value={sede.total_employees} />
              <KpiBox label="En turno ahora" value={sede.on_shift_now} />
              <KpiBox label="Trabajadores" value={sede.total_workers} />
              <KpiBox label="Cajeros" value={sede.total_cashiers} />
            </div>
          </Section>

          {/* On-shift workers */}
          {sede.on_shift_users.length > 0 && (
            <Section title="Empleados en turno ahora">
              <div className="sede-detail-users-list">
                {sede.on_shift_users.map(u => (
                  <div key={u.id} className="sede-detail-user-row">
                    <div className="sede-detail-user-avatar">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="sede-detail-user-name">{u.name}</p>
                      <p className="sede-detail-user-role">{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Stock alerts */}
          <Section title="Inventario">
            {hasAlerts ? (
              <div className="sede-detail-alerts">
                {sede.out_of_stock_count > 0 && (
                  <AlertBox
                    value={sede.out_of_stock_count}
                    label="productos sin stock"
                    variant="error"
                  />
                )}
                {sede.low_stock_count > 0 && (
                  <AlertBox
                    value={sede.low_stock_count}
                    label="con stock bajo"
                    variant="warning"
                  />
                )}
              </div>
            ) : (
              <p className="sede-detail-no-alerts">Sin alertas de inventario</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="sede-detail-section">
    <h3 className="sede-detail-section-title">{title}</h3>
    {children}
  </div>
);

const KpiBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="sede-detail-kpi-box">
    <p className="sede-detail-kpi-label">{label}</p>
    <p className="sede-detail-kpi-value">{value}</p>
  </div>
);

const AlertBox: React.FC<{ value: number; label: string; variant: 'error' | 'warning' }> = ({ value, label, variant }) => (
  <div className={`sede-detail-alert-box sede-detail-alert-box--${variant}`}>
    <p className="sede-detail-alert-value">{value}</p>
    <p className="sede-detail-alert-label">{label}</p>
  </div>
);

export default SedeDetailPanel;
