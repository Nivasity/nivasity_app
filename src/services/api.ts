import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordData,
  Product,
  Order,
  DashboardStats,
} from '../types';

// Base API URL - Update this with the actual Nivasity API endpoint
const API_BASE_URL = 'https://api.nivasity.com/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
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
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordData): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// User Profile APIs
export const profileAPI = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/profile', data);
    return response.data;
  },

  uploadAvatar: async (imageUri: string): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    const response = await api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Product/Store APIs
export const storeAPI = {
  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
};

// Order APIs
export const orderAPI = {
  createOrder: async (items: any[]): Promise<Order> => {
    const response = await api.post('/orders', { items });
    return response.data;
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getStudentStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/student');
    return response.data;
  },

  getAdminStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },
};

// Payment APIs (Interswitch)
export const paymentAPI = {
  initiatePayment: async (orderId: string, amount: number): Promise<{ paymentUrl: string; reference: string }> => {
    const response = await api.post('/payments/initiate', { orderId, amount });
    return response.data;
  },

  verifyPayment: async (reference: string): Promise<{ status: string; order: Order }> => {
    const response = await api.post('/payments/verify', { reference });
    return response.data;
  },
};

export default api;
