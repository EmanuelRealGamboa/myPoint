import React, { useEffect, useState, useCallback } from 'react';
import { inventoryService } from '../../../api/inventory.service';
import type { Categoria } from '../../../types/inventory.types';
import { Pencil, Lock, Unlock } from 'lucide-react';
import CategoryFormModal from './CategoryFormModal';
import ConfirmDialog from '../../common/ConfirmDialog';

const CategoriesList: React.FC = () => {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Categoria | null | undefined>(undefined);
  const [confirmToggle, setConfirmToggle] = useState<Categoria | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError('');
    inventoryService.listCategories({ page_size: 100 } as any)
      .then(r => setCategories(r.data.categories))
      .catch(() => setError('Error al cargar las categorías'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (cat: Categoria) => {
    try {
      await inventoryService.toggleCategory(cat.id);
      setConfirmToggle(null);
      load();
    } catch {
      setConfirmToggle(null);
      setError('Error al cambiar el estado');
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Categorías</h2>
          <p>{categories.filter(c => c.is_active).length} activas · {categories.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(null)}>+ Nueva Categoría</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <div className="table-loading">Cargando...</div>
      ) : (
        <div className="table-wrapper">
          <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Productos activos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">No hay categorías</td></tr>
              ) : categories.map(cat => (
                <tr key={cat.id} className={!cat.is_active ? 'row-inactive' : ''}>
                  <td><strong>{cat.name}</strong></td>
                  <td>{cat.description || <span className="text-muted">—</span>}</td>
                  <td>{cat.product_count}</td>
                  <td>
                    <span className={`status-badge ${cat.is_active ? 'active' : 'inactive'}`}>
                      {cat.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon btn-edit" title="Editar" onClick={() => setModal(cat)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`btn-icon ${cat.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                        title={cat.is_active ? 'Desactivar' : 'Activar'}
                        onClick={() => setConfirmToggle(cat)}
                      >
                        {cat.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {modal !== undefined && (
        <CategoryFormModal category={modal} onClose={() => setModal(undefined)} onSaved={() => { setModal(undefined); load(); }} />
      )}
      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.is_active ? 'Desactivar categoría' : 'Activar categoría'}
        message={confirmToggle?.is_active
          ? `¿Desactivar la categoría "${confirmToggle?.name}"? Los productos asociados no se eliminan.`
          : `¿Activar la categoría "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.is_active ? 'Desactivar' : 'Activar'}
        variant={confirmToggle?.is_active ? 'warning' : 'primary'}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
};

export default CategoriesList;
