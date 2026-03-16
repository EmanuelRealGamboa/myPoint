import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  Package,
  Tags,
  ClipboardList,
  Bike,
  Menu as MenuIcon,
  Wrench,
  AlertTriangle,
  LogOut,
  Factory,
  TrendingUp,
  List,
  Receipt,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../api/auth.service';
import { salesService } from '../api/sales.service';
import type { DashboardStats, SedeSnapshot } from '../types/auth.types';
import type { SedeResumenVentas } from '../types/sales.types';
import UsersList from '../components/admin/UsersList';
import SedesList from '../components/admin/SedesList';
import ProductsList from '../components/admin/inventory/ProductsList';
import CategoriesList from '../components/admin/inventory/CategoriesList';
import SubcategoriesList from '../components/admin/inventory/SubcategoriesList';
import FabricantesList from '../components/admin/inventory/FabricantesList';
import MotoCatalogView from '../components/admin/inventory/MotoCatalogView';
import AuditView from '../components/admin/inventory/AuditView';
import SedeCard from '../components/admin/dashboard/SedeCard';
import SedeDetailPanel from '../components/admin/dashboard/SedeDetailPanel';
import DashboardCharts from '../components/admin/dashboard/DashboardCharts';
import ReportesView from '../components/admin/dashboard/ReportesView';
import ConfigFiscalView from '../components/admin/billing/ConfigFiscalView';
import ReportesCajaView from '../components/encargado/ReportesCajaView';
import LockedAccountsBanner from '../components/admin/LockedAccountsBanner';
import SecurityView from '../components/admin/SecurityView';
import '../styles/DashboardPage.css';

type Section =
  | 'dashboard' | 'users' | 'sedes' | 'security'
  | 'products' | 'categories' | 'subcategories' | 'fabricantes' | 'motos' | 'audits'
  | 'reportes' | 'reportes-caja' | 'config-fiscal';

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; group?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={18} /> },
  { id: 'users',         label: 'Usuarios',        icon: <Users size={18} />,        group: 'Admin' },
  { id: 'sedes',         label: 'Sedes',           icon: <Building2 size={18} />,    group: 'Admin' },
  { id: 'security',      label: 'Seguridad',       icon: <Shield size={18} />,       group: 'Admin' },
  { id: 'products',      label: 'Productos',       icon: <Package size={18} />,      group: 'Inventario' },
  { id: 'categories',    label: 'Categorías',      icon: <Tags size={18} />,         group: 'Inventario' },
  { id: 'subcategories', label: 'Subcategorías',   icon: <List size={18} />,         group: 'Inventario' },
  { id: 'fabricantes',   label: 'Fabricantes',     icon: <Factory size={18} />,      group: 'Inventario' },
  { id: 'motos',         label: 'Catálogo Motos',  icon: <Bike size={18} />,         group: 'Inventario' },
  { id: 'audits',        label: 'Auditorías',      icon: <ClipboardList size={18} />,group: 'Inventario' },
  { id: 'reportes',      label: 'Reportes',        icon: <TrendingUp size={18} />,   group: 'Reportes' },
  { id: 'reportes-caja',  label: 'Reportes Caja',   icon: <FileText size={18} />,   group: 'Reportes' },
  { id: 'config-fiscal', label: 'Config. Tickets', icon: <Receipt size={18} />,      group: 'Reportes' },
];

// ─── Dashboard overview ───────────────────────────────────────────────────────

interface OverviewProps {
  stats: DashboardStats | null;
  sedes: SedeSnapshot[];
  resumen: SedeResumenVentas[];
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onNavigateSecurity: () => void;
}

