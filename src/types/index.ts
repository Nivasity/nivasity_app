export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  schoolId?: number | string | null;
  school?: string;
  institutionName?: string;
  admissionYear?: string;
  deptId?: number | string | null;
  department?: string;
  matricNumber?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  first_name: string;
  last_name: string;
  phone: string;
  gender?: 'female' | 'male';
  email: string;
  password: string;
  school_id: number;
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
  category?: string;
  courseCode?: string;
  materialCode?: string;
  available?: boolean;
  createdAt?: string;
  department?: string;
  faculty?: string;
  level?: string;
  deadlineAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'refunded';
  createdAt: string;
}

export interface DashboardStats {
  totalOrders?: number;
  totalSpent?: number;
  pendingOrders?: number;
}

export type AppNotificationData = Record<string, any>;

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type?: string;
  data?: AppNotificationData;
  createdAt: string;
  readAt?: string | null;
}
