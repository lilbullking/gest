import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TenantInfo {
  id: string;
  name: string;
  tax_id: string;
}

export interface UserInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'hr' | 'employee' | 'auditor';
  tenant: TenantInfo | null;
}

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSimulationMode: boolean;
  login: (token: string, userData: UserInfo) => void;
  logout: () => void;
  enableSimulation: (tenant: 'alfa' | 'beta', role: 'admin' | 'employee' | 'hr') => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Datos simulados de Tenants preconfigurados para evaluación rápida
const SIMULATED_TENANTS = {
  alfa: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Constructora Alfa S.A.",
    tax_id: "76.123.456-K"
  },
  beta: {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Tecnología Beta Ltda.",
    tax_id: "78.987.654-3"
  }
};

const SIMULATED_USERS = {
  alfa: {
    admin: {
      id: "u1111111-1111-1111-1111-111111111111",
      email: "carlos.admin@alfa.cl",
      first_name: "Carlos",
      last_name: "González",
      role: 'admin' as const,
      tenant: SIMULATED_TENANTS.alfa
    },
    employee: {
      id: "u1111111-1111-1111-1111-111111111112",
      email: "juan.perez@alfa.cl",
      first_name: "Juan",
      last_name: "Pérez",
      role: 'employee' as const,
      tenant: SIMULATED_TENANTS.alfa
    },
    hr: {
      id: "u1111111-1111-1111-1111-111111111113",
      email: "maria.hr@alfa.cl",
      first_name: "María",
      last_name: "Rosas",
      role: 'hr' as const,
      tenant: SIMULATED_TENANTS.alfa
    }
  },
  beta: {
    admin: {
      id: "u2222222-2222-2222-2222-222222222221",
      email: "sofia.ceo@beta.com",
      first_name: "Sofía",
      last_name: "Valenzuela",
      role: 'admin' as const,
      tenant: SIMULATED_TENANTS.beta
    },
    employee: {
      id: "u2222222-2222-2222-2222-222222222222",
      email: "diego.dev@beta.com",
      first_name: "Diego",
      last_name: "Mendoza",
      role: 'employee' as const,
      tenant: SIMULATED_TENANTS.beta
    },
    hr: {
      id: "u2222222-2222-2222-2222-222222222223",
      email: "patricia.hr@beta.com",
      first_name: "Patricia",
      last_name: "Soto",
      role: 'hr' as const,
      tenant: SIMULATED_TENANTS.beta
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Dark mode por defecto a petición del usuario

  useEffect(() => {
    // Restaurar sesión de localStorage al cargar
    const savedToken = localStorage.getItem('nubcore_token');
    const savedUser = localStorage.getItem('nubcore_user');
    const savedSim = localStorage.getItem('nubcore_simulation_mode');
    const savedTheme = localStorage.getItem('nubcore_theme') as 'light' | 'dark';

    if (savedTheme) {
      setTheme(savedTheme);
      document.body.className = savedTheme;
    } else {
      setTheme('dark');
      document.body.className = 'dark';
      localStorage.setItem('nubcore_theme', 'dark');
    }


    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsSimulationMode(savedSim === 'true');
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: UserInfo) => {
    const isSim = newToken.startsWith('simulated-');
    setToken(newToken);
    setUser(userData);
    setIsSimulationMode(isSim);
    localStorage.setItem('nubcore_token', newToken);
    localStorage.setItem('nubcore_user', JSON.stringify(userData));
    localStorage.setItem('nubcore_simulation_mode', isSim ? 'true' : 'false');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsSimulationMode(false);
    localStorage.removeItem('nubcore_token');
    localStorage.removeItem('nubcore_user');
    localStorage.removeItem('nubcore_simulation_mode');
  };

  const enableSimulation = (tenantKey: 'alfa' | 'beta', roleKey: 'admin' | 'employee' | 'hr') => {
    const selectedUser = SIMULATED_USERS[tenantKey][roleKey];
    const simulatedToken = `simulated-jwt-token-key-${tenantKey}-${roleKey}`;
    
    setToken(simulatedToken);
    setUser(selectedUser);
    setIsSimulationMode(true);
    
    localStorage.setItem('nubcore_token', simulatedToken);
    localStorage.setItem('nubcore_user', JSON.stringify(selectedUser));
    localStorage.setItem('nubcore_simulation_mode', 'true');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.body.className = newTheme;
    localStorage.setItem('nubcore_theme', newTheme);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated,
      isLoading,
      isSimulationMode,
      login,
      logout,
      enableSimulation,
      toggleTheme,
      theme
    }}>
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
