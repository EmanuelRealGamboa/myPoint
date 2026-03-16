import React from 'react';
import type { SedeSnapshot } from '../../../types/auth.types';

interface Props {
  sede: SedeSnapshot;
  onClick: (sede: SedeSnapshot) => void;
}

const SedeCard: React.FC<Props> = ({ sede, onClick }) => {
  const hasAlerts = sede.low_stock_count > 0 || sede.out_of_stock_count > 0;

  return (
    <div
      className="sede-card sede-card--clickable"
      onClick={() => onClick(sede)}
    >
      {/* Header */}
      <div className="sede-card-header">
        <div>
          <h3 className="sede-card-name">{sede.name}</h3>
          {sede.address && (
            <p className="sede-card-address">{sede.address}</p>
          )}
        </div>
        <span
          className={`status-badge ${sede.is_active ? 'active' : 'inactive'}`}
          style={{ fontSize: 11 }}
        >
          {sede.is_active ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {/* Employee stats */}
      <div className="sede-card-stats-grid">
        <Stat label="Empleados" value={sede.total_employees} />
        <Stat label="En turno ahora" value={sede.on_shift_now} />
        <Stat label="Trabajadores" value={sede.total_workers} />
        <Stat label="Cajeros" value={sede.total_cashiers} />
      </div>

      {/* Stock alerts */}
      {hasAlerts && (
        <div className="sede-card-alerts">
          {sede.out_of_stock_count > 0 && (
            <span className="sede-alert-badge sede-alert-badge--error">
              {sede.out_of_stock_count} sin stock
            </span>
          )}
          {sede.low_stock_count > 0 && (
            <span className="sede-alert-badge sede-alert-badge--warning">
              {sede.low_stock_count} stock bajo
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <p className="sede-card-cta">Ver detalle →</p>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="sede-stat-box">
    <p className="sede-stat-label">{label}</p>
    <p className="sede-stat-value">{value}</p>
  </div>
);

export default SedeCard;
