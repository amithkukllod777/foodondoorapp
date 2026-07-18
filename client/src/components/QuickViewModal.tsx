import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { X, Minus, Plus, Star, ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { optImg } from "@/lib/img";
import { toast } from "sonner";
import type { Product } from "@/lib/products";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const [qty, setQty] = useState(1);

  // Reset qty when product changes
  useEffect(() => {
    setQty(1);
  }, [product?.id]);

  // Body scroll lock
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [product]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!product) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [product, handleKeyDown]);

  if (!product) return null;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(product);
    }
    toast.success(`Added ${qty > 1 ? `${qty}x ` : ""}${product.name.slice(0, 30)}... to cart!`);
    onClose();
  };

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(product);
    }
    setIsCartOpen(true);
    onClose();
  };

  const imgSrc = product.images?.[0] || product.image;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl shadow-clay-lg max-w-lg w-full mx-4 p-6 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted text-foreground transition-colors shadow-clay-sm"
          aria-label="Close quick view"
        >
          <X size={16} />
        </button>

        {/* Layout: side-by-side on desktop, stacked on mobile */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Image */}
          <div className="sm:w-2/5 flex-shrink-0">
            <div className="bg-muted/50 rounded-2xl p-3 flex items-center justify-center">
              <img
                src={optImg(imgSrc, 480)}
                alt={product.name}
                className="w-full h-[180px] sm:h-[200px] object-contain"
              />
            </div>
          </div>

          {/* Details */}
          <div className="sm:w-3/5 flex flex-col">
            <p className="text-[10px] text-nutrigold font-semibold uppercase tracking-wide mb-1">
              Nutriwow
            </p>
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug mb-2 line-clamp-3">
              {product.name}
            </h3>

            {/* Price row */}
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-lg font-bold text-foreground">
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-muted-foreground/70 line-through">
                  MRP ₹{product.originalPrice}
                </span>
              )}
              {product.discount > 0 && (
                <span className="gold-shimmer rounded-full px-2 py-0.5 text-[10px] font-bold shadow-clay-sm">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={
                        i < Math.round(product.rating)
                          ? "fill-nutrigold text-nutrigold"
                          : "text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-foreground ml-1">
                  {product.rating.toFixed(1)}
                </span>
                {product.reviews > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({product.reviews} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Weight */}
            {product.weight && (
              <div className="mb-3">
                <span className="inline-block text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Weight: {product.weight}
                </span>
              </div>
            )}

            {/* Quantity selector */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-muted-foreground">Qty:</span>
              <div className="flex items-center bg-muted rounded-full shadow-clay-pressed">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-bold text-foreground">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-card transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              >
                <ShoppingCart size={14} />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold bg-nutriorange text-white shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              >
                Buy Now
              </button>
            </div>

            {/* View full details */}
            <Link
              href={`/products/${product.handle}`}
              onClick={onClose}
              className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors"
            >
              View Full Details
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
