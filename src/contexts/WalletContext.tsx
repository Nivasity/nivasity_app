import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { walletAPI } from '../services/api';
import { WalletSummary } from '../types';

type WalletContextValue = {
  summary: WalletSummary | null;
  loading: boolean;
  refreshing: boolean;
  hasWallet: boolean;
  hasPin: boolean;
  refreshSummary: () => Promise<WalletSummary | null>;
  refreshCreditsAndSummary: () => Promise<WalletSummary | null>;
  createWallet: () => Promise<WalletSummary | null>;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshSummary = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(null);
      setLoading(false);
      return null;
    }

    const nextSummary = await walletAPI.getSummary();
    setSummary(nextSummary);
    return nextSummary;
  }, [isAuthenticated]);

  const refreshCreditsAndSummary = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(null);
      setLoading(false);
      return null;
    }

    setRefreshing(true);
    try {
      await walletAPI.refreshCredits();
    } catch {
      // Ignore refresh-credit failures and still fetch the latest summary.
    }

    try {
      const nextSummary = await walletAPI.getSummary();
      setSummary(nextSummary);
      return nextSummary;
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  const createWallet = useCallback(async () => {
    if (!isAuthenticated) return null;
    setRefreshing(true);
    try {
      await walletAPI.createWallet();
      const nextSummary = await walletAPI.getSummary();
      setSummary(nextSummary);
      return nextSummary;
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!isAuthenticated) {
        if (!active) return;
        setSummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextSummary = await walletAPI.getSummary();
        if (!active) return;
        setSummary(nextSummary);
      } catch {
        if (!active) return;
        setSummary({ hasWallet: false, hasPin: false });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const value = useMemo<WalletContextValue>(
    () => ({
      summary,
      loading,
      refreshing,
      hasWallet: Boolean(summary?.hasWallet),
      hasPin: Boolean(summary?.hasPin),
      refreshSummary,
      refreshCreditsAndSummary,
      createWallet,
    }),
    [createWallet, loading, refreshCreditsAndSummary, refreshSummary, refreshing, summary]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};