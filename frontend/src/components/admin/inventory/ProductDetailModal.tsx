import React from 'react';
import type { Producto } from '../../../types/inventory.types';
import { X, Package, AlertTriangle, Pencil } from 'lucide-react';

interface Props {
  product: Producto;
  onClose: () => void;
  onEdit: (product: Producto) => void;
}

const Row: React.FC<{ label: string; value?: React.ReactNode; hide?: boolean }> = ({ label, value, hide }) => {
  if (hide || value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #f0f4f8' }}>
      <span style={{ minWidth: 160, fontSize: 12, color: '#718096', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#2d3748', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#4a90d9', letterSpacing: 1, margin: '18px 0 6px' }}>
    {title}
  </div>
);

const ProductDetailModal: React.FC<Props> = ({ product: p, onClose, onEdit }) => {
  const isLow = p.total_stock === 0 || p.stock_items.some(s => s.is_low_stock);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{p.name}</h2>
            <code style={{ fontSize: 12, color: '#718096' }}>{p.sku}</code>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div style={{ padding: '0 4px' }}>
          {/* Imagen */}
          {p.imagen && (
            <div style={{ margin: '12px 0', borderRadius: 8, overflow: 'hidden', maxHeight: 240, display: 'flex', justifyContent: 'center', background: '#f7fafc' }}>
              <img
                src={p.imagen}
                alt={p.name}
                style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
          {!p.imagen && (
            <div style={{ margin: '12px 0', borderRadius: 8, height: 100, background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#a0aec0' }}>
              <Package size={32} />
              <span style={{ fontSize: 13 }}>Sin imagen</span>
            </div>
          )}

          {/* Estado badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
            <span className={`status-badge ${p.is_active ? 'active' : 'inactive'}`}>
              {p.is_active ? 'Activo' : 'Inactivo'}
            </span>
            {p.es_descontinuado && (
              <span className="status-badge inactive">Descontinuado</span>
            )}
            <span className={`product-tipo-badge product-tipo-badge--${p.tipo_parte.toLowerCase()}`}>
              {p.tipo_parte}
            </span>
            {p.es_universal && (
              <span style={{ fontSize: 11, background: '#ebf8ff', color: '#2b6cb0', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                Universal
              </span>
            )}
          </div>

          {/* Identificación */}
          <SectionTitle title="Identificación" />
          <Row label="SKU" value={<code style={{ background: '#f7fafc', padding: '1px 5px', borderRadius: 3 }}>{p.sku}</code>} />
          <Row label="Código de barras" value={p.codigo_barras || undefined} />
          <Row label="N° parte OEM" value={p.numero_parte_oem || undefined} />
          <Row label="N° parte Aftermarket" value={p.numero_parte_aftermarket || undefined} />

          {/* Clasificación */}
          <SectionTitle title="Clasificación" />
          <Row label="Categoría" value={p.categoria_name ?? undefined} />
          <Row label="Subcategoría" value={p.subcategoria_name ?? undefined} />
          <Row label="Marca fabricante" value={p.marca_fabricante_name ?? undefined} />
          <Row label="Tipo de parte" value={p.tipo_parte} />
          <Row label="Unidad de medida" value={p.unidad_medida} />

          {/* Descripción */}
          {p.description && (
            <>
              <SectionTitle title="Descripción" />
              <p style={{ fontSize: 13, color: '#4a5568', margin: '4px 0 0' }}>{p.description}</p>
            </>
          )}

          {/* Precios */}
          <SectionTitle title="Precios" />
          <Row label="Precio de venta" value={<strong style={{ color: '#276749' }}>${Number(p.price).toFixed(2)}</strong>} />
          <Row label="Costo de compra" value={`$${Number(p.cost).toFixed(2)}`} />
          {p.precio_mayoreo && (
            <Row label="Precio mayoreo" value={`$${Number(p.precio_mayoreo).toFixed(2)}`} />
          )}

          {/* Almacén */}
          <SectionTitle title="Almacén" />
          <Row label="Ubicación" value={p.ubicacion_almacen || undefined} />
          <Row label="Peso" value={p.peso_kg ? `${p.peso_kg} kg` : undefined} />

          {/* Stock */}
          <SectionTitle title="Stock" />
          {p.stock_items.length === 0 ? (
            <p style={{ fontSize: 13, color: '#a0aec0' }}>Sin registros de stock</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f7fafc' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#4a5568' }}>Sede</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#4a5568' }}>Cantidad</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#4a5568' }}>Mínimo</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: '#4a5568' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.stock_items.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                      <td style={{ padding: '6px 10px' }}>{s.sede_name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{s.quantity}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#718096' }}>{s.min_quantity}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {s.is_low_stock
                          ? <span style={{ color: '#c53030', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><AlertTriangle size={12} /> Bajo</span>
                          : <span style={{ color: '#276749', fontSize: 11 }}>OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f7fafc', fontWeight: 700 }}>
                    <td style={{ padding: '6px 10px' }}>Total</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      <span className={isLow ? 'stock-value stock-value--low' : 'stock-value stock-value--ok'}>
                        {p.total_stock}
                        {isLow && <AlertTriangle size={11} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                      </span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Compatibilidad */}
          {!p.es_universal && p.compatibilidades.length > 0 && (
            <>
              <SectionTitle title={`Compatibilidad (${p.compatibilidades.length} modelos)`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.compatibilidades.map(c => (
                  <div key={c.id} style={{ fontSize: 12, color: '#4a5568', padding: '3px 0' }}>
                    <strong>{c.marca_name}</strong> — {c.modelo_moto_str}
                    {c.nota && <span style={{ color: '#718096', marginLeft: 6, fontStyle: 'italic' }}>{c.nota}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fechas */}
          <SectionTitle title="Registro" />
          <Row label="Creado" value={new Date(p.created_at).toLocaleString('es-MX')} />
          <Row label="Última actualización" value={new Date(p.updated_at).toLocaleString('es-MX')} />
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onEdit(p)}
          >
            <Pencil size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
