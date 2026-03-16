import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

// Lazy pages
const SplashPage        = lazy(() => import('./pages/SplashPage'));
const BienvenidaPage    = lazy(() => import('./pages/BienvenidaPage'));
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const RegistroPage      = lazy(() => import('./pages/RegistroPage'));
const HomePage          = lazy(() => import('./pages/HomePage'));
const MiQRPage          = lazy(() => import('./pages/MiQRPage'));
const MisComprasPage    = lazy(() => import('./pages/MisComprasPage'));
const DetalleCompraPage = lazy(() => import('./pages/DetalleCompraPage'));
const CuponesPage       = lazy(() => import('./pages/CuponesPage'));
const PerfilPage        = lazy(() => import('./pages/PerfilPage'));

// Layout for authenticated screens (with bottom nav)
const MainLayout: React.FC = () => {
  const { isAuth, loading } = useAuth();
  if (loading) return null;
  if (!isAuth) return <Navigate to="/bienvenida" replace />;
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
};

// Auth guard: redirect to home if already logged in
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuth, loading } = useAuth();
  if (loading) return null;
  if (isAuth) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const PageLoader = () => (
  <div style={{
    minHeight: '100dvh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--c-bg)',
  }}>
    <div className="spinner" style={{ width: 28, height: 28, borderTopColor: 'var(--c-primary)' }} />
  </div>
);

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Splash */}
      <Route path="/" element={<SplashPage />} />

      {/* Public / Auth */}
      <Route path="/bienvenida" element={<AuthGuard><BienvenidaPage /></AuthGuard>} />
      <Route path="/login"      element={<AuthGuard><LoginPage /></AuthGuard>} />
      <Route path="/registro"   element={<AuthGuard><RegistroPage /></AuthGuard>} />

      {/* Protected — with bottom nav */}
      <Route element={<MainLayout />}>
        <Route path="/home"              element={<HomePage />} />
        <Route path="/mi-qr"             element={<MiQRPage />} />
        <Route path="/compras"           element={<MisComprasPage />} />
        <Route path="/compras/:id"       element={<DetalleCompraPage />} />
        <Route path="/cupones"           element={<CuponesPage />} />
        <Route path="/perfil"            element={<PerfilPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
