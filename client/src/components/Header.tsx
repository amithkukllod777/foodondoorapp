import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ShoppingCart, User, Menu, X, LogOut, Package, MapPin, ChevronRight, Heart, Star } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { categories, dbProductToFrontend, type Product } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { useFacebookCapi } from "@/hooks/useFacebookCapi";
import LoginModal from "@/components/LoginModal";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import { useLocation } from "wouter";

export default function Header() {
  const { totalItems, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { isLoggedIn, user, logout, isLoginOpen, setIsLoginOpen } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const fbCapi = useFacebookCapi();

  // Loyalty points balance for logged-in users
  const { data: loyaltyBalance } = trpc.loyalty.getBalance.useQuery(
    undefined,
    { enabled: isLoggedIn }
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeSearchQuery = mobileSearchQuery.trim() || searchQuery.trim()
  const { data: searchDbResults = [] } = trpc.products.list.useQuery(
    { search: activeSearchQuery },
    { enabled: activeSearchQuery.length >= 2 }
  )
  const searchResults = useMemo(
    () => searchDbResults.map(dbProductToFrontend).slice(0, 6),
    [searchDbResults]
  )
  const mobileSearchResults = useMemo(
    () => searchDbResults.map(dbProductToFrontend).slice(0, 8),
    [searchDbResults]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fbCapi.trackSearch({ searchQuery: searchQuery.trim(), resultCount: searchResults.length });
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleProductClick = (handle: string) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    setMobileSearchQuery("");
    setMobileMenuOpen(false);
    navigate(`/products/${handle}`);
  };

  const handleUserClick = () => {
    if (isLoggedIn) {
      setShowUserDropdown(prev => !prev);
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background shadow-clay-sm">
        <div className="container flex items-center justify-between py-3 gap-4">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-foreground flex-shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <img
              src="/nutriwow-logo.png"
              alt="Nutriwow"
              className="h-10 sm:h-12"
            />
          </a>

          {/* Desktop Search */}
          <div className="hidden sm:flex flex-1 max-w-xl mx-4" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
              <input
                type="search"
                placeholder="Search for nuts, seeds, snacks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(e.target.value.trim().length >= 2);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setShowSearchDropdown(true);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-card border-0 shadow-clay-pressed rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />

              {/* Search Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-clay-lg z-50 overflow-hidden">
                  {searchResults.map((product: Product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleProductClick(product.handle)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground/70">{product.category} · {product.weight}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-nutrigreen">₹{product.price}</p>
                        {product.discount > 0 && (
                          <p className="text-xs text-muted-foreground/70 line-through">₹{product.originalPrice}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    type="submit"
                    className="w-full flex items-center justify-between px-4 py-3 bg-clay-green text-sm font-semibold text-nutrigreen hover:brightness-105 transition-all"
                  >
                    <span>See all results for "{searchQuery}"</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {showSearchDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-clay-lg z-50 px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No products found for "<strong>{searchQuery}</strong>"</p>
                </div>
              )}
            </form>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            {/* Mobile search icon — opens mobile menu with search focused */}
            <button
              className="sm:hidden text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            {/* Mobile user icon */}
            <button
              className="sm:hidden text-foreground"
              onClick={() => {
                if (isLoggedIn) {
                  navigate("/profile");
                } else {
                  setIsLoginOpen(true);
                }
              }}
              aria-label="Account"
            >
              {isLoggedIn ? (
                <div className="w-8 h-8 rounded-full bg-nutrigreen text-white text-xs font-bold flex items-center justify-center shadow-clay-sm">
                  {user?.name
                    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                    : user?.mobile?.slice(-2)}
                </div>
              ) : (
                <User size={22} />
              )}
            </button>

            {/* Wishlist — mobile */}
            <button
              className="sm:hidden relative text-foreground"
              onClick={() => navigate("/wishlist")}
              aria-label="Wishlist"
            >
              <Heart size={22} className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* User */}
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={handleUserClick}
                className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
                title={isLoggedIn ? (user?.name || user?.mobile) : "Login"}
              >
                {isLoggedIn ? (
                  <div className="w-8 h-8 rounded-full bg-nutrigreen text-white text-xs font-bold flex items-center justify-center shadow-clay-sm">
                    {user?.name
                      ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : user?.mobile?.slice(-2)}
                  </div>
                ) : (
                  <User size={22} />
                )}
              </button>

              {showUserDropdown && isLoggedIn && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-2xl shadow-clay-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="font-semibold text-foreground text-sm">{user?.name || "Nutriwow User"}</p>
                    <p className="text-xs text-muted-foreground/70">+91 {user?.mobile}</p>
                  </div>
                  <button
                    onClick={() => { navigate("/profile"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <User size={15} className="text-muted-foreground" /> My Profile
                  </button>
                  <button
                    onClick={() => { navigate("/profile?tab=orders"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Package size={15} className="text-muted-foreground" /> My Orders
                  </button>
                  <button
                    onClick={() => { navigate("/profile?tab=addresses"); setShowUserDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <MapPin size={15} className="text-muted-foreground" /> Saved Addresses
                  </button>
                  <button
                    onClick={() => { navigate("/profile?tab=loyalty"); setShowUserDropdown(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Star size={15} className="text-amber-500" /> My Points
                    </span>
                    {loyaltyBalance && loyaltyBalance.balance > 0 && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        {loyaltyBalance.balance} pts
                      </span>
                    )}
                  </button>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { logout(); setShowUserDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist — desktop */}
            <button
              className="hidden sm:flex relative text-foreground hover:text-red-500 transition-colors"
              onClick={() => navigate("/wishlist")}
              aria-label="Wishlist"
            >
              <Heart size={22} className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              className="relative text-white bg-nutriorange shadow-clay-btn hover:brightness-105 active:translate-y-0.5 active:shadow-clay-pressed transition-all px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 ? (
                <span className="absolute -top-2 -right-2 bg-nutrigreen text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-clay-sm">
                  {totalItems}
                </span>
              ) : (
                <span className="text-xs">0</span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop mega-menu nav */}
        <CategoryMegaMenu />

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[60px] bg-background z-50 overflow-y-auto">
            <div className="p-4">

              {/* Mobile Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
                <input
                  type="search"
                  autoFocus
                  placeholder="Search for nuts, seeds, snacks..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border-0 shadow-clay-pressed rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {/* Mobile Search Results */}
              {mobileSearchQuery.trim().length >= 2 && (
                <div className="mb-4">
                  {mobileSearchResults.length > 0 ? (
                    <div className="bg-card rounded-2xl overflow-hidden shadow-clay">
                      {mobileSearchResults.map((product: Product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product.handle)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground/70">{product.category}</p>
                          </div>
                          <p className="text-sm font-bold text-nutrigreen flex-shrink-0">₹{product.price}</p>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
                          setMobileSearchQuery("");
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 bg-clay-green text-sm font-semibold text-nutrigreen hover:brightness-105 transition-all"
                      >
                        <span>View all results for "{mobileSearchQuery}"</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No products found for "<strong>{mobileSearchQuery}</strong>"</p>
                  )}
                </div>
              )}

              {/* Categories */}
              {!mobileSearchQuery && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Shop by Category</p>
                  <ul className="space-y-0.5">
                    <li>
                      <a
                        href="/gifting"
                        className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-nutriorange hover:bg-accent rounded-2xl transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-clay-peach flex items-center justify-center text-xl">🎁</div>
                        Gifting & Hampers
                      </a>
                    </li>
                    {categories.map((cat) => (
                      <li key={cat.name}>
                        <a
                          href={`/collections/${encodeURIComponent(cat.name)}`}
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-2xl transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex-shrink-0 bg-clay-butter flex items-center justify-center text-xl overflow-hidden"
                            style={{
                              backgroundImage: `url(${cat.icon})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          >
                            <span className="drop-shadow" style={{ textShadow: "0 0 4px rgba(255,255,255,0.8)" }}>{cat.emoji}</span>
                          </div>
                          <span>{cat.name}</span>
                          <ChevronRight size={16} className="ml-auto text-muted-foreground/50" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* User section */}
              <div className="mt-4 pt-4 border-t border-border">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-nutrigreen text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-clay-sm">
                        {user?.name
                          ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                          : user?.mobile?.slice(-2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user?.name || "Nutriwow User"}</p>
                        <p className="text-xs text-muted-foreground/70">+91 {user?.mobile}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground w-full hover:bg-accent rounded-2xl"
                    >
                      <User size={18} className="text-muted-foreground" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => { navigate("/profile?tab=orders"); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground w-full hover:bg-accent rounded-2xl"
                    >
                      <Package size={18} className="text-muted-foreground" />
                      <span>My Orders</span>
                    </button>
                    <button
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-500 w-full hover:bg-red-50 rounded-xl"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setIsLoginOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground w-full hover:bg-accent rounded-2xl"
                  >
                    <User size={18} className="text-muted-foreground" />
                    <span>Login / Register</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <LoginModal />
    </>
  );
}
