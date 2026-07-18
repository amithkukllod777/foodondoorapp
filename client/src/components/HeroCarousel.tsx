import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { optImg } from "@/lib/img";
import HeroBanner from "./HeroBanner";

type Slide = {
  id: string;
  desktopImage: string;
  mobileImage?: string;
  link?: string;
  alt?: string;
};

/**
 * Homepage hero carousel. Slides are managed in Admin → Homepage and stored in
 * the `heroCarousel` store setting. When no slides are configured it falls back
 * to the default <HeroBanner/> so the homepage is never empty.
 */
const SLIDE_CACHE_KEY = "nw_hero_slides_v1";

export default function HeroCarousel({ slides: propSlides }: { slides?: Slide[] }) {
  // Last-known slides from localStorage so reloads render the carousel
  // instantly instead of flashing the old fallback banner while fetching.
  const [cached] = useState<Slide[] | null>(() => {
    try {
      const raw = localStorage.getItem(SLIDE_CACHE_KEY);
      return raw ? (JSON.parse(raw) as Slide[]) : null;
    } catch {
      return null;
    }
  });

  const slides = propSlides ?? cached ?? [];

  // Keep the cache fresh whenever real data arrives.
  useEffect(() => {
    if (propSlides?.length) {
      try { localStorage.setItem(SLIDE_CACHE_KEY, JSON.stringify(propSlides)); } catch {}
    }
  }, [propSlides]);

  const list = slides as Slide[];
  const count = list.length;
  const [idx, setIdx] = useState(0);

  const go = useCallback(
    (n: number) => {
      if (count === 0) return;
      setIdx(((n % count) + count) % count);
    },
    [count],
  );

  // Auto-advance every 5s (only with 2+ slides).
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  // Keep index valid if the slide set changes.
  useEffect(() => {
    if (idx >= count) setIdx(0);
  }, [count, idx]);

  // No slides yet and none cached → neutral skeleton.
  if (count === 0 && !propSlides) {
    return (
      <section className="w-full" aria-label="Hero Banner">
        <div className="w-full aspect-[2/1] sm:aspect-[3/1] bg-muted animate-pulse" />
      </section>
    );
  }

  // Fetched and genuinely no slides configured → show the default banner.
  if (count === 0) return <HeroBanner />;

  return (
    <section className="w-full relative overflow-hidden" aria-label="Hero Banner">
      {/* SEO H1 - visually hidden */}
      <h1 className="sr-only">
        Nutriwow – Buy Premium Dry Fruits, Nuts, Seeds &amp; Healthy Snacks Online in India
      </h1>

      <div className="relative">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {list.map((s, i) => {
            const img = (
              <div className="w-full overflow-hidden sm:aspect-[3/1]">
                <picture className="block w-full sm:h-full">
                  <source media="(min-width: 640px)" srcSet={optImg(s.desktopImage, 1600)} />
                  <img
                    src={optImg(s.mobileImage || s.desktopImage, 828)}
                    alt={s.alt || "Nutriwow – Premium Dry Fruits & Healthy Snacks"}
                    className="w-full h-auto sm:h-full object-cover block"
                    fetchPriority={i === 0 ? "high" : "low"}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </picture>
              </div>
            );
            return (
              <div key={s.id} className="w-full flex-shrink-0">
                {s.link
                  ? s.link.startsWith("http")
                    ? <a href={s.link} aria-label={s.alt || "Banner"}>{img}</a>
                    : <Link href={s.link} className="block">{img}</Link>
                  : img}
              </div>
            );
          })}
        </div>

        {/* CTA buttons — shown over every slide */}
        <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10 z-10 flex flex-wrap gap-3">
          <Link
            href="/collections/Nuts"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-clay-btn transition-all hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed"
          >
            Shop Now
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/collections/Combos"
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/40 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/30 transition-all hover:scale-105 active:scale-95 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]"
          >
            View Combos
          </Link>
        </div>

        {count > 1 && (
          <>
            <button
              onClick={() => go(idx - 1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground shadow-clay rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => go(idx + 1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/90 hover:bg-card text-foreground shadow-clay rounded-full p-1.5 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {list.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === idx ? "w-6 bg-primary shadow-clay-sm" : "w-2 bg-card/70 hover:bg-card"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
