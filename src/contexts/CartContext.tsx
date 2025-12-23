import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CartItem, Product } from '../types';

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  lastActionAt: number;
  has: (productId: string) => boolean;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  toggle: (product: Product) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const toCartItem = (product: Product, quantity: number): CartItem => ({
  ...product,
  quantity,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastActionAt, setLastActionAt] = useState<number>(Date.now());

  const has = useCallback((productId: string) => items.some((item) => item.id === productId), [items]);

  const add = useCallback((product: Product, quantity: number = 1) => {
    setLastActionAt(Date.now());
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) return [...current, toCartItem(product, Math.max(1, quantity))];
      return current.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + Math.max(1, quantity) } : item
      );
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLastActionAt(Date.now());
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const toggle = useCallback((product: Product) => {
    setLastActionAt(Date.now());
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.filter((item) => item.id !== product.id);
      return [...current, toCartItem(product, 1)];
    });
  }, []);

  const clear = useCallback(() => {
    setLastActionAt(Date.now());
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { items, count, total, lastActionAt, has, add, remove, toggle, clear };
  }, [has, items, add, remove, toggle, clear, lastActionAt]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
