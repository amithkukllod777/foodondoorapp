/*
 * Nutriwow Admin Store
 * Manages products and orders using localStorage for persistence
 * Updated to use new product schema: price (not salePrice), available (not inStock)
 */

import { bestsellers, trending, exploreMore } from "./products";

export interface AdminProduct {
  id: number;
  name: string;
  weight: string;
  price: number;
  originalPrice: number;
  discount: number;
  image: string;
  available: boolean;
  category: string;
  isBestseller: boolean;
  isTrending: boolean;
}

export interface AdminOrder {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { id: number; name: string; image: string; weight: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: "placed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  awbCode?: string | null;
  trackingUrl?: string | null;
  shippingProvider?: string | null;
  notes?: string | null;
  amountPaid?: number;
  refundedAmount?: number;
  refundStatus?: "none" | "partial" | "full" | "failed";
  source?: string | null; // "app" | "web" — order channel
}

const PRODUCTS_KEY = "nutriwow_admin_products";
const ORDERS_KEY = "nutriwow_admin_orders";

// Build initial products list from all sections
function buildInitialProducts(): AdminProduct[] {
  const all = [
    ...bestsellers.map((p) => ({ ...p, isBestseller: true, isTrending: false })),
    ...trending.map((p) => ({ ...p, isBestseller: false, isTrending: true })),
    ...exploreMore.map((p) => ({ ...p, isBestseller: false, isTrending: false })),
  ].map((p) => ({
    id: p.id,
    name: p.name,
    weight: p.weight,
    price: p.price,
    originalPrice: p.originalPrice,
    discount: p.discount,
    image: p.image,
    available: p.available,
    category: p.category,
    isBestseller: p.isBestseller,
    isTrending: p.isTrending,
  }));
  // Deduplicate by id
  const seen = new Set<number>();
  return all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// Generate mock orders for demo
function buildMockOrders(): AdminOrder[] {
  const statuses: AdminOrder["status"][] = ["placed", "processing", "shipped", "delivered", "delivered"];
  const names = ["Priya Sharma", "Rahul Gupta", "Anita Singh", "Vikram Patel", "Neha Joshi", "Amit Kumar", "Sunita Rao", "Deepak Mehta"];
  const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];
  const states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "Maharashtra", "West Bengal", "Gujarat"];
  const payments = ["UPI", "Card", "COD", "UPI", "UPI"];

  const products = buildInitialProducts().filter((p) => p.available);

  return Array.from({ length: 20 }, (_, i) => {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = Array.from({ length: itemCount }, () => {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      return { id: p.id, name: p.name, image: p.image, weight: p.weight, quantity: qty, price: p.price };
    });
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = subtotal >= 499 ? 0 : 49;
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const nameIdx = i % names.length;
    return {
      id: `NW${100001 + i}`,
      customerName: names[nameIdx],
      email: names[nameIdx].toLowerCase().replace(" ", ".") + "@example.com",
      phone: `98${String(Math.floor(10000000 + Math.random() * 89999999))}`,
      address: `${Math.floor(Math.random() * 999) + 1}, Sample Street`,
      city: cities[nameIdx % cities.length],
      state: states[nameIdx % states.length],
      pincode: String(400001 + nameIdx * 100),
      items,
      subtotal,
      shipping,
      discount: 0,
      total: subtotal + shipping,
      paymentMethod: payments[i % payments.length],
      status: statuses[i % statuses.length],
      createdAt: date.toISOString(),
    };
  });
}

// --- Products ---
export function getAdminProducts(): AdminProduct[] {
  try {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const initial = buildInitialProducts();
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initial));
  return initial;
}

export function saveAdminProducts(products: AdminProduct[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function addAdminProduct(product: Omit<AdminProduct, "id">): AdminProduct {
  const products = getAdminProducts();
  const newId = Math.max(0, ...products.map((p) => p.id)) + 1;
  const newProduct = { ...product, id: newId };
  saveAdminProducts([...products, newProduct]);
  return newProduct;
}

export function updateAdminProduct(updated: AdminProduct) {
  const products = getAdminProducts();
  saveAdminProducts(products.map((p) => (p.id === updated.id ? updated : p)));
}

export function deleteAdminProduct(id: number) {
  const products = getAdminProducts();
  saveAdminProducts(products.filter((p) => p.id !== id));
}

// --- Orders ---
export function getAdminOrders(): AdminOrder[] {
  try {
    const stored = localStorage.getItem(ORDERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const mock = buildMockOrders();
  localStorage.setItem(ORDERS_KEY, JSON.stringify(mock));
  return mock;
}

export function saveAdminOrders(orders: AdminOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function updateOrderStatus(orderId: string, status: AdminOrder["status"]) {
  const orders = getAdminOrders();
  saveAdminOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
}

// Save a new order from checkout (called from Checkout.tsx)
export function saveNewOrder(order: AdminOrder) {
  const orders = getAdminOrders();
  saveAdminOrders([order, ...orders]);
}

// --- Stats ---
export function getAdminStats() {
  const orders = getAdminOrders();
  const products = getAdminProducts();
  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "placed" || o.status === "processing").length;
  const totalProducts = products.length;
  const inStockProducts = products.filter((p) => p.available).length;
  const outOfStockProducts = products.filter((p) => !p.available).length;

  // Revenue by day (last 7 days)
  const revenueByDay: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const dayOrders = orders.filter((o) => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString() && o.status !== "cancelled";
    });
    revenueByDay.push({ date: dateStr, revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length });
  }

  // Top products by order count
  const productCount: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productCount[item.id]) productCount[item.id] = { name: item.name, count: 0, revenue: 0 };
      productCount[item.id].count += item.quantity;
      productCount[item.id].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, data]) => ({ id: Number(id), ...data }));

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    totalProducts,
    inStockProducts,
    outOfStockProducts,
    revenueByDay,
    topProducts,
  };
}
