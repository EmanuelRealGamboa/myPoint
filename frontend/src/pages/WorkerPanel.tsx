import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { pedidosService } from '../api/pedidos.service';
import type { PedidoBodega } from '../types/pedidos.types';
import '../styles/WorkerPanel.css';

const POLL_INTERVAL = 6000; // 6 segundos

const WorkerPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [pedidos,     setPedidos]     = useState<PedidoBodega[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [online,      setOnline]      = useState(true);
  const [lastUpdate,  setLastUpdate]  = useState<Date | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      const data = await pedidosService.listar();
      setPedidos(data);
      setOnline(true);
      setLastUpdate(new Date());
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="worker-layout">

      {/* Header compacto */}
      <header className="worker-header">
        <div className="worker-header-left">
          <span className="worker-logo">MotoQFox</span>
          <span className="worker-sede">{user?.sede?.name ?? ''}</span>
          <span className={`worker-status ${online ? 'worker-status--on' : 'worker-status--off'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online
              ? lastUpdate ? `Act. ${fmt(lastUpdate.toISOString())}` : 'Conectado'
              : 'Sin conexión'}
          </span>
        </div>

        <div className="worker-header-right">
          <span className="worker-username">{user?.full_name}</span>
          <button className="worker-logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="worker-main">

        {loading ? (
          <div className="worker-empty">
            <div className="worker-spinner" />
            <p>Cargando pedidos…</p>
          </div>

        ) : pedidos.length === 0 ? (
          <div className="worker-empty">
            <Package size={72} strokeWidth={1} color="var(--worker-empty-color)" />
            <h2>Sin pedidos pendientes</h2>
            <p>Cuando la cajera envíe un pedido aparecerá aquí automáticamente.</p>
          </div>

        ) : (
          <div className="worker-grid">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="worker-card">

                {/* Número de pedido + hora */}
                <div className="worker-card-header">
                  <span className="worker-card-num">#{pedido.id}</span>
                  <span className="worker-card-time">{fmt(pedido.created_at)}</span>
                </div>

                {/* Cajero que lo pidió */}
                <p className="worker-card-cajero">{pedido.cajero_name}</p>

                {/* Notas */}
                {pedido.notas && (
                  <p className="worker-card-notas">"{pedido.notas}"</p>
                )}

                {/* Items */}
                <div className="worker-card-items">
                  {pedido.items.map(item => (
                    <div key={item.id} className="worker-item">
                      <div className="worker-item-info">
                        <span className="worker-item-name">{item.producto_name}</span>
                        <span className="worker-item-sku">{item.producto_sku}</span>
                      </div>
                      <div className="worker-item-right">
                        {item.ubicacion && (
                          <span className="worker-item-ubicacion">
                            <MapPin size={14} />
                            {item.ubicacion}
                          </span>
                        )}
                        <span className="worker-item-qty">×{item.cantidad}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkerPanel;
