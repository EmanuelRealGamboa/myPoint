import React, { useState } from 'react';
import { inventoryService } from '../../../api/inventory.service';
import type { Categoria, CategoriaPayload } from '../../../types/inventory.types';
import { X } from 'lucide-react';

interface Props {
  category?: Categoria | null;
  onClose: () => void;
  onSaved: () => void;
}

const CategoryFormModal: React.FC<Props> = ({ category, onClose, onSaved }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
    is_active: category?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const change = (field: string, value: string | boolean) =>
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
    setIsSubmitting(true);
    setGlobalError('');
    try {
      const payload: CategoriaPayload = {
        name: form.name,
        description: form.description,
        is_active: form.is_active,
      };
      if (isEdit) {
        await inventoryService.updateCategory(category!.id, payload);
      } else {
        await inventoryService.createCategory(payload);
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}
          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.name} onChange={e => change('name', e.target.value)} placeholder="Ej: Aceites y Lubricantes" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>Descripción (opcional)</label>
            <textarea value={form.description} onChange={e => change('description', e.target.value)} rows={3} placeholder="Descripción breve de la categoría" />
          </div>
          {isEdit && (
            <div className="form-group form-group--checkbox">
              <label>
                <input type="checkbox" checked={form.is_active} onChange={e => change('is_active', e.target.checked)} />
                <span>Categoría activa</span>
              </label>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
