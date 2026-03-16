export interface Sede {
  id: number;
  name: string;
  address: string;
  phone: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: 'ADMINISTRATOR' | 'ENCARGADO' | 'WORKER' | 'CASHIER' | 'CUSTOMER';
  sede: Sede | null;
  is_active: boolean;
  created_at: string;
  // Security fields
  login_attempts:   number;
  locked_until:     string | null;
  unlock_requested: boolean;
}

export interface LoginLockedResponse {
  success:          false;
  locked:           true;
  locked_until:     string;
  remaining_seconds: number;
  unlock_requested: boolean;
  message:          string;
}

export interface LoginAttemptsResponse {
  success:           false;
  locked:            false;
  remaining_attempts: number;
  message:           string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface DashboardStats {
  total_users: number;
  total_administrators: number;
  total_encargados: number;
  total_workers: number;
  total_cashiers: number;
  total_customers: number;
}

/** Rich per-sede snapshot returned by dashboard and /branches/<id>/summary/ */
export interface SedeSnapshot {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  total_employees: number;
  total_encargados: number;
  total_workers: number;
  total_cashiers: number;
  on_shift_now: number;
  on_shift_users: { id: number; name: string; role: string }[];
  low_stock_count: number;
  out_of_stock_count: number;
}

/** @deprecated use SedeSnapshot */
export interface SedesSummaryItem {
  id: number;
  name: string;
  total_users: number;
  total_workers: number;
  total_cashiers: number;
}

// ── Turno / Schedule ────────────────────────────────────────────────────────

export interface Turno {
  id: number;
  user: number;
  user_name: string;
  user_role: string;
  sede: number;
  sede_name: string;
  dia_semana: number;
  dia_semana_display: string;
  hora_inicio: string;
  hora_fin: string;
  is_active: boolean;
}

export interface TurnoPayload {
  user: number;
  sede: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  is_active?: boolean;
}

// ── User CRUD ──────────────────────────────────────────────────────────────

export type UserRole = User['role'];

export interface UserListParams {
  search?: string;
  role?: UserRole;
  sede_id?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface Pagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserListResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: Pagination;
  };
}

export interface UserCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  sede?: number | null;
  password: string;
  password_confirm: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
  sede?: number | null;
  is_active?: boolean;
}

// ── Sede CRUD ──────────────────────────────────────────────────────────────

export interface SedeDetail extends Sede {
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count: number;
}

export interface SedeListResponse {
  success: boolean;
  data: SedeDetail[];
}

export interface SedeCreatePayload {
  name: string;
  address: string;
  phone?: string;
}

export interface SedeUpdatePayload {
  name?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────

export interface DashboardResponse {
  success: boolean;
  data: {
    mode: 'administrator' | 'encargado';
    // administrator mode
    statistics?: DashboardStats;
    sedes_summary?: SedeSnapshot[];
    // encargado mode
    sede?: SedeSnapshot;
    user_info: {
      name: string;
      email: string;
      role: string;
      sede_name?: string;
    };
  };
}
