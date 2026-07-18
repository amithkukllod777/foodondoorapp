import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import type { Product } from "@/lib/products";

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
  loading?: boolean;
  onQuickShop?: (product: Product) => void;
}

export default function ProductSection({ title, products, viewAllLink, loading, onQuickShop }: ProductSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 260;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-6">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          {viewAllLink ? (
            <Link
              href={viewAllLink}
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View All
            </Link>
          ) : (
            <a
              href="#"
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View All
            </a>
          )}
        </div>

        {/* Product Carousel */}
        <div className="relative group/section">
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-clay rounded-full p-2 opacity-0 group-hover/section:opacity-100 transition-all active:translate-y-[calc(-50%+2px)] active:shadow-clay-pressed"
          >
            <ChevronLeft size={20} className="text-foreground" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 scroll-smooth"
          >
            {loading && products.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((product) => (
                  <ProductCard key={product.id} product={product} onQuickShop={onQuickShop} />
                ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card shadow-clay rounded-full p-2 opacity-0 group-hover/section:opacity-100 transition-all active:translate-y-[calc(-50%+2px)] active:shadow-clay-pressed"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
}
