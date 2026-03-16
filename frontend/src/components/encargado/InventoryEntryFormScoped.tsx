import React, { useEffect, useState } from 'react';
import { inventoryService } from '../../api/inventory.service';
import type { Producto, EntradaPayload } from '../../types/inventory.types';

interface Props {
  sedeId:  number;
  onClose: () => void;
  onSaved: () => void;
}

const InventoryEntryFormScoped: React.FC<Props> = ({ sedeId, onClose, onSaved }) => {
  const [products,     setProducts]     = useState<Producto[]>([]);
  const [form,         setForm]         = useState({ producto: '', quantity: '', notes: '' });
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [globalError,  setGlobalError]  = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    inventoryService.listProducts({ is_active: true, page_size: 200 })
      .then(r => setProducts(r.data.products))
      .catch(() => {});
  }, []);

  const selectedProduct = products.find(p => String(p.id) === form.producto) ?? null;

  const change = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.producto)                               errs.producto = 'Selecciona un producto';
    if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = 'La cantidad debe ser mayor a 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedProduct) return;
    setIsSubmitting(true);
    setGlobalError('');
    try {
      const payload: EntradaPayload = {
        producto:  Number(form.producto),
        sede:      sedeId,
        quantity:  Number(form.quantity),
        cost_unit: Number(selectedProduct.price),
        notes:     form.notes,
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
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Registrar entrada de inventario</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          <div className="form-group">
            <label>Producto *</label>
            <select value={form.producto} onChange={e => change('producto', e.target.value)}>
              <option value="">— Selecciona un producto —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
              ))}
            </select>
            {errors.producto && <span className="field-error">{errors.producto}</span>}
          </div>

          {selectedProduct && (
            <div style={{
              background: '#f0f9ff', border: '1px solid #bae6fd',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0369a1',
            }}>
              Precio unitario: <strong>${Number(selectedProduct.price).toFixed(2)}</strong>
              {selectedProduct.precio_mayoreo && (
                <span style={{ marginLeft: 12, color: '#64748b' }}>
                  Mayoreo: ${Number(selectedProduct.precio_mayoreo).toFixed(2)}
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Cantidad recibida *</label>
            <input
              type="number" min="1"
              value={form.quantity}
              onChange={e => change('quantity', e.target.value)}
              placeholder="0"
            />
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </div>

          <div className="form-group">
            <label>Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={e => change('notes', e.target.value)}
              rows={2}
              placeholder="Proveedor, número de factura, observaciones…"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando…' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryEntryFormScoped;
