import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Lock, Unlock, X } from 'lucide-react';
import { inventoryService } from '../../../api/inventory.service';
import type { Subcategoria, Categoria } from '../../../types/inventory.types';
import ConfirmDialog from '../../common/ConfirmDialog';

// ── Inline form modal ─────────────────────────────────────────────────────────

interface FormProps {
  item: Subcategoria | null;
  categories: Categoria[];
  onClose: () => void;
  onSaved: () => void;
}

const SubcategoriaFormModal: React.FC<FormProps> = ({ item, categories, onClose, onSaved }) => {
  const isEdit = !!item;
  const [form, setForm] = useState({
    categoria:   String(item?.categoria ?? ''),
    name:        item?.name ?? '',
    description: item?.description ?? '',
  });
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const change = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.categoria)    errs.categoria = 'Selecciona una categoría';
    if (!form.name.trim())  errs.name      = 'El nombre es requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setGlobalError('');
    const payload = { categoria: Number(form.categoria), name: form.name.trim(), description: form.description };
    try {
      if (isEdit) {
        await inventoryService.updateSubcategory(item!.id, payload);
      } else {
        await inventoryService.createSubcategory(payload);
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
          <h2>{isEdit ? 'Editar Subcategoría' : 'Nueva Subcategoría'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Categoría *</label>
            <select value={form.categoria} onChange={e => change('categoria', e.target.value)}>
              <option value="">Seleccionar categoría…</option>
              {categories.filter(c => c.is_active || isEdit).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoria && <span className="field-error">{errors.categoria}</span>}
          </div>

          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={e => change('name', e.target.value)}
              placeholder="ej. Pistones, Filtros de aceite, Frenos"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => change('description', e.target.value)}
              placeholder="Descripción breve (opcional)"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear subcategoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const SubcategoriesList: React.FC = () => {
  const [items,      setItems]      = useState<Subcategoria[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [modal,      setModal]      = useState<Subcategoria | null | undefined>(undefined);
  const [confirmItem,setConfirmItem]= useState<Subcategoria | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    inventoryService.listSubcategories({
      categoria: filterCat ? Number(filterCat) : undefined,
      page_size: 200,
    } as any)
      .then(r => setItems(r.data.subcategories))
      .catch(() => setError('Error al cargar las subcategorías'))
      .finally(() => setLoading(false));
  }, [filterCat]);

  useEffect(() => {
    inventoryService.listCategories({ page_size: 100 } as any)
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item: Subcategoria) => {
    try {
      await inventoryService.toggleSubcategory(item.id);
      setConfirmItem(null);
      load();
    } catch {
      setConfirmItem(null);
      setError('Error al cambiar el estado');
    }
  };

  const active = items.filter(i => i.is_active).length;

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Subcategorías</h2>
          <p>{active} activas · {items.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="filter-select"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModal(null)}>+ Nueva Subcategoría</button>
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
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty-state">No hay subcategorías registradas</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={!item.is_active ? 'row-inactive' : ''}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.categoria_name}</td>
                    <td>{item.description || <span className="text-muted">—</span>}</td>
                    <td>{item.product_count}</td>
                    <td>
                      <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? 'Activa' : 'Inactiva'}
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
        <SubcategoriaFormModal
          item={modal}
          categories={categories}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); load(); }}
        />
      )}

      <ConfirmDialog
        open={confirmItem !== null}
        title={confirmItem?.is_active ? 'Desactivar subcategoría' : 'Activar subcategoría'}
        message={confirmItem?.is_active
          ? `¿Desactivar "${confirmItem?.name}"?`
          : `¿Activar "${confirmItem?.name}"?`}
        confirmLabel={confirmItem?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmItem?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmItem && handleToggle(confirmItem)}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
};

export default SubcategoriesList;
