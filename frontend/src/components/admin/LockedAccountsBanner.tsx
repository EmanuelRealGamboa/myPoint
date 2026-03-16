import React, { useEffect, useState, useCallback } from 'react';
import { authService } from '../../api/auth.service';
import type { User } from '../../types/auth.types';
import { Lock, Unlock, Loader2, X } from 'lucide-react';

interface Props {
  /** Called after a successful unlock so the parent can refresh if needed */
  onUnlock?: () => void;
}

const LockedAccountsBanner: React.FC<Props> = ({ onUnlock }) => {
  const [accounts, setAccounts]     = useState<User[]>([]);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [dismissed, setDismissed]   = useState(false);

  const load = useCallback(() => {
    authService.getLockedAccounts().then((r) => {
      if (r.success) setAccounts(r.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (user: User) => {
    setUnlockingId(user.id);
    try {
      await authService.adminUnlock(user.id);
      setAccounts((prev) => prev.filter((u) => u.id !== user.id));
      onUnlock?.();
    } catch {
      // silent — full management available in Seguridad tab
    } finally {
      setUnlockingId(null);
    }
  };

  if (dismissed || accounts.length === 0) return null;

  const pendingUnlock = accounts.filter((u) => u.unlock_requested).length;

  return (
    <div style={{
      background: '#fff5f5',
      border: '1px solid #feb2b2',
      borderRadius: 10,
      padding: '14px 18px',
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={20} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: '#c53030', fontSize: 14 }}>
            {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} bloqueada{accounts.length !== 1 ? 's' : ''}
            {pendingUnlock > 0 && (
              <span style={{
                marginLeft: 8, background: '#e53e3e', color: '#fff',
                borderRadius: 10, padding: '1px 7px', fontSize: 11,
              }}>
                {pendingUnlock} solicitud{pendingUnlock !== 1 ? 'es' : ''} pendiente{pendingUnlock !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', lineHeight: 1 }}
          title="Cerrar alerta"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Account rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {accounts.map((u) => {
          const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
          return (
            <div key={u.id} style={{
              background: '#fff',
              border: '1px solid #fed7d7',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{ fontWeight: 600, color: '#2d3748', fontSize: 13 }}>{u.full_name}</span>
                <span style={{ color: '#718096', fontSize: 12, marginLeft: 8 }}>{u.email}</span>
                {isLocked && u.locked_until && (
                  <span style={{ color: '#e53e3e', fontSize: 11, marginLeft: 8 }}>
                    — bloqueado hasta {new Date(u.locked_until).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {u.unlock_requested && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, background: '#fed7d7',
                    color: '#c53030', borderRadius: 6, padding: '1px 6px', fontWeight: 700,
                  }}>
                    solicita desbloqueo
                  </span>
                )}
              </div>
              <button
                onClick={() => handleUnlock(u)}
                disabled={unlockingId === u.id}
                style={{
                  background: '#e53e3e', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '5px 14px', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: unlockingId === u.id ? 0.6 : 1,
                }}
              >
                {unlockingId === u.id ? (
                  <><Loader2 size={14} className="icon-spin" style={{ marginRight: 6, verticalAlign: 'middle' }} /> Desbloqueando...</>
                ) : (
                  <><Unlock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Desbloquear</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LockedAccountsBanner;
