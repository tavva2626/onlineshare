import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage recent shares stored in localStorage.
 */
export function useRecentShares() {
  const STORAGE_KEY = 'codedrop-recent';
  const MAX_ITEMS = 10;

  const [shares, setShares] = useState(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shares));
  }, [shares]);

  const addShare = useCallback((share) => {
    setShares((prev) => {
      const filtered = prev.filter((s) => s.code !== share.code);
      return [share, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const removeShare = useCallback((code) => {
    setShares((prev) => prev.filter((s) => s.code !== code));
  }, []);

  const clearAll = useCallback(() => {
    setShares([]);
  }, []);

  return { shares, addShare, removeShare, clearAll };
}

/**
 * Hook for countdown timer.
 */
export function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetDate) return;
    const target = targetDate.toDate ? targetDate.toDate() : new Date(targetDate);

    const update = () => {
      const diff = target.getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return remaining;
}
