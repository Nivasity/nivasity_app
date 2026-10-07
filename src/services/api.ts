import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  Product,
  Order,
  DashboardStats,
  CartItem,
  CartPricing,
  AppNotification,
  WalletAccount,
  WalletSummary,
  WalletTransaction,
} from '../types';

type ApiStatus = 'success' | 'error';
type ApiResponse<T> = {
  status: ApiStatus;
  message: string;
  data?: T;
};

type LoginSuccessData = {
  id: number | string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  gender?: 'male' | 'female';
  status?: string;
  profile_pic?: string | null;
  school_id?: number | string | null;
  matric_no?: string | null;
  dept?: number | string | null;
  dept_name?: string | null;
  adm_year?: string | null;
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

type RegisterSuccessData = {
  user_id: number | string;
  email: string;
  expires_in?: number;
};

type RefreshSuccessData = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

type VerifyOtpUserData = {
  id: number | string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
  gender?: 'male' | 'female';
  profile_pic?: string | null;
  school_id?: number | string | null;
  dept_id?: number | string | null;
  dept_name?: string | null;
  matric_no?: string | null;
  adm_year?: string | null;
  status?: string;
};

type VerifyOtpSuccessData = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  user: VerifyOtpUserData;
};

type VerifyOtpPasswordResetSuccessData = {
  reset_token: string;
};

type ForgotPasswordSuccessData = {
  email: string;
  expires_in: number;
};

type GoogleLoginSuccessData = {
  access_token: string;
  refresh_token?: string;
  user?: any;
} & Record<string, any>;

type ReferenceSchool = {
  id: number;
  name: string;
  code?: string;
  created_at?: string;
};

type ReferenceFaculty = {
  id: number;
  name: string;
  school_id: number;
  created_at?: string;
};

type ReferenceDepartment = {
  id: number;
  name: string;
  school_id: number;
  faculty_id?: number;
  faculty_name?: string;
  created_at?: string;
};

type ReferencePagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type ReferenceListResponse<T> = {
  pagination: ReferencePagination;
} & T;

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

// Base API URL (docs: https://api.nivasity.com)
const DEFAULT_BASE_URL = 'https://api.nivasity.com';
const RESOLVED_BASE_URL = normalizeBaseUrl(
  ((process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) || DEFAULT_BASE_URL).trim()
);
export const API_BASE_URL = RESOLVED_BASE_URL;

const DEFAULT_ASSETS_BASE_URL = 'https://assets.nivasity.com';
const RESOLVED_ASSETS_BASE_URL = normalizeBaseUrl(
  ((process.env.EXPO_PUBLIC_ASSETS_BASE_URL as string | undefined) || DEFAULT_ASSETS_BASE_URL).trim()
);
export const ASSETS_BASE_URL = RESOLVED_ASSETS_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: RESOLVED_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/** Stock "no photo" images (users/user.jpg): a black silhouette that vanishes in dark mode. */
export const isDefaultAvatar = (src?: string | null) => {
  const v = (src || '').trim().toLowerCase().split('?')[0];
  return !v || /(^|\/)(user|default|avatar|profile)\.(jpe?g|png|webp|svg)$/.test(v);
};

