import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { customersService } from '../api/customers.service';
import './MiQRPage.css';

const MiQRPage: React.FC = () => {
  const { profile } = useAuth();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await customersService.getMiQR();
      setQrToken(d.qr_token);
    } catch { /* use profile token as fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Increase screen brightness on mobile (if API available)
  const boostBrightness = () => {
    if ('screen' in window && 'orientation' in window.screen) {
      // Web API doesn't expose brightness; best UX: go fullscreen
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const token = qrToken ?? profile?.qr_token ?? '';

  return (
    <div className="screen qr-screen">
      <div className="page-header">
        <h1 className="page-title">Mi código QR</h1>
        <button className="btn-icon" onClick={boostBrightness} title="Aumentar brillo">
          <Sun size={20} />
        </button>
      </div>

      <p className="qr-instruction">
        Muéstraselo a la cajera al momento de pagar
      </p>

      <div className="qr-container">
        {loading ? (
          <div className="skeleton" style={{ width: 240, height: 240, borderRadius: 12 }} />
        ) : token ? (
          <>
            <div className="qr-white-bg">
              <QRCode value={token} size={220} level="M" />
            </div>
            <div className="qr-user-info">
              {profile?.foto_url ? (
                <img src={profile.foto_url} alt="foto" className="qr-avatar" />
              ) : (
                <div className="qr-avatar-placeholder">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
              )}
              <div>
                <p className="qr-user-name">{profile?.first_name} {profile?.last_name}</p>
                <p className="qr-user-id mono">
                  #{String(profile?.id ?? 0).padStart(5, '0')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--c-text-sec)', fontSize: 14 }}>
            No se pudo cargar el QR. Intenta de nuevo.
          </p>
        )}
      </div>

      <div className="qr-status">
        <span className="qr-status-dot" />
        <span>Activo</span>
      </div>

      <p className="qr-disclaimer">
        El código no expira. Solo tú puedes verlo.
      </p>
    </div>
  );
};

export default MiQRPage;
