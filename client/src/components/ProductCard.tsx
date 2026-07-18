import { Zap, Flame, Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { optImg } from "@/lib/img";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import { toast } from "sonner";
import { useState, useMemo, memo } from "react";

interface ProductCardProps {
  product: Product;
  onQuickShop?: (product: Product) => void;
}

function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isLoggedIn, setIsLoginOpen } = useAuth();
  const [, navigate] = useLocation();
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const wishlisted = isInWishlist(product.id);

  const images = useMemo(() => {
    const imgs = (product.images && product.images.length > 0) ? product.images : [product.image];
    return imgs.filter(Boolean);
  }, [product.images, product.image]);
  const hasMultiple = images.length > 1;
  const swipe = useImageSwipe({ count: images.length, index: activeImage, onChange: setActiveImage });

  // DB-backed stock check
  const productIds = useMemo(() => [product.id], [product.id]);
  const { data: stockData } = trpc.stock.getBulk.useQuery({ productIds });
  const stockEntry = stockData?.[0];
  // If stock entry exists and is 0, show out of stock; otherwise fall back to product.available
  const isOutOfStock = stockEntry !== undefined ? stockEntry.stock === 0 : !product.available;

  const href = `/products/${product.handle}`;

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isOutOfStock) return;
    setAdding(true);
    addToCart(product);
    toast.success(`Added to cart!`);
    setTimeout(() => setAdding(false), 800);
  };

  const stepImage = (e: React.MouseEvent, dir: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage((prev) => Math.max(0, Math.min(prev + dir, images.length - 1)));
  };

  return (
    <div className="group relative bg-card rounded-3xl shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all duration-300 overflow-hidden flex flex-col w-[220px] sm:w-[240px] flex-shrink-0">
      {/* Whole-card click target — real <a> for SEO. Covers the non-image
          areas (name/price/padding); the image has its own swipe+tap surface
          on top of this. Left at default touch-action so the home product rows
          still scroll horizontally when dragged here. */}
      <Link href={href} className="absolute inset-0 z-[1]">
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* Top badges row (decorative — taps pass through to the card link) */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between pointer-events-none">
        {/* Bestseller / Trending badge */}
        <div className="flex flex-col gap-1">
          {product.isBestseller && (
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary-foreground bg-nutriorange shadow-clay-sm">
              <Zap size={10} />
              <span>Bestseller</span>
            </div>
          )}
          {product.isTrending && (
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-clay-brown bg-clay-pink shadow-clay-sm">
              <Flame size={10} />
              <span>Trending</span>
            </div>
          )}
          {product.isNew && (
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-clay-brown bg-clay-butter shadow-clay-sm">
              <span>New</span>
            </div>
          )}
        </div>



        {/* % OFF badge — gold premium style */}
        {product.discount > 0 && (
          <div className="gold-shimmer rounded-full px-2.5 py-1 text-xs font-semibold shadow-clay-sm">
            {product.discount}% OFF
          </div>
        )}
      </div>

      {/* Image */}
      <div className="relative p-3 pt-8 bg-muted/70">
        <img
          src={optImg(images[activeImage] || product.image, 640)}
          alt={product.name}
          width={320}
          height={180}
          className="w-full h-[180px] object-contain group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
          loading="lazy"
          decoding="async"
          draggable={false}
        />

        {/* Swipe + tap surface over the image. A tap opens the product page; a
            horizontal drag (touch or mouse) swipes through images instead.
            touch-action: pan-y keeps vertical page scroll working. */}
        <div
          className="absolute inset-0 z-[2]"
          style={{ touchAction: "pan-y" }}
          onPointerDown={swipe.onPointerDown}
          onPointerUp={swipe.onPointerUp}
          onClick={(e) => {
            if (swipe.consumeSwipe()) { e.preventDefault(); return; }
            navigate(href);
          }}
          role="link"
          aria-label={product.name}
        />

        {/* Prev / next arrows (desktop hover) */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => stepImage(e, -1)}
              disabled={activeImage === 0}
              className="absolute left-1 top-[46%] -translate-y-1/2 z-[3] w-7 h-7 flex items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-clay-sm opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Previous image"
            >
              <ChevronLeft size={15} className="text-foreground" />
            </button>
            <button
              type="button"
              onClick={(e) => stepImage(e, 1)}
              disabled={activeImage === images.length - 1}
              className="absolute right-1 top-[46%] -translate-y-1/2 z-[3] w-7 h-7 flex items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-clay-sm opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Next image"
            >
              <ChevronRight size={15} className="text-foreground" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-[3] flex gap-1 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${activeImage === i ? "w-3 bg-primary" : "w-1.5 bg-clay-brown/30"}`}
              />
            ))}
          </div>
        )}

        {/* Wishlist heart — always visible in image area */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isLoggedIn) { setIsLoginOpen(true); return; }
            toggleWishlist(product.id);
          }}
          className="absolute bottom-2 right-2 z-[3] w-8 h-8 flex items-center justify-center rounded-full bg-card/90 backdrop-blur-sm shadow-clay-sm hover:scale-110 transition-all"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={15} className={wishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 flex flex-col flex-1">
        <p className="text-[10px] text-nutrigold font-semibold mb-0.5 uppercase tracking-wide">Nutriwow</p>
        <Link
          href={href}
          className="relative z-[3] text-xs font-medium text-foreground line-clamp-2 hover:text-primary transition-colors mb-2 leading-relaxed"
        >
          {product.name}
        </Link>

        {/* Weight + Rating row */}
        <div className="flex items-center justify-between mb-2">
          <span className="inline-block text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {product.weight}
          </span>
          {product.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-nutrigold text-nutrigold" />
              <span className="text-[10px] font-semibold text-foreground">{product.rating.toFixed(1)}</span>
              {product.reviews > 0 && (
                <span className="text-[9px] text-muted-foreground/70">({product.reviews})</span>
              )}
            </div>
          )}
        </div>

        {/* Price — MRP strikethrough + discounted price */}
        <div className="flex items-baseline gap-1.5 mb-2 mt-auto flex-wrap">
          <span className="text-sm font-bold text-foreground">
            ₹{product.price}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-muted-foreground/70 line-through">
              MRP ₹{product.originalPrice}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || adding}
          className={`relative z-[3] w-full py-2 rounded-full text-xs font-bold transition-all ${
            isOutOfStock
              ? "bg-red-100 text-red-700 cursor-not-allowed shadow-clay-pressed border border-red-200"
              : adding
              ? "bg-primary/80 text-primary-foreground shadow-clay-pressed translate-y-0.5"
              : "bg-primary text-primary-foreground shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed"
          }`}
        >
          {isOutOfStock ? "Out of Stock" : adding ? "✓ Added!" : "+ ADD TO CART"}
        </button>
      </div>
    </div>
  );
}

export default memo(ProductCard);
