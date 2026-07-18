import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect, lazy, Suspense, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";
// Landing page — eager so the home view (and its nav bar) paints without first
// waiting on a separate route chunk. Every other page is lazy so they stay out
// of the initial bundle that gates first paint.
import Home from "./pages/Home";
// Store pages — lazy (reached by navigation, not needed for the landing paint)
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Gifting = lazy(() => import("./pages/Gifting"));
const WishlistPage = lazy(() => import("./pages/Wishlist"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
import { GoogleSiteVerification, MarketingPixels } from "./components/SEO";
import CookieBanner from "./components/CookieBanner";
import ScrollToTopButton from "./components/ScrollToTop";
// Floating chat widget — lazy + deferred; it is never needed for first paint.
const WhatsAppChatbot = lazy(() => import("./components/WhatsAppChatbot"));
// Social proof toast — lazy; shows recent purchases for urgency
const SocialProofToast = lazy(() => import("./components/SocialProofToast"));
// Exit-intent popup — offers discount to bouncing visitors
const ExitIntentPopup = lazy(() => import("./components/ExitIntentPopup"));
const PWAInstallPrompt = lazy(() => import("./components/PWAInstallPrompt"));
import { usePageTracker } from "./hooks/usePageTracker";
import { useUtmCapture } from "./hooks/useUtm";
import { trpc } from "./lib/trpc";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Admin pages — lazy (shoppers never load these; keeps the public bundle small)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp"));
const WhatsAppTemplates = lazy(() => import("./pages/admin/WhatsAppTemplates"));
const WhatsAppCampaigns = lazy(() => import("./pages/admin/WhatsAppCampaigns"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const AdminEmailCampaigns = lazy(() => import("./pages/admin/AdminEmailCampaigns"));
const AdminHomepage = lazy(() => import("./pages/admin/AdminHomepage"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const BlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
// Secondary public pages — lazy (blog + policy pages, not the main shopping path)
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));

// Lightweight fallback shown while a lazy route chunk loads
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-nutrigreen rounded-full animate-spin" />
    </div>
  );
}

// Scroll to top on every route change (fixes SPA scroll position issue)
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

// Mobile-only app download banner — ek baar band kiya to dobara nahi aayega
// (localStorage). Banner dikhte waqt body par class lagti hai jisse WhatsApp
// button upar shift ho jata hai (chhupta nahi).
function AppDownloadBanner() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem('nw_app_banner_closed'); } catch { return true; }
  });

  const showing = visible && !location.startsWith('/admin');
  useEffect(() => {
    document.body.classList.toggle('has-app-banner', showing);
    return () => document.body.classList.remove('has-app-banner');
  }, [showing]);

  if (!showing) return null;

  const dismiss = () => {
    try { localStorage.setItem('nw_app_banner_closed', '1'); } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden pb-safe">
      <div className="mx-3 mb-3 rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3" style={{ background: "#1A1A1A", border: "1px solid #2E2E2E" }}>
        <img src="/icon-192.png" alt="Foodondoor" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Foodondoor App</p>
          <p className="text-[11px]" style={{ color: "#9E9E9E" }}>Better experience on the app</p>
        </div>
        <a
          href="https://play.google.com/store/apps/details?id=com.foodondoor.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          Download
        </a>
        <button onClick={dismiss} className="flex-shrink-0 text-gray-500 hover:text-gray-300 p-0.5 text-lg leading-none" aria-label="Close">×</button>
      </div>
    </div>
  );
}

// Capture ?ref=CODE from URL and store in localStorage for referral tracking
function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("nutriwow_ref_code", refCode.toUpperCase());
      // Clean the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
  return null;
}

