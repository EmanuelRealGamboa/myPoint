import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ChevronRight, ShoppingBag } from 'lucide-react';
import { customersService } from '../api/customers.service';
import type { Venta } from '../types/customer.types';
import './MisComprasPage.css';

const fmt = (n: string | number) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const VentaCard: React.FC<{ venta: Venta; onClick: () => void }> = ({ venta, onClick }) => (
  <div className="venta-card card" onClick={onClick}>
    <div className="venta-card-body">
      <div className="venta-card-left">
        <p className="venta-card-sede">{venta.sede_name}</p>
        <p className="venta-card-items">
          {venta.items.slice(0, 2).map(i => i.producto_name).join(', ')}
          {venta.items.length > 2 && ` +${venta.items.length - 2} más`}
        </p>
        <p className="venta-card-date">{fmtDate(venta.created_at)}</p>
      </div>
      <div className="venta-card-right">
        <span className={`badge-${venta.status === 'COMPLETADA' ? 'success' : 'error'}`}>
          {venta.status === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
        </span>
        <p className="venta-card-total">{fmt(venta.total)}</p>
        <ChevronRight size={16} color="var(--c-text-dis)" />
      </div>
    </div>
  </div>
);

const MisComprasPage: React.FC = () => {
  const navigate = useNavigate();
  const [ventas, setVentas]     = useState<Venta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotal]  = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await customersService.getMisCompras(p, 20);
      setVentas(prev => p === 1 ? r.ventas : [...prev, ...r.ventas]);
      setTotal(r.total_pages);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next);
  };

  if (!loading && ventas.length === 0) {
    return (
      <div className="screen">
        <div className="page-header">
          <h1 className="page-title">Mis compras</h1>
        </div>
        <div className="empty-state">
          <ShoppingBag size={48} />
          <h3>Aún sin compras</h3>
          <p>Cuando visites la tienda y te identifiques, tus compras aparecerán aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="page-header">
        <h1 className="page-title">Mis compras</h1>
        {ventas.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>
            {ventas.length} total
          </span>
        )}
      </div>

      <div className="compras-list">
        {loading && ventas.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--r-md)', margin: '0 20px' }} />
          ))
        ) : (
          ventas.map(v => (
            <VentaCard
              key={v.id}
              venta={v}
              onClick={() => navigate(`/compras/${v.id}`, { state: { venta: v } })}
            />
          ))
        )}

        {page < totalPages && !loading && (
          <button className="btn btn-secondary" style={{ margin: '8px 20px' }} onClick={loadMore}>
            <Receipt size={16} /> Cargar más
          </button>
        )}
        {loading && ventas.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <span className="spinner" style={{ borderTopColor: 'var(--c-primary)' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MisComprasPage;
