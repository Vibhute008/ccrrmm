import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded Credentials
const CREDENTIALS = {
  [UserRole.BOSS]: { email: 'boss@raulo.com', pass: 'boss123', name: 'Boss' },
  [UserRole.SALES_MANAGER]: { email: 'salesmanager@raulo.com', pass: 'salesmanager123', name: 'Sales Manager' },
  [UserRole.TELECALLER]: { email: 'telecaller@raulo.com', pass: 'telecaller123', name: 'Telecaller' },
  [UserRole.TECH_LEAD]: { email: 'techlead@raulo.com', pass: 'techlead123', name: 'Tech Lead' },
};

const STORAGE_KEY = 'raulo_crm_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Persist user state
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, pass: string): boolean => {
    const roleKey = Object.keys(CREDENTIALS).find(
      key => CREDENTIALS[key as UserRole].email === email && CREDENTIALS[key as UserRole].pass === pass
    ) as UserRole | undefined;

    if (roleKey) {
      setUser({
        email,
        name: CREDENTIALS[roleKey].name,
        role: roleKey,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};