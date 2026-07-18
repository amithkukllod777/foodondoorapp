/*
 * Checkout page — redirects to home with cart drawer open.
 * Checkout now happens inside the CartDrawer sidebar.
 * Kept as a route for backward compatibility (e.g. PhonePe retry links).
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import SEO from "@/components/SEO";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { setIsCartOpen } = useCart();

  useEffect(() => {
    // Open the cart drawer and navigate to home
    setIsCartOpen(true);
    navigate("/", { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SEO title="Checkout" noIndex />
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Opening cart...</p>
      </div>
    </div>
  );
}