const toUserProfilePicUrl = (profilePic?: string | null) => {
  const value = (profilePic || '').trim();
  if (!value || isDefaultAvatar(value)) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${RESOLVED_ASSETS_BASE_URL}/users/${value.replace(/^\/+/, '')}`;
};

const AUTH_TOKEN_KEY = 'authToken'; // access_token
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

const clearSession = async () => {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
};

const setSession = async (args: { user: User; accessToken: string; refreshToken?: string }) => {
  const ops: [string, string][] = [
    [AUTH_TOKEN_KEY, args.accessToken],
    [USER_KEY, JSON.stringify(args.user)],
  ];
  if (args.refreshToken) ops.push([REFRESH_TOKEN_KEY, args.refreshToken]);
  await AsyncStorage.multiSet(ops);
};

const mapLoginUser = (data: LoginSuccessData): User => {
  const firstName = (data.first_name || '').trim();
  const lastName = (data.last_name || '').trim();
  const name = `${firstName} ${lastName}`.trim() || (data.email || '').trim();
  return {
    id: String(data.id),
    email: (data.email || '').trim(),
    name,
    firstName,
    lastName,
    phone: data.phone,
    admissionYear: data.adm_year ?? undefined,
    matricNumber: data.matric_no ?? undefined,
    deptId: data.dept ?? undefined,
    department: data.dept_name ?? undefined,
    avatar: toUserProfilePicUrl(data.profile_pic),
    schoolId: data.school_id ?? undefined,
    role: data.role ?? undefined,
  };
};

const mapVerifyOtpUser = (data: VerifyOtpUserData): User => {
  const firstName = (data.first_name || '').trim();
  const lastName = (data.last_name || '').trim();
  return {
    id: String(data.id),
    email: (data.email || '').trim(),
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    phone: data.phone,
    avatar: toUserProfilePicUrl(data.profile_pic),
    schoolId: data.school_id ?? undefined,
    deptId: data.dept_id ?? undefined,
    department: data.dept_name ?? undefined,
    admissionYear: data.adm_year ?? undefined,
    matricNumber: data.matric_no ?? undefined,
  };
};

type AuthInvalidatedListener = () => void;
const authInvalidatedListeners = new Set<AuthInvalidatedListener>();
export const onAuthInvalidated = (listener: AuthInvalidatedListener) => {
  authInvalidatedListeners.add(listener);
  return () => {
    authInvalidatedListeners.delete(listener);
  };
};
const notifyAuthInvalidated = () => {
  authInvalidatedListeners.forEach((listener) => listener());
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    if ((config as any).skipAuth) return config;
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config as any;

      if (!originalRequest || originalRequest._retry) {
        await clearSession();
        notifyAuthInvalidated();
        return Promise.reject(error);
      }

      if (originalRequest.skipAuth || String(originalRequest.url || '').includes('/auth/refresh-token.php')) {
        return Promise.reject(error);
      }

      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await clearSession();
        notifyAuthInvalidated();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const res = await api.post<ApiResponse<RefreshSuccessData>>(
              '/auth/refresh-token.php',
              { refresh_token: refreshToken },
              { skipAuth: true } as any
            );
            if (res.data.status !== 'success' || !res.data.data?.access_token) {
              throw new Error(res.data.message || 'Token refresh failed');
            }
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, res.data.data.access_token);
            if (res.data.data.refresh_token) {
              await AsyncStorage.setItem(REFRESH_TOKEN_KEY, res.data.data.refresh_token);
            }
            return res.data.data.access_token;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await clearSession();
        notifyAuthInvalidated();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Show the API's own message instead of axios's generic "Request failed with status code ...".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const serverMessage = data && typeof data === 'object' ? (data as any).message || (data as any).msg : undefined;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      error.message = serverMessage.trim();
    } else if (!error?.response) {
      error.message = 'Could not reach the server. Check your connection and try again.';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
    const response = await api.post<ApiResponse<LoginSuccessData>>('/auth/login.php', credentials, {
      skipAuth: true,
    } as any);
    if (response.data.status !== 'success' || !response.data.data?.access_token) {
      throw new Error(response.data.message || 'Login failed');
    }

    const user = mapLoginUser(response.data.data);
    const accessToken = response.data.data.access_token;
    const refreshToken = response.data.data.refresh_token;
    await setSession({ user, accessToken, refreshToken });
    return { user, accessToken, refreshToken };
  },

  googleLogin: async (args: {
    idToken?: string;
    accessToken?: string;
    schoolId?: number;
  }): Promise<{ user: User; accessToken: string; refreshToken?: string }> => {
    if (!args.idToken && !args.accessToken) {
      throw new Error('Google login failed: missing token');
    }

    const redactToken = (value: unknown) => {
      const token = typeof value === 'string' ? value : '';
      if (!token) return undefined;
      const trimmed = token.trim();
      if (trimmed.length <= 10) return `${trimmed.slice(0, 3)}…(${trimmed.length})`;
      return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}(${trimmed.length})`;
    };

    const send = async (path: string, payload: any) => {
      if (__DEV__) {
        console.log(
          '[GoogleLogin] request:',
          JSON.stringify(
            {
              path,
              payload: {
                ...payload,
                id_token: redactToken(payload?.id_token),
                access_token: redactToken(payload?.access_token),
              },
            },
            null,
            2
          )
        );
      }
      const response = await api.post<ApiResponse<GoogleLoginSuccessData>>(path, payload, { skipAuth: true } as any);
      if (response.data.status !== 'success' || !response.data.data?.access_token) {
        if (__DEV__) {
          console.log(
            '[GoogleLogin] response (error):',
            JSON.stringify(
              {
                path,
                status: response.data.status,
                message: response.data.message,
                data: response.data.data,
              },
              null,
              2
            )
          );
        }
        const err: any = new Error(response.data.message || 'Google login failed');
        err.isGoogleLoginBusinessError = true;
        err.responseData = response.data;
        throw err;
      }
      if (__DEV__) {
        console.log(
          '[GoogleLogin] response (success):',
          JSON.stringify(
            {
              path,
              status: response.data.status,
              message: response.data.message,
              data: response.data.data
                ? {
                  ...response.data.data,
                  access_token: redactToken((response.data.data as any).access_token),
                  refresh_token: redactToken((response.data.data as any).refresh_token),
                }
                : response.data.data,
            },
            null,
            2
          )
        );
      }
      return response.data.data;
    };

    const sendToKnownPaths = async (payload: any) => {
      // Prefer known-existing endpoint first to avoid 404 noise in production logs.
      const paths = ['/auth/google-auth.php'];
      let lastError: any;
      for (const path of paths) {
        try {
          return await send(path, payload);
        } catch (e: any) {
          if (__DEV__) {
            console.log(
              '[GoogleLogin] request failed:',
              JSON.stringify(
                {
                  path,
                  message: e?.response?.data?.message || e?.message,
                  status: e?.response?.status,
                  data: e?.response?.data ?? e?.responseData,
                },
                null,
                2
              )
            );
          }
          if (e?.isGoogleLoginBusinessError) throw e;
          lastError = e;
        }
      }
      throw lastError || new Error('Google login failed');
    };

    const fullPayload: any = {};
    if (args.idToken) fullPayload.id_token = args.idToken;
    if (args.accessToken) fullPayload.access_token = args.accessToken;
    if (args.schoolId != null) fullPayload.school_id = args.schoolId;

    let data: GoogleLoginSuccessData;
    try {
      data = await sendToKnownPaths(fullPayload);
    } catch (e: any) {
      const msg = String(e?.response?.data?.message || e?.message || '');
      if (args.accessToken && /google id token is not valid/i.test(msg)) {
        data = await sendToKnownPaths({ access_token: args.accessToken });
      } else {
        throw e;
      }
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    const rawUser = (data as any).user ?? data;
    const firstName = String(rawUser.first_name ?? rawUser.firstName ?? '').trim();
    const lastName = String(rawUser.last_name ?? rawUser.lastName ?? '').trim();
    const name = `${firstName} ${lastName}`.trim() || String(rawUser.name ?? rawUser.email ?? '').trim();

    const user: User = {
      id: String(rawUser.id ?? rawUser.user_id ?? ''),
      email: String(rawUser.email ?? '').trim(),
      name,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: rawUser.phone ?? undefined,
      avatar: toUserProfilePicUrl(rawUser.profile_pic ?? rawUser.profilePic ?? rawUser.avatar ?? null),
      schoolId: rawUser.school_id ?? rawUser.schoolId ?? rawUser.school ?? undefined,
      deptId: rawUser.dept_id ?? rawUser.deptId ?? rawUser.dept ?? undefined,
      department: rawUser.dept_name ?? rawUser.department ?? undefined,
      admissionYear: rawUser.adm_year ?? rawUser.admissionYear ?? undefined,
      matricNumber: rawUser.matric_no ?? rawUser.matricNumber ?? undefined,
    };

    await setSession({ user, accessToken, refreshToken });
    return { user, accessToken, refreshToken };
  },

  register: async (credentials: RegisterCredentials): Promise<{ message: string; data?: RegisterSuccessData }> => {
    const payload: Record<string, any> = {
      email: credentials.email,
      password: credentials.password,
      first_name: credentials.first_name,
      last_name: credentials.last_name,
      gender: credentials.gender,
      school_id: credentials.school_id,
    };
    const phone = String(credentials.phone ?? '').trim();
    if (phone) payload.phone = phone;
    const response = await api.post<ApiResponse<RegisterSuccessData>>('/auth/register.php', payload, {
      skipAuth: true,
    } as any);
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Registration failed');
    }
    return { message: response.data.message, data: response.data.data };
  },

  verifyRegistrationOtp: async (
    email: string,
    otp: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
    const response = await api.post<ApiResponse<VerifyOtpSuccessData>>(
      '/auth/verify-otp.php',
      { email, otp },
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success' || !response.data.data?.access_token || !response.data.data.user) {
      throw new Error(response.data.message || 'OTP verification failed');
    }
    const accessToken = response.data.data.access_token;
    const refreshToken = response.data.data.refresh_token;
    const user = mapVerifyOtpUser(response.data.data.user);
    await setSession({ user, accessToken, refreshToken });
    return { user, accessToken, refreshToken };
  },

  verifyPasswordResetOtp: async (email: string, otp: string): Promise<{ resetToken: string }> => {
    const response = await api.post<ApiResponse<VerifyOtpPasswordResetSuccessData>>(
      '/auth/verify-otp.php',
      { email, otp, reason: 'password_reset' },
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success' || !response.data.data?.reset_token) {
      throw new Error(response.data.message || 'OTP verification failed');
    }
    return { resetToken: response.data.data.reset_token };
  },

  forgotPassword: async (email: string): Promise<{ message: string; expiresIn?: number }> => {
    const response = await api.post<ApiResponse<ForgotPasswordSuccessData>>(
      '/auth/forgot-password.php',
      { email },
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to request password reset');
    }
    return { message: response.data.message, expiresIn: response.data.data?.expires_in };
  },

  resetPassword: async (args: { token: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.post<ApiResponse<unknown>>(
      '/auth/reset-password.php',
      { token: args.token, new_password: args.newPassword },
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to reset password');
    }
    return { message: response.data.message };
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<ApiResponse<unknown>>(
      '/auth/resend-verification.php',
      { email },
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to resend verification');
    }
    return { message: response.data.message };
  },

  resendRegistrationOtp: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<ApiResponse<unknown>>('/auth/resend-otp.php', { email }, { skipAuth: true } as any);
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to resend OTP');
    }
    return { message: response.data.message };
  },

  logout: async (): Promise<void> => {
    try {
      await api.post<ApiResponse<unknown>>('/auth/logout.php', undefined);
    } finally {
      await clearSession();
      notifyAuthInvalidated();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<any>>('/profile/profile.php');
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load profile');
    }
    const data = response.data.data as any;
    const firstName = (data.first_name || '').trim();
    const lastName = (data.last_name || '').trim();

    const rawSchoolName = data.school_name ?? data.schoolName ?? data.school;
    const schoolName =
      typeof rawSchoolName === 'string' && Number.isNaN(Number(rawSchoolName.trim())) ? rawSchoolName.trim() : undefined;

    const rawSchoolId = data.school_id ?? data.schoolId ?? data.school;
    const schoolIdCandidate = rawSchoolId != null ? Number(rawSchoolId) : NaN;

    const rawDeptId = data.dept_id ?? data.deptId ?? data.dept;
    const deptIdCandidate = rawDeptId != null ? Number(rawDeptId) : NaN;

    return {
      id: String(data.id),
      email: (data.email || '').trim(),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone: data.phone,
      avatar: toUserProfilePicUrl(data.profile_pic),
      schoolId: Number.isFinite(schoolIdCandidate) ? schoolIdCandidate : undefined,
      school: schoolName,
      admissionYear: data.adm_year ?? undefined,
      deptId: Number.isFinite(deptIdCandidate) ? deptIdCandidate : undefined,
      department: data.dept_name ?? undefined,
      matricNumber: data.matric_no ?? undefined,
      role: data.role ?? undefined,
    };
  },

  /** Switch between Student and Class rep (HOC); the API returns fresh tokens for the new role. */
  switchRole: async (role: 'student' | 'hoc'): Promise<{ user: User; message: string }> => {
    const response = await api.post<ApiResponse<LoginSuccessData>>('/profile/switch-role.php', { role });
    if (response.data.status !== 'success' || !response.data.data?.access_token) {
      throw new Error(response.data.message || 'Could not change your role');
    }
    const user = mapLoginUser(response.data.data);
    await setSession({ user, accessToken: response.data.data.access_token, refreshToken: response.data.data.refresh_token });
    return { user, message: response.data.message };
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const response = await api.post<ApiResponse<unknown>>('/profile/change-password.php', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to change password');
    }
    return { message: response.data.message };
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await api.post<ApiResponse<unknown>>('/profile/delete-account.php', { password });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to delete account');
    }
    return { message: response.data.message };
  },
};

