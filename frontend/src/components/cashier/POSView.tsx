import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bike, X } from 'lucide-react';
import type { CartItem, MetodoPago } from '../../types/sales.types';
import type { Producto, MarcaMoto, ModeloMoto, Categoria } from '../../types/inventory.types';
import { inventoryService } from '../../api/inventory.service';
import PaymentModal from './PaymentModal';
import PedidoBodegaPanel from './PedidoBodegaPanel';

interface Props {
  sedeId: number;
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const DEBOUNCE_MS = 350;

// ── Shared product card grid ──────────────────────────────────────────────────

interface GridProps {
  results:   Producto[];
  searching: boolean;
  sedeId:    number;
  cart:      CartItem[];
  onAdd:     (p: Producto) => void;
  emptyMsg?: string;
}

const ProductGrid: React.FC<GridProps> = ({ results, searching, sedeId, cart, onAdd, emptyMsg }) => {
  if (searching) return <p className="pos-search-hint">Buscando…</p>;
  if (results.length === 0 && emptyMsg) return <p className="pos-search-hint">{emptyMsg}</p>;
  if (results.length === 0) return null;

  return (
    <div className="pos-product-grid">
      {results.map(p => {
        const stockEntry = p.stock_items?.find(s => s.sede_id === sedeId);
        const disponible = stockEntry?.quantity ?? 0;
        const price      = parseFloat(String(p.price));
        const inCart     = cart.find(c => c.producto_id === p.id);
        const sinStock   = disponible <= 0;

        return (
          <div
            key={p.id}
            className={`pos-product-card${sinStock ? ' pos-product-card--disabled' : ''}`}
            onClick={() => !sinStock && onAdd(p)}
            title={sinStock ? 'Sin stock en esta sede' : 'Agregar al carrito'}
          >
            {p.imagen ? (
              <img src={p.imagen} alt={p.name} className="pos-product-img" />
            ) : (
              <div className="pos-product-img-placeholder">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            <p className="pos-product-sku">{p.sku}</p>
            <p className="pos-product-name">{p.name}</p>
            <p className="pos-product-price">{fmt(price)}</p>
            <p className={`pos-product-stock${disponible <= 3 && disponible > 0 ? ' pos-product-stock--low' : ''}`}>
              {sinStock
                ? 'Sin stock'
                : `Stock: ${disponible}${inCart ? ` (${inCart.quantity} en carrito)` : ''}`}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ── Text search mode ──────────────────────────────────────────────────────────

const TextSearchMode: React.FC<{ sedeId: number; cart: CartItem[]; onAdd: (p: Producto) => void }> = ({ sedeId, cart, onAdd }) => {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await inventoryService.listProducts({
        search: q, sede_id: sedeId, is_active: true, page_size: 40,
      } as any);
      setResults(res.data.products);
    } catch { setResults([]); }
    finally  { setSearching(false); }
  }, [sedeId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <>
      <div className="pos-search-input-wrap">
        <Search size={16} color="var(--color-text-secondary)" />
        <input
          ref={inputRef}
          className="pos-search-input"
          type="text"
          placeholder="Nombre, SKU, código de barras, número de parte…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-secondary)' }}>
            <X size={14} />
          </button>
        )}
      </div>
      <ProductGrid
        results={results} searching={searching} sedeId={sedeId} cart={cart} onAdd={onAdd}
        emptyMsg={query ? `Sin resultados para "${query}".` : 'Escribe para buscar productos…'}
      />
    </>
  );
};

// ── Moto (YMM) search mode ────────────────────────────────────────────────────

const selStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)', fontSize: 13,
  background: 'var(--color-bg-main)', color: 'var(--color-text)', width: '100%',
};

const MotoSearchMode: React.FC<{ sedeId: number; cart: CartItem[]; onAdd: (p: Producto) => void }> = ({ sedeId, cart, onAdd }) => {
  const [marcas,      setMarcas]      = useState<MarcaMoto[]>([]);
  const [modelos,     setModelos]     = useState<ModeloMoto[]>([]);
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);

  const [selMarca,    setSelMarca]    = useState('');
  const [año,         setAño]         = useState('');
  const [selModelo,   setSelModelo]   = useState('');
  const [selCategoria,setSelCategoria]= useState('');

  const [results,     setResults]     = useState<Producto[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [label,       setLabel]       = useState('');

  // Load reference data once
  useEffect(() => {
    inventoryService.listMotoBrands({ is_active: true })
      .then(r => setMarcas(r.data))
      .catch(() => {});
    inventoryService.listCategories({ is_active: true } as any)
      .then(r => setCategorias(r.data.categories ?? []))
      .catch(() => {});
  }, []);

  // Load models when marca changes
  useEffect(() => {
    setSelModelo(''); setModelos([]); setResults([]); setSearched(false);
    if (!selMarca) return;
    inventoryService.listMotoModels({ marca: Number(selMarca), page_size: 300 } as any)
      .then(r => setModelos(r.data.models ?? []))
      .catch(() => {});
  }, [selMarca]);

  // Filter modelos by year if provided
  const modelosFiltrados = modelos.filter(m => {
    if (!año) return true;
    const y = parseInt(año, 10);
    if (isNaN(y)) return true;
    return m.año_desde <= y && (m.año_hasta === null || m.año_hasta >= y);
  });

  // Reset modelo selection when year changes and current selection is no longer valid
  useEffect(() => {
    if (selModelo && !modelosFiltrados.find(m => String(m.id) === selModelo)) {
      setSelModelo('');
    }
  }, [año]); // eslint-disable-line

  const handleSearch = async () => {
    if (!selModelo && !selCategoria) return;
    setSearching(true); setSearched(true);
    try {
      const params: Record<string, any> = { sede_id: sedeId, is_active: true, page_size: 60 };
      if (selModelo)    params.moto_modelo_id = selModelo;
      if (selCategoria) params.categoria      = selCategoria;
      const res = await inventoryService.listProducts(params as any);
      setResults(res.data.products);

      const m = modelos.find(x => String(x.id) === selModelo);
      const c = categorias.find(x => String(x.id) === selCategoria);
      const parts: string[] = [];
      if (m) parts.push(`${m.marca_name} ${m.modelo}${año ? ` ${año}` : ''}`);
      if (c) parts.push(c.name);
      setLabel(parts.join(' · '));
    } catch { setResults([]); }
    finally  { setSearching(false); }
  };

  const handleClear = () => {
    setSelMarca(''); setAño(''); setSelModelo(''); setSelCategoria('');
    setResults([]); setSearched(false); setLabel('');
  };

  const canSearch = !!selModelo || !!selCategoria;

  return (
    <>
      {/* Row 1: Marca + Año */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 8 }}>
        <select value={selMarca} onChange={e => setSelMarca(e.target.value)} style={selStyle}>
          <option value="">Marca de moto…</option>
          {marcas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          type="number" placeholder="Año" value={año}
          onChange={e => setAño(e.target.value)}
          min={1990} max={2099} step={1}
          style={{ ...selStyle, textAlign: 'center' }}
        />
      </div>

      {/* Row 2: Modelo + Categoría */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <select value={selModelo} onChange={e => setSelModelo(e.target.value)}
          disabled={!selMarca} style={selStyle}>
          <option value="">
            {!selMarca
              ? 'Primero elige la marca'
              : modelosFiltrados.length === 0
                ? año ? `Sin modelos para año ${año}` : 'Sin modelos'
                : 'Modelo de moto…'}
          </option>
          {modelosFiltrados.map(m => (
            <option key={m.id} value={m.id}>
              {m.modelo} ({m.año_desde}–{m.año_hasta ?? 'act.'})
            </option>
          ))}
        </select>
        <select value={selCategoria} onChange={e => setSelCategoria(e.target.value)} style={selStyle}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Row 3: Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '9px', fontSize: 13 }}
          onClick={handleSearch}
          disabled={!canSearch || searching}
        >
          {searching ? 'Buscando…' : 'Buscar piezas'}
        </button>
        {(selMarca || selCategoria || results.length > 0) && (
          <button onClick={handleClear} style={{
            padding: '9px 14px', fontSize: 13, borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--color-border)', background: 'transparent',
            cursor: 'pointer', color: 'var(--color-text-secondary)',
          }}>
            Limpiar
          </button>
        )}
      </div>

      {/* Empty state hint */}
      {!canSearch && !searched && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 20, color: 'var(--color-text-secondary)' }}>
          <Bike size={38} strokeWidth={1.2} />
          <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
            Selecciona la <strong>marca y modelo</strong> de la moto,
            o una <strong>categoría</strong> para ver las piezas disponibles.
            El año es opcional para afinar la búsqueda.
          </p>
        </div>
      )}

      {/* Results summary */}
      {searched && !searching && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 500 }}>
          {results.length === 0
            ? 'Sin piezas disponibles para esa combinación.'
            : `${results.length} pieza${results.length !== 1 ? 's' : ''} encontrada${results.length !== 1 ? 's' : ''}${label ? ` — ${label}` : ''}`}
        </p>
      )}

      <ProductGrid
        results={results} searching={searching} sedeId={sedeId} cart={cart} onAdd={onAdd}
        emptyMsg=""
      />
    </>
  );
};

