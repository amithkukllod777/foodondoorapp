import { createContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export interface UserAddress {
  id: number;
  customerId: number;
  name: string;
  phone: string;
  flat: string;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  mobile: string;
  customerId: number;    // DB primary key from customerProfiles
  name?: string;
  email?: string;
  addresses: UserAddress[];
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
  login: (userData: AuthUser) => void;
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string }) => void;
  setAddresses: (addresses: UserAddress[]) => void;
  addAddress: (addr: UserAddress) => void;
  updateAddress: (id: number, addr: Partial<UserAddress>) => void;
  deleteAddress: (id: number) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "nutriwow_session_v3"; // v3 = localStorage persistent

// Read session synchronously so user is available immediately on first render
function readSessionFromStorage(): AuthUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      if (parsed.mobile && parsed.customerId) return parsed;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from localStorage — no useEffect needed for initial load
  const [user, setUser] = useState<AuthUser | null>(() => readSessionFromStorage());
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // localStorage login kabhi expire nahi hota, par server ka session cookie
  // expire ho sakta hai. Cookie mar chuki ho to local session bhi clear karo —
  // warna user ko "logged in" dikhta hai par server reject karta hai.
  const utils = trpc.useUtils();
  const { data: session, dataUpdatedAt } = trpc.customer.session.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // Fresh login ke time ko track karo taaki login se PEHLE fetch hua stale
  // "invalid" result naye login ko turant logout na kar de.
  const [lastLoginAt, setLastLoginAt] = useState(0);
  useEffect(() => {
    if (user && session && !session.valid && dataUpdatedAt > lastLoginAt) {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
  }, [session, user, dataUpdatedAt, lastLoginAt]);

  const login = (userData: AuthUser) => {
    setUser(userData);
    setLastLoginAt(Date.now());
    // Naya cookie mila hai — purana cached session result (invalid) hata do
    utils.customer.session.reset();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    fetch("/api/trpc/customer.logout", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
  };

  const updateProfile = (data: { name?: string; email?: string }) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  };

  const setAddresses = (addresses: UserAddress[]) => {
    if (!user) return;
    const updated = { ...user, addresses };
    setUser(updated);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  };

  const addAddress = (addr: UserAddress) => {
    if (!user) return;
    let addresses = [...user.addresses];
    if (addr.isDefault) addresses = addresses.map(a => ({ ...a, isDefault: false }));
    addresses.push(addr);
    const updated = { ...user, addresses };
    setUser(updated);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  };

  const updateAddress = (id: number, addr: Partial<UserAddress>) => {
    if (!user) return;
    const addresses = user.addresses.map(a => {
      if (a.id === id) return { ...a, ...addr };
      if (addr.isDefault) return { ...a, isDefault: false };
      return a;
    });
    const updated = { ...user, addresses };
    setUser(updated);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  };

  const deleteAddress = (id: number) => {
    if (!user) return;
    const addresses = user.addresses.filter(a => a.id !== id);
    const updated = { ...user, addresses };
    setUser(updated);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)); } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      isLoginOpen,
      setIsLoginOpen,
      login,
      logout,
      updateProfile,
      setAddresses,
      addAddress,
      updateAddress,
      deleteAddress,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
