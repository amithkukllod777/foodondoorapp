/*
 * Foodondoor Admin - Products Page
 * Fully DB-backed via tRPC — no localStorage
 */

import { useState, useMemo, useRef } from "react";
import { Plus, Search, Edit2, Trash2, X, Package, CheckCircle2, XCircle, Boxes, Loader2, ExternalLink, Eye, EyeOff, Upload } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import CategoryTreeEditor from "@/components/admin/CategoryTreeEditor";
import ProductImageManager from "@/components/admin/ProductImageManager";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CATEGORIES = ["Nuts", "Seeds", "Berries", "Snacks", "Healthy Mix", "Exotic Dried Fruits", "Combos", "Dates", "Makhana"];

interface ProductForm {
  name: string;
  weight: string;
  price: number;
  mrp: number;
  discount: number;
  image: string;
  images: string[];
  available: boolean;
  status: "draft" | "published";
  category: string;
  isBestseller: boolean;
  isTrending: boolean;
  isNew: boolean;
  description: string;
  handle: string;
  // Metafields
  dietaryPreferences: string[];
  allergenInfo: string;
  nutType: string;
  processingMethod: string;
  foodProductForm: string;
  // Custom admin-defined metafields (Settings → Metafields)
  metafields: Record<string, string>;
  // Product details
  ingredients: string;
  nutritionalInfo: string;
  shelfLife: string;
  storageInfo: string;
}

const emptyForm: ProductForm = {
  name: "", weight: "", price: 0, mrp: 0, discount: 0,
  image: "", images: [], available: true, status: "published", category: "Nuts",
  isBestseller: false, isTrending: false, isNew: false,
  description: "", handle: "",
  // Metafields
  dietaryPreferences: [], allergenInfo: "", nutType: "",
  processingMethod: "", foodProductForm: "",
  metafields: {},
  // Product details
  ingredients: "", nutritionalInfo: "", shelfLife: "", storageInfo: "",
};

const DIETARY_OPTIONS = ["Vegan", "Vegetarian", "Gluten Free", "Sugar Free", "Keto Friendly", "Diabetic Friendly", "High Protein", "Organic"];
const PROCESSING_OPTIONS = ["Raw", "Roasted", "Salted", "Unsalted", "Dry Roasted", "Oil Roasted", "Flavoured", "Retort Processed"];
const FORM_OPTIONS = ["Whole", "Halves", "Sliced", "Chopped", "Powder", "Paste", "Pieces"];

interface DbProduct {
  id: number;
  name: string;
  handle: string;
  category: string;
  price: number;
  mrp: number;
  discount: number;
  weight: string | null;
  description: string | null;
  image: string;
  images: unknown;
  isBestseller: boolean;
  isTrending: boolean;
  isNew: boolean;
  available: boolean;
  status: "draft" | "published";
  rating: number;
  reviewCount: number;
  sortOrder: number;
  // Metafields
  dietaryPreferences?: unknown;
  allergenInfo?: string | null;
  nutType?: string | null;
  processingMethod?: string | null;
  foodProductForm?: string | null;
  metafields?: unknown;
  // Product details
  ingredients?: string | null;
  nutritionalInfo?: string | null;
  shelfLife?: string | null;
  storageInfo?: string | null;
}

function toForm(p: DbProduct): ProductForm {
  const dietaryPrefs = Array.isArray(p.dietaryPreferences)
    ? (p.dietaryPreferences as string[])
    : typeof p.dietaryPreferences === "string"
    ? JSON.parse(p.dietaryPreferences as string)
    : [];
  return {
    name: p.name,
    handle: p.handle,
    weight: p.weight || "",
    price: p.price,
    mrp: p.mrp,
    discount: p.discount,
    image: p.image,
    images: Array.isArray(p.images) ? (p.images as string[]) : [],
    available: p.available,
    status: p.status ?? "published",
    category: p.category,
    isBestseller: p.isBestseller,
    isTrending: p.isTrending,
    isNew: p.isNew,
    description: p.description || "",
    // Metafields
    dietaryPreferences: dietaryPrefs,
    allergenInfo: p.allergenInfo || "",
    nutType: p.nutType || "",
    processingMethod: p.processingMethod || "",
    foodProductForm: p.foodProductForm || "",
    metafields: (p.metafields && typeof p.metafields === "object" && !Array.isArray(p.metafields))
      ? (p.metafields as Record<string, string>) : {},
    // Product details
    ingredients: p.ingredients || "",
    nutritionalInfo: p.nutritionalInfo || "",
    shelfLife: p.shelfLife || "",
    storageInfo: p.storageInfo || "",
  };
}

