import React from 'react';
import { Tag } from 'lucide-react';

// Placeholder — Fase C2 implementará cupones en backend
const CuponesPage: React.FC = () => (
  <div className="screen">
    <div className="page-header">
      <h1 className="page-title">Mis cupones</h1>
    </div>
    <div className="empty-state">
      <Tag size={48} />
      <h3>Próximamente</h3>
      <p>
        Aquí verás tus cupones de descuento y beneficios exclusivos.
        Se activan al completar compras.
      </p>
    </div>
  </div>
);

export default CuponesPage;