// ── Main POSView ──────────────────────────────────────────────────────────────

type SearchMode = 'text' | 'moto';

const POSView: React.FC<Props> = ({ sedeId }) => {
  const [searchMode, setSearchMode] = useState<SearchMode>('text');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (producto: Producto) => {
    const stockEntry = producto.stock_items?.find(s => s.sede_id === sedeId);
    const disponible = stockEntry?.quantity ?? 0;
    if (disponible <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.producto_id === producto.id);
      if (existing) {
        if (existing.quantity >= disponible) return prev;
        return prev.map(i =>
          i.producto_id === producto.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      const unit_price = parseFloat(String(producto.price));
      return [...prev, {
        producto_id:      producto.id,
        producto_sku:     producto.sku,
        producto_name:    producto.name,
        unit_price,
        quantity:         1,
        subtotal:         unit_price,
        stock_disponible: disponible,
      }];
    });
  };

  const changeQty = (producto_id: number, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.producto_id !== producto_id) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > i.stock_disponible) return i;
        return { ...i, quantity: newQty, subtotal: newQty * i.unit_price };
      })
      .filter(Boolean)
    );
  };

  const removeItem    = (id: number) => setCart(prev => prev.filter(i => i.producto_id !== id));
  const clearCart     = ()           => setCart([]);

  // Totals
  const [descuento,   setDescuento]   = useState(0);
  const [metodoPago,  setMetodoPago]  = useState<MetodoPago>('EFECTIVO');
  const [montoPagado, setMontoPagado] = useState(0);

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const total    = Math.max(0, subtotal - descuento);
  const cambio   = metodoPago === 'EFECTIVO' ? Math.max(0, montoPagado - total) : 0;

  useEffect(() => {
    if (cart.length === 0) { setDescuento(0); setMontoPagado(0); }
  }, [cart.length]);

  const [showModal, setShowModal] = useState(false);
  const canCobrar = cart.length > 0 && (metodoPago !== 'EFECTIVO' || montoPagado >= total);

  return (
    <div className="pos-layout">

      {/* LEFT: search panel */}
      <div className="pos-search-panel">

        {/* Mode tabs */}
        <div style={{ display: 'flex', marginBottom: 14, borderBottom: '2px solid var(--color-border)' }}>
          {([
            { id: 'text', icon: <Search size={14} />, label: 'Búsqueda rápida' },
            { id: 'moto', icon: <Bike   size={14} />, label: 'Buscar por moto' },
          ] as { id: SearchMode; icon: React.ReactNode; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchMode(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: searchMode === tab.id
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
                color: searchMode === tab.id
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
                marginBottom: -2,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {searchMode === 'text' && <TextSearchMode sedeId={sedeId} cart={cart} onAdd={addToCart} />}
        {searchMode === 'moto' && <MotoSearchMode sedeId={sedeId} cart={cart} onAdd={addToCart} />}

        <PedidoBodegaPanel sedeId={sedeId} onAgregarAlCarrito={() => {}} />
      </div>

      {/* RIGHT: cart panel */}
      <div className="pos-cart-panel">
        <div className="pos-cart-header">
          <span>Carrito</span>
          {cart.length > 0 && (
            <span className="pos-cart-count">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="pos-cart-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>El carrito está vacío</span>
          </div>
        ) : (
          <>
            <div className="pos-cart-items">
              {cart.map(item => (
                <div key={item.producto_id} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <p className="pos-cart-item-name">{item.producto_name}</p>
                    <p className="pos-cart-item-price">{fmt(item.unit_price)} c/u</p>
                  </div>
                  <div className="pos-qty-ctrl">
                    <button className="pos-qty-btn" onClick={() => changeQty(item.producto_id, -1)}>−</button>
                    <span className="pos-qty-value">{item.quantity}</span>
                    <button className="pos-qty-btn"
                      onClick={() => changeQty(item.producto_id, +1)}
                      disabled={item.quantity >= item.stock_disponible}>+</button>
                  </div>
                  <span className="pos-cart-item-subtotal">{fmt(item.subtotal)}</span>
                  <button className="pos-remove-btn" onClick={() => removeItem(item.producto_id)} title="Quitar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="pos-cart-footer">
              <div className="pos-discount-row">
                <label htmlFor="descuento">Descuento $</label>
                <input
                  id="descuento" className="pos-discount-input"
                  type="number" min={0} max={subtotal} step={0.01}
                  value={descuento || ''}
                  onChange={e => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                />
              </div>
              <div className="pos-totals">
                <div className="pos-totals-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {descuento > 0 && (
                  <div className="pos-totals-row"><span>Descuento</span><span>−{fmt(descuento)}</span></div>
                )}
                <div className="pos-totals-row pos-totals-row--total"><span>Total</span><span>{fmt(total)}</span></div>
              </div>
              <div className="pos-payment-btns">
                {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as MetodoPago[]).map(m => (
                  <button key={m}
                    className={`pos-payment-btn${metodoPago === m ? ' pos-payment-btn--active' : ''}`}
                    onClick={() => setMetodoPago(m)}>
                    {m}
                  </button>
                ))}
              </div>
              {metodoPago === 'EFECTIVO' && (
                <>
                  <div className="pos-efectivo-row">
                    <label htmlFor="monto_pagado">Monto recibido</label>
                    <input
                      id="monto_pagado" className="pos-efectivo-input"
                      type="number" min={total} step={0.01}
                      value={montoPagado || ''}
                      onChange={e => setMontoPagado(parseFloat(e.target.value) || 0)}
                      placeholder={fmt(total)}
                    />
                  </div>
                  {montoPagado > 0 && (
                    <div className="pos-cambio-display">
                      <span>Cambio</span><span>{fmt(cambio)}</span>
                    </div>
                  )}
                </>
              )}
              <button className="pos-cobrar-btn" disabled={!canCobrar} onClick={() => setShowModal(true)}>
                Cobrar {fmt(total)}
              </button>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <PaymentModal
          sedeId={sedeId} items={cart} descuento={descuento}
          metodoPago={metodoPago} montoPagado={montoPagado}
          onClose={() => setShowModal(false)}
          onSuccess={() => { clearCart(); setDescuento(0); setMontoPagado(0); setShowModal(false); }}
        />
      )}
    </div>
  );
};

export default POSView;
