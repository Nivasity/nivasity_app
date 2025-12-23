import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authEntryRoute: 'Welcome' | 'Login';
  login: (credentials: LoginCredentials) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authEntryRoute, setAuthEntryRoute] = useState<'Welcome' | 'Login'>('Welcome');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    // Demo user data (customize as needed)
    const demoUser: User = {
      id: 'demo',
      email: 'demo@nivasity.com',
      name: 'Demo User',
      avatar: undefined,
    };
    await AsyncStorage.setItem('authToken', 'demo-token');
    await AsyncStorage.setItem('user', JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const response = await authAPI.register(credentials);
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setAuthEntryRoute('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        authEntryRoute,
        login,
        demoLogin,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
