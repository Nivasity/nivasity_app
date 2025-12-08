export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface DashboardStats {
  totalOrders?: number;
  totalSpent?: number;
  pendingOrders?: number;
  totalUsers?: number;
  totalRevenue?: number;
}