// Guard: gate admin routes on the SERVER-validated admin session (admin.me),
// not a client-settable flag. While the check is in flight we render nothing to
// avoid flashing protected content; on failure we redirect to the login page.
function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const { data, isLoading } = trpc.admin.me.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }
  if (!data?.isAdmin) return <Redirect to="/admin/login" />;
  return <ErrorBoundary><Component /></ErrorBoundary>;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      {/* Store Routes */}
      <Route path="/" component={Home} />
      {/* Shopify-style URLs (primary) */}
      <Route path="/collections/:name" component={CategoryPage} />
      <Route path="/gifting" component={Gifting} />
      <Route path="/products/:handle" component={ProductDetail} />
      {/* Legacy redirects: old /category/ and /product/ → new Shopify-style */}
      <Route path="/category/:name">{(params: { name: string }) => <Redirect to={`/collections/${params.name}`} />}</Route>
      <Route path="/product/:id">{(params: { id: string }) => <Redirect to={`/products/${params.id}`} />}</Route>
      <Route path="/search" component={SearchResults} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />
      <Route path="/payment-status" component={PaymentStatus} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/blog" component={Blog} />
      {/* Shopify-style blog URLs (primary) */}
      <Route path="/blogs/news/:slug" component={BlogPost} />
      {/* Legacy redirect: /blog/:slug → /blogs/news/:slug */}
      <Route path="/blog/:slug">{(params: { slug: string }) => <Redirect to={`/blogs/news/${params.slug}`} />}</Route>
      <Route path="/track-order" component={TrackOrder} />
      {/* Policy Pages */}
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/refund-policy" component={RefundPolicy} />
      <Route path="/shipping-policy" component={ShippingPolicy} />
      <Route path="/return-policy" component={ReturnPolicy} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={() => <AdminGuard component={AdminDashboard} />} />
      <Route path="/admin/products" component={() => <AdminGuard component={AdminProducts} />} />
      <Route path="/admin/orders" component={() => <AdminGuard component={AdminOrders} />} />
      <Route path="/admin/coupons" component={() => <AdminGuard component={AdminCoupons} />} />
      <Route path="/admin/analytics" component={() => <AdminGuard component={AdminAnalytics} />} />
      <Route path="/admin/customers" component={() => <AdminGuard component={AdminCustomers} />} />
      <Route path="/admin/settings" component={() => <AdminGuard component={AdminSettings} />} />
      <Route path="/admin/settings/:tab" component={() => <AdminGuard component={AdminSettings} />} />
      <Route path="/admin/abandoned-carts" component={() => <AdminGuard component={AdminAbandonedCarts} />} />
      <Route path="/admin/whatsapp" component={() => <AdminGuard component={AdminWhatsApp} />} />
      <Route path="/admin/whatsapp/templates" component={() => <AdminGuard component={WhatsAppTemplates} />} />
      <Route path="/admin/whatsapp/campaigns" component={() => <AdminGuard component={WhatsAppCampaigns} />} />
      <Route path="/admin/email-campaigns" component={() => <AdminGuard component={AdminEmailCampaigns} />} />
      <Route path="/admin/homepage" component={() => <AdminGuard component={AdminHomepage} />} />
      <Route path="/admin/reviews" component={() => <AdminGuard component={AdminReviews} />} />
      <Route path="/admin/subscriptions" component={() => <AdminGuard component={AdminSubscriptions} />} />
      <Route path="/admin/blogs" component={() => <AdminGuard component={AdminBlogs} />} />
      <Route path="/admin/blogs/new" component={() => <AdminGuard component={BlogEditor} />} />
      <Route path="/admin/blogs/edit/:id" component={() => <AdminGuard component={BlogEditor} />} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function PageTracker() {
  usePageTracker();
  useUtmCapture();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <TooltipProvider>
                <ScrollToTop />
                <ReferralCapture />
                <PageTracker />
                <GoogleSiteVerification />
                <MarketingPixels />
                <Toaster />
                <Analytics />
                <Router />
                <ScrollToTopButton />
                <CookieBanner />
                <Suspense fallback={null}><WhatsAppChatbot /></Suspense>
                <Suspense fallback={null}><SocialProofToast /></Suspense>
                <Suspense fallback={null}><ExitIntentPopup /></Suspense>
                <Suspense fallback={null}><PWAInstallPrompt /></Suspense>
                <AppDownloadBanner />
                <SpeedInsights />
              </TooltipProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
