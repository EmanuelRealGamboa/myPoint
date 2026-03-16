import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customersService } from '../api/customers.service';
import './AuthPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    setLoading(true);
    try {
      const tokens  = await customersService.login(form);
      // store tokens first so getPerfil has auth header
      localStorage.setItem('mqf_access',  tokens.access);
      localStorage.setItem('mqf_refresh', tokens.refresh);
      const profile = await customersService.getPerfil();
      loginWithTokens(tokens, profile);
      navigate('/home', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Email o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen screen--auth">
      <div className="auth-header">
        <button className="btn-icon" onClick={() => navigate('/bienvenida')}>
          <ChevronLeft size={24} />
        </button>
        <span className="auth-header-title">Iniciar sesión</span>
      </div>

      <div className="auth-body">
        <h2 className="auth-title">Bienvenido de vuelta</h2>
        <p className="auth-subtitle">Ingresa con tu cuenta MotoQFox</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              className={`input${error ? ' input-error' : ''}`}
              type="email" autoComplete="email" required
              placeholder="correo@ejemplo.com"
              value={form.email} onChange={set('email')}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <div className="input-wrap">
              <input
                className={`input${error ? ' input-error' : ''}`}
                type={showPwd ? 'text' : 'password'} autoComplete="current-password" required
                placeholder="Tu contraseña"
                value={form.password} onChange={set('password')}
              />
              <button type="button" className="btn-icon" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="input-hint input-hint--error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <span className="spinner" /> : 'Entrar'}
          </button>
        </form>

        <div className="divider">o</div>

        <p className="auth-switch">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="auth-link">Créala aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
