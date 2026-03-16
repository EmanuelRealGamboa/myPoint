import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ClienteProfile, AuthTokens } from '../types/customer.types';
import { customersService } from '../api/customers.service';

interface AuthState {
  profile:  ClienteProfile | null;
  isAuth:   boolean;
  loading:  boolean;
}

interface AuthContextValue extends AuthState {
  loginWithTokens: (tokens: AuthTokens, profile: ClienteProfile) => void;
  logout:          () => void;
  refreshProfile:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    profile: null,
    isAuth:  false,
    loading: true,
  });

  useEffect(() => {
    const access  = localStorage.getItem('mqf_access');
    const cached  = localStorage.getItem('mqf_profile');
    if (access && cached) {
      setState({ profile: JSON.parse(cached), isAuth: true, loading: false });
      // Re-validate silently
      customersService.getPerfil()
        .then(p => {
          localStorage.setItem('mqf_profile', JSON.stringify(p));
          setState({ profile: p, isAuth: true, loading: false });
        })
        .catch(() => setState({ profile: null, isAuth: false, loading: false }));
    } else {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  const loginWithTokens = (tokens: AuthTokens, profile: ClienteProfile) => {
    localStorage.setItem('mqf_access',  tokens.access);
    localStorage.setItem('mqf_refresh', tokens.refresh);
    localStorage.setItem('mqf_profile', JSON.stringify(profile));
    setState({ profile, isAuth: true, loading: false });
  };

  const logout = () => {
    localStorage.removeItem('mqf_access');
    localStorage.removeItem('mqf_refresh');
    localStorage.removeItem('mqf_profile');
    setState({ profile: null, isAuth: false, loading: false });
  };

  const refreshProfile = async () => {
    const p = await customersService.getPerfil();
    localStorage.setItem('mqf_profile', JSON.stringify(p));
    setState(s => ({ ...s, profile: p }));
  };

  return (
    <AuthContext.Provider value={{ ...state, loginWithTokens, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
