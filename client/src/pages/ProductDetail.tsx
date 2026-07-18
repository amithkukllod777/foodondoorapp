/**
 * Nutriwow Clone - Product Detail Page
 * Design: Soft clay 3D — Baloo 2 headings, peach accents, cream bg
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useImageSwipe } from "@/hooks/useImageSwipe";
import { optImg, hiRes } from "@/lib/img";
import { trackViewItem, trackAddToCart } from "@/lib/ga4";
import {
  ChevronRight,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  Flame,
  Shield,
  ShieldCheck,
  Truck,
  RotateCcw,
  RefreshCw,
  Leaf,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  ThumbsUp,
  Tag,
  Wheat,
  Leaf as LeafIcon,
  FlameKindling,
  Shapes,
  ZoomIn,
  Trash2,
  Heart,
  MessageCircle,
  Link2,
  Share2,
  MapPin,
  Loader2,
  X,
  Package,
  Camera,
  Repeat,
  CalendarClock,
} from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppUnlock from "@/components/WhatsAppUnlock";
import Newsletter from "@/components/Newsletter";
import SEO, { buildProductJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/components/SEO";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import NotifyMeButton from "@/components/NotifyMeButton";
import { dbProductToFrontend } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useFacebookCapi } from "@/hooks/useFacebookCapi";
import { getProductVariants, getBulkDiscount, getBulkPrice } from "@shared/pricing";
import ImageLightbox from "@/components/ImageLightbox";
import ProductSection from "@/components/ProductSection";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";



// NOTE: per-product detail content (description, highlights, nutrition,
// ingredients, shelf-life, storage) now comes ONLY from the product's own
// admin-managed fields (dbProduct.metafields / nutritionalInfo / ingredients /
// etc.). The previous hardcoded map keyed by productId caused one product's
// content (e.g. cashew copy on id=1) to appear on whatever product held that id.
// `defaultDetail` below is a generic, product-neutral fallback used only when a
// field hasn't been filled in admin — it never claims to be a specific product.

// Product-page FAQs — rendered visibly AND emitted as FAQPage structured data.
const PRODUCT_FAQS = [
  { q: "How long does delivery take?", a: "We deliver within 3-7 business days across India. Metro cities typically receive orders in 2-4 days. You will receive a tracking link via SMS once your order is shipped." },
  { q: "Is free shipping available?", a: "Yes! We offer free shipping on all orders. No minimum order value required." },
  { q: "What is your return policy?", a: "We offer a 7-day easy return policy. If you receive a damaged or incorrect product, contact us within 7 days of delivery and we will arrange a replacement or full refund." },
  { q: "How fresh are the products?", a: "All our products are sourced directly from farms and processed in FSSAI-certified facilities. Each product has a minimum shelf life of 3-6 months from the date of dispatch. We ship fresh stock weekly." },
  { q: "Are the products 100% natural?", a: "Yes. All Nutriwow products are 100% natural with no artificial preservatives, colours, or flavours. We believe in clean, honest food." },
  { q: "Can I change or cancel my order?", a: "Orders can be cancelled or modified within 2 hours of placement. After that, the order enters processing and cannot be changed. Please contact us immediately at orders@nutriwow.in." },
];

// Owner asked to hide the weight selector on all products for now. Flip to
// true to restore the "Select Weight" chips; the first variant stays default.
const SHOW_WEIGHT_SELECTOR = false;

const defaultDetail = {
  description: "Nutriwow brings you the finest quality dry fruits and healthy snacks, sourced directly from the best farms. Each product is carefully selected, processed under hygienic conditions, and packed fresh to retain maximum nutrition and flavour.",
  highlights: [
    "Premium quality, handpicked produce",
    "No artificial preservatives or additives",
    "Hygienically processed & packed",
    "Rich in essential nutrients",
    "Resealable zip-lock pouch for freshness",
    "100% natural product",
  ],
  nutrition: [
    { label: "Energy", value: "550 kcal" },
    { label: "Protein", value: "15g" },
    { label: "Carbohydrates", value: "35g" },
    { label: "Total Fat", value: "40g" },
    { label: "Dietary Fibre", value: "4g" },
    { label: "Sodium", value: "80mg" },
  ],
  ingredients: "100% Natural Product. No added preservatives.",
  shelfLife: "6 months from date of manufacture",
  storage: "Store in a cool, dry place away from direct sunlight. Refrigerate after opening.",
};

// Star rating display component
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted fill-muted"}
        />
      ))}
    </div>
  );
}

// Interactive star picker for review form
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            size={24}
            className={(hover || value) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted fill-muted"}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();

  // Fetch product from DB by handle (SEO slug)
  const { data: dbProduct, isLoading: productLoading, isError: productError, refetch: productRefetch } = trpc.products.getByHandle.useQuery(
    { handle: handle || "" },
    { enabled: !!handle }
  );
  const product = dbProduct ? dbProductToFrontend(dbProduct) : null;
  const productId = product?.id || 0;

  // Admin-defined custom metafields: definitions (Settings) + this product's values
  const { data: publicSettings } = trpc.settings.getPublic.useQuery();
  const metafieldDefs = ((publicSettings as { metafields?: { key: string; name: string }[] } | undefined)?.metafields) ?? [];
  const productMetafieldValues = (dbProduct && typeof (dbProduct as { metafields?: unknown }).metafields === "object" && !Array.isArray((dbProduct as { metafields?: unknown }).metafields))
    ? ((dbProduct as { metafields?: Record<string, string> }).metafields ?? {})
    : {};
  const customFields = metafieldDefs
    .map(d => ({ name: d.name, value: (productMetafieldValues as Record<string, string>)[d.key] }))
    .filter(f => f.value && String(f.value).trim());

  // Fetch related products from DB
  const { data: relatedDbProducts = [] } = trpc.products.byCategory.useQuery(
    { category: product?.category || "", limit: 8 },
    { enabled: !!product?.category }
  );
  const relatedProducts = useMemo(
    () => relatedDbProducts.map(dbProductToFrontend).filter(p => p.id !== productId).slice(0, 4),
    [relatedDbProducts, productId]
  );

  // Fetch frequently bought together products from real order data
  const { data: fbtDbProducts = [] } = trpc.products.frequentlyBoughtTogether.useQuery(
    { productId, limit: 4 },
    { enabled: productId > 0 }
  );
  const fbtProducts = useMemo(
    () => fbtDbProducts.map(dbProductToFrontend).filter(p => p.available),
    [fbtDbProducts]
  );
  const fbtCombinedPrice = useMemo(
    () => product ? product.price + fbtProducts.reduce((sum, p) => sum + p.price, 0) : 0,
    [product, fbtProducts]
  );
  const fbtCombinedMrp = useMemo(
    () => product ? product.originalPrice + fbtProducts.reduce((sum, p) => sum + p.originalPrice, 0) : 0,
    [product, fbtProducts]
  );
  const fbtSavings = fbtCombinedMrp - fbtCombinedPrice;

  const detail = defaultDetail;
  // Variant definitions come from the shared pricing module so the server can
  // validate checkout prices against the exact same multipliers (anti-tampering).
  const variants = product
    ? getProductVariants(product.weight)
    : [{ label: "250g", priceMultiplier: 1 }];

  const { items, addToCart, updateQuantity, removeFromCart, setIsCartOpen } = useCart();
  const { isInWishlist: isWishlisted, toggleWishlist } = useWishlist();
  const { user, isLoggedIn, setIsLoginOpen } = useAuth();
  const fbCapi = useFacebookCapi();
  const { recentIds, trackView } = useRecentlyViewed();

  // Track recently viewed product
  useEffect(() => {
    if (product && product.id) {
      trackView(product.id);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch recently viewed products (exclude current product)
  const recentIdsForQuery = useMemo(
    () => recentIds.filter((id) => id !== productId),
    [recentIds, productId]
  );
  const { data: recentDbProducts = [] } = trpc.products.bulkByIds.useQuery(
    { ids: recentIdsForQuery },
    { enabled: recentIdsForQuery.length > 0 }
  );
  const recentlyViewedProducts = useMemo(
    () => {
      const mapped = recentDbProducts.map(dbProductToFrontend);
      // Preserve the order from recentIdsForQuery
      const byId = new Map(mapped.map((p) => [p.id, p]));
      return recentIdsForQuery.map((id) => byId.get(id)).filter(Boolean) as ReturnType<typeof dbProductToFrontend>[];
    },
    [recentDbProducts, recentIdsForQuery]
  );

  // DB-backed stock check for low-stock urgency badge
  const stockProductIds = useMemo(() => [productId], [productId]);
  const { data: stockData } = trpc.stock.getBulk.useQuery(
    { productIds: stockProductIds },
    { enabled: productId > 0 }
  );
  const stockCount = stockData?.[0]?.stock ?? null;
  const isOutOfStock = stockCount !== null ? stockCount === 0 : !product?.available;

  useEffect(() => {
    if (product && product.id) {
      fbCapi.trackViewContent({
        productId: String(product.id),
        productName: product.name,
        productCategory: product.category,
        value: product.price,
      });
      trackViewItem({ id: product.id, name: product.name, category: product.category, price: product.price });
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [localQuantity, setLocalQuantity] = useState(1);
  const [openSection, setOpenSection] = useState<string | null>("description");
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Must call useImageSwipe BEFORE any early return (Rules of Hooks)
  const productImages = product?.images?.length ? product.images : product ? [product.image] : [];
  const swipe = useImageSwipe({ count: productImages.length, index: activeImage, onChange: setActiveImage });

  // Subscribe & Save state
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [subscribeFrequency, setSubscribeFrequency] = useState(30);
  const createSubscription = trpc.subscription.create.useMutation({
    onSuccess: () => {
      toast.success("Subscription created! You'll save 10% on every delivery.");
      setSubscribeMode(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create subscription"),
  });

  // Find this product (with matching weight variant) in cart
  const cartItem = items.find(
    (item) => item.id === productId && (item as any).weight === variants[selectedVariantIdx]?.label
  );
  const isInCart = !!cartItem;
  // Display quantity: if in cart, show cart qty; otherwise show local selector qty
  const displayQuantity = isInCart ? cartItem.quantity : localQuantity;

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewName, setReviewName] = useState((user as any)?.name || "");
  const [reviewSort, setReviewSort] = useState<"newest" | "helpful" | "highest" | "lowest">("newest");
  const [reviewImages, setReviewImages] = useState<{ file: File; preview: string }[]>([]);
  const [reviewImageUrls, setReviewImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [reviewLightbox, setReviewLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // Sticky mobile add-to-cart bar: show when main action buttons scroll out of view
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    if (!actionButtonsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(actionButtonsRef.current);
    return () => observer.disconnect();
  }, []);

  // Pincode delivery check
  const [pincode, setPincode] = useState(() => localStorage.getItem("nutriwow_pincode") || "");
  const [pincodeChecked, setPincodeChecked] = useState(() => {
    const saved = localStorage.getItem("nutriwow_pincode");
    return !!saved && saved.length === 6;
  });
  const { data: deliveryInfo, isFetching: checkingPincode } = trpc.shipping.checkPincode.useQuery(
    { pincode },
    { enabled: pincodeChecked && pincode.length === 6, retry: false }
  );

  const handleCheckPincode = () => {
    if (pincode.length === 6) {
      localStorage.setItem("nutriwow_pincode", pincode);
      setPincodeChecked(true);
    }
  };

  // Fetch DB reviews
  const { data: dbReviews, refetch: refetchReviews } = trpc.reviews.getByProduct.useQuery({ productId });
  const uploadImageMutation = trpc.reviews.uploadImage.useMutation();
  const { data: ratingStats, refetch: refetchStats } = trpc.reviews.ratingStats.useQuery({ productId });
  const helpfulMutation = trpc.reviews.helpful.useMutation({
    onSuccess: () => refetchReviews(),
  });
  const addReviewMutation = trpc.reviews.add.useMutation({
    onSuccess: () => {
      toast.success("Review submitted! Thank you.");
      setShowReviewForm(false);
      setReviewTitle("");
      setReviewBody("");
      setReviewRating(5);
      setReviewImages([]);
      setReviewImageUrls([]);
      refetchReviews();
      refetchStats();
    },
    onError: (e) => {
      // Stale session: local login exists but server cookie expired — re-login
      if (e.data?.code === "UNAUTHORIZED") {
        toast.error("Session expire ho gaya — please login again");
        setIsLoginOpen(true);
      } else {
        toast.error(e.message);
      }
    },
  });

  const handleReviewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - reviewImages.length;
    if (remaining <= 0) { toast.error("Maximum 3 photos allowed"); return; }
    const toAdd = files.slice(0, remaining);
    const newImages = toAdd.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setReviewImages(prev => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Only ever show this product's own real reviews — no hardcoded/fake fallback
  // (previously generic "Priya/Rahul/Anita" reviews appeared on every product
  // that had none, reading as another product's review). Empty → "No reviews yet".
  // Must be computed BEFORE any early return (Rules of Hooks).
  const allReviews = useMemo(() => dbReviews ?? [], [dbReviews]);

  // Sorted reviews
  const sortedReviews = useMemo(() => {
    const sorted = [...allReviews];
    switch (reviewSort) {
      case "helpful":
        return sorted.sort((a, b) => ((b as any).helpfulCount || 0) - ((a as any).helpfulCount || 0));
      case "highest":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [allReviews, reviewSort]);

  if (productError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20 flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Could not load this product.</p>
            <button
              onClick={() => productRefetch()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl shadow-clay-btn hover:-translate-y-0.5 active:translate-y-0.5 transition-all font-semibold"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (productLoading || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-nutrigreen border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Compute effective price based on selected variant
  const selectedVariant = variants[selectedVariantIdx];
  const effectivePrice = Math.round(product.price * selectedVariant.priceMultiplier);
  const effectiveOriginalPrice = Math.round(product.originalPrice * selectedVariant.priceMultiplier);
  const effectiveDiscount = Math.round(((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleQuantityChange = (newQty: number) => {
    if (isInCart) {
      // Directly update cart quantity (pass weight for variant matching)
      if (newQty <= 0) {
        removeFromCart(productId, selectedVariant.label);
        toast.success("Item removed from cart");
      } else {
        updateQuantity(productId, newQty, selectedVariant.label);
      }
    } else {
      // Update local quantity for "add to cart" action
      setLocalQuantity(Math.max(1, newQty));
    }
  };

  const handleAddToCart = () => {
    if (isInCart) {
      // Already in cart — just show toast
      toast.success("Item already in cart! Use +/- to change quantity.");
      return;
    }
    addToCart({ ...product, price: effectivePrice, originalPrice: effectiveOriginalPrice, weight: selectedVariant.label }, localQuantity);
    fbCapi.trackAddToCart({
      productId: String(product.id),
      productName: product.name,
      productCategory: product.category,
      value: effectivePrice * localQuantity,
    });
    trackAddToCart({ id: product.id, name: product.name, category: product.category, price: effectivePrice, quantity: localQuantity });
    toast.success(`${localQuantity} item${localQuantity > 1 ? 's' : ''} added to cart!`);
    setLocalQuantity(1);
  };

  const handleBuyNow = () => {
    if (!isInCart) {
      addToCart({ ...product, price: effectivePrice, originalPrice: effectiveOriginalPrice, weight: selectedVariant.label }, localQuantity);
    }
    setLocalQuantity(1);
    setIsCartOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewName.trim()) { toast.error("Please enter your name"); return; }
    if (!reviewBody.trim()) { toast.error("Please write your review"); return; }

    let imageUrls: string[] = [];
    if (reviewImages.length > 0) {
      setUploadingImages(true);
      try {
        const uploads = await Promise.all(
          reviewImages.map(async ({ file }) => {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(",")[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
            const mimeType = (allowedMime as readonly string[]).includes(file.type)
              ? (file.type as typeof allowedMime[number])
              : "image/jpeg";
            const res = await uploadImageMutation.mutateAsync({
              base64,
              filename: file.name,
              mimeType,
            });
            return res.url;
          })
        );
        imageUrls = uploads;
      } catch (err) {
        toast.error("Failed to upload images. Please try again.");
        setUploadingImages(false);
        return;
      }
      setUploadingImages(false);
    }

    addReviewMutation.mutate({
      productId,
      customerName: reviewName.trim(),
      rating: reviewRating,
      title: reviewTitle.trim() || undefined,
      body: reviewBody.trim(),
      images: imageUrls.length > 0 ? imageUrls : undefined,
    });
  };

  // High-res, de-optimized image URLs for SEO / Open Graph / Google Merchant
  // structured data (fixes small Google-Drive thumbnails + ensures 2+ images per offer).
  const seoImages = Array.from(new Set(productImages.map(hiRes).filter(Boolean)));
  const seoImage = seoImages[0] || hiRes(product.image);
  const seoDescription = (product?.description || detail.description || defaultDetail.description).slice(0, 160);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={product.name}
        description={seoDescription}
        image={seoImage}
        url={`/products/${product.handle}`}
        type="product"
        keywords={`${product.name}, ${product.category}, dry fruits online India, nutriwow, buy ${product.category.toLowerCase()} online`}
        jsonLd={[
          buildProductJsonLd({
            id: product.id,
            handle: product.handle,
            name: product.name,
            description: seoDescription,
            price: effectivePrice,
            mrp: effectiveOriginalPrice,
            image: seoImage,
            images: seoImages,
            category: product.category,
            available: product.available,
            // Only real DB reviews feed the rich-snippet rating — never seed data.
            rating: ratingStats && ratingStats.totalReviews > 0 ? ratingStats.avgRating : undefined,
            reviewCount: ratingStats && ratingStats.totalReviews > 0 ? ratingStats.totalReviews : undefined,
          }),
          buildBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: product.category, url: `/collections/${encodeURIComponent(product.category)}` },
            { name: product.name, url: `/products/${product.handle}` },
          ]),
          buildFaqJsonLd(PRODUCT_FAQS),
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container py-3">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-muted-foreground/70">{product.category}</span>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium line-clamp-1 max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        {/* Product Section */}
        <div className="container pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left - Image Gallery */}
            <div className="space-y-3">
              <div
                className="relative bg-card rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-8 shadow-clay cursor-zoom-in group touch-pan-y"
                onPointerDown={swipe.onPointerDown}
                onPointerUp={swipe.onPointerUp}
                onClick={() => { if (swipe.consumeSwipe()) return; setLightboxOpen(true); }}
                title="Click to zoom"
              >
                {(product.isBestseller || product.isTrending) && (
                  <div className={`absolute top-4 left-4 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-clay-sm ${product.isBestseller ? "bg-nutriorange text-primary-foreground" : "bg-clay-pink text-clay-brown"}`}>
                    {product.isBestseller ? <Zap size={12} /> : <Flame size={12} />}
                    <span>{product.isBestseller ? "Bestseller" : "Trending"}</span>
                  </div>
                )}
                {/* Gold % OFF badge */}
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-clay-sm">
                  {effectiveDiscount}% OFF
                </div>
                {/* Zoom hint overlay */}
                <div className="absolute bottom-3 right-3 bg-clay-brown/60 text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
                  <ZoomIn size={11} /> Zoom
                </div>
                <img
                  src={optImg(productImages[activeImage] || product.image, 1080)}
                  alt={product.name}
                  className="w-full h-full object-contain transition-all duration-300 select-none pointer-events-none"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                />
                {productImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {productImages.map((_, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full transition-all ${activeImage === i ? "bg-primary scale-125" : "bg-clay-brown/30"}`} />
                    ))}
                  </div>
                )}
              </div>
              {/* Thumbnail strip */}
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {productImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all ${activeImage === i ? "ring-2 ring-primary shadow-clay-sm" : "bg-card shadow-clay-sm hover:ring-2 hover:ring-primary/40"}`}
                    >
                      <img src={optImg(img, 128)} alt="" className="w-full h-full object-contain p-1" loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Truck, label: "Free Delivery" },
                  { icon: Shield, label: "Secure Payment" },
                  { icon: RotateCcw, label: "Easy Returns" },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-1 bg-card rounded-2xl py-3 text-center shadow-clay-sm">
                    <b.icon size={18} className="text-nutrigreen" />
                    <span className="text-[10px] font-medium text-foreground">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Lightbox */}
            <ImageLightbox
              images={productImages}
              initialIndex={activeImage}
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              altText={product.name}
            />

            {/* Right - Details */}
            <div>
              <p className="text-xs font-semibold text-nutrigold uppercase tracking-wider mb-1">Nutriwow</p>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                  {product.name}
                </h1>
                <button
                  onClick={() => {
                    if (!isLoggedIn) { setIsLoginOpen(true); return; }
                    toggleWishlist(productId);
                  }}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-card shadow-clay-sm hover:scale-110 transition-all mt-0.5"
                  aria-label={isWishlisted(productId) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart size={20} className={isWishlisted(productId) ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {ratingStats && ratingStats.totalReviews > 0 ? (
                  <div className="flex items-center gap-1.5 bg-clay-butter px-3 py-1.5 rounded-full shadow-clay-sm">
                    <StarRating rating={ratingStats.avgRating} size={13} />
                    <span className="text-xs font-bold text-clay-brown">{ratingStats.avgRating.toFixed(1)}</span>
                    <span className="text-xs text-clay-brown/70">({ratingStats.totalReviews} review{ratingStats.totalReviews !== 1 ? "s" : ""})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-clay-butter px-3 py-1.5 rounded-full shadow-clay-sm">
                    <Star size={13} className="text-clay-brown/50" />
                    <span className="text-xs font-semibold text-clay-brown/70">No reviews yet</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-nutrigreen bg-clay-green px-3 py-1.5 rounded-full shadow-clay-sm" title="FSSAI Lic. No: 11424999000246">
                  <Award size={12} />
                  <span className="font-semibold">FSSAI Licensed</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-clay-brown bg-clay-peach px-3 py-1.5 rounded-full shadow-clay-sm">
                  <CheckCircle2 size={12} />
                  <span className="font-semibold">1000+ Sold</span>
                </div>
              </div>

              {/* Metafields Badges — shown only if set */}
              {(product.dietaryPreferences?.length || product.nutType || product.processingMethod || product.foodProductForm) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {product.nutType && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-clay-butter text-clay-brown px-2.5 py-1 rounded-full">
                      <Tag size={10} />{product.nutType}
                    </span>
                  )}
                  {product.processingMethod && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-clay-pink text-clay-brown px-2.5 py-1 rounded-full">
                      <FlameKindling size={10} />{product.processingMethod}
                    </span>
                  )}
                  {product.foodProductForm && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-clay-peach text-clay-brown px-2.5 py-1 rounded-full">
                      <Shapes size={10} />{product.foodProductForm}
                    </span>
                  )}
                  {product.dietaryPreferences?.map((pref) => (
                    <span key={pref} className="inline-flex items-center gap-1 text-[11px] font-medium bg-clay-green text-nutrigreen px-2.5 py-1 rounded-full">
                      <LeafIcon size={10} />{pref}
                    </span>
                  ))}
                </div>
              )}

              {/* Allergen Info — shown only if set */}
              {product.allergenInfo && (
                <div className="flex items-start gap-2 bg-clay-butter rounded-2xl px-3 py-2 mb-3">
                  <Wheat size={13} className="text-clay-brown mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-clay-brown"><strong>Allergen Info:</strong> {product.allergenInfo}</p>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-foreground">₹{effectivePrice}</span>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground/70 line-through">₹{effectiveOriginalPrice}</span>
                  <span className="text-xs font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full text-center">
                    {effectiveDiscount}% OFF
                  </span>
                </div>
              </div>
              {/* Low stock urgency badge */}
              {stockCount !== null && stockCount > 0 && stockCount <= 5 && (
                <div className="flex items-center gap-1.5 bg-red-50 text-red-600 rounded-full px-3 py-1 text-xs font-semibold w-fit mb-1">
                  <AlertCircle size={12} />
                  Only {stockCount} left in stock!
                </div>
              )}
              <p className="text-xs text-muted-foreground/70 mb-4">Inclusive of all taxes. Free shipping on this order.</p>

              {/* Weight Variants — hidden for now (owner request). Set
                  SHOW_WEIGHT_SELECTOR to true to bring it back; the first
                  variant stays selected as the default. */}
              {SHOW_WEIGHT_SELECTOR && variants.length > 1 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-foreground mb-2">Select Weight:</p>
                  <div className="flex gap-2 flex-wrap">
                    {variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariantIdx(i)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                          selectedVariantIdx === i
                            ? "bg-clay-peach text-clay-brown shadow-clay-pressed"
                            : "bg-card text-muted-foreground shadow-clay-sm hover:-translate-y-0.5"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div className="bg-clay-green rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 shadow-clay-sm">
                <Leaf size={18} className="text-nutrigreen flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Use code <span className="text-nutrigreen">SUPERSAVER10</span> for extra 10% off
                  </p>
                  <p className="text-[10px] text-muted-foreground">Valid on all orders above ₹299</p>
                </div>
              </div>

              {/* Quantity + Add to Cart */}
              <div ref={actionButtonsRef} className="flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center rounded-full overflow-hidden shadow-clay-pressed bg-background ${isInCart ? 'ring-2 ring-nutrigreen/40' : ''}`}>
                  <button
                    onClick={() => handleQuantityChange(displayQuantity - 1)}
                    className={`px-3 py-2.5 transition-colors ${isInCart && displayQuantity === 1 ? 'hover:bg-red-50 text-red-500' : 'hover:bg-accent'}`}
                  >
                    {isInCart && displayQuantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                  </button>
                  <input
                    type="number"
                    min={isInCart ? 0 : 1}
                    value={displayQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleQuantityChange(val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < (isInCart ? 0 : 1)) {
                        handleQuantityChange(isInCart ? 1 : 1);
                      }
                    }}
                    className="w-12 py-2.5 font-bold text-sm text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => handleQuantityChange(displayQuantity + 1)} className="px-3 py-2.5 hover:bg-accent transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all disabled:opacity-50 ${
                    isOutOfStock
                      ? 'bg-red-100 text-red-700 cursor-not-allowed shadow-clay-pressed border border-red-200'
                      : isInCart
                      ? 'bg-nutrigreen text-white shadow-clay hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed'
                      : 'bg-clay-green text-nutrigreen shadow-clay-sm hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {isOutOfStock ? 'Out of Stock' : isInCart ? `In Cart (${cartItem.quantity})` : 'Add to Cart'}
                </button>
              </div>

              {/* Buy More, Save More — bulk discount tiers */}
              {(() => {
                const bulkDisc = getBulkDiscount(displayQuantity);
                const bulkUnitPrice = getBulkPrice(effectivePrice, displayQuantity);
                const tiers = [
                  { qty: 1, discount: 0 },
                  { qty: 2, discount: 0.05 },
                  { qty: 3, discount: 0.10 },
                ];
                return (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-foreground mb-1.5">Buy More, Save More</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {tiers.map((t) => {
                        const isActive = displayQuantity >= t.qty && getBulkDiscount(displayQuantity) === t.discount;
                        const tierPrice = getBulkPrice(effectivePrice, t.qty);
                        return (
                          <div
                            key={t.qty}
                            className={`rounded-xl px-3 py-1.5 text-[11px] transition-all ${
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/30 font-bold shadow-clay-sm"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span>Buy {t.qty === 3 ? "3+" : t.qty}: </span>
                            <span className="font-semibold">₹{tierPrice}</span>
                            {t.discount > 0 && (
                              <span className="ml-1 text-nutrigreen font-bold">
                                ({Math.round(t.discount * 100)}% off)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {bulkDisc > 0 && (
                      <p className="text-[11px] text-nutrigreen font-semibold mt-1.5">
                        Bulk price: ₹{bulkUnitPrice} x {displayQuantity} = ₹{(bulkUnitPrice * displayQuantity).toLocaleString("en-IN")}
                        <span className="ml-1 text-nutrigreen/80">(saving ₹{(Math.round(effectivePrice * bulkDisc) * displayQuantity).toLocaleString("en-IN")})</span>
                      </p>
                    )}
                  </div>
                );
              })()}

              {!isOutOfStock && (
              <button
                onClick={handleBuyNow}
                className="w-full bg-nutriorange text-white py-3 rounded-full font-bold text-sm shadow-clay-btn hover:brightness-105 transition-all active:translate-y-0.5 active:shadow-clay-pressed"
              >
                Buy Now — ₹{getBulkPrice(effectivePrice, displayQuantity) * displayQuantity}
              </button>
              )}
              </div>

              {isOutOfStock && (
                <div className="mt-2 space-y-2">
                  <p className="text-center text-xs text-red-500 font-medium">Currently out of stock</p>
                  <button
                    onClick={() => {
                      if (!isLoggedIn) { setIsLoginOpen(true); return; }
                      toggleWishlist(productId);
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-sm transition-all shadow-clay-sm hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed ${
                      isWishlisted(productId)
                        ? "bg-red-50 text-red-500 border border-red-200"
                        : "bg-clay-pink text-clay-brown"
                    }`}
                  >
                    <Heart size={16} className={isWishlisted(productId) ? "fill-red-500" : ""} />
                    {isWishlisted(productId) ? "In Wishlist ✓" : "Add to Wishlist"}
                  </button>
                  <NotifyMeButton productId={product.id} />
                </div>
              )}

              {/* Share Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground font-medium">Share:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out ${product.name} on Nutriwow! 🥜\n₹${effectivePrice}\nhttps://www.nutriwow.in/products/${product.handle}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-clay-sm hover:scale-110 transition-all"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle size={14} className="text-white" />
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://www.nutriwow.in/products/${product.handle}`);
                    toast.success("Link copied!");
                  }}
                  className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-clay-sm hover:scale-110 transition-all"
                >
                  <Link2 size={14} className="text-muted-foreground" />
                </button>
                {typeof navigator !== "undefined" && !!navigator.share && (
                  <button
                    onClick={() => {
                      navigator.share({
                        title: product.name,
                        text: `Check out ${product.name} on Nutriwow! 🥜 ₹${effectivePrice}`,
                        url: `https://www.nutriwow.in/products/${product.handle}`,
                      });
                    }}
                    className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-clay-sm hover:scale-110 transition-all"
                  >
                    <Share2 size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Trust badges strip */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {[
                  { icon: ShieldCheck, text: "100% Genuine" },
                  { icon: Truck, text: "Free Shipping" },
                  { icon: RefreshCw, text: "Easy Returns" },
                  { icon: Award, text: "FSSAI Licensed" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-muted rounded-full px-2.5 py-1">
                    <Icon size={11} className="text-nutrigreen" />
                    {text}
                  </div>
                ))}
              </div>

              {/* Subscribe & Save */}
              {!isOutOfStock && (
                <div className="mt-4 rounded-2xl overflow-hidden shadow-clay-sm bg-card">
                  <button
                    onClick={() => setSubscribeMode(!subscribeMode)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                      subscribeMode ? "bg-clay-green" : "hover:bg-clay-green/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-nutrigreen" />
                      <span className="font-semibold text-sm text-foreground">Subscribe & Save 10%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-nutrigreen font-bold">
                        ₹{Math.round(effectivePrice * 0.9)}/delivery
                      </span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${subscribeMode ? "bg-nutrigreen" : "bg-muted"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${subscribeMode ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>
                  </button>

                  {subscribeMode && (
                    <div className="px-4 pb-4 pt-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Deliver every</span>
                        <select
                          value={subscribeFrequency}
                          onChange={e => setSubscribeFrequency(Number(e.target.value))}
                          className="flex-1 border-0 bg-background shadow-clay-pressed rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                        >
                          <option value={15}>15 days</option>
                          <option value={30}>30 days (Monthly)</option>
                          <option value={60}>60 days</option>
                          <option value={90}>90 days</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between bg-clay-green rounded-xl px-3 py-2">
                        <div>
                          <span className="text-xs text-muted-foreground line-through">₹{effectivePrice}</span>
                          <span className="text-sm font-bold text-nutrigreen ml-2">₹{Math.round(effectivePrice * 0.9)}</span>
                        </div>
                        <span className="text-[10px] bg-nutrigreen/10 text-nutrigreen font-bold px-2 py-0.5 rounded-full">SAVE 10%</span>
                      </div>

                      <button
                        onClick={() => {
                          if (!user) {
                            toast.error("Please login to subscribe");
                            return;
                          }
                          createSubscription.mutate({
                            productId,
                            variantIdx: selectedVariantIdx,
                            quantity: localQuantity,
                            frequencyDays: subscribeFrequency,
                          });
                        }}
                        disabled={createSubscription.isPending}
                        className="w-full bg-nutrigreen text-white py-2.5 rounded-full font-bold text-sm shadow-clay-btn hover:brightness-105 transition-all active:translate-y-0.5 active:shadow-clay-pressed disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CalendarClock size={16} />
                        {createSubscription.isPending ? "Subscribing..." : "Subscribe Now"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pincode Delivery Check */}
              <div className="mt-5 bg-card rounded-2xl shadow-clay-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground font-serif">Check Delivery Availability</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]*"
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPincode(val);
                      setPincodeChecked(false);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCheckPincode(); }}
                    placeholder="Enter 6-digit PIN"
                    className="flex-1 bg-background shadow-clay-pressed rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  />
                  <button
                    onClick={handleCheckPincode}
                    disabled={pincode.length !== 6 || checkingPincode}
                    className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold shadow-clay-btn hover:brightness-105 transition-all active:translate-y-0.5 disabled:opacity-50"
                  >
                    {checkingPincode ? <Loader2 size={16} className="animate-spin" /> : "Check"}
                  </button>
                </div>
                {pincodeChecked && !checkingPincode && deliveryInfo && (
                  <div className="mt-3">
                    {deliveryInfo.deliverable ? (() => {
                      // Concrete delivery-date estimate (#18). Uses the courier's
                      // estimatedDays if given, else admin Settings → Checkout
                      // (deliveryDaysMin/Max), else 3–7 days.
                      const cfg = (publicSettings as { checkout?: { deliveryDaysMin?: string | number; deliveryDaysMax?: string | number } } | undefined)?.checkout;
                      const estN = Number(deliveryInfo.estimatedDays);
                      const minDays = Number.isFinite(estN) && estN > 0 ? estN : (Number(cfg?.deliveryDaysMin) || 3);
                      const maxDays = Number.isFinite(estN) && estN > 0 ? estN + 1 : (Number(cfg?.deliveryDaysMax) || 7);
                      const fmt = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
                      const range = minDays >= maxDays ? fmt(minDays) : `${fmt(minDays)} – ${fmt(maxDays)}`;
                      return (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Truck size={16} />
                          <span>
                            Delivery by <strong>{range}</strong>{deliveryInfo.courierName ? ` · ${deliveryInfo.courierName}` : ""}
                          </span>
                        </div>
                      );
                    })() : (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <X size={16} />
                        <span>Sorry, delivery is not available to this pincode</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Why You'll Love It — visual benefits strip (from admin Key
                  Highlights / metafields.highlights), shown prominently instead
                  of hidden in an accordion. */}
              {(() => {
                const raw = dbProduct as any;
                const dbHighlights = raw?.metafields?.highlights as string | undefined;
                const benefits = (dbHighlights
                  ? dbHighlights.split("\n").map((s: string) => s.trim()).filter(Boolean)
                  : detail.highlights).slice(0, 4);
                if (benefits.length === 0) return null;
                return (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-foreground mb-3 font-serif">Why You'll Love It</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {benefits.map((b: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-clay-green/40 rounded-2xl px-3 py-2.5 shadow-clay-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-nutrigreen text-white text-[11px] font-bold flex items-center justify-center mt-0.5">✓</span>
                          <span className="text-xs text-clay-brown font-medium leading-snug">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* WhatsApp opt-in → unlock 10% off */}
              <div className="mt-6">
                <WhatsAppUnlock />
              </div>

              {/* Accordion Sections */}
              <div className="mt-6 space-y-2">
                {[
                  { key: "description", label: "Product Description" },
                  { key: "highlights", label: "Key Highlights" },
                  { key: "nutrition", label: "Nutrition Information" },
                  { key: "details", label: "Ingredients & Storage" },
                ].map(({ key, label }) => (
                  <div key={key} className="rounded-2xl overflow-hidden bg-card shadow-clay-sm">
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                    >
                      <span>{label}</span>
                      {openSection === key ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    {openSection === key && (
                      <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border">
                        {key === "description" && <p className="pt-3">{product?.description || detail.description}</p>}
                        {key === "highlights" && (() => {
                          const raw = dbProduct as any;
                          const dbHighlights = raw?.metafields?.highlights as string | undefined;
                          const highlights = dbHighlights
                            ? dbHighlights.split("\n").map((s: string) => s.trim()).filter(Boolean)
                            : detail.highlights;
                          return (
                            <ul className="pt-3 space-y-1.5">
                              {highlights.map((h: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-nutrigreen font-bold mt-0.5">✓</span>
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                        {key === "nutrition" && (() => {
                          const raw = dbProduct as any;
                          const dbNutri = raw?.nutritionalInfo as string | undefined;
                          const nutrition = dbNutri
                            ? dbNutri.split("\n").map((line: string) => {
                                const idx = line.indexOf(":");
                                if (idx === -1) return null;
                                return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
                              }).filter(Boolean) as { label: string; value: string }[]
                            : detail.nutrition;
                          return (
                            <div className="pt-3">
                              <p className="text-[10px] text-muted-foreground/70 mb-2">Per 100g serving</p>
                              <div className="grid grid-cols-2 gap-2">
                                {nutrition.map((n: { label: string; value: string }) => (
                                  <div key={n.label} className="bg-clay-butter rounded-2xl px-3 py-2">
                                    <p className="text-[10px] text-clay-brown/70">{n.label}</p>
                                    <p className="font-bold text-clay-brown">{n.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {key === "details" && (() => {
                          const raw = dbProduct as any;
                          return (
                            <div className="pt-3 space-y-2">
                              <p><strong>Ingredients:</strong> {raw?.ingredients || detail.ingredients}</p>
                              <p><strong>Shelf Life:</strong> {raw?.shelfLife || detail.shelfLife}</p>
                              <p><strong>Storage:</strong> {raw?.storageInfo || detail.storage}</p>
                              {raw?.metafields?.countryOfOrigin && (
                                <p><strong>Country of Origin:</strong> {raw.metafields.countryOfOrigin}</p>
                              )}
                              {customFields.map(f => (
                                <p key={f.name}><strong>{f.name}:</strong> {f.value}</p>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How to Use / Serving Suggestion — admin: metafields.howToUse (steps,
              one per line) + metafields.videoUrl (YouTube or mp4). Great for
              Soya Chaap, combos, and recipe-style products. */}
          {(() => {
            const raw = dbProduct as any;
            const howToUse = (raw?.metafields?.howToUse as string | undefined)?.trim();
            const videoUrl = (raw?.metafields?.videoUrl as string | undefined)?.trim();
            if (!howToUse && !videoUrl) return null;
            const steps = howToUse ? howToUse.split("\n").map((s: string) => s.trim()).filter(Boolean) : [];
            const yt = videoUrl ? videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) : null;
            return (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-foreground mb-4 font-serif">How to Use</h2>
                <div className="bg-card rounded-2xl shadow-clay-sm overflow-hidden">
                  {videoUrl && (
                    <div className="w-full aspect-video bg-black">
                      {yt ? (
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
                          title="How to use"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video className="w-full h-full" src={videoUrl} controls playsInline preload="metadata" />
                      )}
                    </div>
                  )}
                  {steps.length > 0 && (
                    <ol className="p-4 space-y-2.5">
                      {steps.map((s: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-foreground">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="pt-0.5 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            );
          })()}

          {/* FAQ Accordion */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {PRODUCT_FAQS.map(({ q, a }, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-card shadow-clay-sm">
                  <button
                    onClick={() => toggleSection(`faq-${i}`)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <span>{q}</span>
                    {openSection === `faq-${i}` ? <ChevronUp size={16} className="text-primary flex-shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
                  </button>
                  {openSection === `faq-${i}` && (
                    <div className="px-4 pb-4 pt-2 text-xs text-muted-foreground leading-relaxed border-t border-border">
                      {a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold text-foreground font-serif">
                  Customer Reviews
                </h2>
                {ratingStats && ratingStats.totalReviews > 0 ? (
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={ratingStats.avgRating} size={16} />
                    <span className="text-sm font-bold text-foreground">{ratingStats.avgRating.toFixed(1)} out of 5</span>
                    <span className="text-sm text-muted-foreground">({ratingStats.totalReviews} review{ratingStats.totalReviews !== 1 ? "s" : ""})</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Be the first to review this product</p>
                )}
              </div>
              {user ? (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all"
                >
                  <ThumbsUp size={14} />
                  Write a Review
                </button>
              ) : (
                <Link href="/profile" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all">
                  Login to Review
                </Link>
              )}
            </div>

            {/* Rating Distribution */}
            {ratingStats && ratingStats.totalReviews > 0 && (
              <div className="bg-card rounded-2xl p-4 mb-6 shadow-clay-sm">
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.distribution[star] || 0;
                    const pct = ratingStats.totalReviews > 0 ? Math.round((count / ratingStats.totalReviews) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground w-4 text-right">{star}</span>
                        <Star size={11} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden shadow-clay-pressed">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sort Controls */}
            {allReviews.length > 1 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">Sort by:</span>
                {([
                  { key: "newest", label: "Most Recent" },
                  { key: "helpful", label: "Most Helpful" },
                  { key: "highest", label: "Highest Rating" },
                  { key: "lowest", label: "Lowest Rating" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setReviewSort(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      reviewSort === key
                        ? "bg-primary text-primary-foreground shadow-clay-btn"
                        : "bg-card text-muted-foreground shadow-clay-sm hover:shadow-clay active:translate-y-0.5 active:shadow-clay-pressed"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-card rounded-3xl p-6 mb-6 shadow-clay">
                <h3 className="font-bold text-foreground mb-4">Share Your Experience</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Your Rating *</label>
                    <StarPicker value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Your Name *</label>
                    <input
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      placeholder="e.g. Priya S."
                      className="w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Review Title</label>
                    <input
                      value={reviewTitle}
                      onChange={e => setReviewTitle(e.target.value)}
                      placeholder="e.g. Excellent quality!"
                      className="w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Your Review *</label>
                    <textarea
                      value={reviewBody}
                      onChange={e => setReviewBody(e.target.value)}
                      placeholder="Tell others what you think about this product..."
                      rows={3}
                      className="w-full bg-background border-0 shadow-clay-pressed rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                    />
                  </div>
                  {/* Photo Upload Area */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-2 block">Add Photos (up to 3)</label>
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-4">
                      {reviewImages.length > 0 && (
                        <div className="flex gap-3 mb-3 flex-wrap">
                          {reviewImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img.preview}
                                alt={`Preview ${idx + 1}`}
                                className="w-20 h-20 rounded-xl object-cover shadow-clay-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeReviewImage(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-clay-sm"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {reviewImages.length < 3 && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          <Camera size={16} />
                          <span>{reviewImages.length === 0 ? "Add photos of the product" : "Add more photos"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleReviewImageSelect}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmitReview}
                      disabled={addReviewMutation.isPending || uploadingImages}
                      className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all disabled:opacity-50"
                    >
                      {uploadingImages ? "Uploading photos..." : addReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                    </button>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="bg-card text-muted-foreground px-6 py-2 rounded-full text-sm font-semibold shadow-clay-sm active:translate-y-0.5 active:shadow-clay-pressed transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sort Dropdown */}
            {allReviews.length > 1 && (
              <div className="flex justify-end mb-3">
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as "newest" | "helpful" | "highest" | "lowest")}
                  className="text-xs bg-card text-foreground border-0 rounded-xl px-3 py-1.5 shadow-clay-pressed focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                </select>
              </div>
            )}

            {/* Review Cards */}
            {sortedReviews.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 shadow-clay-sm text-center">
                <Star size={32} className="text-muted mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No reviews yet</p>
                <p className="text-xs text-muted-foreground">Be the first to review this product!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedReviews.map((r, i) => (
                  <div key={r.id ?? i} className="bg-card rounded-2xl p-4 shadow-clay-sm">
                    <div className="flex items-center justify-between mb-2">
                      <StarRating rating={r.rating} size={12} />
                      <span className="text-[10px] text-muted-foreground/70">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {r.title && <p className="text-xs font-bold text-foreground mb-1">{r.title}</p>}
                    <p className="text-xs font-semibold text-foreground mb-1">{r.customerName}</p>
                    {r.verified && (
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle2 size={10} className="text-nutrigreen" />
                        <span className="text-[10px] text-nutrigreen font-medium">Verified Purchase</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.body}</p>
                  {/* Review Photos */}
                  {(r as any).images && (r as any).images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {((r as any).images as string[]).map((imgUrl, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={optImg(imgUrl, 128)}
                          alt={`Review photo ${imgIdx + 1}`}
                          className="w-16 h-16 rounded-xl object-cover shadow-clay-sm cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setReviewLightbox({ images: (r as any).images, index: imgIdx })}
                        />
                      ))}
                    </div>
                  )}
                  {r.id > 0 && (
                    <button
                      onClick={() => helpfulMutation.mutate({ reviewId: r.id })}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded-full shadow-clay-pressed transition-colors mt-2"
                    >
                      <ThumbsUp size={9} />
                      Helpful{(r as any).helpfulCount > 0 && ` (${(r as any).helpfulCount})`}
                    </button>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Frequently Bought Together */}
          {fbtProducts.length >= 2 && product && (
            <div className="mt-12 bg-muted/30 rounded-3xl p-6">
              <h2 className="text-2xl font-bold text-foreground mb-5 flex items-center gap-2 font-serif">
                <Package size={22} className="text-primary" />
                Frequently Bought Together
              </h2>

              <div className="flex items-center gap-0 overflow-x-auto hide-scrollbar pb-2">
                {/* Current product mini card */}
                <div className="bg-card rounded-2xl shadow-clay-sm p-3 flex-shrink-0 w-[160px]">
                  <div className="bg-muted/50 rounded-xl p-2 mb-2">
                    <img src={optImg(product.image, 256)} alt={product.name} className="w-full h-[90px] object-contain" />
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">{product.name}</p>
                  <span className="text-sm font-bold text-foreground">₹{product.price}</span>
                  <div className="mt-1.5">
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">This item</span>
                  </div>
                </div>

                {fbtProducts.map((p) => (
                  <div key={p.id} className="flex items-center flex-shrink-0">
                    {/* Plus sign between cards */}
                    <div className="w-8 h-8 rounded-full bg-card shadow-clay-sm flex items-center justify-center mx-2 flex-shrink-0">
                      <Plus size={14} className="text-muted-foreground" />
                    </div>
                    {/* Product card */}
                    <Link href={`/products/${p.handle}`} className="bg-card rounded-2xl shadow-clay-sm p-3 flex-shrink-0 w-[160px] hover:-translate-y-1 transition-transform">
                      <div className="bg-muted/50 rounded-xl p-2 mb-2">
                        <img src={optImg(p.image, 256)} alt={p.name} className="w-full h-[90px] object-contain" />
                      </div>
                      <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">{p.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">₹{p.price}</span>
                        {p.discount > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 line-through">₹{p.originalPrice}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(p, 1);
                          toast.success(`${p.name} added to cart`);
                        }}
                        className="mt-2 w-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-full py-1.5 transition-colors active:translate-y-0.5"
                      >
                        + Add to Cart
                      </button>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Combined price & Add All */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="text-sm text-foreground">
                  <span className="font-medium">Buy together for </span>
                  <span className="text-lg font-bold text-foreground">₹{fbtCombinedPrice}</span>
                  {(() => {
                    const combinedMrp = (product.originalPrice || product.price) + fbtProducts.reduce((s, p) => s + (p.originalPrice || p.price), 0);
                    const savings = combinedMrp - fbtCombinedPrice;
                    return savings > 0 ? (
                      <span className="text-xs font-semibold text-nutrigreen ml-1.5">(Save ₹{savings})</span>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => {
                    fbtProducts.forEach(p => addToCart(p, 1));
                    toast.success(`${fbtProducts.length} items added to cart`);
                    setIsCartOpen(true);
                  }}
                  className="bg-primary text-primary-foreground rounded-full shadow-clay-btn px-5 py-2 text-sm font-bold hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
                >
                  Add All to Cart
                </button>
              </div>
            </div>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                You May Also Like
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.handle}`}
                    className="group bg-card rounded-3xl shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all overflow-hidden"
                  >
                    <div className="p-3 bg-muted/70">
                      <img
                        src={optImg(p.image, 384)}
                        alt={p.name}
                        className="w-full h-[120px] object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="px-3 pb-3 pt-2">
                      <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">{p.name}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <StarRating rating={p.rating} size={10} />
                        <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">₹{p.price}</span>
                        <span className="text-[10px] text-muted-foreground/70 line-through">₹{p.originalPrice}</span>
                        <span className="text-[10px] font-bold text-clay-brown bg-clay-butter px-1.5 py-0.5 rounded-full">{p.discount}% Off</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed Products */}
          {recentlyViewedProducts.length > 0 && (
            <div className="mt-12">
              <ProductSection title="Recently Viewed" products={recentlyViewedProducts} />
            </div>
          )}
        </div>
      </main>

      <Newsletter />
      <Footer />
      <CartDrawer />

      {/* Sticky mobile add-to-cart bar */}
      {showStickyBar && !isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-clay-lg px-4 py-3 transition-transform duration-300 animate-in slide-in-from-bottom pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <p className="text-sm font-bold text-foreground">₹{effectivePrice}</p>
              {effectiveDiscount > 0 && (
                <p className="text-[10px] text-muted-foreground line-through">₹{effectiveOriginalPrice}</p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 py-2.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-clay-btn active:translate-y-0.5 transition-all"
            >
              {isInCart ? `In Cart (${cartItem.quantity})` : 'Add to Cart'}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-2.5 rounded-full text-xs font-bold bg-nutriorange text-white shadow-clay-btn active:translate-y-0.5 transition-all"
            >
              Buy Now
            </button>
          </div>
        </div>
      )}

      {/* Review Photo Lightbox */}
      {reviewLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setReviewLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-colors"
            onClick={() => setReviewLightbox(null)}
          >
            <X size={24} />
          </button>
          {reviewLightbox.images.length > 1 && reviewLightbox.index > 0 && (
            <button
              className="absolute left-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-colors"
              onClick={(e) => { e.stopPropagation(); setReviewLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : null); }}
            >
              <ChevronDown size={24} className="rotate-90" />
            </button>
          )}
          {reviewLightbox.images.length > 1 && reviewLightbox.index < reviewLightbox.images.length - 1 && (
            <button
              className="absolute right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition-colors"
              onClick={(e) => { e.stopPropagation(); setReviewLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : null); }}
            >
              <ChevronDown size={24} className="-rotate-90" />
            </button>
          )}
          <img
            src={reviewLightbox.images[reviewLightbox.index]}
            alt="Review photo"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-clay-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
