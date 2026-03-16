import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, LoginCredentials } from '../types/auth.types';
import { authService } from '../api/auth.service';
import { tokenStore } from '../utils/tokenStore';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On mount: try to restore the session for this tab.
   *
   * - sessionStorage has the refresh token (persists through F5, gone on tab close)
   * - We call /auth/refresh/ to get a fresh access token into memory
   * - We restore the user snapshot from sessionStorage while we wait
   */
  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = tokenStore.getRefresh();
      const storedUser = tokenStore.getUser();

      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      // Optimistically restore user so UI doesn't flicker
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // corrupted JSON — clear and force re-login
          tokenStore.clear();
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh } = response.data;
        tokenStore.setAccess(access);
        if (refresh) tokenStore.setRefresh(refresh);
      } catch {
        // Refresh token expired or revoked — clear session
        tokenStore.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await authService.login(credentials);

    if (response.success) {
      const { user: loggedUser, tokens } = response.data;

      tokenStore.setAccess(tokens.access);
      tokenStore.setRefresh(tokens.refresh);
      tokenStore.setUser(JSON.stringify(loggedUser));

      setUser(loggedUser);
      return loggedUser;
    }

    throw new Error(response.message || 'Error al iniciar sesión');
  };

  const logout = () => {
    authService.logout();
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};
