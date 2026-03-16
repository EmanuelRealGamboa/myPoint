import React, { useEffect, useState, useCallback } from 'react';
import { authService } from '../../api/auth.service';

interface AuditLog {
  id:                  number;
  event_type:          string;
  event_type_display:  string;
  email:               string;
  ip_address:          string | null;
  timestamp:           string;
  details:             string;
}

interface Pagination {
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN_SUCCESS:       { label: 'Acceso exitoso',          color: '#276749' },
  LOGIN_FAILED:        { label: 'Intento fallido',         color: '#744210' },
  ACCOUNT_LOCKED:      { label: 'Cuenta bloqueada',        color: '#c53030' },
  ACCOUNT_UNLOCKED:    { label: 'Cuenta desbloqueada',     color: '#2b6cb0' },
  UNLOCK_REQUESTED:    { label: 'Solicitud desbloqueo',    color: '#6b46c1' },
  PASSWORD_RESET_REQ:  { label: 'Reset contraseña (req.)', color: '#744210' },
  PASSWORD_RESET_DONE: { label: 'Contraseña restablecida', color: '#276749' },
};

const EVENT_BG: Record<string, string> = {
  LOGIN_SUCCESS:       '#f0fff4',
  LOGIN_FAILED:        '#fffbeb',
  ACCOUNT_LOCKED:      '#fff5f5',
  ACCOUNT_UNLOCKED:    '#ebf8ff',
  UNLOCK_REQUESTED:    '#faf5ff',
  PASSWORD_RESET_REQ:  '#fffbeb',
  PASSWORD_RESET_DONE: '#f0fff4',
};

const SecurityView: React.FC = () => {
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, page_size: 50, total_pages: 1 });
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');

  const [eventFilter, setEventFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage]               = useState(1);

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    const params: Record<string, any> = { page, page_size: 50 };
    if (eventFilter) params.event_type = eventFilter;
    if (emailFilter) params.email = emailFilter;

    authService.getAuditLog(params)
      .then((r) => {
        if (r.success) {
          setLogs(r.data.logs ?? []);
          setPagination(r.data.pagination);
        }
      })
      .catch(() => setError('Error al cargar el registro de seguridad'))
      .finally(() => setIsLoading(false));
  }, [page, eventFilter, emailFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [eventFilter, emailFilter]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Registro de Seguridad</h2>
          <p>{pagination.total} evento{pagination.total !== 1 ? 's' : ''} en total</p>
        </div>
        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={load}>
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="filter-input"
          placeholder="Buscar por email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
        <select
          className="filter-select"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="">Todos los eventos</option>
          {Object.entries(EVENT_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="table-loading">Cargando...</div>
      ) : (
        <>
          <div className="table-wrapper">
            <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Evento</th>
                  <th>Email</th>
                  <th>IP</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">No hay eventos registrados</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const meta = EVENT_LABELS[log.event_type] ?? { label: log.event_type_display, color: '#4a5568' };
                    const bg   = EVENT_BG[log.event_type]   ?? '#f7fafc';
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#718096' }}>
                          {fmt(log.timestamp)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            background: bg,
                            color: meta.color,
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{log.email}</td>
                        <td style={{ fontSize: 12, color: '#718096', whiteSpace: 'nowrap' }}>
                          {log.ip_address ?? '—'}
                        </td>
                        <td style={{ fontSize: 12, color: '#4a5568', maxWidth: 260, wordBreak: 'break-word' }}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <button
                className="page-btn"
                disabled={page === pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SecurityView;