// User Profile APIs
export const profileAPI = {
  getProfile: async (): Promise<User> => {
    return authAPI.getCurrentUser();
  },

  requestEmailChangeOtp: async (newEmail: string): Promise<{ message: string; newEmail: string; expiresIn?: number }> => {
    const response = await api.post<ApiResponse<any>>('/profile/request-email-change.php', {
      new_email: newEmail,
    });

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to send email change OTP');
    }

    return {
      message: response.data.message,
      newEmail: String(response.data.data.new_email || newEmail).trim().toLowerCase(),
      expiresIn:
        typeof response.data.data.expires_in === 'number'
          ? response.data.data.expires_in
          : Number.isFinite(Number(response.data.data.expires_in))
            ? Number(response.data.data.expires_in)
            : undefined,
    };
  },

  verifyEmailChangeOtp: async (args: { newEmail: string; otp: string }): Promise<{ message: string; oldEmail?: string; email: string }> => {
    const response = await api.post<ApiResponse<any>>('/profile/verify-email-change.php', {
      new_email: args.newEmail,
      otp: args.otp,
    });

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to verify email change OTP');
    }

    return {
      message: response.data.message,
      oldEmail: String(response.data.data.old_email || '').trim() || undefined,
      email: String(response.data.data.email || args.newEmail).trim().toLowerCase(),
    };
  },

  updateProfilePhoto: async (args: {
    file: { uri: string; name: string; type: string };
    fallback?: User;
  }): Promise<User> => {
    const formData = new FormData();
    formData.append(
      'profile_pic',
      {
        uri: args.file.uri,
        name: args.file.name,
        type: args.file.type,
      } as any
    );

    const response = await api.post<ApiResponse<any>>('/profile/update-profile.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update profile photo');
    }

    const next = response.data.data as any;
    const firstName = (next.first_name || '').trim();
    const lastName = (next.last_name || '').trim();
    const baseAvatar = toUserProfilePicUrl(next.profile_pic);
    const avatar = baseAvatar ? `${baseAvatar}${baseAvatar.includes('?') ? '&' : '?'}v=${Date.now()}` : undefined;

    const fallback = args.fallback;
    return {
      ...fallback,
      id: String(next.id ?? fallback?.id ?? ''),
      email: (next.email || fallback?.email || '').trim(),
      name: `${firstName || fallback?.firstName || ''} ${lastName || fallback?.lastName || ''}`.trim() || fallback?.name || '',
      firstName: firstName || fallback?.firstName || '',
      lastName: lastName || fallback?.lastName || '',
      phone: next.phone ?? fallback?.phone,
      avatar,
      schoolId: next.school_id ?? fallback?.schoolId,
      deptId: next.dept_id ?? fallback?.deptId,
      admissionYear: next.adm_year ?? fallback?.admissionYear,
      matricNumber: next.matric_no ?? fallback?.matricNumber,
    };
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const formData = new FormData();

    if (data.firstName != null) formData.append('firstname', String(data.firstName));
    if (data.lastName != null) formData.append('lastname', String(data.lastName));
    if (data.phone != null) formData.append('phone', String(data.phone));

    const response = await api.post<ApiResponse<any>>('/profile/update-profile.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update profile');
    }

    const next = response.data.data as any;
    const firstName = (next.first_name || '').trim();
    const lastName = (next.last_name || '').trim();
    return {
      id: String(next.id),
      email: (next.email || '').trim(),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone: next.phone,
      avatar: toUserProfilePicUrl(next.profile_pic),
      schoolId: next.school_id ?? data.schoolId,
      deptId: next.dept_id ?? data.deptId,
      admissionYear: next.adm_year ?? data.admissionYear,
      matricNumber: next.matric_no ?? data.matricNumber,
      department: data.department,
      school: data.school,
      institutionName: data.institutionName,
    };
  },

  updateAcademicInfo: async (data: {
    deptId?: number | string | null;
    matricNo?: string | null;
    admissionYear?: string | null;
  }): Promise<{ message: string; data?: { deptId?: number | string | null; matricNo?: string | null; admissionYear?: string | null } }> => {
    const payload: any = {};
    if (data.deptId != null) payload.dept_id = data.deptId;
    if (data.matricNo != null) payload.matric_no = data.matricNo;
    if (data.admissionYear != null) payload.adm_year = data.admissionYear;

    const response = await api.post<ApiResponse<any>>('/profile/update-academic-info.php', payload);
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to update academic information');
    }
    const next = response.data.data as any | undefined;
    return {
      message: response.data.message,
      data: next
        ? {
          deptId: next.dept_id ?? undefined,
          matricNo: next.matric_no ?? undefined,
          admissionYear: next.adm_year ?? undefined,
        }
        : undefined,
    };
  },
};

const REFERENCE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const referenceCache = new Map<string, { value: any; fetchedAt: number }>();
const referenceInflight = new Map<string, Promise<any>>();

const cachedReference = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const cached = referenceCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < REFERENCE_CACHE_TTL_MS) {
    return cached.value as T;
  }

  const inflight = referenceInflight.get(key);
  if (inflight) return inflight as Promise<T>;

  const promise = (async () => {
    const value = await fetcher();
    referenceCache.set(key, { value, fetchedAt: Date.now() });
    return value;
  })();

  referenceInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    referenceInflight.delete(key);
  }
};

export const referenceAPI = {
  getSchools: async (args?: { page?: number; limit?: number }): Promise<ReferenceListResponse<{ schools: ReferenceSchool[] }>> => {
    const page = args?.page ?? 1;
    const limit = args?.limit ?? 50;
    return cachedReference(`reference.schools?page=${page}&limit=${limit}`, async () => {
      const response = await api.get<ApiResponse<ReferenceListResponse<{ schools: ReferenceSchool[] }>>>(
        `/reference/schools.php?page=${page}&limit=${limit}`,
        { skipAuth: true } as any
      );
      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to load schools');
      }
      return response.data.data;
    });
  },

  getFaculties: async (args: { schoolId: number; page?: number; limit?: number }): Promise<ReferenceListResponse<{ faculties: ReferenceFaculty[] }>> => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 50;
    return cachedReference(`reference.faculties?school_id=${args.schoolId}&page=${page}&limit=${limit}`, async () => {
      const response = await api.get<ApiResponse<ReferenceListResponse<{ faculties: ReferenceFaculty[] }>>>(
        `/reference/faculties.php?school_id=${args.schoolId}&page=${page}&limit=${limit}`,
        { skipAuth: true } as any
      );
      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to load faculties');
      }
      return response.data.data;
    });
  },

  getDepartments: async (args: {
    schoolId: number;
    facultyId?: number;
    page?: number;
    limit?: number;
  }): Promise<ReferenceListResponse<{ departments: ReferenceDepartment[] }>> => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 100;
    const facultyFilter = args.facultyId ? `&faculty_id=${args.facultyId}` : '';
    return cachedReference(
      `reference.departments?school_id=${args.schoolId}${facultyFilter}&page=${page}&limit=${limit}`,
      async () => {
        const response = await api.get<ApiResponse<ReferenceListResponse<{ departments: ReferenceDepartment[] }>>>(
          `/reference/departments.php?school_id=${args.schoolId}${facultyFilter}&page=${page}&limit=${limit}`,
          { skipAuth: true } as any
        );
        if (response.data.status !== 'success' || !response.data.data) {
          throw new Error(response.data.message || 'Failed to load departments');
        }
        return response.data.data;
      }
    );
  },

  getSupportDetails: async (): Promise<{ whatsapp?: string; email?: string }> => {
    const tryGet = async (path: string) => {
      const response = await api.get<ApiResponse<any>>(path, { skipAuth: true } as any);
      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to load support details');
      }
      return response.data.data as any;
    };

    return cachedReference('reference.supportDetails', async () => {
      const candidates = ['/reference/support.php'];
      let lastError: any;
      for (const path of candidates) {
        try {
          const data = await tryGet(path);
          const contact =
            data?.contact && typeof data.contact === 'object' && !Array.isArray(data.contact) ? data.contact : undefined;

          const whatsapp =
            String(
              contact?.whatsapp ??
              contact?.phone ??
              data?.whatsapp ??
              data?.whats_app ??
              data?.whatsapp_phone ??
              ''
            ).trim() || undefined;

          const email = String(contact?.email ?? data?.email ?? data?.support_email ?? '').trim() || undefined;
          const value = { whatsapp, email };
          return value;
        } catch (e: any) {
          lastError = e;
        }
      }
      throw lastError || new Error('Failed to load support details');
    });
  },
};

type MaterialListItem = {
  id: number;
  code?: string;
  title: string;
  course_code?: string;
  price: number;
  level?: string | number | null;
  host_level?: string | number | null;
  quantity?: number;
  due_date?: string;
  dept_name?: string;
  faculty_name?: string;
  host_faculty_name?: string;
  seller_name?: string;
  is_purchased?: boolean;
  created_at?: string;
};

