/*
 * Nutriwow - Home Page
 * Design: Soft Clay 3D (claymorphism)
 * Colors: Cream background (#FDF2E7), Peach primary (#FF8A4C), Warm brown text (#6B3E15), pastel clay tints
 * Typography: Baloo 2 (headings) + Poppins (body)
 */

import { useState, useMemo, useCallback, lazy, Suspense, startTransition } from "react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useAuth } from "@/hooks/useAuth";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import WhyChooseUs from "@/components/WhyChooseUs";
import CouponBanner from "@/components/CouponBanner";
import ProductSection from "@/components/ProductSection";
import ExploreGrid from "@/components/ExploreGrid";
const BlogSection = lazy(() => import("@/components/BlogSection"))
const Newsletter = lazy(() => import("@/components/Newsletter"))
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import QuickViewModal from "@/components/QuickViewModal";
import WhatsAppUnlock from "@/components/WhatsAppUnlock";
import { categories, dbProductToFrontend } from "@/lib/products";
import type { Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import SEO from "@/components/SEO";

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nutriwow",
    url: "https://www.nutriwow.in",
    logo: "https://www.nutriwow.in/nutriwow-logo.png",
    description: "Buy premium dry fruits, nuts, seeds & healthy snacks online. 100% natural, no preservatives. Free shipping above ₹499 across India.",
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: "wecare@nutriwow.in", telephone: "+91-95463-34633", availableLanguage: ["English", "Hindi"] },
    sameAs: ["https://www.instagram.com/nutriwowindia/", "https://www.facebook.com/nutriwowindia/"]
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nutriwow",
    url: "https://www.nutriwow.in",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://www.nutriwow.in/search?q={search_term_string}" },
      "query-input": "required name=search_term_string"
    }
  }
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const handleQuickShop = useCallback((product: Product) => setQuickViewProduct(product), []);
  const { isLoggedIn, user } = useAuth();

  // Single API call to fetch ALL homepage data (avoids 429 rate limiting from multiple parallel requests)
  const { data: homepageData, isError: homeError, refetch: homeRefetch } = trpc.homepage.getAll.useQuery();
  const homeLoading = !homepageData;

  // Category bar: admin-managed list, with emojis from the static map (default for new ones)
  const { data: catNames } = trpc.categories.list.useQuery();
  const categoryBar = useMemo(() => {
    const emojiMap = Object.fromEntries(categories.map((c) => [c.name, c.emoji]));
    const names = catNames?.length ? catNames : categories.map((c) => c.name);
    return names.map((name) => ({ name, emoji: emojiMap[name] || "🏷️" }));
  }, [catNames]);

  const { data: categoryDbProducts = [], isLoading: catLoading } = trpc.products.byCategory.useQuery(
    { category: activeCategory || "", limit: 50 },
    { enabled: !!activeCategory }
  );

  const carouselSlides = homepageData?.carousel as any[] | undefined;
  const bestsellers = useMemo(() => (homepageData?.bestseller || []).map(dbProductToFrontend), [homepageData]);
  const trending = useMemo(() => (homepageData?.trending || []).map(dbProductToFrontend), [homepageData]);
  const featured = useMemo(() => (homepageData?.featured || []).map(dbProductToFrontend), [homepageData]);
  const exploreMore = useMemo(() => (homepageData?.explore || []).map(dbProductToFrontend), [homepageData]);
  const categoryProducts = useMemo(() => categoryDbProducts.map(dbProductToFrontend), [categoryDbProducts]);

  // Recently viewed products
  const { recentIds } = useRecentlyViewed();
  const { data: recentDbProducts = [] } = trpc.products.bulkByIds.useQuery(
    { ids: recentIds },
    { enabled: recentIds.length > 0 }
  );
  const recentlyViewedProducts = useMemo(() => {
    const mapped = recentDbProducts.map(dbProductToFrontend);
    // Preserve the order from recentIds
    const byId = new Map(mapped.map((p) => [p.id, p]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as ReturnType<typeof dbProductToFrontend>[];
  }, [recentDbProducts, recentIds]);

  const showFiltered = activeCategory !== null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Buy Dry Fruits & Nuts Online | Nutriwow"
        description="Buy premium dry fruits, nuts, seeds & healthy snacks online. 100% natural, no preservatives. Free shipping above ₹499 across India. Shop cashews, almonds, dates & more."
        url="/"
        keywords="dry fruits online, buy nuts online India, premium almonds, cashews, dates, makhana, healthy snacks, Nutriwow"
        jsonLd={HOME_JSON_LD}
      />
      <AnnouncementBar />
      <Header />

      {/* Category Bar - Horizontal scrollable */}
      <section className="bg-background/95 backdrop-blur py-3 sticky top-0 z-30 shadow-clay-sm">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 lg:justify-between">
            <button
              onClick={() => startTransition(() => setActiveCategory(null))}
              className={`flex flex-col items-center justify-center gap-1 min-w-[72px] lg:flex-1 px-2 py-2 rounded-2xl transition-all flex-shrink-0 ${
                !activeCategory
                  ? "bg-primary text-primary-foreground shadow-clay-pressed"
                  : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
              }`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">All</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => startTransition(() => setActiveCategory(activeCategory === cat.name ? null : cat.name))}
                className={`flex flex-col items-center justify-center gap-1 min-w-[72px] lg:flex-1 px-2 py-2 rounded-2xl transition-all flex-shrink-0 ${
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground shadow-clay-pressed"
                    : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[11px] font-semibold whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoggedIn && user?.name && (
        <div className="container pt-4">
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user.name.split(" ")[0]}</span>! 👋
          </p>
        </div>
      )}

      <main className="flex-1">
        {homeError && !homepageData ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-muted-foreground">Something went wrong loading products.</p>
            <button
              onClick={() => homeRefetch()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl shadow-clay-btn hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : showFiltered ? (
          /* Category filtered view */
          <div className="py-6">
            <div className="container mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{activeCategory}</h2>
                  <p className="text-sm text-muted-foreground">{categoryProducts.length} products</p>
                </div>
                <button
                  onClick={() => startTransition(() => setActiveCategory(null))}
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  Clear Filter ✕
                </button>
              </div>
            </div>
            <ExploreGrid title="" products={categoryProducts} loading={catLoading} />
          </div>
        ) : (
          /* Default home view */
          <>
            <HeroCarousel slides={carouselSlides} />
            <WhyChooseUs />
            <ProductSection title="Bestseller" products={bestsellers} viewAllLink="/collections/bestseller" loading={homeLoading} onQuickShop={handleQuickShop} />
            <div className="container my-4"><WhatsAppUnlock /></div>
            <CouponBanner />
            <ProductSection title="Trending" products={trending} viewAllLink="/collections/trending" loading={homeLoading} onQuickShop={handleQuickShop} />
            {featured.length > 0 && (
              <>
                <div className="h-4" />
                <ProductSection title="Featured" products={featured} viewAllLink="/collections/all" onQuickShop={handleQuickShop} />
              </>
            )}
            <div className="h-4" />
            <ExploreGrid title="Explore More Products" products={exploreMore} viewAllLink="/collections/all" loading={homeLoading} />
            {recentlyViewedProducts.length > 0 && (
              <ProductSection title="Recently Viewed" products={recentlyViewedProducts} />
            )}
            <Suspense fallback={null}><BlogSection /></Suspense>
          </>
        )}
      </main>

      <Suspense fallback={null}><Newsletter /></Suspense>
      <Footer />
      <CartDrawer />
      <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
