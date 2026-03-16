import React, { useEffect, useState, useCallback } from 'react';
import { branchesService } from '../../api/branches.service';
import type { SedeDetail } from '../../types/auth.types';
import { Building2, Pencil, Lock, Unlock, Phone } from 'lucide-react';
import SedeFormModal from './SedeFormModal';

const SedesList: React.FC = () => {
  const [sedes, setSedes] = useState<SedeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalSede, setModalSede] = useState<SedeDetail | null | undefined>(undefined);
  // undefined = modal closed, null = create mode, SedeDetail = edit mode

  const loadSedes = useCallback(() => {
    setIsLoading(true);
    setError('');
    branchesService
      .list()
      .then((r) => setSedes(r.data))
      .catch(() => setError('Error al cargar las sedes'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadSedes(); }, [loadSedes]);

  const handleToggleActive = async (sede: SedeDetail) => {
    try {
      await branchesService.toggleActive(sede.id);
      loadSedes();
    } catch {
      setError('Error al cambiar el estado de la sede');
    }
  };

  const handleSaved = () => {
    setModalSede(undefined);
    loadSedes();
  };

  const activeSedes = sedes.filter((s) => s.is_active).length;

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Sedes</h2>
          <p>{activeSedes} sede{activeSedes !== 1 ? 's' : ''} activa{activeSedes !== 1 ? 's' : ''} · {sedes.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setModalSede(null)}>
          + Nueva Sede
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="table-loading">Cargando...</div>
      ) : (
        <div className="sedes-grid">
          {sedes.length === 0 ? (
            <div className="empty-card">No hay sedes registradas</div>
          ) : (
            sedes.map((s) => (
              <div key={s.id} className={`sede-card ${!s.is_active ? 'sede-card--inactive' : ''}`}>
                <div className="sede-card-header">
                  <div className="sede-icon"><Building2 size={28} /></div>
                  <div className="sede-card-actions">
                    <button
                      className="btn-icon btn-edit"
                      title="Editar"
                      onClick={() => setModalSede(s)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={`btn-icon ${s.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                      title={s.is_active ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggleActive(s)}
                    >
                      {s.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>

                <h3 className="sede-card-name">{s.name}</h3>
                <p className="sede-card-address">{s.address}</p>
                {s.phone && (
                  <p className="sede-card-phone">
                    <Phone size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {s.phone}
                  </p>
                )}

                <div className="sede-card-stats">
                  <div className="sede-stat">
                    <span className="sede-stat-value">{s.user_count}</span>
                    <span className="sede-stat-label">usuarios</span>
                  </div>
                  <span className={`status-badge ${s.is_active ? 'active' : 'inactive'}`}>
                    {s.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modalSede !== undefined && (
        <SedeFormModal
          sede={modalSede}
          onClose={() => setModalSede(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default SedesList;