type CartViewItem = {
  id: number;
  title: string;
  course_code?: string;
  price: number;
  status?: string;
  dept_name?: string;
  seller_name?: string;
};

type CartWalletView = {
  has_wallet?: boolean;
  balance?: number;
  wallet_charge?: number;
  wallet_total_amount?: number;
  can_pay_with_wallet?: boolean;
};

const mapMaterialToProduct = (item: MaterialListItem): Product => ({
  id: String(item.id),
  name: item.title,
  description: `${item.course_code || ''}${item.dept_name ? ` • #${item.code}` : ''}`.trim(),
  price: item.price,
  courseCode: item.course_code || undefined,
  materialCode: item.code || undefined,
  available: item.quantity ? item.quantity > 0 : true,
  createdAt: item.created_at,
  department: item.dept_name,
  faculty: item.host_faculty_name || item.faculty_name,
  hostFacultyName: item.host_faculty_name || item.faculty_name,
  level: String((item as any).level ?? (item as any).host_level ?? '').trim() || undefined,
  deadlineAt: item.due_date,
});

const mapCartViewItemToCartItem = (item: CartViewItem): CartItem => ({
  id: String(item.id),
  name: item.title,
  description: `${item.course_code || ''}${item.dept_name ? ` • ${item.dept_name}` : ''}`.trim(),
  price: item.price,
  courseCode: item.course_code || undefined,
  available: true,
  department: item.dept_name,
  quantity: 1,
});

const mapWalletAccount = (wallet: any): WalletAccount => ({
  id: Number(wallet?.id ?? 0),
  userId: Number(wallet?.user_id ?? 0),
  schoolId: Number(wallet?.school_id ?? 0),
  status: String(wallet?.status ?? '').trim() || 'inactive',
  balance: Number(wallet?.balance ?? 0),
  currency: String(wallet?.currency ?? 'NGN').trim() || 'NGN',
  provider: String(wallet?.provider ?? '').trim() || undefined,
  providerAccountId: String(wallet?.provider_account_id ?? '').trim() || undefined,
  accountName: String(wallet?.account_name ?? '').trim() || undefined,
  accountNumber: String(wallet?.account_number ?? '').trim() || undefined,
  bankName: String(wallet?.bank_name ?? '').trim() || undefined,
  bankSlug: String(wallet?.bank_slug ?? '').trim() || undefined,
  accountStatus: String(wallet?.account_status ?? '').trim() || undefined,
});

const mapWalletSummary = (data: any): WalletSummary => ({
  hasWallet: Boolean(data?.has_wallet),
  hasPin: Boolean(data?.has_pin),
  wallet: data?.wallet ? mapWalletAccount(data.wallet) : undefined,
});

const mapWalletTransaction = (item: any): WalletTransaction => ({
  id: String(item?.id ?? ''),
  entryType: String(item?.entry_type ?? '').trim() || 'neutral',
  direction:
    item?.direction === 'credit' || item?.direction === 'debit'
      ? item.direction
      : 'neutral',
  amount: Number(item?.amount ?? 0),
  signedAmount: Number(item?.signed_amount ?? 0),
  status: String(item?.status ?? '').trim() || 'posted',
  reference: String(item?.reference ?? '').trim(),
  providerReference: String(item?.provider_reference ?? '').trim() || undefined,
  displayReference: String(item?.display_reference ?? '').trim() || undefined,
  description: String(item?.description ?? '').trim() || 'Wallet transaction',
  balanceBefore:
    typeof item?.balance_before === 'number'
      ? item.balance_before
      : Number.isFinite(Number(item?.balance_before))
        ? Number(item.balance_before)
        : undefined,
  balanceAfter:
    typeof item?.balance_after === 'number'
      ? item.balance_after
      : Number.isFinite(Number(item?.balance_after))
        ? Number(item.balance_after)
        : undefined,
  createdAt: String(item?.created_at ?? '').trim(),
  displayDate: String(item?.display_date ?? '').trim() || undefined,
});

type MaterialsPagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

// Product/Store APIs (Materials)
export const storeAPI = {
  getMaterials: async (args?: {
    search?: string;
    sort?: 'recommended' | 'low-high' | 'high-low';
    level?: string;
    page?: number;
    limit?: number;
  }): Promise<{ materials: Product[]; pagination: MaterialsPagination }> => {
    const params = new URLSearchParams();
    if (args?.search) params.set('search', args.search);
    if (args?.sort) params.set('sort', args.sort);
    if (args?.level) params.set('level', args.level);
    if (args?.page) params.set('page', String(args.page));
    if (args?.limit) params.set('limit', String(args.limit));

    const suffix = params.toString();
    const response = await api.get<ApiResponse<{ materials: MaterialListItem[] } & { pagination: MaterialsPagination }>>(
      `/materials/list.php${suffix ? `?${suffix}` : ''}`
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load materials');
    }

    // Hide materials already purchased by the current user.
    const availableMaterials = (response.data.data.materials || []).filter((item) => !item.is_purchased);
    return {
      materials: availableMaterials.map(mapMaterialToProduct),
      pagination: response.data.data.pagination,
    };
  },

  getProducts: async (args?: {
    search?: string;
    sort?: 'recommended' | 'low-high' | 'high-low';
    level?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[]> => {
    const result = await storeAPI.getMaterials(args);
    return result.materials;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get<ApiResponse<MaterialListItem>>(`/materials/details.php?id=${encodeURIComponent(id)}`);
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load material');
    }
    return mapMaterialToProduct(response.data.data);
  },
};

export const cartAPI = {
  add: async (materialId: string | number) => {
    const response = await api.post<ApiResponse<{ total_items: number; cart_items: number[] }>>(
      '/materials/cart-add.php',
      { material_id: Number(materialId) }
    );
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to add to cart');
    }
    return response.data.data;
  },
  remove: async (materialId: string | number) => {
    const response = await api.post<ApiResponse<{ total_items: number; cart_items: number[] }>>(
      '/materials/cart-remove.php',
      { material_id: Number(materialId) }
    );
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to remove from cart');
    }
    return response.data.data;
  },
  view: async (): Promise<CartPricing> => {
    const response = await api.get<
      ApiResponse<{
        items: CartViewItem[];
        subtotal?: number;
        charge?: number;
        total_amount: number;
        total_items: number;
        wallet?: CartWalletView;
      }>
    >(
      '/materials/cart-view.php'
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load cart');
    }
    const items = (response.data.data.items || []).map(mapCartViewItemToCartItem);
    const subtotal =
      typeof response.data.data.subtotal === 'number'
        ? response.data.data.subtotal
        : items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount =
      typeof response.data.data.total_amount === 'number' ? response.data.data.total_amount : subtotal;
    const charge =
      typeof response.data.data.charge === 'number'
        ? response.data.data.charge
        : Math.max(0, totalAmount - subtotal);

    const wallet = response.data.data.wallet
      ? {
        hasWallet: Boolean(response.data.data.wallet.has_wallet),
        balance: Number(response.data.data.wallet.balance ?? 0),
        walletCharge: Number(response.data.data.wallet.wallet_charge ?? 0),
        walletTotalAmount: Number(response.data.data.wallet.wallet_total_amount ?? subtotal),
        canPayWithWallet: Boolean(response.data.data.wallet.can_pay_with_wallet),
      }
      : undefined;

    return {
      items,
      subtotal,
      charge,
      totalAmount,
      totalItems: response.data.data.total_items,
      wallet,
    };
  },
};

// Order APIs (Transactions)
type TransactionItem = {
  type?: string;
  id: number;
  title: string;
  course_code?: string;
  price: number;
};
type Transaction = {
  id: number;
  ref_id: string;
  amount: number;
  status: string;
  medium?: string;
  payment_channel?: string;
  transaction_context?: string;
  items: TransactionItem[];
  created_at: string;
  payer_name_with_matric?: string;
  payer_name?: string;
  payer_matric_no?: string;
  matric_no?: string;
};

const mapTransactionToOrder = (tx: Transaction): Order => ({
  id: tx.ref_id || String(tx.id),
  userId: '',
  payerNameWithMatric:
    tx.payer_name_with_matric ||
    [tx.payer_name, tx.payer_matric_no || tx.matric_no].filter(Boolean).join(' ').trim() ||
    undefined,
  items: (tx.items || []).map((it) => ({
    id: String(it.id),
    name: it.title,
    courseCode: it.course_code || undefined,
    description: it.course_code || '',
    price: it.price,
    category: it.course_code || '',
    quantity: 1,
  })),
  total: tx.amount,
  status:
    tx.status === 'successful' || tx.status === 'success'
      ? 'completed'
      : tx.status === 'pending'
        ? 'processing'
        : tx.status === 'failed'
          ? 'failed'
          : 'processing',
  createdAt: tx.created_at,
  medium: tx.medium ? String(tx.medium).trim() : undefined,
  paymentChannel:
    tx.payment_channel === 'wallet'
      ? 'wallet'
      : tx.payment_channel === 'gateway'
        ? 'gateway'
        : undefined,
  transactionContext: tx.transaction_context ? String(tx.transaction_context).trim() : undefined,
});