const DashboardOverview: React.FC<OverviewProps> = ({ stats, sedes, resumen, isLoading, error, onRefresh, onNavigateSecurity }) => {
  const [selectedSede, setSelectedSede] = useState<SedeSnapshot | null>(null);

  const totalOnShift = sedes.reduce((acc, s) => acc + s.on_shift_now, 0);
  const totalAlerts  = sedes.reduce((acc, s) => acc + s.out_of_stock_count + s.low_stock_count, 0);

  if (isLoading) {
    return <div className="table-loading">Cargando dashboard...</div>;
  }

  return (
    <div className="section-container">
      {/* Locked accounts alert */}
      <LockedAccountsBanner onUnlock={onNavigateSecurity} />

      {error && <div className="error-banner">{error}</div>}

      {/* Top KPI strip */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total usuarios',  value: stats?.total_users ?? 0,     color: 'blue',   icon: <Users size={22} /> },
          { label: 'Sedes activas',   value: sedes.length,                color: 'purple', icon: <Building2 size={22} /> },
          { label: 'En turno ahora',  value: totalOnShift,                color: 'green',  icon: <Wrench size={22} /> },
          { label: 'Alertas stock',   value: totalAlerts,                 color: totalAlerts > 0 ? 'red' : 'green', icon: <AlertTriangle size={22} /> },
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

      {/* Sede cards */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="section-subtitle">Sedes</h3>
        <button
          className="btn-secondary"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={onRefresh}
        >
          Actualizar
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {sedes.map(s => (
          <SedeCard key={s.id} sede={s} onClick={setSelectedSede} />
        ))}
        {sedes.length === 0 && (
          <p className="dashboard-empty-text">No hay sedes activas.</p>
        )}
      </div>

      {/* Charts */}
      {stats && sedes.length > 0 && (
        <>
          <h3 className="section-subtitle" style={{ margin: '0 0 16px' }}>Análisis</h3>
          <DashboardCharts sedes={sedes} stats={stats} resumen={resumen} />
        </>
      )}

      {/* Sede detail modal */}
      {selectedSede && (
        <SedeDetailPanel sede={selectedSede} onClose={() => setSelectedSede(null)} />
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [stats, setStats]     = useState<DashboardStats | null>(null);
  const [sedes, setSedes]     = useState<SedeSnapshot[]>([]);
  const [resumen, setResumen] = useState<SedeResumenVentas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDashboard = useCallback(() => {
    setIsLoading(true);
    setError('');
    Promise.all([
      authService.getDashboardSummary(),
      salesService.adminResumen().catch(() => ({ success: false, data: [] as SedeResumenVentas[] })),
    ])
      .then(([dash, res]) => {
        if (dash.success && dash.data.mode === 'administrator') {
          setStats(dash.data.statistics ?? null);
          setSedes(dash.data.sedes_summary ?? []);
        }
        if (res.success) setResumen(res.data);
      })
      .catch(() => setError('Error al cargar los datos del dashboard'))
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
              <p className="sidebar-user-role">{user?.role}</p>
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
          </h1>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            Salir
          </button>
        </header>

        <main className="dashboard-content">
          {activeSection === 'dashboard' && (
            <DashboardOverview
              stats={stats}
              sedes={sedes}
              resumen={resumen}
              isLoading={isLoading}
              error={error}
              onRefresh={loadDashboard}
              onNavigateSecurity={() => setActiveSection('security')}
            />
          )}
          {activeSection === 'users'         && <UsersList />}
          {activeSection === 'sedes'         && <SedesList />}
          {activeSection === 'security'      && <SecurityView />}
          {activeSection === 'products'      && <ProductsList />}
          {activeSection === 'categories'    && <CategoriesList />}
          {activeSection === 'subcategories' && <SubcategoriesList />}
          {activeSection === 'fabricantes'   && <FabricantesList />}
          {activeSection === 'motos'         && <MotoCatalogView />}
          {activeSection === 'audits'        && <AuditView />}
          {activeSection === 'reportes'      && <ReportesView sedes={sedes} />}
          {activeSection === 'reportes-caja'  && <ReportesCajaView showSede />}
          {activeSection === 'config-fiscal' && <ConfigFiscalView sedes={sedes} />}
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
