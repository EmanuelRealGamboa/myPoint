import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Lock, Unlock, X, ChevronRight } from 'lucide-react';
import { inventoryService } from '../../../api/inventory.service';
import type { MarcaMoto, ModeloMoto, TipoMotor, TipoMoto } from '../../../types/inventory.types';
import ConfirmDialog from '../../common/ConfirmDialog';

const TIPO_MOTOR: { value: TipoMotor; label: string }[] = [
  { value: '2T',        label: '2 Tiempos' },
  { value: '4T',        label: '4 Tiempos' },
  { value: 'ELECTRICO', label: 'Eléctrico' },
];
const TIPO_MOTO: { value: TipoMoto; label: string }[] = [
  { value: 'CARGO',    label: 'Carga / Trabajo' },
  { value: 'NAKED',    label: 'Naked / Urbana' },
  { value: 'DEPORTIVA',label: 'Deportiva' },
  { value: 'SCOOTER',  label: 'Scooter / Automática' },
  { value: 'OFF_ROAD', label: 'Off Road / Enduro' },
  { value: 'CRUCERO',  label: 'Crucero' },
];
const YEAR = new Date().getFullYear();

// ── Modelos form modal ────────────────────────────────────────────────────────

interface ModeloFormProps {
  item: ModeloMoto | null;
  marcaId: number;
  marcaName: string;
  onClose: () => void;
  onSaved: () => void;
}

