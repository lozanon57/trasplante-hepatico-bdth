import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, saveTokens, clearTokens, getAccessToken, getServerUrl } from '../api/client';
import { authenticateLocal } from './local-users';

interface User { id: number; nombre: string; rol: 'cirujano' | 'jefe' }
interface AuthState {
  user:      User | null;
  loading:   boolean;
  login:     (email: string, password: string) => Promise<void>;
  loginDemo: () => void;
  logout:    () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  login: async () => {}, loginDemo: () => {}, logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recargar sesión guardada al arrancar
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            setUser({ id: payload.id, nombre: payload.nombre, rol: payload.rol });
          } else {
            await clearTokens();
          }
        }
      } catch { /* token corrupto */ }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    // Try local users first (works offline, no server needed)
    const localUser = await authenticateLocal(email, password);
    if (localUser) {
      setUser(localUser);
      return;
    }

    // Fallback to backend if a server URL is configured
    const serverUrl = await getServerUrl();
    if (!serverUrl) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Usuario o contraseña incorrectos');
    }
    const data = await res.json();
    await saveTokens(data.access, data.refresh);
    setUser({ id: data.id ?? 0, nombre: data.nombre, rol: data.rol });
  }

  function loginDemo() {
    setUser({ id: 0, nombre: 'Demo', rol: 'jefe' });
  }

  async function logout() {
    await clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
