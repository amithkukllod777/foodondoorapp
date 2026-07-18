import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { optImg } from "@/lib/img";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { useMemo } from "react";

interface ExploreGridProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
  loading?: boolean;
}

export default function ExploreGrid({ title, products, viewAllLink, loading }: ExploreGridProps) {
  const { addToCart } = useCart();

  // Bulk stock check for all products in the grid
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: stockData = [] } = trpc.stock.getBulk.useQuery(
    { productIds },
    { enabled: productIds.length > 0 }
  );
  const stockMap = useMemo(
    () => Object.fromEntries(stockData.map((s) => [s.productId, s])),
    [stockData]
  );

  const isOutOfStock = (product: Product) => {
    const entry = stockMap[product.id];
    return entry !== undefined ? entry.stock === 0 : !product.available;
  };

  const handleAdd = (product: Product) => {
    if (isOutOfStock(product)) return;
    addToCart(product);
    toast.success(`${product.name.slice(0, 30)}... added to cart!`);
  };

  return (
    <section className="py-6">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          {viewAllLink ? (
            <Link
              href={viewAllLink}
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View All
            </Link>
          ) : title ? (
            <a
              href="#"
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View All
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {loading && products.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <div key={`sk-${i}`} className="w-full bg-card rounded-3xl shadow-clay overflow-hidden flex flex-col animate-pulse">
                <div className="p-2 pt-3"><div className="w-full h-[140px] sm:h-[160px] bg-muted rounded-2xl" /></div>
                <div className="px-2 pb-2 space-y-1.5">
                  <div className="h-2 bg-muted rounded-full w-1/3" />
                  <div className="h-2.5 bg-muted rounded-full w-3/4" />
                  <div className="h-4 bg-muted rounded-full w-1/2 mt-1" />
                  <div className="h-7 bg-muted rounded-full w-full mt-1" />
                </div>
              </div>
            ))}
          {products.map((product) => {
            const outOfStock = isOutOfStock(product);
            return (
              <div key={product.id} className="w-full">
                <div className="bg-card rounded-3xl shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all duration-300 overflow-hidden flex flex-col h-full group relative">
                  {/* Out of Stock overlay — pointer-events-none so the card stays clickable */}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-background/40 z-20 flex items-start justify-center pt-6 rounded-3xl pointer-events-none">
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-clay-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative p-2 pt-3">
                    {product.discount > 0 && (
                      <div className="absolute top-2 right-2 z-10 gold-shimmer rounded-full px-2 py-0.5 text-[10px] font-bold shadow-clay-sm">
                        {product.discount}% OFF
                      </div>
                    )}
                    <Link href={`/products/${product.handle}`} className="block">
                      <img
                        src={optImg((product as any).images?.[0] || product.image, 384)}
                        alt={product.name}
                        className="w-full h-[140px] sm:h-[160px] object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="px-2 pb-2 flex flex-col flex-1">
                    <p className="text-[10px] text-nutrigold font-semibold mb-0.5 uppercase tracking-wide">Nutriwow</p>
                    <Link
                      href={`/products/${product.handle}`}
                      className="text-[11px] font-medium text-foreground line-clamp-2 hover:text-primary transition-colors mb-1.5 leading-relaxed"
                    >
                      {product.name}
                    </Link>

                    {product.weight && (
                      <div className="mb-1.5">
                        <span className="inline-block text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {product.weight}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mb-1.5 mt-auto flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        ₹{product.price}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 line-through">
                        ₹{product.originalPrice}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdd(product)}
                      disabled={outOfStock}
                      className={`w-full py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        outOfStock
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed"
                      }`}
                    >
                      {outOfStock ? "Out of Stock" : "+ ADD"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
