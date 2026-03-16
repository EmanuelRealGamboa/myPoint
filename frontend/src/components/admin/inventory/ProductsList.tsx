import React, { useEffect, useState, useCallback } from 'react';
import { inventoryService } from '../../../api/inventory.service';
import type {
  Producto, Categoria, MarcaFabricante, TipoParte, ProductoListParams,
} from '../../../types/inventory.types';
import type { Pagination } from '../../../types/auth.types';
import ProductFormModal from './ProductFormModal';
import ProductDetailModal from './ProductDetailModal';
import InventoryEntryForm from './InventoryEntryForm';
import ConfirmDialog from '../../common/ConfirmDialog';
import {
  Package, AlertTriangle, Pencil, Lock, Unlock, Eye,
} from 'lucide-react';

const TIPO_PARTE_LABELS: Record<TipoParte, string> = {
  OEM:             'OEM',
  AFTERMARKET:     'Aftermarket',
  REMANUFACTURADO: 'Remfdo.',
};

const TIPO_PARTE_CLASS: Record<TipoParte, string> = {
  OEM:             'product-tipo-badge product-tipo-badge--oem',
  AFTERMARKET:     'product-tipo-badge product-tipo-badge--aftermarket',
  REMANUFACTURADO: 'product-tipo-badge product-tipo-badge--remanufacturado',
};

interface Props { sedeId?: number; }