export const orderAPI = {
  getOrders: async (args?: { page?: number; limit?: number }): Promise<Order[]> => {
    const page = args?.page ?? 1;
    const limit = args?.limit ?? 20;
    const response = await api.get<
      ApiResponse<{ transactions: Transaction[]; pagination?: ReferencePagination }>
    >(`/payment/transactions.php?page=${page}&limit=${limit}`);

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load transactions');
    }
    const list = (response.data.data.transactions || []).slice().sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
      return bt - at;
    });
    return list.map(mapTransactionToOrder);
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getStudentStats: async (): Promise<DashboardStats> => {
    const response = await api.get<
      ApiResponse<{ total_materials: number; total_spent: number; pending_orders: number }>
    >('/profile/stats.php');

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load profile stats');
    }

    return {
      totalOrders: response.data.data.total_materials ?? 0,
      totalSpent: response.data.data.total_spent ?? 0,
      pendingOrders: response.data.data.pending_orders ?? 0,
    };
  },
};

type SupportTicketStatus = 'open' | 'closed' | 'in_progress' | string;

export type SupportTicketListItem = {
  id: number;
  code: string;
  subject: string;
  category?: string;
  status: SupportTicketStatus;
  message_count?: number;
  latest_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SupportTicketMessage = {
  id: number;
  user_id: number | null;
  user_name?: string;
  user_role?: string;
  message: string;
  attachment?:
  | string
  | {
    path: string;
    original_name?: string;
  }
  | null;
  created_at: string;
};

export type SupportTicketDetails = {
  id: number;
  code: string;
  subject: string;
  category?: string;
  status: SupportTicketStatus;
  messages: SupportTicketMessage[];
  created_at?: string;
  updated_at?: string;
};

type SupportPagination = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

type SupportListResponse<T> = {
  pagination: SupportPagination;
} & T;

export const supportAPI = {
  createTicket: async (args: {
    subject: string;
    message: string;
    category?: string;
    attachment?: { uri: string; name: string; type: string } | null;
  }): Promise<SupportTicketListItem> => {
    const formData = new FormData();
    formData.append('subject', args.subject);
    formData.append('message', args.message);
    if (args.category) formData.append('category', args.category);
    if (args.attachment) {
      formData.append(
        'attachment',
        { uri: args.attachment.uri, name: args.attachment.name, type: args.attachment.type } as any
      );
    }

    const response = await api.post<ApiResponse<any>>('/support/create-ticket.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create support ticket');
    }

    const data = response.data.data as any;
    return {
      id: Number(data.ticket_id ?? data.id),
      code: String(data.ticket_code ?? data.code ?? ''),
      subject: String(data.subject ?? '').trim(),
      category: data.category ? String(data.category).trim() : undefined,
      status: String(data.status ?? 'open'),
      created_at: data.created_at ? String(data.created_at) : undefined,
    };
  },

  listTickets: async (args?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<SupportListResponse<{ tickets: SupportTicketListItem[] }>> => {
    const params = new URLSearchParams();
    if (args?.status) params.set('status', args.status);
    params.set('page', String(args?.page ?? 1));
    params.set('limit', String(args?.limit ?? 20));

    const suffix = params.toString();
    const response = await api.get<ApiResponse<SupportListResponse<{ tickets: SupportTicketListItem[] }>>>(
      `/support/list-tickets.php${suffix ? `?${suffix}` : ''}`
    );

    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load tickets');
    }
    return response.data.data;
  },

  getTicketDetails: async (args: { id?: number; code?: string }): Promise<SupportTicketDetails> => {
    const params = new URLSearchParams();
    if (args.id != null) params.set('id', String(args.id));
    if (args.code) params.set('code', args.code);

    const suffix = params.toString();
    const response = await api.get<ApiResponse<SupportTicketDetails>>(
      `/support/ticket-details.php${suffix ? `?${suffix}` : ''}`
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load ticket details');
    }
    return response.data.data;
  },

  replyToTicket: async (args: {
    ticketId: number;
    message: string;
    attachment?: { uri: string; name: string; type: string } | null;
  }): Promise<{ ticket_id: number; message: string; created_at?: string }> => {
    const formData = new FormData();
    formData.append('ticket_id', String(args.ticketId));
    formData.append('message', args.message);
    if (args.attachment) {
      formData.append(
        'attachment',
        { uri: args.attachment.uri, name: args.attachment.name, type: args.attachment.type } as any
      );
    }

    const response = await api.post<ApiResponse<any>>('/support/reply.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to send message');
    }
    return response.data.data as any;
  },
};

type NotificationApiItem = {
  id?: number | string | null;
  notification_id?: number | string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  type?: string | null;
  data?: any;
  payload?: any;
  created_at?: string | null;
  createdAt?: string | null;
  read_at?: string | null;
  readAt?: string | null;
};

const parseMaybeJson = (value: any) => {
  if (value == null) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // ignore
  }
  return undefined;
};

const toNormalizedDateString = (value: any) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  return raw;
};

const mapNotification = (raw: NotificationApiItem): AppNotification => {
  const idValue = raw.id ?? raw.notification_id ?? '';
  const title = String(raw.title ?? '').trim();
  const body = String(raw.body ?? raw.message ?? '').trim();
  const type = raw.type != null ? String(raw.type).trim() : undefined;
  const data = parseMaybeJson(raw.data) ?? parseMaybeJson(raw.payload) ?? (raw.data && typeof raw.data === 'object' ? raw.data : undefined);
  const createdAt = toNormalizedDateString(raw.created_at ?? raw.createdAt);
  const readAt = raw.read_at ?? raw.readAt ?? null;

  return {
    id: String(idValue),
    title: title || 'Notification',
    body,
    type: type || undefined,
    data: data || undefined,
    createdAt: createdAt || new Date().toISOString(),
    readAt: typeof readAt === 'string' ? readAt : readAt == null ? null : String(readAt),
  };
};

export const notificationAPI = {
  registerDevice: async (args: {
    expoPushToken: string;
    deviceId?: string;
    platform: 'ios' | 'android' | 'web';
    appVersion?: string;
  }): Promise<{ ok: true }> => {
    const response = await api.post<ApiResponse<any>>('/notifications/register-device.php', {
      expo_push_token: args.expoPushToken,
      device_id: args.deviceId,
      platform: args.platform,
      app_version: args.appVersion,
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to register device');
    }
    return { ok: true };
  },

  unregisterDevice: async (args: { expoPushToken: string; deviceId?: string }): Promise<{ ok: true }> => {
    const response = await api.post<ApiResponse<any>>('/notifications/unregister-device.php', {
      expo_push_token: args.expoPushToken,
      device_id: args.deviceId,
    });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to unregister device');
    }
    return { ok: true };
  },

  listNotifications: async (args?: {
    page?: number;
    limit?: number;
  }): Promise<{ notifications: AppNotification[]; unreadCount?: number }> => {
    const params = new URLSearchParams();
    params.set('page', String(args?.page ?? 1));
    params.set('limit', String(args?.limit ?? 50));
    // Backend limits results to the last 7 days ending at end_date.
    const now = new Date();
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    params.set('end_date', endDate);

    const suffix = params.toString();
    const response = await api.get<ApiResponse<any>>(`/notifications/list.php${suffix ? `?${suffix}` : ''}`);

    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to load notifications');
    }

    const data = response.data.data as any;
    const list = Array.isArray(data?.notifications) ? data.notifications : Array.isArray(data) ? data : [];
    const notifications = list.map((item: any) => mapNotification(item));
    const unreadCount =
      typeof data?.unread_count === 'number'
        ? data.unread_count
        : typeof data?.unreadCount === 'number'
          ? data.unreadCount
          : undefined;
    return { notifications, unreadCount };
  },

  markRead: async (args: { id: string }): Promise<{ ok: true }> => {
    const response = await api.post<ApiResponse<any>>('/notifications/mark-read.php', { id: args.id });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to mark notification as read');
    }
    return { ok: true };
  },

  markAllRead: async (): Promise<{ ok: true }> => {
    const response = await api.post<ApiResponse<any>>('/notifications/mark-all-read.php', {});
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to mark all notifications as read');
    }
    return { ok: true };
  },
};