const ModeloFormModal: React.FC<ModeloFormProps> = ({ item, marcaId, marcaName, onClose, onSaved }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    modelo:     item?.modelo     ?? '',
    año_desde:  String(item?.año_desde ?? YEAR),
    año_hasta:  item?.año_hasta  ? String(item.año_hasta)  : '',
    cilindraje: item?.cilindraje ? String(item.cilindraje) : '',
    tipo_motor: (item?.tipo_motor ?? '4T') as TipoMotor,
    tipo_moto:  (item?.tipo_moto  ?? 'CARGO') as TipoMoto,
  });
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const change = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.modelo.trim()) errs.modelo    = 'El nombre del modelo es requerido';
    if (!form.año_desde)     errs.año_desde = 'El año desde es requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setGlobalError('');
    const payload = {
      marca:      marcaId,
      modelo:     form.modelo.trim(),
      año_desde:  Number(form.año_desde),
      año_hasta:  form.año_hasta  ? Number(form.año_hasta)  : null,
      cilindraje: form.cilindraje ? Number(form.cilindraje) : null,
      tipo_motor: form.tipo_motor,
      tipo_moto:  form.tipo_moto,
    };
    try {
      if (isEdit) {
        await inventoryService.updateMotoModel(item!.id, payload);
      } else {
        await inventoryService.createMotoModel(payload);
      }
      onSaved();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v);
        }
        setErrors(mapped);
      } else {
        setGlobalError(data?.message ?? 'Error inesperado');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Modelo' : `Nuevo Modelo — ${marcaName}`}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Nombre del modelo *</label>
            <input
              value={form.modelo}
              onChange={e => change('modelo', e.target.value)}
              placeholder="ej. T110, FT125, Wave, Pulsar NS200"
            />
            {errors.modelo && <span className="field-error">{errors.modelo}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Año desde *</label>
              <input
                type="number" min={1990} max={YEAR + 1}
                value={form.año_desde}
                onChange={e => change('año_desde', e.target.value)}
              />
              {errors.año_desde && <span className="field-error">{errors.año_desde}</span>}
            </div>
            <div className="form-group">
              <label>Año hasta</label>
              <input
                type="number" min={1990} max={YEAR + 5}
                value={form.año_hasta}
                onChange={e => change('año_hasta', e.target.value)}
                placeholder="Vacío = vigente"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cilindraje (cc)</label>
              <input
                type="number" min={0}
                value={form.cilindraje}
                onChange={e => change('cilindraje', e.target.value)}
                placeholder="ej. 110, 125, 200"
              />
            </div>
            <div className="form-group">
              <label>Tipo de motor</label>
              <select value={form.tipo_motor} onChange={e => change('tipo_motor', e.target.value)}>
                {TIPO_MOTOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de moto</label>
            <select value={form.tipo_moto} onChange={e => change('tipo_moto', e.target.value)}>
              {TIPO_MOTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Marca form modal ──────────────────────────────────────────────────────────

interface MarcaFormProps {
  item: MarcaMoto | null;
  onClose: () => void;
  onSaved: () => void;
}

const MarcaFormModal: React.FC<MarcaFormProps> = ({ item, onClose, onSaved }) => {
  const isEdit = !!item;
  const [name,        setName]        = useState(item?.name ?? '');
  const [error,       setError]       = useState('');
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSubmitting(true); setGlobalError('');
    try {
      if (isEdit) {
        await inventoryService.updateMotoBrand(item!.id, { name: name.trim() });
      } else {
        await inventoryService.createMotoBrand({ name: name.trim() });
      }
      onSaved();
    } catch (err: any) {
      const data = err?.response?.data;
      setGlobalError(data?.message ?? data?.errors?.name?.[0] ?? 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Marca' : 'Nueva Marca de Moto'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}
          <div className="form-group">
            <label>Nombre de la marca *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="ej. Italika, Honda, Yamaha, Suzuki"
            />
            {error && <span className="field-error">{error}</span>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear marca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modelos panel ─────────────────────────────────────────────────────────────

interface ModelosPanelProps { marca: MarcaMoto; }

const ModelosPanel: React.FC<ModelosPanelProps> = ({ marca }) => {
  const [modelos,     setModelos]     = useState<ModeloMoto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<ModeloMoto | null | undefined>(undefined);
  const [confirmItem, setConfirmItem] = useState<ModeloMoto | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    inventoryService.listMotoModels({ marca: marca.id, page_size: 200 })
      .then(r => setModelos(r.data.models))
      .finally(() => setLoading(false));
  }, [marca.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item: ModeloMoto) => {
    await inventoryService.updateMotoModel(item.id, { is_active: !item.is_active });
    setConfirmItem(null);
    load();
  };

  if (loading) return <div className="table-loading">Cargando modelos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {modelos.length} modelo{modelos.length !== 1 ? 's' : ''} registrados
        </p>
        <button className="btn-primary" onClick={() => setModal(null)}>+ Nuevo Modelo</button>
      </div>

      {modelos.length === 0 ? (
        <div className="empty-card">Sin modelos registrados para esta marca.<br />Usa el botón para agregar el primero.</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Años</th>
                <th>CC</th>
                <th>Motor</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map(m => (
                <tr key={m.id} className={!m.is_active ? 'row-inactive' : ''}>
                  <td><strong>{m.modelo}</strong></td>
                  <td>{m.año_desde}{m.año_hasta ? `–${m.año_hasta}` : '+'}</td>
                  <td>{m.cilindraje ? `${m.cilindraje} cc` : <span className="text-muted">—</span>}</td>
                  <td><span className="table-code">{m.tipo_motor}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{m.tipo_moto}</td>
                  <td>
                    <span className={`status-badge ${m.is_active ? 'active' : 'inactive'}`}>
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon btn-edit" title="Editar" onClick={() => setModal(m)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`btn-icon ${m.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                        title={m.is_active ? 'Desactivar' : 'Activar'}
                        onClick={() => setConfirmItem(m)}
                      >
                        {m.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== undefined && (
        <ModeloFormModal
          item={modal}
          marcaId={marca.id}
          marcaName={marca.name}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); load(); }}
        />
      )}

      <ConfirmDialog
        open={confirmItem !== null}
        title={confirmItem?.is_active ? 'Desactivar modelo' : 'Activar modelo'}
        message={confirmItem?.is_active
          ? `¿Desactivar el modelo "${confirmItem?.modelo}"?`
          : `¿Activar el modelo "${confirmItem?.modelo}"?`}
        confirmLabel={confirmItem?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmItem?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmItem && handleToggle(confirmItem)}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────

const MotoCatalogView: React.FC = () => {
  const [marcas,     setMarcas]     = useState<MarcaMoto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [selected,   setSelected]   = useState<MarcaMoto | null>(null);
  const [marcaModal, setMarcaModal] = useState<MarcaMoto | null | undefined>(undefined);
  const [confirmMarca, setConfirmMarca] = useState<MarcaMoto | null>(null);

  const loadMarcas = useCallback(() => {
    setLoading(true); setError('');
    inventoryService.listMotoBrands()
      .then(r => {
        setMarcas(r.data);
        if (r.data.length > 0) setSelected(prev => prev ?? r.data[0]);
      })
      .catch(() => setError('Error al cargar las marcas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMarcas(); }, [loadMarcas]);

  const handleToggleMarca = async (m: MarcaMoto) => {
    await inventoryService.updateMotoBrand(m.id, { is_active: !m.is_active });
    setConfirmMarca(null);
    loadMarcas();
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Catálogo de Motos</h2>
          <p>Marcas y modelos para la compatibilidad de piezas (fitment)</p>
        </div>
        <button className="btn-primary" onClick={() => setMarcaModal(null)}>+ Nueva Marca</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* Marcas sidebar */}
        <div className="table-wrapper" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--color-primary)',
            background: 'var(--color-primary-bg)',
          }}>
            Marcas ({marcas.length})
          </div>

          {loading ? (
            <div className="table-loading">Cargando...</div>
          ) : marcas.length === 0 ? (
            <p style={{ padding: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Sin marcas. Agrega una.
            </p>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 520 }}>
              {marcas.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSelected(m)}
                  style={{
                    padding: '11px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-border-light)',
                    borderLeft: selected?.id === m.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                    background: selected?.id === m.id ? 'var(--color-primary-bg)' : 'transparent',
                    opacity: m.is_active ? 1 : 0.55,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selected?.id === m.id && <ChevronRight size={14} color="var(--color-primary)" />}
                    <span style={{ fontSize: 14, fontWeight: selected?.id === m.id ? 700 : 400, color: 'var(--color-text)' }}>
                      {m.name}
                    </span>
                  </div>
                  <div className="action-buttons" style={{ gap: 4 }}>
                    <button
                      className="btn-icon btn-edit"
                      title="Editar"
                      style={{ width: 28, height: 28 }}
                      onClick={e => { e.stopPropagation(); setMarcaModal(m); }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className={`btn-icon ${m.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                      title={m.is_active ? 'Desactivar' : 'Activar'}
                      style={{ width: 28, height: 28 }}
                      onClick={e => { e.stopPropagation(); setConfirmMarca(m); }}
                    >
                      {m.is_active ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modelos panel */}
        <div className="table-wrapper">
          {selected ? (
            <>
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Modelos de moto compatibles con piezas del catálogo
                </p>
              </div>
              <ModelosPanel key={selected.id} marca={selected} />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
              Selecciona una marca en el panel izquierdo para ver sus modelos.
            </div>
          )}
        </div>
      </div>

      {/* Marca modal */}
      {marcaModal !== undefined && (
        <MarcaFormModal
          item={marcaModal}
          onClose={() => setMarcaModal(undefined)}
          onSaved={() => { setMarcaModal(undefined); loadMarcas(); }}
        />
      )}

      <ConfirmDialog
        open={confirmMarca !== null}
        title={confirmMarca?.is_active ? 'Desactivar marca' : 'Activar marca'}
        message={confirmMarca?.is_active
          ? `¿Desactivar la marca "${confirmMarca?.name}"? Sus modelos no se eliminarán.`
          : `¿Activar la marca "${confirmMarca?.name}"?`}
        confirmLabel={confirmMarca?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmMarca?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmMarca && handleToggleMarca(confirmMarca)}
        onCancel={() => setConfirmMarca(null)}
      />
    </div>
  );
};

export default MotoCatalogView;
