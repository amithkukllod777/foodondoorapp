/**
 * Admin Homepage Management — Control which products appear in each homepage section
 * Sections: Bestseller, Trending, Featured, New Arrivals
 */

import { useState, useMemo, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical, Search, ArrowUp, ArrowDown, Trash2, LayoutGrid } from "lucide-react";
import HeroCarouselManager from "@/components/admin/HeroCarouselManager";

const SECTION_TYPES = [
  { key: "bestseller", label: "Bestseller", emoji: "🏆" },
  { key: "trending", label: "Trending", emoji: "🔥" },
  { key: "featured", label: "Featured", emoji: "⭐" },
  { key: "new_arrivals", label: "New Arrivals", emoji: "🆕" },
];

export default function AdminHomepage() {
  const [activeSection, setActiveSection] = useState("bestseller");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch all sections data
  const { data: sectionProducts = [], refetch: refetchSection } = trpc.homepage.getSection.useQuery(
    { sectionType: activeSection }
  );

  // Fetch all products for search/add
  const { data: allProducts = [] } = trpc.products.list.useQuery({});

  // Mutations
  const addProduct = trpc.homepage.addProduct.useMutation({
    onSuccess: () => { refetchSection(); setSearchQuery(""); setShowSearch(false); },
  });
  const removeProduct = trpc.homepage.removeProduct.useMutation({
    onSuccess: () => refetchSection(),
  });
  // Reorder saves in the background; we DON'T refetch on success — the local
  // list below is the source of truth while editing, so the UI stays instant.
  const reorder = trpc.homepage.reorder.useMutation();

  // Local, optimistic copy of the section list so up/down/drag feel instant
  // (no waiting on the server round-trip). Re-synced whenever the server data
  // or the active section changes.
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  useEffect(() => { setLocalProducts(sectionProducts as any[]); }, [sectionProducts]);

  // Debounced save — rapid clicks collapse into one network write.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = (ids: (string | number)[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      reorder.mutate({ sectionType: activeSection, productIds: ids as any });
    }, 350);
  };

  // Filter products for search (exclude already added ones)
  const sectionProductIds = useMemo(() => new Set(sectionProducts.map((p: any) => p.id)), [sectionProducts]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allProducts
      .filter((p: any) => !sectionProductIds.has(p.id))
      .filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.handle?.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 10);
  }, [searchQuery, allProducts, sectionProductIds]);

  // Move product up/down — updates the UI instantly, saves in the background.
  const moveProduct = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localProducts.length) return;
    setLocalProducts((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      queueSave(next.map((p: any) => p.id));
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-green-600" />
              Homepage Products
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage which products appear in each section on the homepage
            </p>
          </div>
        </div>

        {/* Hero Carousel manager */}
        <HeroCarouselManager />

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto">
          {SECTION_TYPES.map((section) => (
            <button
              key={section.key}
              onClick={() => { setActiveSection(section.key); setShowSearch(false); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSection === section.key
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{section.emoji}</span>
              <span>{section.label}</span>
              {activeSection === section.key && (
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">
                  {sectionProducts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add Product Button + Search */}
        <div className="mb-4">
          {!showSearch ? (
            <Button
              onClick={() => setShowSearch(true)}
              variant="outline"
              className="border-dashed border-green-400 text-green-600 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product to {SECTION_TYPES.find(s => s.key === activeSection)?.label}
            </Button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-green-200 transition-all"
                      onClick={() => addProduct.mutate({ sectionType: activeSection, productId: product.id })}
                    >
                      <img
                        src={product.images?.[0] || product.image}
                        alt={product.name}
                        className="w-10 h-10 object-contain rounded bg-white border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">₹{(product.price / 100).toFixed(0)} • {product.category}</p>
                      </div>
                      <Plus className="w-4 h-4 text-green-600 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-3">No products found</p>
              )}
            </div>
          )}
        </div>

        {/* Product List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {localProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No products in this section</p>
              <p className="text-sm mt-1">Click "Add Product" to start adding products</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {localProducts.map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Sort Order */}
                  <div className="flex flex-col items-center gap-0.5 text-gray-300">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-[10px] font-bold text-gray-400">{index + 1}</span>
                  </div>

                  {/* Product Image */}
                  <img
                    src={product.images?.[0] || product.image}
                    alt={product.name}
                    className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0"
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      ₹{(product.price / 100).toFixed(0)} • {product.category} • {product.weight || "N/A"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveProduct(index, "up")}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveProduct(index, "down")}
                      disabled={index === localProducts.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct.mutate({ sectionType: activeSection, productId: product.id })}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Products will appear on the homepage in the order shown above. 
            Use the arrow buttons to reorder. Changes are saved automatically.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
