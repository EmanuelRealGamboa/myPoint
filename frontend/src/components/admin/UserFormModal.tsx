import React, { useEffect, useState } from 'react';
import { usersService } from '../../api/users.service';
import { branchesService } from '../../api/branches.service';
import type {
  User,
  SedeDetail,
  UserRole,
  UserCreatePayload,
  UserUpdatePayload,
} from '../../types/auth.types';
import { X } from 'lucide-react';

interface Props {
  user?: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ADMINISTRATOR', label: 'Administrador' },
  { value: 'ENCARGADO',     label: 'Encargado de Sede' },
  { value: 'WORKER',        label: 'Trabajador' },
  { value: 'CASHIER',       label: 'Cajero' },
  { value: 'CUSTOMER',      label: 'Cliente' },
];

const SEDE_REQUIRED: UserRole[] = ['ENCARGADO', 'WORKER', 'CASHIER'];

// ── Validation helpers ────────────────────────────────────────────────────────

const LETTERS_RE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE   = /^[0-9\s\-+().]*$/;

const validatePassword = (pwd: string): string => {
  if (!pwd)            return 'La contraseña es requerida';
  if (pwd.length < 8)  return 'Mínimo 8 caracteres';
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

// ── Eye icon ──────────────────────────────────────────────────────────────────

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

const UserFormModal: React.FC<Props> = ({ user, onClose, onSaved }) => {
  const isEdit = !!user;

  const [form, setForm] = useState({
    email:            user?.email ?? '',
    first_name:       user?.first_name ?? '',
    last_name:        user?.last_name ?? '',
    phone:            user?.phone ?? '',
    role:             (user?.role ?? 'CUSTOMER') as UserRole,
    sede:             user?.sede?.id ?? '',
    is_active:        user?.is_active ?? true,
    password:         '',
    password_confirm: '',
  });

  const [sedes, setSedes]               = useState<SedeDetail[]>([]);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [globalError, setGlobalError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  useEffect(() => {
    branchesService
      .list()
      .then((r) => setSedes(r.data.filter((s) => s.is_active)))
      .catch(() => setSedes([]));
  }, []);

  const change = (field: string, value: string | boolean | number) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.first_name.trim()) {
      errs.first_name = 'El nombre es requerido';
    } else if (!LETTERS_RE.test(form.first_name)) {
      errs.first_name = 'Solo se permiten letras';
    }

    if (!form.last_name.trim()) {
      errs.last_name = 'El apellido es requerido';
    } else if (!LETTERS_RE.test(form.last_name)) {
      errs.last_name = 'Solo se permiten letras';
    }

    if (form.phone && !PHONE_RE.test(form.phone)) {
      errs.phone = 'Formato inválido (solo números, espacios, +, -, paréntesis)';
    }

    if (!isEdit) {
      if (!form.email.trim()) {
        errs.email = 'El correo es requerido';
      } else if (!EMAIL_RE.test(form.email)) {
        errs.email = 'Correo electrónico inválido';
      }

      const pwdErr = validatePassword(form.password);
      if (pwdErr) errs.password = pwdErr;

      if (!form.password_confirm) {
        errs.password_confirm = 'Confirma la contraseña';
      } else if (form.password !== form.password_confirm) {
        errs.password_confirm = 'Las contraseñas no coinciden';
      }
    }

    if (SEDE_REQUIRED.includes(form.role) && !form.sede) {
      errs.sede = 'Encargados, trabajadores y cajeros deben tener una sede';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGlobalError('');

    try {
      if (isEdit) {
        const payload: UserUpdatePayload = {
          first_name: form.first_name,
          last_name:  form.last_name,
          phone:      form.phone,
          role:       form.role,
          sede:       form.sede ? Number(form.sede) : null,
          is_active:  form.is_active,
        };
        await usersService.update(user!.id, payload);
      } else {
        const payload: UserCreatePayload = {
          email:            form.email,
          first_name:       form.first_name,
          last_name:        form.last_name,
          phone:            form.phone,
          role:             form.role,
          sede:             form.sede ? Number(form.sede) : null,
          password:         form.password,
          password_confirm: form.password_confirm,
        };
        await usersService.create(payload);
      }
      onSaved();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) {
          mapped[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v);
        }
        setErrors(mapped);
      } else {
        setGlobalError(data?.message ?? 'Ocurrió un error inesperado');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = !isEdit ? passwordStrength(form.password) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {globalError && <div className="form-error-banner">{globalError}</div>}

          {/* Nombre + Apellido */}
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                value={form.first_name}
                onChange={(e) => change('first_name', e.target.value)}
                placeholder="Solo letras"
              />
              {errors.first_name && <span className="field-error">{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input
                value={form.last_name}
                onChange={(e) => change('last_name', e.target.value)}
                placeholder="Solo letras"
              />
              {errors.last_name && <span className="field-error">{errors.last_name}</span>}
            </div>
          </div>

          {/* Email (solo creación) */}
          {!isEdit && (
            <div className="form-group">
              <label>Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => change('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          )}

          {/* Teléfono */}
          <div className="form-group">
            <label>Teléfono (opcional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => change('phone', e.target.value)}
              placeholder="Ej: +52 55 1234 5678"
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          {/* Rol + Sede */}
          <div className="form-row">
            <div className="form-group">
              <label>Rol *</label>
              <select
                value={form.role}
                onChange={(e) => change('role', e.target.value as UserRole)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <span className="field-error">{errors.role}</span>}
            </div>
            <div className="form-group">
              <label>Sede {SEDE_REQUIRED.includes(form.role) ? '*' : '(opcional)'}</label>
              <select
                value={form.sede}
                onChange={(e) => change('sede', e.target.value)}
              >
                <option value="">— Sin sede —</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.sede && <span className="field-error">{errors.sede}</span>}
            </div>
          </div>

          {/* Contraseñas (solo creación) */}
          {!isEdit && (
            <>
              <div className="form-row">
                {/* Contraseña */}
                <div className="form-group">
                  <label>Contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => change('password', e.target.value)}
                      placeholder="Mayús, minús, número, símbolo"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPass ? 'Ocultar' : 'Mostrar'}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#718096', padding: 0, lineHeight: 0,
                      }}
                    >
                      <EyeIcon open={showPass} />
                    </button>
                  </div>
                  {/* Barra de fuerza */}
                  {form.password && strength && (
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
                  {errors.password && <span className="field-error">{errors.password}</span>}
                </div>

                {/* Confirmar contraseña */}
                <div className="form-group">
                  <label>Confirmar contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.password_confirm}
                      onChange={(e) => change('password_confirm', e.target.value)}
                      placeholder="Repite la contraseña"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#718096', padding: 0, lineHeight: 0,
                      }}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {form.password_confirm && (
                    <p style={{
                      margin: '3px 0 0', fontSize: 11, fontWeight: 600,
                      color: form.password === form.password_confirm ? '#38a169' : '#e53e3e',
                    }}>
                      {form.password === form.password_confirm ? 'Las contraseñas coinciden' : 'No coinciden'}
                    </p>
                  )}
                  {errors.password_confirm && <span className="field-error">{errors.password_confirm}</span>}
                </div>
              </div>

              {/* Info email */}
              <div style={{
                background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 8,
                padding: '10px 14px', fontSize: 12, color: '#2c5282',
              }}>
                Al crear el usuario, sus credenciales se enviarán automáticamente a su correo electrónico.
              </div>
            </>
          )}

          {/* Estado (solo edición) */}
          {isEdit && (
            <div className="form-group form-group--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => change('is_active', e.target.checked)}
                />
                <span>Usuario activo</span>
              </label>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
