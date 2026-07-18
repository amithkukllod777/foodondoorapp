/**
 * BlogSection — Homepage blog preview
 * - Fetches latest 4 published blogs from DB via tRPC (blog.list)
 * - Horizontal swipe scroll on mobile (no extra load time)
 * - Click navigates to /blogs/news/:slug
 * - "View All" navigates to /blog
 */
import { useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { optImg, BLOG_FALLBACK_IMAGE } from "@/lib/img";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_IMAGE = BLOG_FALLBACK_IMAGE;

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  try {
    return new Date(d as string).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(d);
  }
}

export default function BlogSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: posts } = trpc.blog.list.useQuery(
    { limit: 4 },
    { staleTime: 5 * 60 * 1000 }
  );

  const blogs = posts ?? [];

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -280, behavior: "smooth" });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" });
  };

  if (blogs.length === 0) return null;

  return (
    <section className="py-8 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">New Reads</h2>
          <div className="flex items-center gap-2">
            {/* Scroll arrows — visible on mobile only */}
            <button
              onClick={scrollLeft}
              className="sm:hidden w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-clay-sm active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} className="text-foreground" />
            </button>
            <button
              onClick={scrollRight}
              className="sm:hidden w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-clay-sm active:translate-y-0.5 active:shadow-clay-pressed transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} className="text-foreground" />
            </button>
            <Link
              href="/blog"
              className="text-sm font-semibold text-primary hover:underline transition-colors"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Mobile: horizontal scroll | Desktop: grid */}
        <div
          ref={scrollRef}
          className="
            flex gap-4 overflow-x-auto pb-2
            sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0
            lg:grid-cols-4
          "
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {blogs.map((post) => (
            <Link
              key={post.id}
              href={`/blogs/news/${post.slug}`}
              className="
                group bg-card rounded-3xl overflow-hidden shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all block
                flex-shrink-0 w-[260px]
                sm:w-auto sm:flex-shrink
              "
            >
              <div className="overflow-hidden">
                <img
                  src={optImg(post.coverImage || DEFAULT_IMAGE, 384)}
                  alt={post.title}
                  className="w-full h-[160px] object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground/70 mb-2">
                  {formatDate(post.publishedAt || post.createdAt)}
                </p>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
