import React, { useEffect, useState, useCallback } from 'react';
import { usersService } from '../../api/users.service';
import { authService } from '../../api/auth.service';
import { branchesService } from '../../api/branches.service';
import type { User, UserRole, SedeDetail, Pagination } from '../../types/auth.types';
import { Pencil, Trash2, Lock, Unlock, Loader2 } from 'lucide-react';
import UserFormModal from './UserFormModal';
import ConfirmDialog from '../common/ConfirmDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: 'Administrador',
  ENCARGADO:     'Encargado',
  WORKER:        'Trabajador',
  CASHIER:       'Cajero',
  CUSTOMER:      'Cliente',
};

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
  });
  const [sedes, setSedes] = useState<SedeDetail[]>([]);

  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [sedeFilter, setSedeFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const [modalUser, setModalUser]             = useState<User | null | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [unlockingId, setUnlockingId]         = useState<number | null>(null);
  // undefined = modal closed, null = create mode, User = edit mode

  const loadSedes = useCallback(() => {
    branchesService.list().then((r) => setSedes(r.data)).catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    setIsLoading(true);
    setError('');

    const params: Record<string, any> = { page, page_size: 20 };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (sedeFilter) params.sede_id = sedeFilter;
    if (activeFilter !== '') params.is_active = activeFilter === 'true';

    usersService
      .list(params)
      .then((r) => {
        setUsers(r.data.users);
        setPagination(r.data.pagination);
      })
      .catch(() => setError('Error al cargar los usuarios'))
      .finally(() => setIsLoading(false));
  }, [search, roleFilter, sedeFilter, activeFilter, page]);

  useEffect(() => { loadSedes(); }, [loadSedes]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, sedeFilter, activeFilter]);

  const handleToggleActive = async (user: User) => {
    try {
      await usersService.setActive(user.id, !user.is_active);
      loadUsers();
    } catch {
      setError('Error al cambiar el estado del usuario');
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await usersService.remove(id);
      setConfirmDeleteId(null);
      loadUsers();
    } catch {
      setConfirmDeleteId(null);
      setError('Error al eliminar el usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnlock = async (user: User) => {
    setUnlockingId(user.id);
    try {
      await authService.adminUnlock(user.id);
      loadUsers();
    } catch {
      setError('Error al desbloquear el usuario');
    } finally {
      setUnlockingId(null);
    }
  };

  const handleSaved = () => {
    setModalUser(undefined);
    loadUsers();
  };

  // Count accounts with pending unlock requests
  const unlockPending = users.filter((u) => u.unlock_requested).length;

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Usuarios</h2>
          <p>
            {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} en total
            {unlockPending > 0 && (
              <span style={{
                marginLeft: 10, background: '#e53e3e', color: '#fff',
                borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {unlockPending} solicitud{unlockPending !== 1 ? 'es' : ''} de desbloqueo
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModalUser(null)}>
          + Nuevo Usuario
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="filter-input"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Todos los roles</option>
          <option value="ADMINISTRATOR">Administrador</option>
          <option value="ENCARGADO">Encargado</option>
          <option value="WORKER">Trabajador</option>
          <option value="CASHIER">Cajero</option>
          <option value="CUSTOMER">Cliente</option>
        </select>
        <select
          className="filter-select"
          value={sedeFilter}
          onChange={(e) => setSedeFilter(e.target.value)}
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="table-loading">Cargando...</div>
      ) : (
        <>
          <div className="table-wrapper">
            <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Sede</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                      <td className="user-cell">
                        <div className="table-user-avatar">
                          {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                        </div>
                        <div>
                          <div className="user-cell-name">
                            {u.full_name}
                            {/* Unlock request badge */}
                            {u.unlock_requested && (
                              <span title="Solicitud de desbloqueo pendiente"
                                style={{
                                  marginLeft: 6, fontSize: 10, background: '#fed7d7',
                                  color: '#c53030', borderRadius: 8, padding: '1px 6px',
                                  fontWeight: 700, verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}>
                                <Lock size={10} />
                                solicita desbloqueo
                              </span>
                            )}
                          </div>
                          <div className="user-cell-email">{u.email}</div>
                          {/* Lockout info */}
                          {u.locked_until && new Date(u.locked_until) > new Date() && (
                            <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 2 }}>
                              Bloqueado hasta {new Date(u.locked_until).toLocaleTimeString('es-MX', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${u.role.toLowerCase()}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td>{u.sede?.name ?? <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString('es-MX')}</td>
                      <td>
                        <div className="action-buttons">
                          {(u.unlock_requested || (u.locked_until && new Date(u.locked_until) > new Date())) && (
                            <button
                              className="btn-icon btn-activate"
                              title="Desbloquear cuenta"
                              onClick={() => handleUnlock(u)}
                              disabled={unlockingId === u.id}
                            >
                              {unlockingId === u.id ? <Loader2 size={14} className="icon-spin" /> : <Unlock size={14} />}
                            </button>
                          )}
                          <button
                            className="btn-icon btn-edit"
                            title="Editar"
                            onClick={() => setModalUser(u)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className={`btn-icon ${u.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                            title={u.is_active ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            title="Eliminar usuario"
                            onClick={() => setConfirmDeleteId(u.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <button
                className="page-btn"
                disabled={page === pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {modalUser !== undefined && (
        <UserFormModal
          user={modalUser}
          onClose={() => setModalUser(undefined)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar usuario"
        message="¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deletingId !== null}
      />
    </div>
  );
};

export default UsersList;
