import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { authAPI, onAuthInvalidated, profileAPI, referenceAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authEntryRoute: 'Welcome' | 'Login';
  needsAcademicInfo: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (args: { idToken?: string; accessToken?: string; schoolId?: number }) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<{ message: string }>;
  verifyOtp: (email: string, otp: string, meta?: { schoolName?: string }) => Promise<void>;
  updateAcademicInfo: (data: { deptId: number | string; matricNo: string; admissionYear: string }) => Promise<void>;
  dismissAcademicPrompt: () => void;
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
  const [academicPromptDismissed, setAcademicPromptDismissed] = useState(false);
  const schoolNameCache = React.useRef<Map<number, string>>(new Map());
  const schoolListLoaded = React.useRef(false);
  const schoolListPromise = React.useRef<Promise<void> | null>(null);

  const ensureSchoolList = useCallback(async () => {
    if (schoolListLoaded.current) return;
    if (schoolListPromise.current) return schoolListPromise.current;
    const promise = (async () => {
      const data = await referenceAPI.getSchools({ page: 1, limit: 100 });
      for (const school of data.schools || []) {
        schoolNameCache.current.set(school.id, school.name);
      }
      schoolListLoaded.current = true;
    })().finally(() => {
      schoolListPromise.current = null;
    });
    schoolListPromise.current = promise;
    return promise;
  }, []);

  const getSchoolNameById = useCallback(async (rawId: User['schoolId']) => {
    if (rawId == null || rawId === '') return undefined;
    const schoolId = Number(rawId);
    if (!Number.isFinite(schoolId)) return undefined;
    const cached = schoolNameCache.current.get(schoolId);
    if (cached) return cached;
    try {
      await ensureSchoolList();
      return schoolNameCache.current.get(schoolId);
    } catch {
      return undefined;
    }
  }, [ensureSchoolList]);

  const hydrateProfile = useCallback(async (existing?: User | null) => {
    try {
      const profile = await authAPI.getCurrentUser();
      let merged: User = { ...(existing || profile), ...profile };
      if (!merged.school && !merged.institutionName && merged.schoolId != null) {
        const schoolName = await getSchoolNameById(merged.schoolId);
        if (schoolName) {
          merged = { ...merged, school: schoolName, institutionName: schoolName };
        }
      }
      setUser(merged);
      await AsyncStorage.setItem('user', JSON.stringify(merged));
    } catch {
      // ignore (offline, token issues handled by interceptor)
    }
  }, [getSchoolNameById]);

  const loadUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('user');

      if (token && savedUser) {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
        hydrateProfile(parsed);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateProfile]);

  useEffect(() => {
    loadUser();
    const unsubscribe = onAuthInvalidated(() => {
      setUser(null);
      setAuthEntryRoute('Login');
      setAcademicPromptDismissed(false);
    });
    return unsubscribe;
  }, [loadUser]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { user: nextUser } = await authAPI.login(credentials);
      setUser(nextUser);
      setAcademicPromptDismissed(false);
      hydrateProfile(nextUser);
    } catch (error) {
      throw error;
    }
  }, [hydrateProfile]);

  const loginWithGoogle = useCallback(async (args: { idToken?: string; accessToken?: string; schoolId?: number }) => {
    try {
      const { user: nextUser } = await authAPI.googleLogin(args);
      setUser(nextUser);
      setAcademicPromptDismissed(false);
      hydrateProfile(nextUser);
    } catch (error) {
      throw error;
    }
  }, [hydrateProfile]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      const res = await authAPI.register(credentials);
      return { message: res.message };
    } catch (error) {
      throw error;
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string, meta?: { schoolName?: string }) => {
    try {
      const { user: rawUser } = await authAPI.verifyRegistrationOtp(email, otp);
      const nextUser =
        meta?.schoolName && !rawUser.school
          ? { ...rawUser, school: meta.schoolName, institutionName: meta.schoolName }
          : rawUser;
      setUser(nextUser);
      setAcademicPromptDismissed(false);
      hydrateProfile(nextUser);
    } catch (error) {
      throw error;
    }
  }, [hydrateProfile]);

  const updateAcademicInfo = useCallback(async (data: { deptId: number | string; matricNo: string; admissionYear: string }) => {
    try {
      const admissionYearValue = (() => {
        const trimmed = (data.admissionYear || '').trim();
        const match = trimmed.match(/^(\d{4})\/\d{4}$/);
        if (match) return match[1];
        return trimmed;
      })();

      await profileAPI.updateAcademicInfo({
        deptId: data.deptId,
        matricNo: data.matricNo,
        admissionYear: admissionYearValue,
      });
      await hydrateProfile(user);
      setAcademicPromptDismissed(false);
    } catch (error) {
      throw error;
    }
  }, [hydrateProfile, user]);

  const dismissAcademicPrompt = useCallback(() => {
    setAcademicPromptDismissed(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setAuthEntryRoute('Login');
      setAcademicPromptDismissed(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const needsAcademicInfo =
    !!user && (user.deptId == null || user.deptId === '') && !academicPromptDismissed;

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      authEntryRoute,
      needsAcademicInfo,
      login,
      loginWithGoogle,
      register,
      verifyOtp,
      updateAcademicInfo,
      dismissAcademicPrompt,
      logout,
      updateUser,
    }),
    [
      user,
      isLoading,
      authEntryRoute,
      needsAcademicInfo,
      login,
      loginWithGoogle,
      register,
      verifyOtp,
      updateAcademicInfo,
      dismissAcademicPrompt,
      logout,
      updateUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
