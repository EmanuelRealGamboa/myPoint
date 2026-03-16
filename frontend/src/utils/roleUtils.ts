import type { User } from '../types/auth.types';

export const getRoleHome = (role: User['role']): string => {
  switch (role) {
    case 'ADMINISTRATOR': return '/admin';
    case 'ENCARGADO':     return '/encargado';
    case 'WORKER':        return '/worker';
    case 'CASHIER':       return '/cashier';
    default:              return '/login';
  }
};
