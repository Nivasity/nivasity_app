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

const DEFAULT_ASSETS_BASE_URL = 'https://assets.nivasity.com';
const RESOLVED_ASSETS_BASE_URL = normalizeBaseUrl(
  ((process.env.EXPO_PUBLIC_ASSETS_BASE_URL as string | undefined) || DEFAULT_ASSETS_BASE_URL).trim()
);

// Create axios instance
const api = axios.create({
  baseURL: RESOLVED_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const toUserProfilePicUrl = (profilePic?: string | null) => {
  const value = (profilePic || '').trim();
  if (!value) return undefined;
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

  register: async (credentials: RegisterCredentials): Promise<{ message: string; data?: RegisterSuccessData }> => {
    const payload = {
      email: credentials.email,
      password: credentials.password,
      first_name: credentials.first_name,
      last_name: credentials.last_name,
      phone: credentials.phone,
      gender: credentials.gender,
      school_id: credentials.school_id,
    };
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
    return {
      id: String(data.id),
      email: (data.email || '').trim(),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
    phone: data.phone,
    avatar: toUserProfilePicUrl(data.profile_pic),
    schoolId: data.school ?? undefined,
    admissionYear: data.adm_year ?? undefined,
    deptId: data.dept ?? undefined,
    department: data.dept_name ?? undefined,
    matricNumber: data.matric_no ?? undefined,
  };
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

export const referenceAPI = {
  getSchools: async (args?: { page?: number; limit?: number }): Promise<ReferenceListResponse<{ schools: ReferenceSchool[] }>> => {
    const page = args?.page ?? 1;
    const limit = args?.limit ?? 50;
    const response = await api.get<ApiResponse<ReferenceListResponse<{ schools: ReferenceSchool[] }>>>(
      `/reference/schools.php?page=${page}&limit=${limit}`,
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load schools');
    }
    return response.data.data;
  },

  getFaculties: async (args: { schoolId: number; page?: number; limit?: number }): Promise<ReferenceListResponse<{ faculties: ReferenceFaculty[] }>> => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 50;
    const response = await api.get<ApiResponse<ReferenceListResponse<{ faculties: ReferenceFaculty[] }>>>(
      `/reference/faculties.php?school_id=${args.schoolId}&page=${page}&limit=${limit}`,
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load faculties');
    }
    return response.data.data;
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
    const response = await api.get<ApiResponse<ReferenceListResponse<{ departments: ReferenceDepartment[] }>>>(
      `/reference/departments.php?school_id=${args.schoolId}${facultyFilter}&page=${page}&limit=${limit}`,
      { skipAuth: true } as any
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load departments');
    }
    return response.data.data;
  },
};

type MaterialListItem = {
  id: number;
  code?: string;
  title: string;
  course_code?: string;
  price: number;
  quantity?: number;
  due_date?: string;
  dept_name?: string;
  faculty_name?: string;
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
  faculty: item.faculty_name,
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
    page?: number;
    limit?: number;
  }): Promise<{ materials: Product[]; pagination: MaterialsPagination }> => {
    const params = new URLSearchParams();
    if (args?.search) params.set('search', args.search);
    if (args?.sort) params.set('sort', args.sort);
    if (args?.page) params.set('page', String(args.page));
    if (args?.limit) params.set('limit', String(args.limit));

    const suffix = params.toString();
    const response = await api.get<ApiResponse<{ materials: MaterialListItem[] } & { pagination: MaterialsPagination }>>(
      `/materials/list.php${suffix ? `?${suffix}` : ''}`
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load materials');
    }
    return {
      materials: (response.data.data.materials || []).map(mapMaterialToProduct),
      pagination: response.data.data.pagination,
    };
  },

  getProducts: async (args?: {
    search?: string;
    sort?: 'recommended' | 'low-high' | 'high-low';
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
  view: async (): Promise<{ items: CartItem[]; total_amount: number; total_items: number }> => {
    const response = await api.get<ApiResponse<{ items: CartViewItem[]; total_amount: number; total_items: number }>>(
      '/materials/cart-view.php'
    );
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load cart');
    }
    return {
      items: (response.data.data.items || []).map(mapCartViewItemToCartItem),
      total_amount: response.data.data.total_amount,
      total_items: response.data.data.total_items,
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
  items: TransactionItem[];
  created_at: string;
};

const mapTransactionToOrder = (tx: Transaction): Order => ({
  id: tx.ref_id || String(tx.id),
  userId: '',
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
    const response = await api.get('/dashboard/student');
    return response.data;
  },
};

// Payment APIs (Interswitch)
export const paymentAPI = {
  initPayment: async (args?: {
    redirectUrl?: string;
  }): Promise<{
    tx_ref: string;
    payment_url: string;
    gateway: string;
    amount: number;
  }> => {
    const payload = args?.redirectUrl ? { redirect_url: args.redirectUrl } : undefined;

    const send = async (body?: any) => {
      const response = await api.post<
        ApiResponse<{ tx_ref: string; payment_url: string; gateway: string; amount: number }>
      >('/payment/init.php', body);

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
      return response.data.data;
    };

    try {
      return await send(payload);
    } catch (e) {
      if (payload) return await send(undefined);
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
