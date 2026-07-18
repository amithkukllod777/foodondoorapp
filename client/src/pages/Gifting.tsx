/**
 * Gifting Hub — curated gift hampers landing page.
 * Route: /gifting
 *
 * Products shown come from an admin-managed "Gifting" or "Hampers" category
 * (product decisions stay with the owner — just tag products into either
 * category). Until that's set up, bestsellers are shown as gift ideas so the
 * page is never empty. Corporate/bulk gifting is enquiry-based via WhatsApp.
 */
import { useMemo, useState, useCallback } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import ProductSection from "@/components/ProductSection";
import ExploreGrid from "@/components/ExploreGrid";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import QuickViewModal from "@/components/QuickViewModal";
import SEO, { buildBreadcrumbJsonLd } from "@/components/SEO";
import { dbProductToFrontend } from "@/lib/products";
import type { Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { Gift, Building2, Sparkles, Heart, MessageCircle } from "lucide-react";

const CORP_WHATSAPP =
  "https://wa.me/919243177706?text=" +
  encodeURIComponent("Hi Foodondoor! I'd like to enquire about corporate / bulk gifting.");

const OCCASIONS = [
  { label: "Diwali", emoji: "🪔" },
  { label: "Rakhi", emoji: "🎗️" },
  { label: "Corporate", emoji: "💼" },
  { label: "Birthday", emoji: "🎂" },
  { label: "Wedding", emoji: "💍" },
  { label: "Thank You", emoji: "🙏" },
];

export default function Gifting() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const handleQuickShop = useCallback((p: Product) => setQuickViewProduct(p), []);

  // Curated gift products from an admin "Gifting"/"Hampers" category, with a
  // bestseller fallback so the hub is never empty before the owner sets it up.
  const { data: giftingDb = [], isLoading: giftLoading } = trpc.products.byCategory.useQuery({ category: "Gifting", limit: 100 });
  const { data: hampersDb = [] } = trpc.products.byCategory.useQuery({ category: "Hampers", limit: 100 });
  const { data: bestsellersDb = [] } = trpc.products.bestsellers.useQuery({ limit: 24 });

  const giftingProducts = useMemo(() => {
    const seen = new Set<number>();
    const unique = [...giftingDb, ...hampersDb]
      .map(dbProductToFrontend)
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    if (unique.length > 0) return unique;
    return bestsellersDb.map(dbProductToFrontend); // fallback
  }, [giftingDb, hampersDb, bestsellersDb]);

  const usingFallback = giftingDb.length === 0 && hampersDb.length === 0;

  const under500 = useMemo(() => giftingProducts.filter((p) => p.price <= 500), [giftingProducts]);
  const midRange = useMemo(() => giftingProducts.filter((p) => p.price > 500 && p.price <= 1000), [giftingProducts]);
  const premium = useMemo(() => giftingProducts.filter((p) => p.price > 1000), [giftingProducts]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Gift Hampers & Corporate Gifting | Foodondoor"
        description="Premium dry-fruit gift hampers for Diwali, Rakhi, weddings, birthdays and corporate gifting. Curated, natural, beautifully packed. Free shipping across India."
        url="/gifting"
        keywords="dry fruit gift hampers, corporate gifting India, diwali gift box, rakhi gifts, premium gift hampers, nutriwow gifting"
        jsonLd={[
          buildBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Gifting", url: "/gifting" },
          ]),
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="container pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-clay-pink via-clay-peach to-clay-butter shadow-clay-lg p-8 sm:p-12">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-white/70 text-clay-brown text-[11px] font-bold px-3 py-1.5 rounded-full shadow-clay-sm mb-4">
                <Sparkles size={12} /> Curated Gift Hampers
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif text-clay-brown leading-tight">
                Gift wellness.<br />Gift Foodondoor.
              </h1>
              <p className="text-sm text-clay-brown/80 mt-3">
                Beautifully packed dry-fruit hampers for every occasion — festive, corporate, or just because. 100% natural, freshly packed, delivered across India.
              </p>
              <a
                href="#gift-collection"
                className="inline-flex items-center gap-2 mt-5 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold shadow-clay-btn hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              >
                <Gift size={16} /> Shop Gift Hampers
              </a>
            </div>
            <div className="absolute -right-6 -bottom-6 text-[9rem] opacity-20 select-none pointer-events-none">🎁</div>
          </div>
        </section>

        {/* Shop by occasion */}
        <section className="container mt-8">
          <h2 className="text-lg font-bold text-foreground font-serif mb-3">Shop by Occasion</h2>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {OCCASIONS.map((o) => (
              <a
                key={o.label}
                href="#gift-collection"
                className="flex flex-col items-center justify-center gap-1 min-w-[84px] px-3 py-3 rounded-2xl bg-card shadow-clay-sm hover:-translate-y-0.5 transition-all flex-shrink-0"
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{o.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Price-tier sections */}
        {under500.length > 0 && (
          <ProductSection title="Gifts Under ₹500" products={under500} loading={giftLoading} onQuickShop={handleQuickShop} />
        )}
        {midRange.length > 0 && (
          <ProductSection title="Gifts ₹500 – ₹1000" products={midRange} onQuickShop={handleQuickShop} />
        )}
        {premium.length > 0 && (
          <ProductSection title="Premium Hampers" products={premium} onQuickShop={handleQuickShop} />
        )}

        {/* Corporate / bulk gifting CTA */}
        <section className="container mt-8">
          <div className="rounded-3xl bg-gradient-to-r from-clay-green/40 to-clay-butter shadow-clay p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-clay-sm flex-shrink-0">
              <Building2 size={26} className="text-nutrigreen" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold font-serif text-clay-brown">Corporate & Bulk Gifting</h2>
              <p className="text-sm text-clay-brown/80 mt-1">
                Impress clients and teams with custom-branded dry-fruit hampers. Volume pricing, personalised packaging and pan-India delivery. Tell us your requirement and we'll craft a quote.
              </p>
            </div>
            <a
              href={CORP_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-2xl font-semibold shadow-clay-btn hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex-shrink-0"
            >
              <MessageCircle size={16} /> Enquire on WhatsApp
            </a>
          </div>
        </section>

        {/* Full gift collection grid */}
        <section id="gift-collection" className="mt-8 scroll-mt-24">
          <div className="container mb-2 flex items-center gap-2">
            <Heart size={16} className="text-nutriorange" />
            <h2 className="text-lg font-bold text-foreground font-serif">All Gift Ideas</h2>
          </div>
          {usingFallback && (
            <div className="container">
              <p className="text-xs text-muted-foreground mb-3">
                Our curated hampers are coming soon — here are some bestselling gift-worthy picks.
              </p>
            </div>
          )}
          <ExploreGrid title="" products={giftingProducts} loading={giftLoading} />
        </section>
      </main>

      <Newsletter />
      <Footer />
      <CartDrawer />
      <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
