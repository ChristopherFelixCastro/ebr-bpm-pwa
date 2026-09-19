import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  switchRole: (role: Role) => void;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('ADMINISTRADOR');
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initialize with default admin user or restore from session
    const loadSession = async () => {
      try {
        const users = await apiService.getUsers();
        const savedUserId = localStorage.getItem('ebr_current_user_id');
        let user = users.find((u) => u.id === savedUserId);

        if (!user) {
          // Default to Ivan (Administrador)
          user = users.find((u) => u.role === 'ADMINISTRADOR') || users[0];
        }

        if (user) {
          setCurrentUser(user);
          setCurrentRole(user.role);
          setActiveCompanyId(user.companyId || null);
        }
      } catch (err) {
        console.error('Error loading initial session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const switchRole = async (role: Role) => {
    setIsLoading(true);
    try {
      const users = await apiService.getUsers();
      let matchedUser = users.find((u) => u.role === role && u.status === 'APROBADO');

      if (!matchedUser) {
        // Create an ephemeral approved user for this role if none exists
        matchedUser = {
          id: `sim-user-${role.toLowerCase()}`,
          fullName: `Usuario ${role}`,
          identityNumber: '001-0000000-1',
          email: `${role.toLowerCase()}@example.com`,
          phone: '(809) 000-0000',
          role: role,
          status: 'APROBADO',
          companyId: role !== 'ADMINISTRADOR' && role !== 'COORDINADOR' ? 'comp-1' : undefined,
          companyName: role !== 'ADMINISTRADOR' && role !== 'COORDINADOR' ? 'Lácteos del Cibao, S.R.L.' : undefined,
          createdAt: new Date().toISOString(),
        };
      }

      setCurrentUser(matchedUser);
      setCurrentRole(role);
      setActiveCompanyId(matchedUser.companyId || (role !== 'ADMINISTRADOR' ? 'comp-1' : null));
      localStorage.setItem('ebr_current_user_id', matchedUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const users = await apiService.getUsers();
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        throw new Error('Credenciales inválidas o usuario no registrado.');
      }

      if (user.status === 'PENDIENTE_VALIDACION') {
        throw new Error('Su cuenta está pendiente de validación por un Administrador.');
      }

      if (user.status === 'RECHAZADO') {
        throw new Error(`Su solicitud de registro fue rechazada: ${user.rejectionReason || 'No especificado'}`);
      }

      setCurrentUser(user);
      setCurrentRole(user.role);
      setActiveCompanyId(user.companyId || null);
      localStorage.setItem('ebr_current_user_id', user.id);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ebr_current_user_id');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        login,
        logout,
        isLoading,
        activeCompanyId,
        setActiveCompanyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
