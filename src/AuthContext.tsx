import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { AdminPermissions } from './types/admin';

export type User = {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'active' | 'banned';
  plan_id: string;
  avatar_url?: string;
  plan_features?: {
    cloud_save?: boolean;
    pro_analysis_enabled?: boolean;
    video_caption?: boolean;
  };
};

export type AdminViewMode = 'admin' | 'user';

type AuthContextType = {
  user: User | null;
  token: string | null;
  permissions: AdminPermissions | null;
  adminViewMode: AdminViewMode;
  setAdminViewMode: (mode: AdminViewMode) => void;
  login: (user: User, token: string, permissions?: AdminPermissions | null) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setPermissions: (permissions: AdminPermissions | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_VIEW_MODE_KEY = 'admin_view_mode';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewModeState] = useState<AdminViewMode>(() =>
    (localStorage.getItem(ADMIN_VIEW_MODE_KEY) as AdminViewMode) || 'admin'
  );

  const setAdminViewMode = (mode: AdminViewMode) => {
    setAdminViewModeState(mode);
    localStorage.setItem(ADMIN_VIEW_MODE_KEY, mode);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setPermissions(data.permissions || null);
        } else {
          // Token invalid or expired
          logout();
        }
      } catch (err) {
        console.error('Failed to fetch user', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = useCallback((userData: User, authToken: string, permissionData: AdminPermissions | null = null) => {
    setUser(userData);
    setToken(authToken);
    setPermissions(permissionData);
    localStorage.setItem('token', authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions(null);
    localStorage.removeItem('token');
  }, []);

  const updateUser = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  const value = useMemo(() => ({
    user, token, permissions, adminViewMode, setAdminViewMode, login, logout, updateUser, setPermissions, loading,
  }), [user, token, permissions, adminViewMode, setAdminViewMode, login, logout, updateUser, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
