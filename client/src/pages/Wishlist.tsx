import { Heart } from "lucide-react";
import { Link } from "wouter";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { useWishlist } from "@/contexts/WishlistContext";
import { trpc } from "@/lib/trpc";
import { dbProductToFrontend } from "@/lib/products";
import { useMemo } from "react";

export default function Wishlist() {
  const { wishlistIds } = useWishlist();

  // Fetch full product details for wishlisted items
  const { data: dbProducts, isLoading } = trpc.products.list.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  const wishlistProducts = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts
      .filter((p: any) => wishlistIds.includes(p.id))
      .map(dbProductToFrontend);
  }, [dbProducts, wishlistIds]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="My Wishlist" description="Your saved favourite products on Nutriwow" noIndex />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 container py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif mb-6">
          <Heart size={28} className="inline-block mr-2 text-red-500 fill-red-500 align-middle" />
          My Wishlist
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-nutrigreen border-t-transparent rounded-full animate-spin" />
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl shadow-clay">
            <Heart size={48} className="mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-lg font-bold text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Save your favourite products by tapping the heart icon
            </p>
            <Link
              href="/"
              className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm shadow-clay-btn hover:brightness-105 transition-all active:translate-y-0.5 active:shadow-clay-pressed"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''} saved
            </p>
            <div className="flex flex-wrap gap-4">
              {wishlistProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
