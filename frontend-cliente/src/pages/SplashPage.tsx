import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SplashPage.css';

const SplashPage: React.FC = () => {
  const { isAuth, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      navigate(isAuth ? '/home' : '/bienvenida', { replace: true });
    }, 900);
    return () => clearTimeout(t);
  }, [loading, isAuth, navigate]);

  return (
    <div className="splash">
      <div className="splash-logo">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <rect width="72" height="72" rx="20" fill="#E53E00" />
          <path d="M12 44 C20 28 28 22 36 22 C44 22 52 28 60 44"
            stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="48" r="8" fill="white" />
          <circle cx="52" cy="48" r="8" fill="white" />
          <circle cx="20" cy="48" r="4" fill="#E53E00" />
          <circle cx="52" cy="48" r="4" fill="#E53E00" />
        </svg>
        <span className="splash-name">MotoQFox</span>
      </div>
    </div>
  );
};

export default SplashPage;