export const walletAPI = {
  createWallet: async (payload?: { phone?: string }): Promise<{ created: boolean; wallet?: WalletAccount }> => {
    const response = await api.post<ApiResponse<{ created: boolean; wallet?: any }>>('/wallet/create.php', payload || {});
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create wallet');
    }
    return {
      created: Boolean(response.data.data.created),
      wallet: response.data.data.wallet ? mapWalletAccount(response.data.data.wallet) : undefined,
    };
  },

  getSummary: async (): Promise<WalletSummary> => {
    const response = await api.get<ApiResponse<any>>('/wallet/summary.php');
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load wallet summary');
    }
    return mapWalletSummary(response.data.data);
  },

  /** type: 'in' (credits/refunds) or 'out' (debits/fees); search matches description or reference. */
  getTransactions: async (args?: { page?: number; type?: 'in' | 'out'; search?: string }): Promise<{
    summary: WalletSummary;
    transactions: WalletTransaction[];
    pagination?: ReferencePagination;
  }> => {
    const params = new URLSearchParams({ page: String(args?.page ?? 1) });
    if (args?.type) params.set('type', args.type);
    if (args?.search) params.set('search', args.search);
    const response = await api.get<ApiResponse<any>>(`/wallet/transactions.php?${params.toString()}`);
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load wallet transactions');
    }

    return {
      summary: mapWalletSummary(response.data.data),
      transactions: Array.isArray(response.data.data.transactions)
        ? response.data.data.transactions.map(mapWalletTransaction)
        : [],
      pagination: response.data.data.pagination,
    };
  },

  sendPinCode: async (): Promise<{ status: string; purpose?: string; expiresAt?: string }> => {
    const response = await api.post<ApiResponse<any>>('/wallet/pin.php', { action: 'send_code' });
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to send wallet PIN code');
    }
    return {
      status: String(response.data.data.status ?? 'sent'),
      purpose: String(response.data.data.purpose ?? '').trim() || undefined,
      expiresAt: String(response.data.data.expires_at ?? '').trim() || undefined,
    };
  },

  verifyPinCode: async (code: string): Promise<{ status: string; purpose?: string; pinToken: string; tokenExpiresAt?: string }> => {
    const response = await api.post<ApiResponse<any>>('/wallet/pin.php', { action: 'verify_code', code });
    if (response.data.status !== 'success' || !response.data.data?.pin_token) {
      throw new Error(response.data.message || 'Failed to verify wallet PIN code');
    }
    return {
      status: String(response.data.data.status ?? 'verified'),
      purpose: String(response.data.data.purpose ?? '').trim() || undefined,
      pinToken: String(response.data.data.pin_token),
      tokenExpiresAt: String(response.data.data.token_expires_at ?? '').trim() || undefined,
    };
  },

  savePin: async (args: { pinToken: string; pin: string; confirmPin: string }): Promise<{ status: string; hasPin: boolean }> => {
    const response = await api.post<ApiResponse<any>>('/wallet/pin.php', {
      action: 'save_pin',
      pin_token: args.pinToken,
      pin: args.pin,
      confirm_pin: args.confirmPin,
    });
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to save wallet PIN');
    }
    return {
      status: String(response.data.data.status ?? 'saved'),
      hasPin: Boolean(response.data.data.has_pin),
    };
  },

  // No email code: a first PIN is created directly; changing a PIN needs the current one.
  // A forgotten PIN still uses sendPinCode -> verifyPinCode -> savePin (older app versions use that flow too).
  setPinDirect: async (args: { pin: string; confirmPin: string; currentPin?: string }): Promise<{ status: string; hasPin: boolean }> => {
    const response = await api.post<ApiResponse<any>>('/wallet/pin.php', {
      action: 'set_pin_direct',
      pin: args.pin,
      confirm_pin: args.confirmPin,
      ...(args.currentPin ? { current_pin: args.currentPin } : {}),
    });
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to save wallet PIN');
    }
    return {
      status: String(response.data.data.status ?? 'saved'),
      hasPin: Boolean(response.data.data.has_pin),
    };
  },

  refreshCredits: async (): Promise<{ status: string; processed: number; posted: number }> => {
    const response = await api.post<ApiResponse<any>>('/wallet/refresh-credits.php', {});
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to refresh wallet credits');
    }
    return {
      status: String(response.data.data.status ?? 'ok'),
      processed: Number(response.data.data.processed ?? 0),
      posted: Number(response.data.data.posted ?? 0),
    };
  },
};

// Payment APIs (Interswitch)
export const paymentAPI = {
  getGateway: async (): Promise<{ active: string; available: string[]; gateway_enabled: boolean; wallet_enabled: boolean }> => {
    const response = await api.get<ApiResponse<{ active: string; available: string[]; gateway_enabled: boolean; wallet_enabled: boolean }>>('/payment/gateway.php');
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load payment gateway');
    }
    return response.data.data;
  },

  initPayment: async (args?: {
    redirectUrl?: string;
    paymentChannel?: 'gateway' | 'wallet';
    walletPin?: string;
  }): Promise<{
    tx_ref: string;
    payment_url?: string;
    gateway: string;
    amount?: number;
    subtotal?: number;
    charge?: number;
    total_amount?: number;
    payment_channel?: string;
    wallet_balance_after?: number;
  }> => {
    const payload: Record<string, string> = {};
    if (args?.redirectUrl) payload.redirect_url = args.redirectUrl;
    if (args?.paymentChannel) payload.payment_channel = args.paymentChannel;
    if (args?.walletPin) payload.wallet_pin = args.walletPin;
    const requestBody = Object.keys(payload).length > 0 ? payload : undefined;

    const send = async (body?: any) => {
      const response = await api.post<
        ApiResponse<{
          tx_ref: string;
          payment_url?: string;
          gateway: string;
          amount?: number;
          subtotal?: number;
          charge?: number;
          total_amount?: number;
          payment_channel?: string;
          wallet_balance_after?: number;
        }>
      >('/payment/init.php', body);

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
      return response.data.data;
    };

    try {
      return await send(requestBody);
    } catch (e) {
      if (requestBody && args?.paymentChannel !== 'wallet') return await send(undefined);
      throw e;
    }
  },

  verifyPayment: async (txRef: string): Promise<{ status: string; tx_ref: string; amount: number }> => {
    const response = await api.get<ApiResponse<{ status: string; tx_ref: string; amount: number }>>(
      `/payment/verify.php?tx_ref=${encodeURIComponent(txRef)}`
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to verify payment');
    }
    return response.data.data;
  },
};

export default api;

// ─── Features that used to be website-only (same endpoints as the white-label portal) ───

export interface BulkClaim {
  id: number;
  source: string;
  manual_id: number;
  title: string;
  course_code: string;
  student_name: string;
  student_matric_no: string;
  claim_status: string;
  payer_name: string;
  paid_at: string;
}

/** Materials a class rep (or admin) paid for on the student's behalf, waiting to be accepted. */
export const claimsAPI = {
  getPending: async (limit = 5): Promise<BulkClaim[]> => {
    const response = await api.get<ApiResponse<{ claims: BulkClaim[] }>>(`/materials/claims/pending.php?limit=${limit}`);
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load claims');
    return response.data.data?.claims ?? [];
  },
  resolve: async (claim: BulkClaim, action: 'confirm' | 'reject'): Promise<string> => {
    const response = await api.post<ApiResponse<any>>('/materials/claims/resolve.php', {
      student_row_id: claim.id,
      action,
      source: claim.source,
    });
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not update this claim');
    return response.data.message || '';
  },
  /** Payments rejected with "Not mine" in the last 14 days (they can be brought back). */
  getRejected: async (): Promise<RejectedClaim[]> => {
    const response = await api.get<ApiResponse<{ claims: RejectedClaim[] }>>('/materials/claims/rejected.php');
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load rejected payments');
    return response.data.data?.claims ?? [];
  },
  restore: async (claim: { id: number; source: string }): Promise<string> => {
    const response = await api.post<ApiResponse<any>>('/materials/claims/restore.php', { student_row_id: claim.id, source: claim.source });
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not bring this payment back');
    return response.data.message || '';
  },
};

export interface RejectedClaim {
  id: number;
  source: string;
  title: string;
  course_code: string;
  payer_name: string;
  paid_at: string;
  rejected_at: string;
}

export interface TransferRecipient {
  user_id: number;
  name: string;
  email: string;
  matric_no: string;
}

export interface WalletTransferResult {
  transfer: { amount: number; recipient: TransferRecipient; transfer_reference: string };
  reference: string;
  new_balance: number;
}

