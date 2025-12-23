import { CartItem, DashboardStats, Order, Product } from '../types';

export const demoProducts: Product[] = [
  {
    id: 'csc-112',
    name: 'CSC 112',
    description: 'Computer Science',
    price: 5000,
    category: 'Handout',
    available: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mth-101',
    name: 'MTH 101',
    description: 'General Mathematics',
    price: 3500,
    category: 'Handout',
    available: true,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'gst-103',
    name: 'GST 103',
    description: 'Use of English',
    price: 2500,
    category: 'Past Questions',
    available: true,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'chm-102',
    name: 'CHM 102',
    description: 'General Chemistry',
    price: 4200,
    category: 'Past Questions',
    available: true,
    createdAt: '2026-01-06T00:00:00.000Z',
  },
  {
    id: 'phy-104',
    name: 'PHY 104',
    description: 'Introductory Physics',
    price: 4000,
    category: 'Lab Material',
    available: true,
    createdAt: '2026-01-08T00:00:00.000Z',
  },
  {
    id: 'sta-110',
    name: 'STA 110',
    description: 'Statistics for Students',
    price: 3000,
    category: 'Handout',
    available: true,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
];

const toCartItem = (product: Product, quantity: number): CartItem => ({
  ...product,
  quantity,
});

export const computeOrderTotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const demoOrders: Order[] = [
  {
    id: 'DEMO-1001',
    userId: 'demo',
    status: 'completed',
    createdAt: '2026-01-12T10:20:00.000Z',
    items: [toCartItem(demoProducts[0], 1), toCartItem(demoProducts[2], 1)],
    total: computeOrderTotal([toCartItem(demoProducts[0], 1), toCartItem(demoProducts[2], 1)]),
  },
  {
    id: 'DEMO-1002',
    userId: 'demo',
    status: 'processing',
    createdAt: '2026-01-16T16:05:00.000Z',
    items: [toCartItem(demoProducts[1], 1), toCartItem(demoProducts[3], 1), toCartItem(demoProducts[5], 1)],
    total: computeOrderTotal([
      toCartItem(demoProducts[1], 1),
      toCartItem(demoProducts[3], 1),
      toCartItem(demoProducts[5], 1),
    ]),
  },
  {
    id: 'DEMO-1003',
    userId: 'demo',
    status: 'pending',
    createdAt: '2026-01-20T08:11:00.000Z',
    items: [toCartItem(demoProducts[4], 1)],
    total: computeOrderTotal([toCartItem(demoProducts[4], 1)]),
  },
];

export const computeDashboardStats = (orders: Order[]): DashboardStats => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  return { totalOrders, pendingOrders, totalSpent };
};

