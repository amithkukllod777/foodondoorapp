/**
 * SearchResults — full search results page
 * Route: /search?q=...
 */
import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { ChevronLeft, Search as SearchIcon } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import ExploreGrid from "@/components/ExploreGrid";
import { dbProductToFrontend, type Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";

type SortOption = "relevance" | "price-asc" | "price-desc" | "rating";

const sortLabels: { key: SortOption; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Rating" },
];

function sortProducts(products: Product[], sort: SortOption): Product[] {
  if (sort === "relevance") return products;
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return sorted;
  }
}

export default function SearchResults() {
  const search = useSearch();
  const query = new URLSearchParams(search).get("q")?.trim() || "";
  const [sort, setSort] = useState<SortOption>("relevance");

  const { data: dbResults = [], isLoading } = trpc.products.list.useQuery(
    { search: query },
    { enabled: query.length >= 1 }
  );

  const products = useMemo(() => {
    const mapped = dbResults.map(dbProductToFrontend);
    return sortProducts(mapped, sort);
  }, [dbResults, sort]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={query ? `Search: "${query}" - Nutriwow` : "Search - Nutriwow"}
        description={`Search results for "${query}" on Nutriwow. Find premium dry fruits, nuts, seeds and healthy snacks.`}
        url={`/search?q=${encodeURIComponent(query)}`}
        noIndex
      />
      <AnnouncementBar />
      <Header />

      {/* Breadcrumb + header */}
      <div className="bg-background/95 backdrop-blur py-4 sticky top-0 z-30 shadow-clay-sm">
        <div className="container">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft size={16} />
              Home
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm font-semibold text-foreground">Search</span>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="py-6">
          <div className="container mb-4">
            {/* Title & count */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground font-serif mb-1">
                {query ? (
                  <>Showing results for "<span className="text-primary">{query}</span>"</>
                ) : (
                  "Search Products"
                )}
              </h1>
              {query && !isLoading && (
                <p className="text-sm text-muted-foreground">
                  {products.length} {products.length === 1 ? "product" : "products"} found
                </p>
              )}
            </div>

            {/* Sort pills */}
            {products.length > 0 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {sortLabels.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                      sort === key
                        ? "bg-primary text-primary-foreground shadow-clay-pressed"
                        : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5 hover:text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && query && (
            <ExploreGrid title="" products={[]} loading />
          )}

          {/* Results */}
          {!isLoading && products.length > 0 && (
            <ExploreGrid title="" products={products} />
          )}

          {/* Empty state */}
          {!isLoading && query && products.length === 0 && (
            <div className="container py-16 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-clay-butter flex items-center justify-center shadow-clay mb-6">
                <SearchIcon size={40} className="text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-bold text-foreground font-serif mb-2">
                No products found
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                We couldn't find any products matching "<strong>{query}</strong>". Try a different search term or browse our categories.
              </p>
              <Link
                href="/collections/all"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 transition-all"
              >
                Browse All Products
              </Link>
            </div>
          )}

          {/* No query state */}
          {!query && (
            <div className="container py-16 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-clay-green flex items-center justify-center shadow-clay mb-6">
                <SearchIcon size={40} className="text-primary/50" />
              </div>
              <h2 className="text-xl font-bold text-foreground font-serif mb-2">
                Search for products
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Type a product name to find premium dry fruits, nuts, seeds and healthy snacks.
              </p>
              <Link
                href="/collections/all"
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 transition-all"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