/** Wallet to wallet transfers between students of the same school. */
export const transferAPI = {
  lookup: async (identifier: string): Promise<TransferRecipient> => {
    const response = await api.post<ApiResponse<{ recipient: TransferRecipient }>>('/wallet/transfer.php', {
      action: 'lookup',
      recipient_identifier: identifier,
    });
    if (response.data.status !== 'success' || !response.data.data) throw new Error(response.data.message || 'Student not found');
    return response.data.data.recipient;
  },
  /** requestToken must be unique per attempt and reused on retry so money is never sent twice. */
  send: async (args: {
    recipientIdentifier: string;
    amount: number;
    pin: string;
    requestToken: string;
    description?: string;
  }): Promise<WalletTransferResult> => {
    const response = await api.post<ApiResponse<WalletTransferResult>>('/wallet/transfer.php', {
      action: 'transfer',
      recipient_identifier: args.recipientIdentifier,
      amount: args.amount,
      wallet_pin: args.pin,
      request_token: args.requestToken,
      description: args.description,
    });
    if (response.data.status !== 'success' || !response.data.data) throw new Error(response.data.message || 'Transfer failed');
    return response.data.data;
  },
};

export interface SystemAlert {
  id: number;
  title: string;
  message: string;
  color: 'red' | 'green' | 'info';
}

export interface ActiveSurvey {
  id: number;
  slug: string;
  title: string;
  description: string;
  url: string;
}

export const noticesAPI = {
  getAlerts: async (): Promise<SystemAlert[]> => {
    const response = await api.get<ApiResponse<{ alerts: SystemAlert[] }>>('/reference/system-alerts.php');
    if (response.data.status !== 'success') return [];
    return response.data.data?.alerts ?? [];
  },
  getSurvey: async (): Promise<ActiveSurvey | null> => {
    const response = await api.get<ApiResponse<{ survey: ActiveSurvey | null }>>('/surveys/active.php');
    if (response.data.status !== 'success') return null;
    return response.data.data?.survey ?? null;
  },
  dismissSurvey: async (surveyId: number): Promise<void> => {
    await api.post<ApiResponse<any>>('/surveys/dismiss.php', { survey_id: surveyId });
  },
};

export interface BulkPaymentRecord {
  id: number;
  ref_id: string;
  manual_id: number;
  title: string;
  course_code: string;
  student_count: number;
  subtotal: number;
  fee_amount: number;
  total_amount: number;
  status: string;
  paid_at: string;
}

/** Official receipt PDFs (same layout and logo as the website) and bulk payment history. */
// PDF endpoints answer with JSON when something is wrong: return the bytes or throw its message.
const pdfBytesOrThrow = (data: ArrayBuffer, fallback: string): Uint8Array => {
  const bytes = new Uint8Array(data);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return bytes; // "%PDF"
  let message = fallback;
  try {
    const text = typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : String.fromCharCode(...Array.from(bytes.slice(0, 2000)));
    message = JSON.parse(text).message || message;
  } catch {
    // keep default
  }
  throw new Error(message);
};

export const receiptsAPI = {
  /** Raw PDF bytes for a payment reference, or one material of it with itemId. */
  getPdf: async (ref: string, itemId?: string | number): Promise<Uint8Array> => {
    const params = new URLSearchParams({ ref });
    if (itemId) params.set('item_id', String(itemId));
    const response = await api.get<ArrayBuffer>(`/payment/receipt-pdf.php?${params.toString()}`, {
      responseType: 'arraybuffer',
    });
    const bytes = new Uint8Array(response.data);
    // "%PDF" header; anything else is a JSON error
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      let message = 'Could not download the receipt';
      try {
        const text = typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : String.fromCharCode(...Array.from(bytes.slice(0, 2000)));
        message = JSON.parse(text).message || message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }
    return bytes;
  },

  bulkHistory: async (): Promise<BulkPaymentRecord[]> => {
    const response = await api.get<ApiResponse<{ payments: BulkPaymentRecord[] }>>('/materials/bulk/history.php');
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load bulk payments');
    return response.data.data?.payments ?? [];
  },
};

export interface MaterialRequest {
  id: number;
  material_code: string;
  material_title: string;
  status: string;
  scope?: string;
  requester_name?: string;
  target_faculty_name?: string | null;
  target_department_name?: string | null;
  upvote_count: number;
  expected_buyers_count: number;
  progress_percent: number;
  threshold_percent: number;
  threshold_met: boolean;
  viewer_has_upvoted: boolean | number | string;
  share_token: string;
  created_at?: string;
}

export type MaterialRequestScope = 'my_department' | 'faculty' | 'school';

/** Ask for a material that is not in the store yet; course mates upvote it. */
export const materialRequestsAPI = {
  list: async (token?: string): Promise<{ requests: MaterialRequest[]; highlighted: MaterialRequest | null }> => {
    const response = await api.get<ApiResponse<{ requests: MaterialRequest[]; highlighted: MaterialRequest | null }>>(
      `/material-requests/list.php${token ? `?token=${encodeURIComponent(token)}` : ''}`
    );
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load requests');
    return { requests: response.data.data?.requests ?? [], highlighted: response.data.data?.highlighted ?? null };
  },
  create: async (payload: { material_code: string; material_title: string; scope: MaterialRequestScope }) => {
    const response = await api.post<ApiResponse<{ status: string; material?: { course_code: string } | null }>>(
      '/material-requests/create.php',
      payload
    );
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not send your request');
    return { message: response.data.message || '', result: response.data.data };
  },
  upvote: async (requestId: number): Promise<string> => {
    const response = await api.post<ApiResponse<any>>('/material-requests/upvote.php', { request_id: requestId });
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not add your vote');
    return response.data.message || '';
  },
};

// ─── Bulk payment: pay for course mates' copies from the wallet ───

export interface BulkMaterial {
  id: number;
  title: string;
  course_code: string;
  price: number;
}

export interface BulkPreviewRow {
  line_number: number;
  first_name: string;
  last_name: string;
  matric_no: string;
  status: 'valid' | 'error';
  message: string;
}

/** Sent back unchanged to pay.php */
export type BulkPaymentRow = Record<string, string | number>;

export interface BulkPreview {
  manual: { id: number; title: string; course_code: string; price: number };
  rows: BulkPreviewRow[];
  valid_count: number;
  invalid_count: number;
  breakdown: { subtotal: number; fee_percent: number; fee_amount: number; total_amount: number };
  wallet: { ready: boolean; balance: number; has_enough_balance: boolean };
  warnings: string[];
  can_submit_payment: boolean;
  payment_rows: BulkPaymentRow[];
}

export interface BulkPayResult {
  ref_id: string;
  batch_id: number;
  student_count: number;
  subtotal: number;
  fee_amount: number;
  total_amount: number;
  wallet_balance_after: number;
}

export const bulkAPI = {
  manuals: async (): Promise<{ materials: BulkMaterial[]; fee_percent: number; wallet: { ready: boolean; warnings?: string[] } }> => {
    const response = await api.get<ApiResponse<any>>('/materials/bulk/manuals.php');
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Bulk payment is not available right now');
    }
    const d = response.data.data;
    return {
      materials: (d.materials || []).map((m: any) => ({ ...m, id: Number(m.id), price: Number(m.price) })),
      fee_percent: Number(d.fee_percent ?? 5),
      wallet: d.wallet || { ready: false },
    };
  },
  /** records: one "first name, last name, matric no" per line */
  previewText: async (manualId: number, records: string): Promise<BulkPreview> => {
    const response = await api.post<ApiResponse<BulkPreview>>('/materials/bulk/preview.php', { manual_id: manualId, records });
    if (response.data.status !== 'success' || !response.data.data) throw new Error(response.data.message || 'Could not check the list');
    return response.data.data;
  },
  previewFile: async (manualId: number, file: { uri: string; name: string; type: string }): Promise<BulkPreview> => {
    const formData = new FormData();
    formData.append('manual_id', String(manualId));
    formData.append('bulk_csv', file as any);
    const response = await api.post<ApiResponse<BulkPreview>>('/materials/bulk/preview.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.status !== 'success' || !response.data.data) throw new Error(response.data.message || 'Could not read the CSV');
    return response.data.data;
  },
  pay: async (manualId: number, rows: BulkPaymentRow[], pin: string): Promise<BulkPayResult> => {
    const response = await api.post<ApiResponse<BulkPayResult>>('/materials/bulk/pay.php', { manual_id: manualId, rows, wallet_pin: pin });
    if (response.data.status !== 'success' || !response.data.data) throw new Error(response.data.message || 'Payment failed');
    return response.data.data;
  },
};


// ─── Class rep (HOC): export paid-student lists for their department ───
export interface HocMaterial {
  id: number;
  title: string;
  course_code: string;
  code: string;
  price: number;
  active: boolean;
  managed_by_admin: boolean;
  sold: number;
  sold_amount: number;
  pending_collection: number;
  exports_count: number;
  last_exported_at: string | null;
}

