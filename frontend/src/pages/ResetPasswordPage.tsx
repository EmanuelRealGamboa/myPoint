import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../api/auth.service';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import '../styles/LoginPage.css';

// ── Password strength ──────────────────────────────────────────────────────────
const validatePassword = (pwd: string): string => {
  if (!pwd)               return 'La contraseña es requerida';
  if (pwd.length < 8)     return 'Mínimo 8 caracteres';
  if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una mayúscula';
  if (!/[a-z]/.test(pwd)) return 'Debe contener al menos una minúscula';
  if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
    return 'Debe contener al menos un carácter especial (!@#$%...)';
  return '';
};

const passwordStrength = (pwd: string): { level: 0|1|2|3|4; label: string; color: string } => {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) score++;
  const map: Record<number, { level: 0|1|2|3|4; label: string; color: string }> = {
    0: { level: 0, label: '',           color: '#e2e8f0' },
    1: { level: 1, label: 'Muy débil',  color: '#e53e3e' },
    2: { level: 2, label: 'Débil',      color: '#ed8936' },
    3: { level: 3, label: 'Regular',    color: '#ecc94b' },
    4: { level: 4, label: 'Fuerte',     color: '#38a169' },
    5: { level: 4, label: 'Muy fuerte', color: '#276749' },
  };
  return map[score] ?? map[0];
};

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

// ── Component ─────────────────────────────────────────────────────────────────
const ResetPasswordPage: React.FC = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') ?? '';

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [globalError, setGlobalError]   = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [success, setSuccess]           = useState(false);

  // Redirect to login after success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate('/login'), 3500);
    return () => clearTimeout(t);
  }, [success, navigate]);

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center', padding: '48px 40px' }}>
          <AlertTriangle size={48} style={{ marginBottom: 12, color: 'var(--color-error, #c53030)' }} />
          <h2 style={{ color: '#c53030', margin: '0 0 12px' }}>Enlace inválido</h2>
          <p style={{ color: '#718096', fontSize: 14 }}>
            Este enlace de restablecimiento no es válido o ha expirado.
          </p>
          <Link to="/forgot-password" className="lock-btn lock-btn--primary"
            style={{ display: 'inline-block', marginTop: 20, width: 'auto', padding: '10px 24px' }}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errs: Record<string, string> = {};

    const pwdErr = validatePassword(password);
    if (pwdErr) errs.password = pwdErr;

    if (!confirm) {
      errs.confirm = 'Confirma la contraseña';
    } else if (password !== confirm) {
      errs.confirm = 'Las contraseñas no coinciden';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      await authService.confirmPasswordReset(token, password, confirm);
      setSuccess(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        setErrors(data.errors);
      } else {
        setGlobalError(data?.message ?? 'Token inválido o expirado. Solicita un nuevo enlace.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength(password);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1>MotoQFox</h1>
          <p>Nueva contraseña</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <CheckCircle2 size={48} style={{ marginBottom: 12, color: '#16A34A' }} />
            <h3 style={{ color: '#276749', fontSize: 18, margin: '0 0 8px' }}>
              Contraseña actualizada
            </h3>
            <p style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.6 }}>
              Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {globalError && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {globalError}
              </div>
            )}

            {/* Nueva contraseña */}
            <div className="form-group">
              <label>Nueva contraseña *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((err) => ({ ...err, password: '' }));
                  }}
                  placeholder="Mayús, minús, número, símbolo"
                  style={{ paddingRight: 40 }}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#718096',
                    padding: 0, lineHeight: 0 }}>
                  <EyeIcon open={showPass} />
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2, transition: 'background .2s',
                        background: i <= strength.level ? strength.color : '#e2e8f0',
                      }} />
                    ))}
                  </div>
                  {strength.label && (
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: strength.color, fontWeight: 600 }}>
                      {strength.label}
                    </p>
                  )}
                </div>
              )}
              {errors.password && (
                <span style={{ fontSize: 12, color: '#e53e3e' }}>{errors.password}</span>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="form-group">
              <label>Confirmar contraseña *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErrors((err) => ({ ...err, confirm: '' }));
                  }}
                  placeholder="Repite la contraseña"
                  style={{ paddingRight: 40 }}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#718096',
                    padding: 0, lineHeight: 0 }}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirm && (
                <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600,
                  color: password === confirm ? '#38a169' : '#e53e3e' }}>
                  {password === confirm ? 'Las contraseñas coinciden' : 'No coinciden'}
                </p>
              )}
              {errors.confirm && (
                <span style={{ fontSize: 12, color: '#e53e3e' }}>{errors.confirm}</span>
              )}
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Establecer nueva contraseña'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" className="forgot-link">← Volver al inicio de sesión</Link>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>© 2026 MotoQFox. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
