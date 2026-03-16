import React, { useEffect, useRef, useState } from 'react';
import { salesService } from '../../api/sales.service';
import type { AperturaCaja } from '../../types/sales.types';

interface Props {
  sedeId: number;
}

const ControlCajasCard: React.FC<Props> = ({ sedeId }) => {
  const [codigo,       setCodigo]       = useState<string | null>(null);
  const [expiresAt,    setExpiresAt]    = useState<Date | null>(null);
  const [secondsLeft,  setSecondsLeft]  = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cajasAbiertas, setCajasAbiertas] = useState<AperturaCaja[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCajasActivas = () => {
    salesService.cajasActivas()
      .then(r => setCajasAbiertas(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadCajasActivas();
  }, [sedeId]);

  // Countdown timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!expiresAt) return;

    const tick = () => {
      const secs = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      if (secs <= 0) {
        setSecondsLeft(0);
        setCodigo(null);
        setExpiresAt(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setSecondsLeft(secs);
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [expiresAt]);

  const handleGenerar = async () => {
    setIsGenerating(true);
    try {
      const res = await salesService.generarCodigoApertura();
      setCodigo(res.data.codigo);
      setExpiresAt(new Date(res.data.expires_at));
      loadCajasActivas();
    } catch {
    } finally {
      setIsGenerating(false);
    }
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,.08)', border: '1px solid #e2e8f0', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4a5568' }}>
          Control de cajas
        </h3>
        {!codigo ? (
          <button
            className="btn-primary"
            style={{ fontSize: 13 }}
            onClick={handleGenerar}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generando…' : 'Generar código de apertura'}
          </button>
        ) : (
          <button
            className="btn-secondary"
            style={{ fontSize: 13 }}
            onClick={handleGenerar}
            disabled={isGenerating}
          >
            Generar nuevo
          </button>
        )}
      </div>

      {/* Código activo */}
      {codigo && (
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>
              CÓDIGO DE APERTURA
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {codigo.split('').map((d, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 48, background: '#fff', borderRadius: 8,
                  border: '2px solid #3B82F6', fontSize: 24, fontWeight: 700,
                  color: '#1D4ED8',
                }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#64748b' }}>Expira en</p>
            <p style={{
              margin: 0, fontSize: 22, fontWeight: 700,
              color: secondsLeft < 120 ? '#c53030' : '#1D4ED8',
            }}>
              {mins}:{secs}
            </p>
          </div>
        </div>
      )}

      {/* Cajas activas */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#718096', fontWeight: 600 }}>
          CAJAS ABIERTAS AHORA
        </p>
        {cajasAbiertas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>No hay cajas abiertas actualmente.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cajasAbiertas.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', background: '#f0fff4',
                borderRadius: 8, border: '1px solid #c6f6d5',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#22543d', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {c.cajero_name.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{c.cajero_name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#718096' }}>
                    Desde {new Date(c.fecha_apertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlCajasCard;
