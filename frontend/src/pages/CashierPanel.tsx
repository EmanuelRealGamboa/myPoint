import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { salesService } from '../api/sales.service';
import POSView from '../components/cashier/POSView';
import SalesHistoryView from '../components/cashier/SalesHistoryView';
import CajaClosedScreen from '../components/cashier/CajaClosedScreen';
import '../styles/DashboardPage.css';

type Section    = 'pos' | 'history';
type CajaStatus = 'loading' | 'cerrada' | 'abierta';

const CashierPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [section,    setSection]    = useState<Section>('pos');
  const [cajaStatus, setCajaStatus] = useState<CajaStatus>('loading');
  const [aperturaId, setAperturaId] = useState<number | null>(null);

  const sedeId   = user?.sede?.id ?? 0;
  const cajeroId = user?.id ?? 0;
  const initials =
    (user?.first_name?.charAt(0) ?? '') +
    (user?.last_name?.charAt(0)  ?? '');

  useEffect(() => {
    if (!sedeId) { setCajaStatus('cerrada'); return; }
    salesService.miEstadoCaja()
      .then(r => {
        if (r.data.tiene_caja_abierta && r.data.apertura) {
          setAperturaId(r.data.apertura.id);
          setCajaStatus('abierta');
        } else {
          setCajaStatus('cerrada');
        }
      })
      .catch(() => setCajaStatus('cerrada'));
  }, [sedeId]);

  const handleAbierta = (id: number) => {
    setAperturaId(id);
    setCajaStatus('abierta');
    setSection('pos');
  };

  const handleCerrarCaja = async () => {
    if (!aperturaId) return;
    try {
      await salesService.cerrarCaja(aperturaId);
      setAperturaId(null);
      setCajaStatus('cerrada');
      setSection('pos');
    } catch { /* ignore */ }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="cashier-layout">

      {/* Sidebar */}
      <aside className="cashier-sidebar">
        <div className="cashier-sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" color="var(--color-primary)">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>MotoQFox</span>
        </div>

        <button
          className={`cashier-nav-item${section === 'pos' ? ' cashier-nav-item--active' : ''}`}
          onClick={() => setSection('pos')}
          disabled={cajaStatus !== 'abierta'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Punto de Venta
        </button>

        <button
          className={`cashier-nav-item${section === 'history' ? ' cashier-nav-item--active' : ''}`}
          onClick={() => setSection('history')}
          disabled={cajaStatus !== 'abierta'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Ventas del día
        </button>

        {/* User info + actions */}
        <div className="cashier-sidebar-footer">
          <div className="cashier-user-info">
            <div className="cashier-user-avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <p className="cashier-user-name">{user?.full_name}</p>
              <p className="cashier-sede-badge">{user?.sede?.name ?? '—'}</p>
            </div>
          </div>
          {cajaStatus === 'abierta' && (
            <button
              onClick={handleCerrarCaja}
              className="cashier-nav-item"
              style={{ color: '#c05621', padding: '8px 0' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Cerrar caja
            </button>
          )}
          <button
            onClick={handleLogout}
            className="cashier-nav-item"
            style={{ color: '#e53e3e', padding: '8px 0' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="cashier-main">
        <div className="cashier-main-header">
          {cajaStatus !== 'abierta'
            ? 'Caja'
            : section === 'pos' ? 'Punto de Venta' : 'Ventas del día'
          }
        </div>

        <div className="cashier-main-body">
          {cajaStatus === 'loading' && (
            <p style={{ textAlign: 'center', marginTop: 60, color: '#718096' }}>Verificando estado de caja…</p>
          )}

          {cajaStatus === 'cerrada' && sedeId > 0 && (
            <CajaClosedScreen onAbierta={handleAbierta} />
          )}

          {cajaStatus === 'abierta' && sedeId > 0 && (
            <>
              {section === 'pos'     && <POSView sedeId={sedeId} />}
              {section === 'history' && <SalesHistoryView sedeId={sedeId} cajeroId={cajeroId} />}
            </>
          )}

          {sedeId === 0 && cajaStatus !== 'loading' && (
            <p style={{ color: '#718096', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
              Tu cuenta no tiene sede asignada. Contacta a un administrador.
            </p>
          )}
        </div>
      </main>

    </div>
  );
};

export default CashierPanel;