function generateHandle(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProductFormPanel({ product, onClose, onSaved }: {
  product: DbProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(product ? toForm(product) : emptyForm);

  const utils = trpc.useUtils();
  const { data: catList } = trpc.categories.list.useQuery();
  const categoryOptions = catList?.length ? catList : CATEGORIES;
  // Admin-defined product metafields (Settings → Metafields)
  const { data: publicSettings } = trpc.settings.getPublic.useQuery();
  const customMetafieldDefs = ((publicSettings as { metafields?: { key: string; name: string }[] } | undefined)?.metafields) ?? [];
  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => { toast.success("Product added"); utils.products.adminList.invalidate(); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => { toast.success("Product updated"); utils.products.adminList.invalidate(); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const getUploadTokenMutation = trpc.products.getUploadToken.useMutation();

  // All images for new product (primary + extras)
  const allNewImages = [form.image, ...form.images].filter(Boolean);

  const syncNewImages = (imgs: string[]) => {
    setForm(prev => ({ ...prev, image: imgs[0] ?? "", images: imgs.slice(1) }));
  };

  const removeNewImage = (idx: number) => {
    const next = allNewImages.filter((_, i) => i !== idx);
    syncNewImages(next);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 8 - allNewImages.length;
    if (remaining <= 0) { toast.error("Maximum 8 images allowed"); return; }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) toast.warning(`Only ${remaining} slot(s) left — uploading first ${remaining}`);
    setImageUploading(true);
    try {
      const { put } = await import("@vercel/blob/client");
      const uploaded: string[] = [];
      for (const file of toUpload) {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} too large (max 20MB)`); continue; }
        const { token, pathname } = await getUploadTokenMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
        });
        const blob = await put(pathname, file, { access: "public", token });
        uploaded.push(blob.url);
      }
      if (uploaded.length) {
        syncNewImages([...allNewImages, ...uploaded]);
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Image upload failed");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  };

  const set = (k: keyof ProductForm, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.weight.trim()) { toast.error("Weight is required"); return; }
    if (form.price <= 0) { toast.error("Price must be > 0"); return; }
    if (form.mrp <= 0) { toast.error("Original price must be > 0"); return; }
    // For new products, image URL is optional (can be added via image manager after save)
    if (!product && !form.image.trim()) { toast.error("Product image URL is required for new products"); return; }

    const discount = form.mrp > 0
      ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0;
    const handle = form.handle.trim() || generateHandle(form.name);

    if (product) {
      updateMutation.mutate({ id: product.id, ...form, handle, discount, images: form.images });
    } else {
      createMutation.mutate({ ...form, handle, discount, images: form.images });
    }
  };

  const discountPreview = form.mrp > 0
    ? Math.round(((form.mrp - form.price) / form.mrp) * 100) : 0;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-bold text-gray-900">{product ? "Edit Product" : "Add Product"}</h2>
            {product && (
              <a
                href={`/products/${product.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                title="View on website"
              >
                <ExternalLink size={12} />
                View
              </a>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Multi-image manager — only shown when editing an existing product */}
          {product ? (
            <ProductImageManager productId={product.id} />
          ) : (
            /* For new products: multi-image upload (up to 8) */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product Images * <span className="text-gray-400 font-normal normal-case">({allNewImages.length}/8)</span></label>
              </div>
              {allNewImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {allNewImages.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
                      <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-[9px] text-center py-0.5 font-semibold">PRIMARY</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200"
                      ><X size={11} className="text-gray-600" /></button>
                    </div>
                  ))}
                </div>
              )}
              {allNewImages.length < 8 && (
                <div
                  onClick={() => !imageUploading && imageInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  {imageUploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-green-600" />
                      <span className="text-xs text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{allNewImages.length === 0 ? "Click to upload images" : "Add more images"}</span>
                      <span className="text-[11px] text-gray-400">Select multiple — JPG, PNG, WebP</span>
                    </>
                  )}
                </div>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageFile} disabled={imageUploading} />
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Product Name *</label>
            <input value={form.name} onChange={e => { set("name", e.target.value); if (!form.handle) set("handle", generateHandle(e.target.value)); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Foodondoor Premium Cashews 200g" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">URL Handle (auto-generated)</label>
            <input value={form.handle} onChange={e => set("handle", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-500"
              placeholder="e.g. nutriwow-premium-cashews-200g" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Weight *</label>
              <input value={form.weight} onChange={e => set("weight", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 200g" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Category *</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {categoryOptions.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Sale Price (₹) *</label>
              <input type="number" value={form.price || ""} onChange={e => set("price", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="299" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Original Price (₹) *</label>
              <input type="number" value={form.mrp || ""} onChange={e => set("mrp", Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="399" />
            </div>
          </div>

          {discountPreview > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
              Discount: {discountPreview}% off
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Short product description..." />
          </div>

          {/* ── Product Details Section ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Product Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Key Highlights <span className="normal-case font-normal">(ek line me ek point)</span></label>
                <textarea
                  value={form.metafields.highlights || ""}
                  onChange={e => set("metafields", { ...form.metafields, highlights: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder={"Premium quality, handpicked produce\nNo artificial preservatives\nRich in protein and nutrients"} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">How to Use / Serving Steps <span className="normal-case font-normal">(ek line me ek step — Soya Chaap, recipes ke liye)</span></label>
                <textarea
                  value={form.metafields.howToUse || ""}
                  onChange={e => set("metafields", { ...form.metafields, howToUse: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder={"Heat oil in a pan\nAdd soya chaap and spices\nCook for 8-10 minutes and serve hot"} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Video URL <span className="normal-case font-normal">(YouTube link ya mp4 — recipe/how-to video)</span></label>
                <input
                  value={form.metafields.videoUrl || ""}
                  onChange={e => set("metafields", { ...form.metafields, videoUrl: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://youtu.be/xxxxxxxxxxx" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Nutrition Info <span className="normal-case font-normal">(Label: Value, ek line me)</span></label>
                <textarea value={form.nutritionalInfo} onChange={e => set("nutritionalInfo", e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder={"Energy: 550 kcal\nProtein: 15g\nCarbohydrates: 35g\nTotal Fat: 40g"} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Ingredients</label>
                <textarea value={form.ingredients} onChange={e => set("ingredients", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="e.g. 100% Natural Cashews, Salt" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Shelf Life</label>
                  <input value={form.shelfLife} onChange={e => set("shelfLife", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. 6 months from MFG date" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Storage Info</label>
                  <input value={form.storageInfo} onChange={e => set("storageInfo", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. Store in a cool, dry place" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Country of Origin</label>
                  <input value={form.metafields.countryOfOrigin || ""}
                    onChange={e => set("metafields", { ...form.metafields, countryOfOrigin: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. India" />
                </div>
              </div>
              {/* Tax fields for the GST invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">HSN Code <span className="normal-case font-normal">(invoice ke liye)</span></label>
                  <input value={form.metafields.hsnCode || ""}
                    onChange={e => set("metafields", { ...form.metafields, hsnCode: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. 0801 (default)" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">GST Rate % <span className="normal-case font-normal">(default 5)</span></label>
                  <input type="number" value={form.metafields.gstRate || ""}
                    onChange={e => set("metafields", { ...form.metafields, gstRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="5" min={0} max={28} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Metafields Section ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Metafields</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Nut / Product Type</label>
                <input value={form.nutType} onChange={e => set("nutType", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Cashew, Almond" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Processing Method</label>
                <select value={form.processingMethod} onChange={e => set("processingMethod", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="">Select...</option>
                  {PROCESSING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Food Form</label>
                <select value={form.foodProductForm} onChange={e => set("foodProductForm", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="">Select...</option>
                  {FORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Allergen Info</label>
                <input value={form.allergenInfo} onChange={e => set("allergenInfo", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Contains tree nuts" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Dietary Preferences</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.dietaryPreferences.includes(opt)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...form.dietaryPreferences, opt]
                          : form.dietaryPreferences.filter(p => p !== opt);
                        set("dietaryPreferences", next);
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Custom fields (admin-defined metafields) ── */}
          {customMetafieldDefs.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Custom fields</p>
              <div className="space-y-3">
                {customMetafieldDefs.map(def => (
                  <div key={def.key}>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{def.name}</label>
                    <input
                      value={form.metafields[def.key] ?? ""}
                      onChange={e => set("metafields", { ...form.metafields, [def.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder={def.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft / Published toggle */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Visibility</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set("status", "published")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                  form.status === "published"
                    ? "bg-green-600 text-white border-green-600 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-green-400"
                }`}
              >
                <Eye size={13} />
                Published
              </button>
              <button
                type="button"
                onClick={() => set("status", "draft")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all border ${
                  form.status === "draft"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-amber-400"
                }`}
              >
                <EyeOff size={13} />
                Draft
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {form.status === "draft" ? "Draft products are hidden from the website." : "Published products are visible on the website."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.available} onChange={e => set("available", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <span className="text-sm font-medium text-gray-700">In Stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isBestseller} onChange={e => set("isBestseller", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              <span className="text-sm font-medium text-gray-700">Bestseller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isTrending} onChange={e => set("isTrending", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
              <span className="text-sm font-medium text-gray-700">Trending</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isNew} onChange={e => set("isNew", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">New</span>
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {product ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const [editProduct, setEditProduct] = useState<DbProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [stockInputValue, setStockInputValue] = useState("");

  const utils = trpc.useUtils();
  const { data: catList } = trpc.categories.list.useQuery();
  const categoryOptions = catList?.length ? catList : CATEGORIES;
  const setCategories = trpc.categories.set.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); toast.success("Categories updated"); },
    onError: (e) => toast.error(e.message),
  });
  const addCategory = () => {
    const name = window.prompt("New category name:");
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    if (categoryOptions.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That category already exists");
      return;
    }
    setCategories.mutate({ categories: [...categoryOptions, trimmed] });
  };
  const removeCategory = (cat: string) => {
    if (!window.confirm(`Remove category "${cat}"? Products in it keep the label but it leaves the list.`)) return;
    setCategories.mutate({ categories: categoryOptions.filter(c => c !== cat) });
  };
  const renameCategory = trpc.categories.rename.useMutation({
    onSuccess: () => { utils.categories.list.invalidate(); utils.products.adminList.invalidate(); toast.success("Category renamed (products updated)"); },
    onError: (e) => toast.error(e.message),
  });
  const editCategory = (cat: string) => {
    const name = window.prompt(`Rename category "${cat}" to:`, cat);
    const trimmed = (name || "").trim();
    if (!trimmed || trimmed === cat) return;
    if (categoryOptions.some(c => c.toLowerCase() === trimmed.toLowerCase())) { toast.error("That category already exists"); return; }
    renameCategory.mutate({ oldName: cat, newName: trimmed });
  };
  const [fixingImages, setFixingImages] = useState(false);
  const fixProductImages = trpc.products.fixProductImages.useMutation();

  const handleFixProductImages = async () => {
    setFixingImages(true);
    try {
      await fixProductImages.mutateAsync();
      toast.success("Product images synced successfully!");
      utils.products.adminList.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Failed to sync images");
    } finally {
      setFixingImages(false);
    }
  };

  // Fetch all products from DB (admin sees drafts too)
  const { data: products = [], isLoading } = trpc.products.adminList.useQuery({});

  // DB-backed stock
  const { data: stockMap = {}, refetch: refetchStock } = trpc.stock.getAll.useQuery(
    undefined,
    { select: (rows) => Object.fromEntries(rows.map((r) => [r.productId, r])) }
  );
  const upsertStock = trpc.stock.upsert.useMutation({
    onSuccess: () => {
      refetchStock();
      // Server auto-syncs available (In Stock / Out of Stock) with qty — refresh list to show it
      utils.products.adminList.invalidate();
      toast.success("Stock updated!");
      setEditingStockId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      utils.products.adminList.invalidate();
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.adminList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveStock = (productId: number) => {
    const qty = parseInt(stockInputValue, 10);
    if (isNaN(qty) || qty < 0) { toast.error("Enter a valid quantity"); return; }
    upsertStock.mutate({ productId, stock: qty, lowStockThreshold: 10 });
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "All" || p.category === categoryFilter;
      const matchStock = stockFilter === "all" || (stockFilter === "in" ? p.available : !p.available);
      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const toggleAvailable = (p: DbProduct) => {
    updateMutation.mutate({ id: p.id, available: !p.available });
    toast.success(p.available ? "Marked as out of stock" : "Marked as in stock");
  };

  return (
    <AdminLayout
      title="Products"
      subtitle={`${products.length} products · ${products.filter(p => p.available).length} in stock`}
      actions={
        <button
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="All">All Categories</option>
          {categoryOptions.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={addCategory} disabled={setCategories.isPending}
          className="flex items-center gap-1.5 border border-[#43A047] text-[#43A047] rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-50 disabled:opacity-60 whitespace-nowrap">
          <Plus size={14} /> Category
        </button>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as "all" | "in" | "out")}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">All Stock</option>
          <option value="in">In Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Manage categories — ✎ to rename, ✕ to remove */}
      <div className="flex flex-wrap items-center gap-2 px-1 -mt-1 mb-1">
        <span className="text-[11px] text-gray-400 mr-1">Categories:</span>
        {categoryOptions.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5 text-[12px] bg-gray-100 text-gray-700 rounded-full pl-3 pr-1.5 py-1">
            <span className="font-medium">{c}</span>
            <button onClick={() => editCategory(c)} disabled={renameCategory.isPending} title={`Rename "${c}"`}
              className="p-1 rounded-full text-gray-400 hover:bg-[#43A047]/15 hover:text-[#43A047] disabled:opacity-50"><Edit2 size={12} /></button>
            <button onClick={() => removeCategory(c)} disabled={setCategories.isPending} title={`Remove "${c}"`}
              className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 disabled:opacity-50"><X size={12} /></button>
          </span>
        ))}
      </div>

      <CategoryTreeEditor />

      {/* Sync Product Images */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Package size={14} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Sync Product Images</p>
            <p className="text-[11px] text-gray-600">Replace legacy screenshots with uploaded images</p>
          </div>
        </div>
        <button
          onClick={handleFixProductImages}
          disabled={fixingImages}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {fixingImages ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-green-600" />
            <span className="ml-2 text-sm text-gray-500">Loading products...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Stock Qty</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <Package size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No products found</p>
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {(p as any).images?.[0] || p.image ? (
                            <img src={(p as any).images?.[0] || p.image} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 text-[13px] line-clamp-1 max-w-[200px]">{p.name}</p>
                            {p.status === "draft" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">DRAFT</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">{p.weight}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-600">{p.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-[13px]">₹{p.price}</p>
                        {p.mrp > p.price && (
                          <p className="text-[11px] text-gray-400 line-through">₹{p.mrp}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAvailable(p)}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          p.available
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        }`}>
                        {p.available ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {p.available ? "In Stock" : "Out of Stock"}
                      </button>
                    </td>
                    {/* Stock Qty column */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {editingStockId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={stockInputValue}
                            onChange={(e) => setStockInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveStock(p.id); if (e.key === "Escape") setEditingStockId(null); }}
                            className="w-16 px-2 py-1 text-xs border border-green-400 rounded focus:outline-none"
                            autoFocus
                            min={0}
                          />
                          <button onClick={() => handleSaveStock(p.id)} className="text-green-600 hover:text-green-800 text-xs font-bold">✓</button>
                          <button onClick={() => setEditingStockId(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingStockId(p.id); setStockInputValue(String(stockMap[p.id]?.stock ?? "")); }}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-700 group"
                        >
                          <Boxes size={12} className="text-gray-400 group-hover:text-green-600" />
                          {stockMap[p.id] !== undefined ? (
                            <span className={stockMap[p.id].stock <= stockMap[p.id].lowStockThreshold ? "text-orange-600 font-semibold" : ""}>
                              {stockMap[p.id].stock} units
                              {stockMap[p.id].stock <= stockMap[p.id].lowStockThreshold && " ⚠"}
                            </span>
                          ) : (
                            <span className="text-gray-300 italic">Set qty</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.isBestseller && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                            Bestseller
                          </span>
                        )}
                        {p.isTrending && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            Trending
                          </span>
                        )}
                        {p.isNew && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditProduct(p); setShowForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product count */}
      <p className="text-[12px] text-gray-400 mt-3">
        Showing {filtered.length} of {products.length} products
      </p>

      {/* Add/Edit Panel */}
      {showForm && (
        <ProductFormPanel
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSaved={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-[15px] font-bold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirm })}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
