import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Package,
  ClipboardList,
  Bike,
  Menu as MenuIcon,
  Wrench,
  Hammer,
  Wallet,
  LogOut,
  CheckCircle2,
  TrendingUp,
  FileText,
  PackagePlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../api/auth.service';
import type { SedeSnapshot } from '../types/auth.types';
import UsersList from '../components/admin/UsersList';
import ProductsList from '../components/admin/inventory/ProductsList';
import AuditView from '../components/admin/inventory/AuditView';
import SedeDetailPanel from '../components/admin/dashboard/SedeDetailPanel';
import EncargadoSalesView from '../components/encargado/EncargadoSalesView';
import EncargadoEntradasView from '../components/encargado/EncargadoEntradasView';
import ControlCajasCard from '../components/encargado/ControlCajasCard';
import ReportesCajaView from '../components/encargado/ReportesCajaView';
import '../styles/DashboardPage.css';

type Section = 'dashboard' | 'users' | 'products' | 'entries' | 'audits' | 'sales' | 'reportes-caja';

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; group?: string }[] = [
  { id: 'dashboard',  label: 'Mi Sede',    icon: <Building2 size={18} /> },
  { id: 'users',      label: 'Personal',   icon: <Users size={18} />,       group: 'Gestión' },
  { id: 'products',   label: 'Productos',  icon: <Package size={18} />,     group: 'Inventario' },
  { id: 'entries',    label: 'Entradas',   icon: <PackagePlus size={18} />, group: 'Inventario' },
  { id: 'audits',     label: 'Auditorías', icon: <ClipboardList size={18} />, group: 'Inventario' },
  { id: 'sales',          label: 'Ventas',          icon: <TrendingUp size={18} />, group: 'Ventas' },
  { id: 'reportes-caja', label: 'Reportes Caja', icon: <FileText size={18} />,   group: 'Ventas' },
];

// ─── Sede overview for encargado ─────────────────────────────────────────────

const SedeOverview: React.FC<{ snapshot: SedeSnapshot | null; isLoading: boolean; error: string; onRefresh: () => void }> = ({
  snapshot, isLoading, error, onRefresh,
}) => {
  const [showDetail, setShowDetail] = useState(false);

  if (isLoading) return <div className="table-loading">Cargando datos de sede...</div>;

  if (!snapshot) {
    return (
      <div className="section-container">
        {error && <div className="error-banner">{error}</div>}
        <p style={{ color: '#718096' }}>No se pudieron cargar los datos de tu sede.</p>
      </div>
    );
  }

  const hasAlerts = snapshot.low_stock_count > 0 || snapshot.out_of_stock_count > 0;

  return (
    <div className="section-container">
      {error && <div className="error-banner">{error}</div>}

      {/* Header */}
      <div className="section-header">
        <div>
          <h2>{snapshot.name}</h2>
          <p style={{ color: '#718096' }}>{snapshot.address}{snapshot.phone ? ` · ${snapshot.phone}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onRefresh} style={{ fontSize: 13 }}>
            Actualizar
          </button>
          <button className="btn-primary" onClick={() => setShowDetail(true)} style={{ fontSize: 13 }}>
            Ver detalle completo
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total empleados',  value: snapshot.total_employees, color: 'blue',   icon: <Users size={22} /> },
          { label: 'En turno ahora',   value: snapshot.on_shift_now,    color: 'green',  icon: <Wrench size={22} /> },
          { label: 'Trabajadores',     value: snapshot.total_workers,   color: 'purple', icon: <Hammer size={22} /> },
          { label: 'Cajeros',          value: snapshot.total_cashiers,  color: 'orange', icon: <Wallet size={22} /> },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-content">
              <p className="stat-label">{s.label}</p>
              <p className="stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Control de cajas */}
      <ControlCajasCard sedeId={snapshot.id} />

      {/* On-shift workers */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #e2e8f0', marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#4a5568' }}>
          Empleados en turno ahora
        </h3>
        {snapshot.on_shift_users.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {snapshot.on_shift_users.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', background: '#f0fff4',
                  borderRadius: 8, border: '1px solid #c6f6d5',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#22543d', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{u.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#718096' }}>{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#718096', fontSize: 13 }}>No hay empleados en turno actualmente.</p>
        )}
      </div>

      {/* Inventory alerts */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #e2e8f0',
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#4a5568' }}>
          Estado del inventario
        </h3>
        {hasAlerts ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {snapshot.out_of_stock_count > 0 && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fed7d7',
                borderRadius: 8, padding: '12px 18px',
              }}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#c53030' }}>{snapshot.out_of_stock_count}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#c53030' }}>productos sin stock</p>
              </div>
            )}
            {snapshot.low_stock_count > 0 && (
              <div style={{
                background: '#fffaf0', border: '1px solid #fbd38d',
                borderRadius: 8, padding: '12px 18px',
              }}>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#c05621' }}>{snapshot.low_stock_count}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#c05621' }}>con stock bajo</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#22543d', fontSize: 14 }}>
              Sin alertas de inventario
            </p>
          </div>
        )}
      </div>

      {showDetail && <SedeDetailPanel sede={snapshot} onClose={() => setShowDetail(false)} />}
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const EncargadoPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [snapshot, setSnapshot] = useState<SedeSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDashboard = useCallback(() => {
    setIsLoading(true);
    setError('');
    authService
      .getDashboardSummary()
      .then((r) => {
        if (r.success && r.data.mode === 'encargado' && r.data.sede) {
          setSnapshot(r.data.sede);
        }
      })
      .catch(() => setError('Error al cargar los datos de tu sede'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon"><Bike size={24} /></span>
          <span className="sidebar-brand-name">MotoQFox</span>
        </div>

        <nav className="sidebar-nav">
          {(() => {
            let lastGroup: string | undefined = undefined;
            return NAV_ITEMS.map((item) => {
              const showGroup = item.group && item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <React.Fragment key={item.id}>
                  {showGroup && <p className="nav-group-label">{item.group}</p>}
                  <button
                    className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.full_name}</p>
              <p className="sidebar-user-role" style={{ color: '#fbb6ce' }}>Encargado</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="dashboard-main-area">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Menú"
          >
            <MenuIcon size={22} />
          </button>
          <h1 className="topbar-title">
            {NAV_ITEMS.find((i) => i.id === activeSection)?.label}
            {user?.sede && activeSection === 'dashboard' && (
              <span style={{
                marginLeft: 12, fontSize: 13, fontWeight: 500,
                background: '#ebf8ff', color: '#2c5282',
                padding: '2px 10px', borderRadius: 8,
              }}>
                {user.sede.name}
              </span>
            )}
          </h1>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            Salir
          </button>
        </header>

        <main className="dashboard-content">
          {activeSection === 'dashboard' && (
            <SedeOverview
              snapshot={snapshot}
              isLoading={isLoading}
              error={error}
              onRefresh={loadDashboard}
            />
          )}
          {activeSection === 'users'    && <UsersList />}
          {activeSection === 'products' && user?.sede && <ProductsList sedeId={user.sede.id} />}
          {activeSection === 'audits'   && <AuditView />}
          {activeSection === 'entries'    && user?.sede && <EncargadoEntradasView sedeId={user.sede.id} />}
          {activeSection === 'sales'         && user?.sede && <EncargadoSalesView sedeId={user.sede.id} />}
          {activeSection === 'reportes-caja' && user?.sede && <ReportesCajaView sedeId={user.sede.id} />}
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default EncargadoPanel;
