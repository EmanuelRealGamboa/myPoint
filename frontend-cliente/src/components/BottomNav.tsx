import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Receipt, QrCode, Tag, User } from 'lucide-react';
import './BottomNav.css';

const BottomNav: React.FC = () => (
  <nav className="bottom-nav">
    <NavLink to="/home" className={({ isActive }) => `bnav-item${isActive ? ' bnav-item--active' : ''}`}>
      <Home size={22} />
      <span>Inicio</span>
    </NavLink>

    <NavLink to="/compras" className={({ isActive }) => `bnav-item${isActive ? ' bnav-item--active' : ''}`}>
      <Receipt size={22} />
      <span>Compras</span>
    </NavLink>

    {/* Center QR button */}
    <NavLink to="/mi-qr" className="bnav-qr">
      <QrCode size={26} color="#fff" />
    </NavLink>

    <NavLink to="/cupones" className={({ isActive }) => `bnav-item${isActive ? ' bnav-item--active' : ''}`}>
      <Tag size={22} />
      <span>Cupones</span>
    </NavLink>

    <NavLink to="/perfil" className={({ isActive }) => `bnav-item${isActive ? ' bnav-item--active' : ''}`}>
      <User size={22} />
      <span>Perfil</span>
    </NavLink>
  </nav>
);

export default BottomNav;
