import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Truck, ShieldCheck, Leaf } from "lucide-react";
import { optImg } from "@/lib/img";

export default function HeroBanner() {
  return (
    <section className="w-full relative overflow-hidden" aria-label="Hero Banner">
      {/* SEO H1 - visually hidden but accessible to search engines */}
      <h1 className="sr-only">
        Nutriwow – Buy Premium Dry Fruits, Nuts, Seeds &amp; Healthy Snacks Online in India
      </h1>

      {/* Hero image with text overlay */}
      <div className="relative">
        <img
          src={optImg("https://d2xsxph8kpxj0f.cloudfront.net/310519663511606631/CdmiS9X3tpMWG6J8LrtNoP/hero-banner-Ya6bc5fLKg9U7nbVsAryz7.webp", 1920)}
          alt="Nutriwow – Premium Dry Fruits & Healthy Snacks"
          className="w-full h-auto object-cover min-h-[260px] sm:min-h-[340px]"
          fetchPriority="high"
        />

        {/* Very strong dark overlay — covers the baked-in image text on the left side */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.78) 35%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.08) 100%)",
          }}
        />

        {/* HTML Text + CTA overlay */}
        <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-10 pb-4 pt-4">
          {/* 100% Natural badge */}
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background: "rgba(201,168,76,0.20)",
                border: "1px solid rgba(201,168,76,0.80)",
                color: "#C9A84C",
              }}
            >
              🌿 100% Natural · No Preservatives
            </span>
          </div>

          {/* Main heading */}
          <div className="mb-2">
            <div
              className="text-2xl sm:text-4xl font-bold leading-tight"
              style={{ color: "#ffffff" }}
            >
              Premium Dry Fruits
            </div>
            <div
              className="text-2xl sm:text-4xl font-bold leading-tight"
              style={{ color: "#C9A84C" }}
            >
              &amp; Healthy Snacks
            </div>
          </div>

          {/* Subtitle */}
          <p
            className="text-xs sm:text-sm mb-5 max-w-[260px] sm:max-w-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Sourced from the finest farms. Delivered fresh to your door.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/collections/Nuts"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-clay-btn transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed"
            >
              Shop Now
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/collections/Combos"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/40 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
            >
              View Combos
            </Link>
          </div>
        </div>
      </div>

      {/* Trust badges strip below hero */}
      <div className="bg-background">
        <div className="container py-3">
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-foreground bg-card rounded-full px-3 py-1.5 shadow-clay-sm">
              <Truck size={16} className="text-nutrigreen" />
              <span className="font-semibold">Free Shipping</span>
              <span className="text-muted-foreground hidden sm:inline">on orders above ₹499</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground bg-card rounded-full px-3 py-1.5 shadow-clay-sm">
              <ShieldCheck size={16} className="text-nutrigreen" />
              <span className="font-semibold">FSSAI Certified</span>
              <span className="text-muted-foreground hidden sm:inline">100% safe &amp; hygienic</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground bg-card rounded-full px-3 py-1.5 shadow-clay-sm">
              <Leaf size={16} className="text-nutrigreen" />
              <span className="font-semibold">No Preservatives</span>
              <span className="text-muted-foreground hidden sm:inline">pure &amp; natural</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground bg-card rounded-full px-3 py-1.5 shadow-clay-sm">
              <span className="text-amber-500 font-bold text-sm">★</span>
              <span className="font-semibold">4.8/5 Rating</span>
              <span className="text-muted-foreground hidden sm:inline">10,000+ happy customers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
