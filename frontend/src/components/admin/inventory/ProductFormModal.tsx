import React, { useEffect, useRef, useState } from 'react';
import { inventoryService } from '../../../api/inventory.service';
import type {
  Producto, ProductoPayload, TipoParte, UnidadMedida,
  Categoria, SubcategoriaMinimal, MarcaFabricante, MarcaMoto, ModeloMoto,
  CompatibilidadPieza,
} from '../../../types/inventory.types';
import { X, ClipboardList, Wrench, ImageIcon } from 'lucide-react';

interface Props {
  product?: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

const TIPO_PARTE_LABELS: Record<TipoParte, string> = {
  OEM:             'OEM (Original)',
  AFTERMARKET:     'Aftermarket',
  REMANUFACTURADO: 'Remanufacturado',
};

const UNIDAD_LABELS: Record<UnidadMedida, string> = {
  PIEZA: 'Pieza',
  PAR:   'Par',
  KIT:   'Kit',
  LITRO: 'Litro',
  METRO: 'Metro',
  ROLLO: 'Rollo',
};

const MAX_IMG_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const ProductFormModal: React.FC<Props> = ({ product, onClose, onSaved }) => {
  const isEdit = !!product;

  // ── Form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    sku:                      product?.sku                      ?? '',
    name:                     product?.name                     ?? '',
    description:              product?.description              ?? '',
    codigo_barras:            product?.codigo_barras            ?? '',
    numero_parte_oem:         product?.numero_parte_oem         ?? '',
    numero_parte_aftermarket: product?.numero_parte_aftermarket ?? '',
    categoria:                product?.categoria?.toString()    ?? '',
    subcategoria:             product?.subcategoria?.toString() ?? '',
    marca_fabricante:         product?.marca_fabricante?.toString() ?? '',
    tipo_parte:               (product?.tipo_parte   ?? 'AFTERMARKET') as TipoParte,
    unidad_medida:            (product?.unidad_medida ?? 'PIEZA')       as UnidadMedida,
    price:                    product?.price          ?? '',
    cost:                     product?.cost           ?? '',
    precio_mayoreo:           product?.precio_mayoreo ?? '',
    ubicacion_almacen:        product?.ubicacion_almacen ?? '',
    peso_kg:                  product?.peso_kg           ?? '',
    es_universal:             product?.es_universal      ?? false,
    is_active:                product?.is_active         ?? true,
    es_descontinuado:         product?.es_descontinuado  ?? false,
  });

  // ── Image state ───────────────────────────────────────────────────────
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imagen ?? null);
  const [imageError,   setImageError]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Catalog data ──────────────────────────────────────────────────────
  const [categories,   setCategories]   = useState<Categoria[]>([]);
  const [subcats,      setSubcats]      = useState<SubcategoriaMinimal[]>([]);
  const [fabBrands,    setFabBrands]    = useState<MarcaFabricante[]>([]);
  const [motoBrands,   setMotoBrands]   = useState<MarcaMoto[]>([]);
  const [motoModels,   setMotoModels]   = useState<ModeloMoto[]>([]);
  const [selectedMarca, setSelectedMarca] = useState('');

  // Compatibility panel (edit mode only)
  const [compatList,   setCompatList]   = useState<CompatibilidadPieza[]>(product?.compatibilidades ?? []);
  const [addingCompat, setAddingCompat] = useState(false);
  const [newCompatModel, setNewCompatModel] = useState('');
  const [newCompatNota,  setNewCompatNota]  = useState('');
  const [removingId,   setRemovingId]   = useState<number | null>(null);

  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab]     = useState<'basic' | 'fitment'>('basic');

  // ── Load catalog data on mount ────────────────────────────────────────
  useEffect(() => {
    inventoryService.listCategories({ is_active: true, page_size: 200 })
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
    inventoryService.listFabricanteBrands({ is_active: true })
      .then(r => setFabBrands(r.data))
      .catch(() => {});
    inventoryService.listMotoBrands()
      .then(r => setMotoBrands(r.data))
      .catch(() => {});
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!form.categoria) { setSubcats([]); return; }
    const cat = categories.find(c => c.id === Number(form.categoria));
    setSubcats(cat?.subcategorias?.filter(s => s.is_active) ?? []);
    if (form.subcategoria) {
      const belongs = cat?.subcategorias?.some(s => s.id === Number(form.subcategoria));
      if (!belongs) setForm(f => ({ ...f, subcategoria: '' }));
    }
  }, [form.categoria, categories]);

  // Load moto models when brand changes
  useEffect(() => {
    if (!selectedMarca) { setMotoModels([]); return; }
    inventoryService.listMotoModels({ marca: Number(selectedMarca), page_size: 200 })
      .then(r => setMotoModels(r.data.models))
      .catch(() => {});
  }, [selectedMarca]);

  const change = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Image file handler ────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Solo se permiten imágenes PNG o JPG.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMG_SIZE) {
      setImageError('La imagen no debe superar 5 MB.');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isEdit && !form.sku.trim()) errs.sku = 'El SKU es requerido';
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.price || Number(form.price) <= 0) errs.price = 'El precio debe ser mayor a 0';
    if (form.cost === '' || Number(form.cost) < 0) errs.cost = 'El costo no puede ser negativo';
    if (form.precio_mayoreo !== '' && Number(form.precio_mayoreo) < 0)
      errs.precio_mayoreo = 'El precio mayoreo no puede ser negativo';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setGlobalError('');
    try {
      const payload: ProductoPayload = {
        name:                     form.name,
        description:              form.description,
        codigo_barras:            form.codigo_barras  || undefined,
        numero_parte_oem:         form.numero_parte_oem         || undefined,
        numero_parte_aftermarket: form.numero_parte_aftermarket || undefined,
        categoria:                form.categoria     ? Number(form.categoria)     : null,
        subcategoria:             form.subcategoria  ? Number(form.subcategoria)  : null,
        marca_fabricante:         form.marca_fabricante ? Number(form.marca_fabricante) : null,
        tipo_parte:               form.tipo_parte,
        unidad_medida:            form.unidad_medida,
        price:                    Number(form.price),
        cost:                     Number(form.cost),
        precio_mayoreo:           form.precio_mayoreo !== '' ? Number(form.precio_mayoreo) : null,
        ubicacion_almacen:        form.ubicacion_almacen || undefined,
        peso_kg:                  form.peso_kg !== '' ? Number(form.peso_kg) : null,
        es_universal:             form.es_universal,
        is_active:                form.is_active,
        es_descontinuado:         form.es_descontinuado,
      };
      if (!isEdit) payload.sku = form.sku.toUpperCase();

      let productId: number;
      if (isEdit) {
        await inventoryService.updateProduct(product!.id, payload);
        productId = product!.id;
      } else {
        const res = await inventoryService.createProduct(payload);
        productId = res.data.id;
      }

      // Upload image after saving if a new file was selected
      if (imageFile) {
        await inventoryService.uploadProductImage(productId, imageFile);
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

  // ── Compatibility handlers ────────────────────────────────────────────
  const handleAddCompat = async () => {
    if (!newCompatModel || !product) return;
    setAddingCompat(true);
    try {
      const r = await inventoryService.addCompatibility(product.id, {
        modelo_moto: Number(newCompatModel),
        nota: newCompatNota || undefined,
      });
      if (r.success) {
        setCompatList(prev => [...prev, r.data]);
        setNewCompatModel('');
        setNewCompatNota('');
      }
    } catch (err: any) {
      setGlobalError(err?.response?.data?.message ?? 'Error al agregar compatibilidad');
    } finally {
      setAddingCompat(false);
    }
  };

  const handleRemoveCompat = async (compatId: number) => {
    if (!product) return;
    setRemovingId(compatId);
    try {
      await inventoryService.removeCompatibility(product.id, compatId);
      setCompatList(prev => prev.filter(c => c.id !== compatId));
    } catch {
      setGlobalError('Error al eliminar compatibilidad');
    } finally {
      setRemovingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          {(['basic', 'fitment'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3182ce' : '2px solid transparent',
                color: activeTab === tab ? '#3182ce' : '#718096',
                fontWeight: activeTab === tab ? 700 : 400,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {tab === 'basic' ? (
                <> <ClipboardList size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Datos generales </>
              ) : (
                <> <Wrench size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Compatibilidad </>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          {/* ──────────────── TAB: BASIC DATA ──────────────── */}
          {activeTab === 'basic' && (
            <>
              {/* ── Imagen ───────────────────────────────────────────── */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ImageIcon size={14} />
                  Imagen del producto
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Preview */}
                  <div
                    style={{
                      width: 80, height: 80,
                      borderRadius: 8,
                      border: '2px dashed #e2e8f0',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f7fafc',
                    }}
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ImageIcon size={28} color="#a0aec0" />
                    }
                  </div>
                  {/* Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        style={{
                          fontSize: 11, padding: '4px 10px',
                          background: 'none', border: '1px solid #fed7d7',
                          color: '#c53030', borderRadius: 4, cursor: 'pointer',
                        }}
                        onClick={handleRemoveImage}
                      >
                        Quitar imagen
                      </button>
                    )}
                    <span style={{ fontSize: 11, color: '#a0aec0' }}>PNG o JPG · máx. 5 MB</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                {imageError && <span className="field-error" style={{ display: 'block', marginTop: 4 }}>{imageError}</span>}
              </div>

              {/* SKU + Código de barras */}
              <div className="form-row">
                {!isEdit && (
                  <div className="form-group">
                    <label>SKU *</label>
                    <input
                      value={form.sku}
                      onChange={e => change('sku', e.target.value)}
                      placeholder="Ej: NGK-CR7E"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.sku && <span className="field-error">{errors.sku}</span>}
                  </div>
                )}
                <div className="form-group">
                  <label>Código de barras</label>
                  <input
                    value={form.codigo_barras}
                    onChange={e => change('codigo_barras', e.target.value)}
                    placeholder="EAN-13 / Code128 (auto si se deja vacío)"
                  />
                </div>
              </div>

              {/* Nombre */}
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => change('name', e.target.value)}
                  placeholder="Nombre del producto"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => change('description', e.target.value)}
                  rows={2}
                  placeholder="Descripción breve"
                />
              </div>

              {/* N° de parte OEM + Aftermarket */}
              <div className="form-row">
                <div className="form-group">
                  <label>N° parte OEM</label>
                  <input
                    value={form.numero_parte_oem}
                    onChange={e => change('numero_parte_oem', e.target.value)}
                    placeholder="Ej: 08798-9031"
                  />
                </div>
                <div className="form-group">
                  <label>N° parte Aftermarket</label>
                  <input
                    value={form.numero_parte_aftermarket}
                    onChange={e => change('numero_parte_aftermarket', e.target.value)}
                    placeholder="Ej: CR7E-NGK"
                  />
                </div>
              </div>

              {/* Categoría + Subcategoría (cascading) */}
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={form.categoria} onChange={e => change('categoria', e.target.value)}>
                    <option value="">— Sin categoría —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subcategoría</label>
                  <select
                    value={form.subcategoria}
                    onChange={e => change('subcategoria', e.target.value)}
                    disabled={!form.categoria || subcats.length === 0}
                  >
                    <option value="">— Sin subcategoría —</option>
                    {subcats.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marca fabricante + Tipo parte */}
              <div className="form-row">
                <div className="form-group">
                  <label>Marca fabricante</label>
                  <select value={form.marca_fabricante} onChange={e => change('marca_fabricante', e.target.value)}>
                    <option value="">— Sin marca —</option>
                    {fabBrands.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.tipo})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de parte</label>
                  <select value={form.tipo_parte} onChange={e => change('tipo_parte', e.target.value)}>
                    {(Object.entries(TIPO_PARTE_LABELS) as [TipoParte, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unidad de medida + Ubicación almacén */}
              <div className="form-row">
                <div className="form-group">
                  <label>Unidad de medida</label>
                  <select value={form.unidad_medida} onChange={e => change('unidad_medida', e.target.value)}>
                    {(Object.entries(UNIDAD_LABELS) as [UnidadMedida, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ubicación almacén</label>
                  <input
                    value={form.ubicacion_almacen}
                    onChange={e => change('ubicacion_almacen', e.target.value)}
                    placeholder="Ej: A-03-2-B"
                  />
                </div>
              </div>

              {/* Precios */}
              <div className="form-row">
                <div className="form-group">
                  <label>Precio de venta *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.price}
                    onChange={e => change('price', e.target.value)}
                    placeholder="0.00"
                  />
                  {errors.price && <span className="field-error">{errors.price}</span>}
                </div>
                <div className="form-group">
                  <label>Costo de compra *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.cost}
                    onChange={e => change('cost', e.target.value)}
                    placeholder="0.00"
                  />
                  {errors.cost && <span className="field-error">{errors.cost}</span>}
                </div>
                <div className="form-group">
                  <label>Precio mayoreo</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.precio_mayoreo}
                    onChange={e => change('precio_mayoreo', e.target.value)}
                    placeholder="0.00 (opcional)"
                  />
                  {errors.precio_mayoreo && <span className="field-error">{errors.precio_mayoreo}</span>}
                </div>
              </div>

              {/* Peso */}
              <div className="form-row">
                <div className="form-group">
                  <label>Peso (kg)</label>
                  <input
                    type="number" step="0.001" min="0"
                    value={form.peso_kg}
                    onChange={e => change('peso_kg', e.target.value)}
                    placeholder="0.000 (opcional)"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div className="form-group form-group--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.es_universal}
                      onChange={e => change('es_universal', e.target.checked)}
                    />
                    <span>Es universal (aplica a múltiples modelos)</span>
                  </label>
                </div>
                {isEdit && (
                  <>
                    <div className="form-group form-group--checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={e => change('is_active', e.target.checked)}
                        />
                        <span>Producto activo</span>
                      </label>
                    </div>
                    <div className="form-group form-group--checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.es_descontinuado}
                          onChange={e => change('es_descontinuado', e.target.checked)}
                        />
                        <span>Descontinuado</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ──────────────── TAB: FITMENT / COMPATIBILITY ──────────────── */}
          {activeTab === 'fitment' && (
            <div>
              <div
                style={{
                  background: form.es_universal ? '#ebf8ff' : '#f7fafc',
                  border: `1px solid ${form.es_universal ? '#bee3f8' : '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: form.es_universal ? '#2b6cb0' : '#718096',
                }}
              >
                {form.es_universal
                  ? '✅ Este producto está marcado como universal — aplica a todos los modelos.'
                  : '⚙️ Agrega los modelos de moto compatibles con esta pieza.'}
              </div>

              {isEdit && !form.es_universal && (
                <div style={{ background: '#f7fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#2d3748' }}>
                    Agregar modelo compatible
                  </p>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group">
                      <label>Marca de moto</label>
                      <select value={selectedMarca} onChange={e => { setSelectedMarca(e.target.value); setNewCompatModel(''); }}>
                        <option value="">— Selecciona marca —</option>
                        {motoBrands.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Modelo</label>
                      <select
                        value={newCompatModel}
                        onChange={e => setNewCompatModel(e.target.value)}
                        disabled={!selectedMarca || motoModels.length === 0}
                      >
                        <option value="">— Selecciona modelo —</option>
                        {motoModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.modelo} ({m.año_desde}{m.año_hasta ? `–${m.año_hasta}` : '+'}) {m.cilindraje ? `${m.cilindraje}cc` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Nota (opcional)</label>
                      <input
                        value={newCompatNota}
                        onChange={e => setNewCompatNota(e.target.value)}
                        placeholder="Ej: Solo para versión carburada"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginBottom: 0, height: 38, whiteSpace: 'nowrap' }}
                      disabled={!newCompatModel || addingCompat}
                      onClick={handleAddCompat}
                    >
                      {addingCompat ? '⏳ Agregando...' : '+ Agregar'}
                    </button>
                  </div>
                </div>
              )}

              {!isEdit && (
                <div style={{ color: '#718096', fontSize: 13, marginBottom: 12 }}>
                  Guarda el producto primero para poder agregar compatibilidades.
                </div>
              )}

              {compatList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: 13, padding: '20px 0' }}>
                  Sin modelos compatibles registrados
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {compatList.map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '7px 12px',
                        gap: 12,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#2d3748' }}>
                          {c.marca_name} — {c.modelo_moto_str.split('(')[0].trim()}
                        </span>
                        <span style={{ fontSize: 12, color: '#718096', marginLeft: 6 }}>
                          {c.modelo_moto_str.match(/\(([^)]+)\)/)?.[0]}
                        </span>
                        {c.nota && (
                          <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 8, fontStyle: 'italic' }}>
                            {c.nota}
                          </span>
                        )}
                      </div>
                      {isEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCompat(c.id)}
                          disabled={removingId === c.id}
                          style={{
                            background: 'none', border: 'none',
                            color: removingId === c.id ? '#a0aec0' : '#e53e3e',
                            cursor: 'pointer', fontSize: 16, lineHeight: 1,
                          }}
                          title="Eliminar compatibilidad"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
