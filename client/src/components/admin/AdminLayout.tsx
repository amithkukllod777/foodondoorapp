/*
 * Nutriwow Admin Panel - Shopify-style Layout
 * Design: Dark sidebar (#1c1c1e), white content area, green accent
 * Inspired by Shopify admin: clean, professional, data-dense
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "../../lib/trpc";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Tag,
  BarChart3,
  Store,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Settings,
  Users,
  MessageCircle,
  BookOpen,
  Home,
  Mail,
  MessageSquare,
  CalendarClock,
  Star,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Store",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
      { icon: ShoppingBag, label: "Orders", href: "/admin/orders" },
      { icon: Package, label: "Products", href: "/admin/products" },
      { icon: Home, label: "Homepage", href: "/admin/homepage" },
      { icon: Users, label: "Customers", href: "/admin/customers" },
      { icon: Star, label: "Reviews", href: "/admin/reviews" },
      { icon: CalendarClock, label: "Subscriptions", href: "/admin/subscriptions" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { icon: Tag, label: "Coupons", href: "/admin/coupons" },
      { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
      { icon: ShoppingCart, label: "Abandoned Carts", href: "/admin/abandoned-carts" },
      { icon: MessageCircle, label: "WhatsApp", href: "/admin/whatsapp" },
      { icon: Mail, label: "Email", href: "/admin/email-campaigns" },
      { icon: BookOpen, label: "Blog", href: "/admin/blogs" },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminLogout = trpc.admin.logout.useMutation();

  const handleLogout = async () => {
    // Clear the server-side admin session cookie, then leave the panel.
    try {
      await adminLogout.mutateAsync();
    } catch {
      // Even if the request fails, fall through to the login page.
    }
    window.location.href = "/admin/login";
  };

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full" style={{ background: "#1c1c1e" }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 flex-shrink-0">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#43A047] flex items-center justify-center flex-shrink-0">
            <Store size={14} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white">Nutriwow Admin</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-1.5">
              {group.label}
            </p>
            {group.items.map(({ icon: Icon, label, href }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5 text-[13px] font-medium transition-all ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/55 hover:bg-white/8 hover:text-white/90"
                  }`}
                >
                  <Icon size={15} className={active ? "text-[#43A047]" : ""} />
                  {label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#43A047]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-2 space-y-0.5">
        <Link
          href="/admin/settings"
          onClick={onClose}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all ${
            location.startsWith("/admin/settings")
              ? "bg-white/15 text-white"
              : "text-white/50 hover:bg-white/8 hover:text-white/80"
          }`}
        >
          <Settings size={15} className={location.startsWith("/admin/settings") ? "text-[#43A047]" : ""} />
          Settings
          {location.startsWith("/admin/settings") && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#43A047]" />}
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all"
        >
          <Store size={15} />
          View Store
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-white/50 hover:bg-red-500/15 hover:text-red-400 transition-all"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f6f6f7", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 h-full flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6 h-14 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-900 p-1 -ml-1"
          >
            <Menu size={20} />
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {title && (
              <div className="flex items-baseline gap-2">
                <h1 className="text-[15px] font-semibold text-gray-900 truncate">{title}</h1>
                {subtitle && <span className="text-xs text-gray-400 hidden sm:inline">{subtitle}</span>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions}
            <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-[#43A047] flex items-center justify-center text-white text-[11px] font-bold">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold text-gray-800 leading-none">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