export interface DeptExport {
  id: number;
  code: string;
  manual_title: string;
  course_code: string;
  students_count: number;
  total_amount: number;
  status: 'granted' | 'pending';
  exported_at: string;
  exported_by: string;
  is_mine: boolean;
  granted_at: string | null;
  granted_by: string | null;
}

/** Same endpoints as the web portal's Class rep page. */
export interface HocPage {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export const hocAPI = {
  /** Only materials with students waiting for collection (the ones that can be exported). */
  getMaterials: async (page = 1): Promise<{ materials: HocMaterial[]; pagination: HocPage }> => {
    const response = await api.get<ApiResponse<{ materials: HocMaterial[]; pagination: HocPage }>>(`/hoc/materials.php?page=${page}&limit=20`);
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load materials');
    return { materials: response.data.data?.materials ?? [], pagination: response.data.data!.pagination };
  },

  /** PDF of students in the HOC's department who paid and haven't collected yet. */
  exportList: async (manualId: number, rrr?: string): Promise<Uint8Array> => {
    try {
      const response = await api.post<ArrayBuffer>('/hoc/export.php', { manual_id: manualId, rrr: rrr || '' }, { responseType: 'arraybuffer' });
      return pdfBytesOrThrow(response.data, 'Could not export the list');
    } catch (e: any) {
      if (e?.response?.data instanceof ArrayBuffer) return pdfBytesOrThrow(e.response.data, 'Could not export the list');
      throw e;
    }
  },

  /** Every export made by the department's class reps, with who made it. */
  /** Exports by any class rep of the department; pass manualId for one material's exports. */
  getExports: async (page = 1, manualId?: number): Promise<{ exports: DeptExport[]; pagination: HocPage }> => {
    const q = manualId ? `&manual_id=${manualId}&limit=50` : '&limit=20';
    const response = await api.get<ApiResponse<{ exports: DeptExport[]; pagination: HocPage }>>(`/hoc/granted-exports.php?page=${page}${q}`);
    if (response.data.status !== 'success') throw new Error(response.data.message || 'Could not load exports');
    return { exports: response.data.data?.exports ?? [], pagination: response.data.data!.pagination };
  },

  exportPdf: async (id: number): Promise<Uint8Array> => {
    try {
      const response = await api.get<ArrayBuffer>(`/hoc/granted-exports.php?id=${id}`, { responseType: 'arraybuffer' });
      return pdfBytesOrThrow(response.data, 'Could not download the export');
    } catch (e: any) {
      if (e?.response?.data instanceof ArrayBuffer) return pdfBytesOrThrow(e.response.data, 'Could not download the export');
      throw e;
    }
  },
};

// ─── Bella (support assistant, Cloudflare Worker) ───────────────
// Called through `api` so the student's token is attached and refreshed as usual.
export const BELLA_URL = (process.env.EXPO_PUBLIC_BELLA_URL || 'https://bella.nivasity.com').trim().replace(/\/$/, '');

export type BellaCard =
  | { type: 'material'; id: number; title: string; course_code: string; price: number; bought: boolean; path: string }
  | { type: 'checkout'; items: number; total: number; can_pay_with_wallet: boolean; path: string }
  | { type: 'fund_wallet'; shortfall: number; balance: number; path: string }
  | { type: 'link'; label: string; path: string }
  | { type: 'pay_wallet'; items: number; total: number; status?: 'paid' }
  | { type: 'wallet_account' }
  | { type: 'end_chat'; status?: 'ended' }
  | { type: 'rate_chat'; rating?: number; ends?: boolean; by?: 'team'; dismissed?: boolean }
  | {
      type: 'confirm_change';
      token: string;
      from: { title: string; course_code: string };
      to: { title: string; course_code: string };
      price: number;
      status?: 'done' | 'failed';
    }
  | { type: 'confirm_claim'; token: string; course_code: string; title: string; payer: string; status?: 'done' | 'failed' };

export type BellaMessage = {
  id: number;
  role: 'student' | 'bella' | 'agent' | 'system';
  content: string;
  cards: BellaCard[];
  attachment: { name: string; type: string; size: number; url: string } | null;
  agent_name: string | null;
  created_at: string;
};

export type BellaEscalation = {
  id: number;
  student_message: string | null;
  status: 'open' | 'answered' | 'resolved';
  created_at: string;
  answered_at: string | null;
  resolved_at: string | null;
};
export type BellaArticle = { id: number; title: string; body: string };
export type BellaSession = {
  id: number;
  preview: string | null;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  rating: number | null;
  messages?: number;
};

type BellaReply = { status: string; messages: BellaMessage[]; consent_required?: boolean; consent_version?: string };

export class BellaError extends Error {
  code?: string;
}
const bellaError = (err: any): BellaError => {
  const e = new BellaError(err?.response?.data?.error || (err?.response ? 'Bella could not answer. Try again.' : 'Could not reach Bella. Check your connection.'));
  e.code = err?.response?.data?.code;
  return e;
};

// Where the Bella terms and privacy sections live
export const BELLA_TERMS_URL = 'https://nivasity.com/terms';
export const BELLA_PRIVACY_URL = 'https://nivasity.com/privacy';

export const bellaAPI = {
  // With live, the request stays open (up to live.wait seconds) until a new message or status change
  history: async (after = 0, live?: { wait: number; status: string }): Promise<BellaReply> => {
    try {
      const params = after ? { after, ...(live ? { wait: live.wait, status: live.status } : {}) } : undefined;
      return (await api.get<BellaReply>(`${BELLA_URL}/chat`, { params, timeout: live ? (live.wait + 15) * 1000 : undefined })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  escalations: async (): Promise<BellaEscalation[]> => {
    try {
      return (await api.get(`${BELLA_URL}/chat/escalations`)).data.escalations || [];
    } catch (err) {
      throw bellaError(err);
    }
  },
  articles: async (q = ''): Promise<BellaArticle[]> => {
    try {
      return (await api.get(`${BELLA_URL}/chat/articles`, { params: q ? { q } : undefined })).data.articles || [];
    } catch (err) {
      throw bellaError(err);
    }
  },
  // Not yet: hide Bella's goodbye rating card and keep chatting
  notYet: async (messageId: number): Promise<BellaReply & { ok: boolean; updated_message_id: number | null }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/dismiss`, { message_id: messageId })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  // End the current session (the End chat button)
  end: async (): Promise<BellaReply & { ok: boolean; updated_message_id: number | null }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/end`, {})).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  // Chat history
  sessions: async (): Promise<BellaSession[]> => {
    try {
      return (await api.get(`${BELLA_URL}/chat/sessions`)).data.sessions || [];
    } catch (err) {
      throw bellaError(err);
    }
  },
  session: async (id: number): Promise<{ session: BellaSession; messages: BellaMessage[] }> => {
    try {
      return (await api.get(`${BELLA_URL}/chat/sessions/${id}`)).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  // Rate a chat (1-5) with optional feedback; sessionId for one opened from Chat history
  rate: async (rating: number, comment: string, sessionId?: number): Promise<BellaReply & { ok: boolean; updated_message_id: number | null; rating: number }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/rate`, { rating, comment, ...(sessionId ? { session_id: sessionId } : {}) })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  // Paid from the chat's Pay now card: tell Bella the reference so she confirms with the receipt
  paid: async (txRef: string): Promise<BellaReply & { ok: boolean; updated_message_id: number | null }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/paid`, { tx_ref: txRef })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  // The student confirms an action Bella proposed (a material swap)
  action: async (token: string): Promise<BellaReply & { ok: boolean; updated_message_id: number | null }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/action`, { token }, { timeout: 60000 })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  consentStatus: async (): Promise<{ accepted: boolean; accepted_at: string | null; consent_version: string }> => {
    try {
      return (await api.get(`${BELLA_URL}/chat/consent`)).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  consent: async (version: string): Promise<{ ok: boolean }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/consent`, { version })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  deleteHistory: async (): Promise<{ ok: boolean; deleted: boolean }> => {
    try {
      return (await api.post(`${BELLA_URL}/chat/history/delete`, {})).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
  send: async (message: string, file?: { uri: string; name: string; type: string } | null): Promise<BellaReply> => {
    try {
      if (file) {
        const form = new FormData();
        form.append('message', message);
        form.append('file', file as any);
        return (await api.post<BellaReply>(`${BELLA_URL}/chat`, form, { timeout: 90000, headers: { 'Content-Type': 'multipart/form-data' } })).data;
      }
      return (await api.post<BellaReply>(`${BELLA_URL}/chat`, { message }, { timeout: 60000 })).data;
    } catch (err) {
      throw bellaError(err);
    }
  },
};
