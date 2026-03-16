import React, { useState } from 'react';
import { branchesService } from '../../api/branches.service';
import type { SedeDetail, SedeCreatePayload, SedeUpdatePayload } from '../../types/auth.types';
import { X } from 'lucide-react';

interface Props {
  sede?: SedeDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

const SedeFormModal: React.FC<Props> = ({ sede, onClose, onSaved }) => {
  const isEdit = !!sede;

  const [form, setForm] = useState({
    name: sede?.name ?? '',
    address: sede?.address ?? '',
    phone: sede?.phone ?? '',
    is_active: sede?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const change = (field: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.address.trim()) errs.address = 'La dirección es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGlobalError('');

    try {
      if (isEdit) {
        const payload: SedeUpdatePayload = {
          name: form.name,
          address: form.address,
          phone: form.phone,
          is_active: form.is_active,
        };
        await branchesService.update(sede!.id, payload);
      } else {
        const payload: SedeCreatePayload = {
          name: form.name,
          address: form.address,
          phone: form.phone,
        };
        await branchesService.create(payload);
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
        setGlobalError(data?.message ?? 'Ocurrió un error inesperado');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Sede' : 'Nueva Sede'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Nombre de la sede *</label>
            <input
              value={form.name}
              onChange={(e) => change('name', e.target.value)}
              placeholder="Ej: Sucursal Norte"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Dirección *</label>
            <input
              value={form.address}
              onChange={(e) => change('address', e.target.value)}
              placeholder="Calle, número, colonia..."
            />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </div>

          <div className="form-group">
            <label>Teléfono (opcional)</label>
            <input
              value={form.phone}
              onChange={(e) => change('phone', e.target.value)}
              placeholder="Ej: 555-123-4567"
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          {isEdit && (
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => change('is_active', e.target.checked)}
                />
                <span>Sede activa</span>
              </label>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SedeFormModal;
