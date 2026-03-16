import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customersService } from '../api/customers.service';
import './AuthPage.css';

type Step = 1 | 2 | 3;

function pwdStrength(pwd: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (pwd.length < 4) return { level: 0, label: '' };
  if (pwd.length < 6) return { level: 1, label: 'Débil' };
  if (pwd.length < 10 || !/[0-9]/.test(pwd)) return { level: 2, label: 'Media' };
  return { level: 3, label: 'Fuerte' };
}

const RegistroPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    telefono: '', fecha_nac: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const strength = pwdStrength(form.password);

  const nextStep = () => {
    setError('');
    setStep(s => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { tokens, profile } = await customersService.register({
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        password:   form.password,
        telefono:   form.telefono || undefined,
        fecha_nac:  form.fecha_nac || null,
      });
      loginWithTokens(tokens, profile);
      setStep(3);
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      if (errs?.email)    setError(errs.email[0]);
      else if (errs?.password) setError(errs.password[0]);
      else setError('Error al crear la cuenta. Intenta de nuevo.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen screen--auth">
      <div className="auth-header">
        {step < 3 && (
          <button className="btn-icon" onClick={() => step === 1 ? navigate('/bienvenida') : setStep(s => (s - 1) as Step)}>
            <ChevronLeft size={24} />
          </button>
        )}
        <span className="auth-header-title">
          {step === 3 ? '¡Bienvenido!' : 'Crear cuenta'}
        </span>
      </div>

      <div className="auth-body">
        {/* Step dots */}
        {step < 3 && (
          <div className="step-indicator">
            {([1, 2] as Step[]).map(n => (
              <span key={n} className={`step-dot${n === step ? ' step-dot--active' : n < step ? ' step-dot--done' : ''}`} />
            ))}
          </div>
        )}

        {/* ── STEP 1: Datos personales ── */}
        {step === 1 && (
          <>
            <h2 className="auth-title">Tus datos</h2>
            <p className="auth-subtitle">Cómo te conoceremos en la tienda</p>

            <div className="auth-form">
              <div className="input-group">
                <label className="input-label">Nombre</label>
                <input className="input" type="text" autoComplete="given-name" required
                  placeholder="Ej. Carlos" value={form.first_name} onChange={set('first_name')} />
              </div>

              <div className="input-group">
                <label className="input-label">Apellido</label>
                <input className="input" type="text" autoComplete="family-name" required
                  placeholder="Ej. Ramírez" value={form.last_name} onChange={set('last_name')} />
              </div>

              <div className="input-group">
                <label className="input-label">Email</label>
                <input className={`input${error ? ' input-error' : ''}`}
                  type="email" autoComplete="email" required
                  placeholder="correo@ejemplo.com"
                  value={form.email} onChange={set('email')} />
              </div>

              <div className="input-group">
                <label className="input-label">Contraseña</label>
                <div className="input-wrap">
                  <input className="input"
                    type={showPwd ? 'text' : 'password'} autoComplete="new-password" required
                    placeholder="Mínimo 6 caracteres"
                    value={form.password} onChange={set('password')} />
                  <button type="button" className="btn-icon" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password && (
                  <div className="pwd-strength">
                    <div className="pwd-strength-bar">
                      {[1, 2, 3].map(n => (
                        <span key={n} className={`pwd-strength-seg${n <= strength.level
                          ? strength.level === 1 ? ' pwd-strength-seg--weak'
                          : strength.level === 2 ? ' pwd-strength-seg--medium'
                          : ' pwd-strength-seg--strong' : ''}`} />
                      ))}
                    </div>
                    {strength.label && <span className="pwd-strength-label">{strength.label}</span>}
                  </div>
                )}
              </div>

              {error && <p className="input-hint input-hint--error">{error}</p>}

              <button className="btn btn-primary" style={{ marginTop: 8 }}
                disabled={!form.first_name || !form.last_name || !form.email || form.password.length < 6}
                onClick={nextStep}>
                Continuar
              </button>
            </div>

            <p className="auth-switch" style={{ marginTop: 16 }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="auth-link">Inicia sesión</Link>
            </p>
          </>
        )}

        {/* ── STEP 2: Contacto ── */}
        {step === 2 && (
          <>
            <h2 className="auth-title">Contacto</h2>
            <p className="auth-subtitle">Opcional — puedes completarlo después</p>

            <div className="auth-form">
              <div className="input-group">
                <label className="input-label">Teléfono</label>
                <div className="input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    position: 'absolute', left: 14, color: 'var(--c-text-sec)',
                    fontSize: 15, pointerEvents: 'none',
                  }}>+52</span>
                  <input className="input" type="tel" autoComplete="tel"
                    placeholder="1234567890"
                    style={{ paddingLeft: 48 }}
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Fecha de nacimiento</label>
                <input className="input" type="date"
                  value={form.fecha_nac} onChange={set('fecha_nac')}
                  max={new Date().toISOString().split('T')[0]} />
                <span className="input-hint">Para tu cupón de cumpleaños 🎂</span>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 16 }}
                disabled={loading} onClick={handleSubmit}>
                {loading ? <span className="spinner" /> : 'Crear mi cuenta'}
              </button>

              <button className="btn btn-ghost" style={{ textAlign: 'center' }}
                onClick={handleSubmit} disabled={loading}>
                Saltar por ahora
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Éxito ── */}
        {step === 3 && (
          <div className="success-step">
            <div className="success-icon">
              <CheckCircle size={40} color="#22C55E" />
            </div>
            <h2 className="auth-title" style={{ marginBottom: 0 }}>
              ¡Hola, {form.first_name}!
            </h2>
            <p style={{ color: 'var(--c-text-sec)', fontSize: 15, maxWidth: 280, lineHeight: 1.6 }}>
              Tu cuenta está lista. Ya puedes usar tu código QR en cualquier visita.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }}
              onClick={() => navigate('/home', { replace: true })}>
              Ir a mi cuenta →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistroPage;
