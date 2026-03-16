import React, { useRef, useState } from 'react';
import { salesService } from '../../api/sales.service';

interface Props {
  onAbierta: (aperturaId: number) => void;
}

const CajaClosedScreen: React.FC<Props> = ({ onAbierta }) => {
  const [digits,      setDigits]      = useState<string[]>(['', '', '', '', '', '']);
  const [error,       setError]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError('');
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = digits.join('');
    if (codigo.length < 6) {
      setError('Ingresa los 6 dígitos del código.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await salesService.abrirCaja(codigo);
      onAbierta(res.data.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Código incorrecto o expirado.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#f8fafc',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%',
        textAlign: 'center',
      }}>
        {/* Candado */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#EFF6FF', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 24px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#1a202c' }}>
          Caja cerrada
        </h2>
        <p style={{ margin: '0 0 32px', color: '#718096', fontSize: 14, lineHeight: 1.5 }}>
          Solicita al encargado el código de apertura<br />e ingrésalo a continuación.
        </p>

        <form onSubmit={handleSubmit}>
          {/* OTP inputs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}
            onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48, height: 56, textAlign: 'center',
                  fontSize: 24, fontWeight: 700, letterSpacing: 0,
                  border: `2px solid ${error ? '#fc8181' : d ? 'var(--color-primary)' : '#e2e8f0'}`,
                  borderRadius: 10, outline: 'none',
                  transition: 'border-color .15s',
                  color: '#1a202c',
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: '#c53030', fontSize: 13, margin: '-12px 0 16px', fontWeight: 500 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || digits.join('').length < 6}
            style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'var(--color-primary)', color: '#fff',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
              opacity: (isLoading || digits.join('').length < 6) ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Verificando…' : 'Abrir caja'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CajaClosedScreen;
