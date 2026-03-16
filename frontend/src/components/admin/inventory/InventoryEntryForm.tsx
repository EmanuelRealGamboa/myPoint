import React, { useEffect, useState } from 'react';
import { inventoryService } from '../../../api/inventory.service';
import { branchesService } from '../../../api/branches.service';
import type { Producto, EntradaInventario, EntradaPayload } from '../../../types/inventory.types';
import type { SedeDetail } from '../../../types/auth.types';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const InventoryEntryForm: React.FC<Props> = ({ onClose, onSaved }) => {
  const [products, setProducts] = useState<Producto[]>([]);
  const [sedes, setSedes] = useState<SedeDetail[]>([]);
  const [form, setForm] = useState({ producto: '', sede: '', quantity: '', cost_unit: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      inventoryService.listProducts({ is_active: true, page_size: 200 }),
      branchesService.list(),
    ]).then(([pr, sr]) => {
      setProducts(pr.data.products);
      setSedes(sr.data.filter(s => s.is_active));
    }).catch(() => {});
  }, []);

  const change = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.producto) errs.producto = 'Selecciona un producto';
    if (!form.sede) errs.sede = 'Selecciona una sede';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = 'La cantidad debe ser mayor a 0';
    if (!form.cost_unit || Number(form.cost_unit) < 0) errs.cost_unit = 'El costo no puede ser negativo';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setGlobalError('');
    try {
      const payload: EntradaPayload = {
        producto: Number(form.producto),
        sede: Number(form.sede),
        quantity: Number(form.quantity),
        cost_unit: Number(form.cost_unit),
        notes: form.notes,
      };
      await inventoryService.createEntry(payload);
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
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Alta de Inventario</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Producto *</label>
            <select value={form.producto} onChange={e => change('producto', e.target.value)}>
              <option value="">— Selecciona un producto —</option>
              {products.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>)}
            </select>
            {errors.producto && <span className="field-error">{errors.producto}</span>}
          </div>

          <div className="form-group">
            <label>Sede destino *</label>
            <select value={form.sede} onChange={e => change('sede', e.target.value)}>
              <option value="">— Selecciona una sede —</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.sede && <span className="field-error">{errors.sede}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cantidad recibida *</label>
              <input type="number" min="1" value={form.quantity} onChange={e => change('quantity', e.target.value)} placeholder="0" />
              {errors.quantity && <span className="field-error">{errors.quantity}</span>}
            </div>
            <div className="form-group">
              <label>Costo unitario *</label>
              <input type="number" step="0.01" min="0" value={form.cost_unit} onChange={e => change('cost_unit', e.target.value)} placeholder="0.00" />
              {errors.cost_unit && <span className="field-error">{errors.cost_unit}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Notas (opcional)</label>
            <textarea value={form.notes} onChange={e => change('notes', e.target.value)} rows={2} placeholder="Proveedor, factura, observaciones..." />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryEntryForm;
