import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'organiser' | 'admin';
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  signup: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage and validate by fetching profile
  useEffect(() => {
    let mounted = true;
    async function validate() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const resp = await authAPI.getProfile();
        const profile = resp.data?.data ?? resp.data;
        if (mounted) {
          setUser(profile);
        }
      } catch (err) {
        // Token invalid or expired; clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    validate();
    return () => {
      mounted = false;
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const signup = (newUser: User, newToken: string) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
