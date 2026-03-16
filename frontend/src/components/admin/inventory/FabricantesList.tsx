import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Lock, Unlock, X } from 'lucide-react';
import { inventoryService } from '../../../api/inventory.service';
import type { MarcaFabricante, TipoMarca } from '../../../types/inventory.types';
import ConfirmDialog from '../../common/ConfirmDialog';

const TIPOS: { value: TipoMarca; label: string }[] = [
  { value: 'OEM',         label: 'OEM (Original)' },
  { value: 'AFTERMARKET', label: 'Aftermarket' },
  { value: 'GENERICO',    label: 'Genérico' },
];

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormProps {
  item: MarcaFabricante | null;
  onClose: () => void;
  onSaved: () => void;
}

const FabricanteFormModal: React.FC<FormProps> = ({ item, onClose, onSaved }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? '',
    tipo: (item?.tipo ?? 'OEM') as TipoMarca,
    pais: item?.pais ?? '',
  });
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const change = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setGlobalError('');
    const payload = { name: form.name.trim(), tipo: form.tipo, pais: form.pais.trim() };
    try {
      if (isEdit) {
        await inventoryService.updateFabricanteBrand(item!.id, payload);
      } else {
        await inventoryService.createFabricanteBrand(payload);
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
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Fabricante' : 'Nuevo Fabricante'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={e => change('name', e.target.value)}
              placeholder="ej. Italika, Honda, NGK, Bardahl"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Tipo</label>
            <select value={form.tipo} onChange={e => change('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>País de origen</label>
            <input
              value={form.pais}
              onChange={e => change('pais', e.target.value)}
              placeholder="ej. México, Japón, China, Italia"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear fabricante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const TIPO_BADGE: Record<TipoMarca, string> = {
  OEM:         'product-tipo-badge product-tipo-badge--oem',
  AFTERMARKET: 'product-tipo-badge product-tipo-badge--aftermarket',
  GENERICO:    'product-tipo-badge product-tipo-badge--remanufacturado',
};

const FabricantesList: React.FC = () => {
  const [items,       setItems]       = useState<MarcaFabricante[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [filterTipo,  setFilterTipo]  = useState('');
  const [modal,       setModal]       = useState<MarcaFabricante | null | undefined>(undefined);
  const [confirmItem, setConfirmItem] = useState<MarcaFabricante | null>(null);
  const [toggling,    setToggling]    = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    inventoryService.listFabricanteBrands(filterTipo ? { tipo: filterTipo } : undefined)
      .then(r => setItems(r.data))
      .catch(() => setError('Error al cargar los fabricantes'))
      .finally(() => setLoading(false));
  }, [filterTipo]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item: MarcaFabricante) => {
    setToggling(true);
    try {
      await inventoryService.updateFabricanteBrand(item.id, { is_active: !item.is_active });
      setConfirmItem(null);
      load();
    } catch {
      setConfirmItem(null);
      setError('Error al cambiar el estado');
    } finally {
      setToggling(false);
    }
  };

  const active = items.filter(i => i.is_active).length;

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Marcas Fabricante</h2>
          <p>{active} activas · {items.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="filter-select"
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal(null)}>+ Nuevo Fabricante</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="table-loading">Cargando...</div>
      ) : (
        <div className="table-wrapper">
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>País</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No hay fabricantes registrados</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={!item.is_active ? 'row-inactive' : ''}>
                    <td><strong>{item.name}</strong></td>
                    <td>
                      <span className={TIPO_BADGE[item.tipo]}>{item.tipo}</span>
                    </td>
                    <td>{item.pais || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" title="Editar" onClick={() => setModal(item)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`btn-icon ${item.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                          title={item.is_active ? 'Desactivar' : 'Activar'}
                          onClick={() => setConfirmItem(item)}
                        >
                          {item.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== undefined && (
        <FabricanteFormModal
          item={modal}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); load(); }}
        />
      )}

      <ConfirmDialog
        open={confirmItem !== null}
        title={confirmItem?.is_active ? 'Desactivar fabricante' : 'Activar fabricante'}
        message={confirmItem?.is_active
          ? `¿Desactivar "${confirmItem?.name}"? Los productos asociados no se eliminan.`
          : `¿Activar "${confirmItem?.name}"?`}
        confirmLabel={confirmItem?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmItem?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmItem && handleToggle(confirmItem)}
        onCancel={() => setConfirmItem(null)}
        loading={toggling}
      />
    </div>
  );
};

export default FabricantesList;
