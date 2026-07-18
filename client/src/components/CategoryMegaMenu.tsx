/*
 * Desktop "Shop by Categories" mega-menu (Happilo-style). Fetches the
 * admin-managed category tree (categories.getTree) and renders categories as
 * columns with their subcategories. Category → /collections/<cat>;
 * subcategory → /collections/<cat>?sub=<sub>.
 */
import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, Gift } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Node = { category: string; subcategories: string[] };

// Shown instantly so the menu never lags while the API loads; replaced by the
// admin-managed tree once the query resolves (cached, so no refetch on nav).
const DEFAULT_TREE: Node[] = [
  { category: "Nuts", subcategories: ["Almonds", "Cashews", "Pistachios", "Walnuts"] },
  { category: "Seeds", subcategories: ["Chia", "Flax", "Pumpkin", "Sunflower", "Watermelon"] },
  { category: "Berries", subcategories: ["Raisins", "Cranberries"] },
  { category: "Dates", subcategories: ["Omani", "Khajur"] },
  { category: "Combos", subcategories: [] },
  { category: "Snacks", subcategories: ["Soya Chaap"] },
  { category: "Makhana", subcategories: [] },
  { category: "Healthy Mix", subcategories: [] },
  { category: "Exotic Dried Fruits", subcategories: [] },
];

export default function CategoryMegaMenu() {
  const { data } = trpc.categories.getTree.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 min — tree rarely changes
    gcTime: 60 * 60 * 1000,
  });
  const tree: Node[] = (data && data.length ? (data as Node[]) : DEFAULT_TREE);
  const [open, setOpen] = useState(false);
  if (!tree.length) return null;

  return (
    <div className="hidden lg:block border-t border-border/40 bg-background">
      <div className="container">
        <nav className="flex items-center gap-1" onMouseLeave={() => setOpen(false)}>
          {/* Shop by Categories — opens the mega panel */}
          <div className="relative" onMouseEnter={() => setOpen(true)}>
            <button className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Shop by Categories
              <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="absolute top-full left-0 z-50 bg-card shadow-clay-lg rounded-2xl p-6 grid grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-5 min-w-[700px] max-w-[860px]">
                {tree.map((cat) => (
                  <div key={cat.category} className="min-w-0">
                    <Link
                      href={`/collections/${encodeURIComponent(cat.category)}`}
                      onClick={() => setOpen(false)}
                      className="block text-[15px] font-bold text-primary mb-2 hover:underline"
                    >
                      {cat.category}
                    </Link>
                    <div className="flex flex-col gap-1.5">
                      {cat.subcategories.length === 0 ? (
                        <Link
                          href={`/collections/${encodeURIComponent(cat.category)}`}
                          onClick={() => setOpen(false)}
                          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          View all
                        </Link>
                      ) : (
                        cat.subcategories.map((sub) => (
                          <Link
                            key={sub}
                            href={`/collections/${encodeURIComponent(cat.category)}?sub=${encodeURIComponent(sub)}`}
                            onClick={() => setOpen(false)}
                            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {sub}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top-level shortcuts */}
          <Link href="/collections/bestseller" className="px-3 py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors">Bestsellers</Link>
          <Link href="/collections/trending" className="px-3 py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors">Trending</Link>
          <Link href="/gifting" className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-nutriorange hover:brightness-110 transition-all">
            <Gift size={15} /> Gifting
          </Link>
        </nav>
      </div>
    </div>
  );
}
