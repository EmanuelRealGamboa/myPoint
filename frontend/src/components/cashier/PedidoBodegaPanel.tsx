import React, { useState, useEffect, useCallback } from 'react';
import { Send, MapPin, CheckCheck, X, ChevronDown, ChevronUp, Warehouse } from 'lucide-react';
import type { Producto } from '../../types/inventory.types';
import type { PedidoBodega } from '../../types/pedidos.types';
import { pedidosService } from '../../api/pedidos.service';

interface Props {
  sedeId:  number;
  /** Productos que el usuario seleccionó en la búsqueda para enviar a bodega */
  onAgregarAlCarrito: (productoIds: number[]) => void;
}

/* ── Subcomponente: formulario de nuevo pedido ── */
interface NuevoPedidoFormProps {
  sedeId:   number;
  onCreado: (p: PedidoBodega) => void;
  onCancel: () => void;
}

const NuevoPedidoForm: React.FC<NuevoPedidoFormProps> = ({ sedeId, onCreado, onCancel }) => {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [items,     setItems]     = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [notas,     setNotas]     = useState('');
  const [enviando,  setEnviando]  = useState(false);
  const [error,     setError]     = useState('');

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const { inventoryService } = await import('../../api/inventory.service');
      const r = await inventoryService.listProducts({ search: q, sede_id: sedeId, is_active: true, page_size: 20 } as any);
      setResults(r.data.products);
    } catch { setResults([]); }
    finally  { setSearching(false); }
  }, [sedeId]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => buscar(query), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, buscar]);

  const agregarItem = (p: Producto) => {
    setResults([]);
    setQuery('');
    setItems(prev => {
      if (prev.find(i => i.producto.id === p.id)) return prev;
      return [...prev, { producto: p, cantidad: 1 }];
    });
  };

  const quitarItem = (id: number) => setItems(prev => prev.filter(i => i.producto.id !== id));

  const cambiarCantidad = (id: number, delta: number) =>
    setItems(prev => prev.map(i =>
      i.producto.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i
    ));

  const enviar = async () => {
    if (items.length === 0) return;
    setEnviando(true); setError('');
    try {
      const pedido = await pedidosService.crear({
        items: items.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
        notas,
      });
      onCreado(pedido);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al enviar el pedido.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pedido-form">
      <div className="pedido-form-title">
        <Warehouse size={15} />
        Nuevo pedido a bodega
      </div>

      {/* Buscador de productos */}
      <div className="pedido-search-wrap">
        <input
          className="pedido-search-input"
          type="text"
          placeholder="Buscar producto para pedir…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {searching && <span className="pedido-searching">…</span>}
      </div>

      {results.length > 0 && (
        <div className="pedido-results">
          {results.map(p => (
            <button key={p.id} className="pedido-result-item" onClick={() => agregarItem(p)}>
              <span className="pedido-result-name">{p.name}</span>
              <span className="pedido-result-sku">{p.sku}</span>
              {p.ubicacion_almacen && (
                <span className="pedido-result-ubicacion">
                  <MapPin size={11} />{p.ubicacion_almacen}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Items del pedido */}
      {items.length > 0 && (
        <div className="pedido-items">
          {items.map(({ producto, cantidad }) => (
            <div key={producto.id} className="pedido-item-row">
              <div className="pedido-item-info">
                <span className="pedido-item-name">{producto.name}</span>
                {producto.ubicacion_almacen && (
                  <span className="pedido-item-loc">
                    <MapPin size={11} />{producto.ubicacion_almacen}
                  </span>
                )}
              </div>
              <div className="pedido-item-controls">
                <button onClick={() => cambiarCantidad(producto.id, -1)} className="pedido-qty-btn">−</button>
                <span className="pedido-qty-val">{cantidad}</span>
                <button onClick={() => cambiarCantidad(producto.id, +1)} className="pedido-qty-btn">+</button>
                <button onClick={() => quitarItem(producto.id)} className="pedido-remove-btn">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notas opcionales */}
      <input
        className="pedido-notas-input"
        type="text"
        placeholder="Notas para bodega (opcional)…"
        value={notas}
        onChange={e => setNotas(e.target.value)}
        maxLength={200}
      />

      {error && <p className="pedido-error">{error}</p>}

      <div className="pedido-form-actions">
        <button className="pedido-cancel-btn" onClick={onCancel}>Cancelar</button>
        <button
          className="pedido-send-btn"
          onClick={enviar}
          disabled={items.length === 0 || enviando}
        >
          {enviando ? 'Enviando…' : <><Send size={14} /> Enviar a bodega</>}
        </button>
      </div>
    </div>
  );
};

/* ── Subcomponente: card de pedido activo ── */
interface PedidoCardProps {
  pedido:   PedidoBodega;
  onUpdate: (p: PedidoBodega) => void;
  onRemove: (id: number) => void;
}

const PedidoCard: React.FC<PedidoCardProps> = ({ pedido, onUpdate, onRemove }) => {
  const [expanded,   setExpanded]   = useState(true);
  const [procesando, setProcesando] = useState(false);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const marcarEntregado = async () => {
    setProcesando(true);
    try {
      const updated = await pedidosService.marcarEntregado(pedido.id);
      onUpdate(updated);
      onRemove(pedido.id);
    } catch { /* silencioso */ }
    finally  { setProcesando(false); }
  };

  const cancelar = async () => {
    if (!confirm('¿Cancelar este pedido?')) return;
    setProcesando(true);
    try {
      await pedidosService.cancelar(pedido.id);
      onRemove(pedido.id);
    } catch { /* silencioso */ }
    finally  { setProcesando(false); }
  };

  return (
    <div className="pedido-card">
      <div className="pedido-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="pedido-card-title">
          <span className="pedido-card-num">Pedido #{pedido.id}</span>
          <span className="pedido-card-time">{fmt(pedido.created_at)}</span>
          <span className="pedido-badge-pendiente">● Esperando</span>
        </div>
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </div>

      {expanded && (
        <>
          <div className="pedido-card-items">
            {pedido.items.map(item => (
              <div key={item.id} className="pedido-card-item">
                <div>
                  <span className="pedido-card-item-name">{item.producto_name}</span>
                  <span className="pedido-card-item-sku">{item.producto_sku}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.ubicacion && (
                    <span className="pedido-card-item-loc">
                      <MapPin size={11} />{item.ubicacion}
                    </span>
                  )}
                  <span className="pedido-card-item-qty">×{item.cantidad}</span>
                </div>
              </div>
            ))}
          </div>
          {pedido.notas && <p className="pedido-card-notas">"{pedido.notas}"</p>}

          <div className="pedido-card-actions">
            <button className="pedido-cancel-small-btn" onClick={cancelar} disabled={procesando}>
              <X size={13} /> Cancelar
            </button>
            <button className="pedido-entregado-btn" onClick={marcarEntregado} disabled={procesando}>
              {procesando ? 'Procesando…' : <><CheckCheck size={14} /> Entregado</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Componente principal ── */
const PedidoBodegaPanel: React.FC<Props> = ({ sedeId, onAgregarAlCarrito: _ }) => {
  const [pedidos,     setPedidos]     = useState<PedidoBodega[]>([]);
  const [showForm,    setShowForm]    = useState(false);

  // Polling: refresca pedidos propios cada 8s
  const fetchPedidos = useCallback(async () => {
    try {
      const data = await pedidosService.listar();
      setPedidos(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 8000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const handleCreado = (p: PedidoBodega) => {
    setPedidos(prev => [p, ...prev]);
    setShowForm(false);
  };

  const handleRemove = (id: number) => setPedidos(prev => prev.filter(p => p.id !== id));
  const handleUpdate = (p: PedidoBodega) => setPedidos(prev => prev.map(x => x.id === p.id ? p : x));

  return (
    <div className="pedido-panel">
      {/* Header de la sección */}
      <div className="pedido-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Warehouse size={15} color="var(--color-text-secondary)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Bodega
          </span>
          {pedidos.length > 0 && (
            <span className="pedido-panel-badge">{pedidos.length}</span>
          )}
        </div>
        {!showForm && (
          <button className="pedido-new-btn" onClick={() => setShowForm(true)}>
            + Nuevo pedido
          </button>
        )}
      </div>

      {/* Formulario de nuevo pedido */}
      {showForm && (
        <NuevoPedidoForm
          sedeId={sedeId}
          onCreado={handleCreado}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Lista de pedidos activos */}
      {pedidos.map(p => (
        <PedidoCard
          key={p.id}
          pedido={p}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}

      {!showForm && pedidos.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '8px 0' }}>
          Sin pedidos activos en bodega.
        </p>
      )}
    </div>
  );
};

export default PedidoBodegaPanel;