const ProductsList: React.FC<Props> = ({ sedeId }) => {
  const [products,   setProducts]   = useState<Producto[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, page_size: 20, total_pages: 1 });
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [fabBrands,  setFabBrands]  = useState<MarcaFabricante[]>([]);

  const [search,           setSearch]           = useState('');
  const [categoriaFilter,  setCategoriaFilter]  = useState('');
  const [fabFilter,        setFabFilter]        = useState('');
  const [tipoParteFilter,  setTipoParteFilter]  = useState('');
  const [activeFilter,     setActiveFilter]     = useState('true');
  const [lowStockFilter,   setLowStockFilter]   = useState(false);
  const [page,             setPage]             = useState(1);

  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState('');
  const [productModal, setProductModal] = useState<Producto | null | undefined>(undefined);
  const [detailModal,  setDetailModal]  = useState<Producto | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Producto | null>(null);

  const loadCategories = useCallback(() => {
    inventoryService.listCategories({ is_active: true, page_size: 200 })
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
  }, []);

  const loadFabBrands = useCallback(() => {
    inventoryService.listFabricanteBrands({ is_active: true })
      .then(r => setFabBrands(r.data))
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    setIsLoading(true);
    setError('');
    const params: ProductoListParams = { page, page_size: 20 };
    if (search)          params.search          = search;
    if (categoriaFilter) params.categoria       = Number(categoriaFilter);
    if (fabFilter)       params.marca_fabricante = Number(fabFilter);
    if (tipoParteFilter) params.tipo_parte       = tipoParteFilter;
    if (activeFilter !== '') params.is_active   = activeFilter === 'true';
    if (lowStockFilter)  params.low_stock       = true;
    if (sedeId)          params.sede_id         = sedeId;

    inventoryService.listProducts(params)
      .then(r => { setProducts(r.data.products); setPagination(r.data.pagination); })
      .catch(() => setError('Error al cargar los productos'))
      .finally(() => setIsLoading(false));
  }, [search, categoriaFilter, fabFilter, tipoParteFilter, activeFilter, lowStockFilter, page, sedeId]);

  useEffect(() => { loadCategories(); loadFabBrands(); }, [loadCategories, loadFabBrands]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [search, categoriaFilter, fabFilter, tipoParteFilter, activeFilter, lowStockFilter]);

  const handleToggle = async (p: Producto) => {
    try {
      await inventoryService.toggleProduct(p.id);
      setConfirmToggle(null);
      loadProducts();
    } catch {
      setConfirmToggle(null);
      setError('Error al cambiar el estado');
    }
  };

  const handleSaved = () => { setProductModal(undefined); setShowEntryForm(false); loadProducts(); };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Productos</h2>
          <p>
            {pagination.total} producto{pagination.total !== 1 ? 's' : ''}
            {' · '}
            {products.filter(p => p.total_stock === 0).length} sin stock
          </p>
        </div>
        {!sedeId && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setShowEntryForm(true)}>
              <Package size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Alta de inventario
            </button>
            <button className="btn-primary" onClick={() => setProductModal(null)}>+ Nuevo Producto</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input
          className="filter-input"
          placeholder="Buscar nombre, SKU, código barras, N° parte…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select className="filter-select" value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="filter-select" value={fabFilter} onChange={e => setFabFilter(e.target.value)}>
          <option value="">Todas las marcas</option>
          {fabBrands.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={tipoParteFilter} onChange={e => setTipoParteFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="OEM">OEM</option>
          <option value="AFTERMARKET">Aftermarket</option>
          <option value="REMANUFACTURADO">Remanufacturado</option>
        </select>
        <select className="filter-select" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="">Todos</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={lowStockFilter} onChange={e => setLowStockFilter(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? <div className="table-loading">Cargando...</div> : (
        <>
          {products.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center', color: '#718096' }}>
              No se encontraron productos
            </div>
          ) : (
            <div className="products-grid">
              {products.map(p => {
                const sedeStock = sedeId ? (p.stock_items.find(s => s.sede_id === sedeId)?.quantity ?? 0) : p.total_stock;
                const isLow = sedeStock === 0 || (sedeId ? p.stock_items.find(s => s.sede_id === sedeId)?.is_low_stock : p.stock_items.some(s => s.is_low_stock));
                return (
                  <div key={p.id} className={`product-card${!p.is_active ? ' product-card--inactive' : ''}`}>
                    {/* Imagen */}
                    <div className="product-card-img">
                      {p.imagen
                        ? <img src={p.imagen} alt={p.name} />
                        : (
                          <div className="product-card-placeholder">
                            <Package size={36} color="#a0aec0" />
                          </div>
                        )
                      }
                    </div>

                    {/* Body */}
                    <div className="product-card-body">
                      {/* Badges */}
                      <div className="product-card-badges">
                        <span className={TIPO_PARTE_CLASS[p.tipo_parte] ?? 'product-tipo-badge'}>
                          {TIPO_PARTE_LABELS[p.tipo_parte] ?? p.tipo_parte}
                        </span>
                        <span className={`status-badge ${p.is_active ? 'active' : 'inactive'}`} style={{ fontSize: 10 }}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {p.es_descontinuado && (
                          <span className="status-badge inactive" style={{ fontSize: 10 }}>Desc.</span>
                        )}
                      </div>

                      {/* SKU */}
                      <code className="product-card-sku">{p.sku}</code>

                      {/* Name */}
                      <div className="product-card-name">{p.name}</div>

                      {/* Breadcrumb */}
                      {p.categoria_name && (
                        <div className="product-card-breadcrumb">
                          {p.categoria_name}{p.subcategoria_name ? ` › ${p.subcategoria_name}` : ''}
                        </div>
                      )}

                      {/* Price + Stock */}
                      <div className="product-card-stats">
                        <div className="product-card-price">
                          ${Number(p.price).toFixed(2)}
                          {p.precio_mayoreo && (
                            <span className="product-card-price-may">
                              May: ${Number(p.precio_mayoreo).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className={`product-card-stock${isLow ? ' product-card-stock--low' : ' product-card-stock--ok'}`}>
                          {isLow && <AlertTriangle size={12} style={{ marginRight: 3 }} />}
                          {sedeStock} uds
                        </div>
                      </div>

                      {/* Meta */}
                      {(p.marca_fabricante_name || p.ubicacion_almacen) && (
                        <div className="product-card-meta">
                          {p.marca_fabricante_name && <span>{p.marca_fabricante_name}</span>}
                          {p.ubicacion_almacen && <span>📍 {p.ubicacion_almacen}</span>}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="product-card-footer">
                      {!sedeId && (
                        <button
                          className="btn-icon btn-edit"
                          title="Editar"
                          onClick={() => setProductModal(p)}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        title="Ver información completa"
                        style={{ color: '#4a90d9' }}
                        onClick={() => setDetailModal(p)}
                      >
                        <Eye size={14} />
                      </button>
                      {!sedeId && (
                        <button
                          className={`btn-icon ${p.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                          title={p.is_active ? 'Desactivar' : 'Activar'}
                          onClick={() => setConfirmToggle(p)}
                        >
                          {p.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination.total_pages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
              <span className="page-info">Página {pagination.page} de {pagination.total_pages}</span>
              <button className="page-btn" disabled={page === pagination.total_pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {productModal !== undefined && (
        <ProductFormModal
          product={productModal}
          onClose={() => setProductModal(undefined)}
          onSaved={handleSaved}
        />
      )}
      {detailModal && (
        <ProductDetailModal
          product={detailModal}
          onClose={() => setDetailModal(null)}
          onEdit={p => { setDetailModal(null); setProductModal(p); }}
        />
      )}
      {showEntryForm && (
        <InventoryEntryForm onClose={() => setShowEntryForm(false)} onSaved={handleSaved} />
      )}
      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.is_active ? 'Desactivar producto' : 'Activar producto'}
        message={confirmToggle
          ? (confirmToggle.is_active
            ? `¿Desactivar "${confirmToggle.name}"? No se elimina del inventario.`
            : `¿Activar "${confirmToggle.name}"?`)
          : ''}
        confirmLabel={confirmToggle?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmToggle?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
};

export default ProductsList;
