/**
 * CategoryPage — renders the Home page with a pre-selected category filter
 * Route: /category/:name
 */
import { useRoute } from "wouter";
import { useMemo, useState, useCallback, useEffect } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import ExploreGrid from "@/components/ExploreGrid";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import QuickViewModal from "@/components/QuickViewModal";
import SEO, { buildCategoryJsonLd, buildBreadcrumbJsonLd } from "@/components/SEO";
import { categories, dbProductToFrontend } from "@/lib/products";
import type { Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { ChevronRight, X } from "lucide-react";

export default function CategoryPage() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const handleQuickShop = useCallback((product: Product) => setQuickViewProduct(product), []);
  const [, params] = useRoute("/collections/:name");
  const categoryName = params?.name ? decodeURIComponent(params.name) : "";
  const search = useSearch();
  const subFilter = new URLSearchParams(search).get("sub")?.trim() || "";

  // Special collections: bestseller, trending, and all use dedicated queries
  const isBestsellerCollection = categoryName.toLowerCase() === "bestseller";
  const isTrendingCollection = categoryName.toLowerCase() === "trending";
  const isAllCollection = categoryName.toLowerCase() === "all";
  const isSpecialCollection = isBestsellerCollection || isTrendingCollection || isAllCollection;

  // Fetch products from DB by category (only for regular categories)
  const { data: dbProducts = [] } = trpc.products.byCategory.useQuery(
    { category: categoryName, limit: 100 },
    { enabled: !!categoryName && !isSpecialCollection }
  );
  const { data: allDbProducts = [] } = trpc.products.list.useQuery(
    {},
    { enabled: !categoryName || isAllCollection }
  );
  // Special: bestsellers
  const { data: bestsellersDb = [] } = trpc.products.bestsellers.useQuery(
    { limit: 100 },
    { enabled: isBestsellerCollection }
  );
  // Special: trending
  const { data: trendingDb = [] } = trpc.products.trending.useQuery(
    { limit: 100 },
    { enabled: isTrendingCollection }
  );

  // Sort & filter state
  const [sortBy, setSortBy] = useState("relevance");
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);

  const sortOptions = [
    { key: "relevance", label: "Relevance" },
    { key: "price-asc", label: "Price: Low to High" },
    { key: "price-desc", label: "Price: High to Low" },
    { key: "newest", label: "Newest First" },
    { key: "rating", label: "Rating" },
    { key: "discount", label: "Discount" },
  ] as const;

  const priceRanges: { label: string; range: [number, number] }[] = [
    { label: "Under ₹200", range: [0, 200] },
    { label: "₹200–₹500", range: [200, 500] },
    { label: "₹500–₹1000", range: [500, 1000] },
    { label: "Above ₹1000", range: [1000, Infinity] },
  ];

  const activeFilterCount =
    (priceRange ? 1 : 0) + (inStockOnly ? 1 : 0) + (sortBy !== "relevance" ? 1 : 0);

  const clearAll = useCallback(() => {
    setSortBy("relevance");
    setPriceRange(null);
    setInStockOnly(false);
  }, []);

  const categoryProducts = useMemo(() => {
    let list;
    if (isBestsellerCollection) list = bestsellersDb.map(dbProductToFrontend);
    else if (isTrendingCollection) list = trendingDb.map(dbProductToFrontend);
    else if (isAllCollection) list = allDbProducts.map(dbProductToFrontend);
    else list = (categoryName ? dbProducts : allDbProducts).map(dbProductToFrontend);
    // Subcategory filter (?sub=) — match the keyword in the product name
    if (subFilter) {
      const q = subFilter.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    // Price range filter (both ranges and p.price are in rupees)
    if (priceRange) {
      const [min, max] = priceRange;
      list = list.filter((p) => p.price >= min && p.price <= max);
    }
    // In-stock filter
    if (inStockOnly) {
      list = list.filter((p) => p.available);
    }
    // Sort
    if (sortBy !== "relevance") {
      list = [...list].sort((a, b) => {
        switch (sortBy) {
          case "price-asc": return a.price - b.price;
          case "price-desc": return b.price - a.price;
          case "newest": return b.id - a.id;
          case "rating": return b.rating - a.rating;
          case "discount": return b.discount - a.discount;
          default: return 0;
        }
      });
    }
    return list;
  }, [categoryName, subFilter, dbProducts, allDbProducts, bestsellersDb, trendingDb, isBestsellerCollection, isTrendingCollection, isAllCollection, sortBy, priceRange, inStockOnly]);

  // --- Load More pagination ---
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset visible count when category or sub-filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [categoryName, subFilter]);

  const totalProducts = categoryProducts.length;
  const hasMore = visibleCount < totalProducts;
  const displayedProducts = useMemo(
    () => categoryProducts.slice(0, visibleCount),
    [categoryProducts, visibleCount]
  );

  const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  // Display name for special collections
  const baseName = isBestsellerCollection
    ? "Bestsellers"
    : isTrendingCollection
    ? "Trending"
    : isAllCollection
    ? "All Products"
    : (category?.name || categoryName);
  const displayName = subFilter ? `${baseName} · ${subFilter}` : baseName;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${displayName} - Buy Premium ${displayName} Online`}
        description={`Buy premium ${displayName.toLowerCase()} online from Nutriwow. ${categoryProducts.length}+ products available. 100% natural, no preservatives. Free shipping across India.`}
        url={`/collections/${encodeURIComponent(categoryName)}`}
        keywords={`${displayName.toLowerCase()} online India, buy ${displayName.toLowerCase()}, premium ${displayName.toLowerCase()}, nutriwow ${displayName.toLowerCase()}`}
        jsonLd={[
          buildCategoryJsonLd(displayName, categoryProducts.length),
          buildBreadcrumbJsonLd(
            subFilter
              ? [
                  { name: "Home", url: "/" },
                  { name: baseName, url: `/collections/${encodeURIComponent(categoryName)}` },
                  { name: subFilter, url: `/collections/${encodeURIComponent(categoryName)}?sub=${encodeURIComponent(subFilter)}` },
                ]
              : [
                  { name: "Home", url: "/" },
                  { name: displayName, url: `/collections/${encodeURIComponent(categoryName)}` },
                ]
          ),
        ]}
      />
      <AnnouncementBar />
      <Header />

      {/* Category header */}
      <div className="bg-background/95 backdrop-blur py-4 sticky top-0 z-30 shadow-clay-sm">
        <div className="container">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={12} />
            {subFilter ? (
              <>
                <Link href={`/collections/${encodeURIComponent(categoryName)}`} className="hover:text-primary transition-colors">
                  {baseName}
                </Link>
                <ChevronRight size={12} />
                <span className="text-foreground font-medium">{subFilter}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">{displayName}</span>
            )}
          </nav>
        </div>
      </div>

      {/* Category bar — horizontal scroll */}
      <section className="bg-background py-3">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 lg:justify-between">
            <Link
              href="/"
              className="flex flex-col items-center justify-center gap-1 min-w-[72px] lg:flex-1 px-2 py-2 rounded-2xl transition-all flex-shrink-0 bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
            >
              <span className="text-xl">🏠</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">All</span>
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/collections/${encodeURIComponent(cat.name)}`}
                className={`flex flex-col items-center justify-center gap-1 min-w-[72px] lg:flex-1 px-2 py-2 rounded-2xl transition-all flex-shrink-0 ${
                  cat.name.toLowerCase() === categoryName.toLowerCase()
                    ? "bg-primary text-primary-foreground shadow-clay-pressed"
                    : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[11px] font-semibold whitespace-nowrap">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="py-6">
          <div className="container mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {isBestsellerCollection && <span className="mr-2">⚡</span>}
                  {isTrendingCollection && <span className="mr-2">🔥</span>}
                  {!isSpecialCollection && category?.emoji && <span className="mr-2">{category.emoji}</span>}
                  {displayName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {hasMore
                    ? `Showing ${displayedProducts.length} of ${totalProducts} products`
                    : `${totalProducts} products`}
                </p>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors bg-primary/10 rounded-full px-3 py-1.5 shadow-clay-sm"
                >
                  <X size={12} />
                  Clear All ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Sort pills */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Sort by</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(sortBy === opt.key ? "relevance" : opt.key)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0 ${
                      sortBy === opt.key
                        ? "bg-primary text-primary-foreground shadow-clay-pressed"
                        : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range + In-stock filter */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Price</p>
              {priceRanges.map((pr) => {
                const isActive = priceRange && priceRange[0] === pr.range[0] && priceRange[1] === pr.range[1];
                return (
                  <button
                    key={pr.label}
                    onClick={() => setPriceRange(isActive ? null : pr.range)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-clay-pressed"
                        : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                    }`}
                  >
                    {pr.label}
                  </button>
                );
              })}

              <span className="hidden sm:inline text-muted-foreground/30 mx-1">|</span>

              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0 ${
                  inStockOnly
                    ? "bg-primary text-primary-foreground shadow-clay-pressed"
                    : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                }`}
              >
                In Stock Only
              </button>
            </div>
          </div>
          <ExploreGrid title="" products={displayedProducts} />

          {/* Load More button */}
          {hasMore && (
            <div className="flex justify-center mt-6 mb-2">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="bg-card shadow-clay rounded-2xl px-6 py-3 text-sm font-semibold text-primary hover:shadow-clay-lg hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              >
                Load More (showing {displayedProducts.length} of {totalProducts})
              </button>
            </div>
          )}
        </div>
      </main>

      <Newsletter />
      <Footer />
      <CartDrawer />
      <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
