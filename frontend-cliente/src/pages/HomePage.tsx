import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Receipt, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customersService } from '../api/customers.service';
import type { Venta } from '../types/customer.types';
import './HomePage.css';

const fmt = (n: string | number) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const HomePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [lastVenta, setLastVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshProfile().catch(() => {});
    customersService.getMisCompras(1, 1)
      .then(r => setLastVenta(r.ventas[0] ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="screen">
      <div className="home-header">
        <div>
          <p className="home-greeting">{greeting()},</p>
          <h1 className="home-name">{profile?.first_name} {profile?.last_name}</h1>
        </div>
      </div>

      <div className="home-body">
        {/* Points hero */}
        <div className="home-points-card" onClick={() => navigate('/perfil')}>
          <div className="home-points-row">
            <Star size={18} color="#FFB800" fill="#FFB800" />
            <span className="home-points-label">Tus puntos</span>
          </div>
          <div className="home-points-value">{(profile?.puntos ?? 0).toLocaleString('es-MX')}</div>
          <div className="home-points-sub">pts acumulados</div>
          <div className="home-points-bar-bg">
            <div className="home-points-bar" style={{ width: `${Math.min(100, ((profile?.puntos ?? 0) % 500) / 5)}%` }} />
          </div>
          <p className="home-points-hint">
            {500 - ((profile?.puntos ?? 0) % 500)} pts para tu próximo cupón
          </p>
        </div>

        {/* QR quick access */}
        <button className="home-qr-card" onClick={() => navigate('/mi-qr')}>
          <div className="home-qr-icon">
            <QrCode size={28} color="#fff" />
          </div>
          <div className="home-qr-text">
            <span className="home-qr-title">Mostrar mi QR en caja</span>
            <span className="home-qr-sub">Toca para abrir tu código</span>
          </div>
          <ChevronRight size={20} color="var(--c-text-sec)" />
        </button>

        {/* Last purchase */}
        <div>
          <div className="section-title" style={{ paddingLeft: 0, marginBottom: 10 }}>Última compra</div>
          {loading ? (
            <div className="skeleton" style={{ height: 88, borderRadius: 'var(--r-md)' }} />
          ) : lastVenta ? (
            <div className="card home-venta-card" onClick={() => navigate('/compras')}>
              <div className="home-venta-top">
                <div>
                  <p className="home-venta-sede">{lastVenta.sede_name}</p>
                  <p className="home-venta-items">
                    {lastVenta.items.slice(0, 2).map(i => i.producto_name).join(', ')}
                    {lastVenta.items.length > 2 && ` +${lastVenta.items.length - 2} más`}
                  </p>
                </div>
                <div className="home-venta-total">{fmt(lastVenta.total)}</div>
              </div>
              <div className="home-venta-footer">
                <span>{fmtDate(lastVenta.created_at)}</span>
                <button className="home-venta-ticket" onClick={e => { e.stopPropagation(); navigate('/compras'); }}>
                  <Receipt size={13} /> Ver ticket
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--c-text-sec)', fontSize: 14 }}>
              Aún no tienes compras registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
