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
  hostFacultyName?: string;
  level?: string;
  deadlineAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentChannel = 'gateway' | 'wallet';

export interface WalletAccount {
  id: number;
  userId: number;
  schoolId: number;
  status: string;
  balance: number;
  currency: string;
  provider?: string;
  providerAccountId?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bankSlug?: string;
  accountStatus?: string;
}

export interface WalletSummary {
  hasWallet: boolean;
  hasPin: boolean;
  wallet?: WalletAccount;
}

export interface WalletPricing {
  hasWallet: boolean;
  balance: number;
  walletCharge: number;
  walletTotalAmount: number;
  canPayWithWallet: boolean;
}

export interface CartPricing {
  items: CartItem[];
  subtotal: number;
  charge: number;
  totalAmount: number;
  totalItems: number;
  wallet?: WalletPricing;
}

export interface WalletTransaction {
  id: string;
  entryType: string;
  direction: 'credit' | 'debit' | 'neutral';
  amount: number;
  signedAmount: number;
  status: string;
  reference: string;
  providerReference?: string;
  displayReference?: string;
  description: string;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt: string;
  displayDate?: string;
}

export interface Order {
  id: string;
  userId: string;
  payerNameWithMatric?: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'refunded';
  createdAt: string;
  medium?: string;
  paymentChannel?: PaymentChannel;
  transactionContext?: string;
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
