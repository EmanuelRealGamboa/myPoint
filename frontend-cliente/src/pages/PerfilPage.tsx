import React, { useState } from 'react';
import { ChevronRight, LogOut, User, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import './PerfilPage.css';

const PerfilPage: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/bienvenida', { replace: true });
  };

  if (!profile) return null;

  const inicial = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="screen">
      <div className="page-header">
        <h1 className="page-title">Mi perfil</h1>
      </div>

      {/* Avatar + nombre */}
      <div className="perfil-hero">
        <div className="perfil-avatar">
          {profile.foto_url
            ? <img src={profile.foto_url} alt="foto" className="perfil-avatar-img" />
            : <span className="perfil-avatar-iniciales">{inicial}</span>}
        </div>
        <div className="perfil-info">
          <h2 className="perfil-name">{profile.first_name} {profile.last_name}</h2>
          <p className="perfil-email">{profile.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="perfil-stats">
        <div className="perfil-stat">
          <Star size={16} color="#FFB800" fill="#FFB800" />
          <span className="perfil-stat-value">{profile.puntos.toLocaleString('es-MX')}</span>
          <span className="perfil-stat-label">puntos</span>
        </div>
      </div>

      {/* Menu */}
      <div className="perfil-menu">
        <p className="section-title" style={{ paddingLeft: 20 }}>Cuenta</p>

        <div className="perfil-menu-group">
          {[
            { icon: <User size={18} />, label: 'Editar perfil', action: () => setToast('Próximamente disponible') },
          ].map((item, i) => (
            <button key={i} className="perfil-menu-item" onClick={item.action}>
              <span className="perfil-menu-icon">{item.icon}</span>
              <span className="perfil-menu-label">{item.label}</span>
              <ChevronRight size={16} color="var(--c-text-dis)" />
            </button>
          ))}
        </div>

        <div className="perfil-menu-group" style={{ marginTop: 8 }}>
          <button className="perfil-menu-item perfil-menu-item--danger" onClick={handleLogout}>
            <span className="perfil-menu-icon"><LogOut size={18} /></span>
            <span className="perfil-menu-label">Cerrar sesión</span>
          </button>
        </div>

        <p className="perfil-version">MotoQFox v1.0 · Cliente desde {new Date(profile.created_at).getFullYear()}</p>
      </div>

      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
};

export default PerfilPage;
