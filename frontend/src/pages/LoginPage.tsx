import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../api/auth.service';
import { getRoleHome } from '../utils/roleUtils';
import { Lock, AlertTriangle } from 'lucide-react';
import '../styles/LoginPage.css';

interface LockState {
  remaining:        number;   // seconds left
  lockedUntil:      string;   // ISO string from backend
  unlockRequested:  boolean;
  email:            string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);

  // Remaining-attempts warning (1–4 left before lockout)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Lockout state
  const [lockState, setLockState] = useState<LockState | null>(null);

  // Unlock-request feedback
  const [unlockMsg, setUnlockMsg]       = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Countdown ticker
  useEffect(() => {
    if (!lockState || lockState.remaining <= 0) return;
    const timer = setTimeout(() => {
      setLockState((prev) => {
        if (!prev) return null;
        if (prev.remaining <= 1) return null; // auto-unlock on expiry
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockState?.remaining]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setRemainingAttempts(null);
    setIsLoading(true);

    try {
      const user = await login({ email, password });
      navigate(getRoleHome(user.role));
    } catch (err: any) {
      const data = err?.response?.data;

      if (data?.locked === true) {
        // Account is now locked
        setLockState({
          remaining:       data.remaining_seconds ?? 1800,
          lockedUntil:     data.locked_until ?? '',
          unlockRequested: data.unlock_requested ?? false,
          email,
        });
        setError('');
      } else if (data?.locked === false && data?.remaining_attempts != null) {
        // Wrong credentials but not yet locked
        setRemainingAttempts(data.remaining_attempts);
        setError(data.message ?? 'Credenciales incorrectas.');
      } else {
        setError(
          data?.message ??
          'Error al iniciar sesión. Verifica tus credenciales.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestUnlock = async () => {
    if (!lockState) return;
    setUnlockLoading(true);
    setUnlockMsg('');
    try {
      const r = await authService.requestUnlock(lockState.email);
      setUnlockMsg(r.message);
      setLockState((prev) => prev ? { ...prev, unlockRequested: true } : null);
    } catch {
      setUnlockMsg('No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setUnlockLoading(false);
    }
  };

  const fmtCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isLocked = !!lockState && lockState.remaining > 0;

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: isLocked ? 460 : 420 }}>
        <div className="login-header">
          <div className="logo-circle">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1>MotoQFox</h1>
          <p>Sistema de Inventario y Punto de Venta</p>
        </div>

        {/* ── LOCKOUT PANEL ── */}
        {isLocked ? (
          <div className="lock-panel">
            <Lock size={48} className="lock-icon" />
            <h3 className="lock-title">Cuenta bloqueada temporalmente</h3>
            <p className="lock-subtitle">
              Demasiados intentos fallidos. Vuelve a intentarlo en:
            </p>
            <div className="lock-countdown">{fmtCountdown(lockState.remaining)}</div>

            <div className="lock-actions">
              {/* Request unlock */}
              {!lockState.unlockRequested ? (
                <button
                  className="lock-btn lock-btn--primary"
                  onClick={handleRequestUnlock}
                  disabled={unlockLoading}
                >
                  {unlockLoading ? 'Enviando...' : 'Solicitar desbloqueo al administrador'}
                </button>
              ) : (
                <div className="lock-requested-badge">
                  Solicitud enviada al administrador
                </div>
              )}

              {unlockMsg && (
                <p className="lock-feedback">{unlockMsg}</p>
              )}

              {/* Forgot password while locked */}
              <Link to="/forgot-password" className="lock-btn lock-btn--secondary">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        ) : (
          /* ── NORMAL LOGIN FORM ── */
          <form onSubmit={handleSubmit} className="login-form">
            {/* General error */}
            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Remaining-attempts warning */}
            {remainingAttempts !== null && remainingAttempts <= 3 && (
              <div className="attempts-warning">
                <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Te queda{remainingAttempts !== 1 ? 'n' : ''}{' '}
                <strong>{remainingAttempts}</strong> intento{remainingAttempts !== 1 ? 's' : ''} antes
                de que la cuenta se bloquee por {30} minutos.
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@motoqfox.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <Link to="/forgot-password" className="forgot-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <span className="loading-spinner">Iniciando sesión...</span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>© 2026 MotoQFox. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
