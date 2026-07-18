import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nutriwow_recently_viewed";
const MAX_ITEMS = 12;

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<number[]>(readIds);

  // Sync state if another tab changes localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecentIds(readIds());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const trackView = useCallback((productId: number) => {
    const current = readIds();
    const filtered = current.filter((id) => id !== productId);
    const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRecentIds(updated);
  }, []);

  return { recentIds, trackView };
}
