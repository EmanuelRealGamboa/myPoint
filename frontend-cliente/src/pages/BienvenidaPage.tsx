import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Tag, Receipt } from 'lucide-react';
import './BienvenidaPage.css';

const FEATURES = [
  { icon: <QrCode size={22} color="#E53E00" />, text: 'Tu código QR para identificarte en caja' },
  { icon: <Tag    size={22} color="#FFB800" />, text: 'Cupones de descuento y beneficios exclusivos' },
  { icon: <Receipt size={22} color="#22C55E" />, text: 'Historial de compras y tickets digitales' },
];

const BienvenidaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bienvenida screen--auth">
      {/* Hero */}
      <div className="bienvenida-hero">
        <div className="bienvenida-moto-bg" />
        <div className="bienvenida-overlay" />
        <div className="bienvenida-logo">
          <svg width="48" height="48" viewBox="0 0 72 72" fill="none">
            <rect width="72" height="72" rx="20" fill="#E53E00" />
            <path d="M12 44 C20 28 28 22 36 22 C44 22 52 28 60 44"
              stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="48" r="8" fill="white" />
            <circle cx="52" cy="48" r="8" fill="white" />
            <circle cx="20" cy="48" r="4" fill="#E53E00" />
            <circle cx="52" cy="48" r="4" fill="#E53E00" />
          </svg>
          <span>MotoQFox</span>
        </div>
      </div>

      {/* Content */}
      <div className="bienvenida-content">
        <h1 className="bienvenida-title">Tu taller,<br />en tu bolsillo</h1>
        <ul className="bienvenida-features">
          {FEATURES.map((f, i) => (
            <li key={i} className="bienvenida-feature">
              <span className="bienvenida-feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="bienvenida-actions">
          <button className="btn btn-primary" onClick={() => navigate('/registro')}>
            Crear cuenta
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default BienvenidaPage;
