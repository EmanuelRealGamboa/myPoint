import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../api/auth.service';
import '../styles/LoginPage.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <p>Restablecer contraseña</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
            <h3 style={{ color: '#276749', fontSize: 18, margin: '0 0 8px' }}>
              Correo enviado
            </h3>
            <p style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              Si el correo <strong>{email}</strong> está registrado en el sistema,
              recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              Revisa también tu carpeta de spam.
            </p>
            <Link to="/login" className="lock-btn lock-btn--secondary"
              style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <p style={{ color: '#718096', fontSize: 14, margin: '-8px 0 0', lineHeight: 1.6 }}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" className="forgot-link">
                ← Volver al inicio de sesión
              </Link>
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

export default ForgotPasswordPage;
