import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "nutriwow_wishlist";

interface WishlistContextType {
  wishlistIds: number[];
  toggleWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function readLocalWishlist(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function writeLocalWishlist(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [localIds, setLocalIds] = useState<number[]>(readLocalWishlist);
  const hasMerged = useRef(false);

  // Fetch DB wishlist for logged-in users
  const utils = trpc.useUtils();
  const { data: dbIds } = trpc.wishlist.list.useQuery(undefined, {
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const toggleMutation = trpc.wishlist.toggle.useMutation({
    onSuccess: () => { utils.wishlist.list.invalidate(); },
  });

  const mergeMutation = trpc.wishlist.merge.useMutation({
    onSuccess: () => {
      utils.wishlist.list.invalidate();
      // Clear local storage after merge
      writeLocalWishlist([]);
      setLocalIds([]);
    },
  });

  // Merge localStorage wishlist into DB when user logs in
  useEffect(() => {
    if (isLoggedIn && !hasMerged.current) {
      const local = readLocalWishlist();
      if (local.length > 0) {
        mergeMutation.mutate({ productIds: local });
      }
      hasMerged.current = true;
    }
    if (!isLoggedIn) {
      hasMerged.current = false;
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const wishlistIds = isLoggedIn ? (dbIds ?? []) : localIds;

  const toggleWishlist = useCallback((productId: number) => {
    if (isLoggedIn) {
      toggleMutation.mutate({ productId });
      // Optimistic update
      utils.wishlist.list.setData(undefined, (old) => {
        if (!old) return [productId];
        return old.includes(productId) ? old.filter(id => id !== productId) : [...old, productId];
      });
    } else {
      setLocalIds(prev => {
        const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
        writeLocalWishlist(next);
        return next;
      });
    }
  }, [isLoggedIn, toggleMutation, utils.wishlist.list]);

  const isInWishlistFn = useCallback((productId: number) => {
    return wishlistIds.includes(productId);
  }, [wishlistIds]);

  return (
    <WishlistContext.Provider value={{
      wishlistIds,
      toggleWishlist,
      isInWishlist: isInWishlistFn,
      wishlistCount: wishlistIds.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
