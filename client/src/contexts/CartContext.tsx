import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number, weight?: string) => void;
  updateQuantity: (productId: number, quantity: number, weight?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "nutriwow_cart";

function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const upsertAbandonedCart = trpc.abandonedCarts.upsert.useMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  // Track abandoned cart on any cart change (debounced 3s) — save to DB
  useEffect(() => {
    if (items.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        // Try to get phone from auth context stored in localStorage
        let phone: string | undefined;
        let name: string | undefined;
        const authData = localStorage.getItem("nutriwow_session_v3");
        if (authData) {
          const u = JSON.parse(authData);
          if (u?.mobile) {
            phone = u.mobile;
            name = u.name;
          }
        }
        // Stable anonymous id so a guest's cart is ONE row (dedup), not a new
        // row per change. Persists across visits until they clear storage.
        let sessionId = localStorage.getItem("nutriwow_cart_sid") || "";
        if (!sessionId) {
          sessionId = "web_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("nutriwow_cart_sid", sessionId);
        }
        upsertAbandonedCart.mutate({
          phone,
          name,
          sessionId,
          source: "web",
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.images?.[0] || "",
          })),
          total: items.reduce((s, i) => s + i.price * i.quantity, 0),
        });
      } catch {}
    }, 3000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [items]);

  const addToCart = (product: Product, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id && (item as any).weight === (product as any).weight);
      if (existing) {
        return prev.map((item) =>
          (item.id === product.id && (item as any).weight === (product as any).weight) ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    // Emit custom event for cart funnel tracking (listened in CartDrawer)
    window.dispatchEvent(new CustomEvent("nw:add_to_cart", { detail: { productId: product.id, price: product.price } }));
  };

  const removeFromCart = (productId: number, weight?: string) => {
    setItems((prev) => prev.filter((item) => {
      if (weight) {
        return !(item.id === productId && (item as any).weight === weight);
      }
      return item.id !== productId;
    }));
  };

  const updateQuantity = (productId: number, quantity: number, weight?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, weight);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (weight) {
          return (item.id === productId && (item as any).weight === weight) ? { ...item, quantity } : item;
        }
        return item.id === productId ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
