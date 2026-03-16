import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { billingService } from '../../../api/billing.service';
import type { ConfiguracionFiscal } from '../../../types/billing.types';
import type { SedeSnapshot } from '../../../types/auth.types';

interface Props {
  sedes: SedeSnapshot[];
}

const EMPTY: Omit<ConfiguracionFiscal, 'sede'> = {
  nombre_comercial: '',
  nombre_legal:     '',
  rfc:              '',
  direccion:        '',
  telefono:         '',
  email:            '',
  logo_url:         '',
  leyenda_ticket:   'Gracias por su compra. Este documento no es una factura fiscal.',
};

const ConfigFiscalView: React.FC<Props> = ({ sedes }) => {
  const [selectedSede, setSelectedSede] = useState<number>(sedes[0]?.id ?? 0);
  const [form,         setForm]         = useState({ ...EMPTY });
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (!selectedSede) return;
    setLoading(true); setError('');
    billingService.getConfigFiscal(selectedSede)
      .then(r => {
        if (r.data) {
          const { sede: _s, id: _id, sede_name: _sn, updated_at: _u, ...rest } = r.data;
          setForm({ ...EMPTY, ...rest });
        } else {
          setForm({ ...EMPTY });
        }
      })
      .catch(() => setError('Error al cargar la configuración'))
      .finally(() => setLoading(false));
  }, [selectedSede]);

  const change = (field: keyof typeof EMPTY, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSede) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await billingService.saveConfigFiscal(selectedSede, { ...form, sede: selectedSede });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const sedeName = sedes.find(s => s.id === selectedSede)?.name ?? '';

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Configuración de Tickets</h2>
          <p>Información que aparece en los tickets impresos de cada sede</p>
        </div>
      </div>

      {/* Sede selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
          Sede a configurar
        </label>
        <select
          className="filter-select"
          value={selectedSede}
          onChange={e => setSelectedSede(Number(e.target.value))}
          style={{ minWidth: 240 }}
        >
          {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="table-loading">Cargando configuración…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── Form ── */}
          <form onSubmit={handleSave}>
            {error  && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
            {saved  && <div className="success-banner" style={{ marginBottom: 16 }}>Configuración guardada correctamente.</div>}

            <div className="modal-form" style={{ padding: 0 }}>

              <div className="form-group">
                <label>Nombre comercial *</label>
                <input
                  value={form.nombre_comercial}
                  onChange={e => change('nombre_comercial', e.target.value)}
                  placeholder="ej. MotoQFox Sucursal Norte"
                  required
                />
              </div>

              <div className="form-group">
                <label>Razón social / Nombre legal</label>
                <input
                  value={form.nombre_legal}
                  onChange={e => change('nombre_legal', e.target.value)}
                  placeholder="Nombre legal (si difiere del comercial)"
                />
              </div>

              <div className="form-group">
                <label>RFC</label>
                <input
                  value={form.rfc}
                  onChange={e => change('rfc', e.target.value.toUpperCase())}
                  placeholder="ej. XAXX010101000"
                  maxLength={13}
                  style={{ fontFamily: 'monospace', letterSpacing: 1 }}
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <textarea
                  rows={2}
                  value={form.direccion}
                  onChange={e => change('direccion', e.target.value)}
                  placeholder="Calle, número, colonia, ciudad, CP"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    value={form.telefono}
                    onChange={e => change('telefono', e.target.value)}
                    placeholder="55 1234 5678"
                  />
                </div>
                <div className="form-group">
                  <label>Email de contacto</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => change('email', e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL del logotipo</label>
                <input
                  value={form.logo_url}
                  onChange={e => change('logo_url', e.target.value)}
                  placeholder="https://... (URL pública de la imagen)"
                />
                {form.logo_url && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={form.logo_url}
                      alt="Logo preview"
                      style={{ maxHeight: 50, maxWidth: 120, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button type="button" className="btn-icon btn-deactivate" title="Quitar logo"
                      onClick={() => change('logo_url', '')}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Leyenda del ticket</label>
                <textarea
                  rows={3}
                  value={form.leyenda_ticket}
                  onChange={e => change('leyenda_ticket', e.target.value)}
                  placeholder="Texto que aparece al pie del ticket"
                />
              </div>

              <div style={{ paddingTop: 8 }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : `Guardar configuración — ${sedeName}`}
                </button>
              </div>
            </div>
          </form>

          {/* ── Preview ── */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              VISTA PREVIA DEL TICKET
            </p>
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '16px 18px', maxWidth: 280, fontFamily: 'monospace', fontSize: 11,
              boxShadow: '0 2px 8px rgba(0,0,0,.06)',
            }}>
              {form.logo_url && (
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <img src={form.logo_url} alt="" style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, fontFamily: 'sans-serif' }}>
                  {form.nombre_comercial || <span style={{ color: '#a0aec0' }}>Nombre comercial</span>}
                </p>
                {form.rfc && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#718096' }}>RFC: {form.rfc}</p>}
                {form.direccion && <p style={{ margin: '3px 0 0', fontSize: 9, color: '#4a5568' }}>{form.direccion}</p>}
                {form.telefono && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#4a5568' }}>Tel: {form.telefono}</p>}
              </div>

              <div style={{ borderTop: '1px dashed #a0aec0', margin: '8px 0' }} />

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Folio:</span>
                  <span style={{ fontWeight: 700 }}>#000001</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ color: '#718096' }}>Fecha:</span>
                  <span>10/03/2026 14:30</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #a0aec0', margin: '8px 0' }} />

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ flex: 1, color: '#444' }}>Filtro de aceite Honda</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ flex: 1 }} />
                  <span style={{ width: 24, textAlign: 'center' }}>2</span>
                  <span style={{ width: 60, textAlign: 'right' }}>$150.00</span>
                  <span style={{ width: 70, textAlign: 'right', fontWeight: 700 }}>$300.00</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #a0aec0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                <span>TOTAL:</span>
                <span>$300.00</span>
              </div>

              <div style={{ borderTop: '1px dashed #a0aec0', margin: '8px 0' }} />
              <p style={{ margin: 0, textAlign: 'center', fontSize: 9, color: '#718096', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                {form.leyenda_ticket || <span style={{ color: '#a0aec0' }}>Leyenda del ticket</span>}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ConfigFiscalView;
