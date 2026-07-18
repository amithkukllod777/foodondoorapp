/**
 * Facebook Conversions API (CAPI) Frontend Hook
 * 
 * Sends events to both:
 * 1. Browser Pixel (fbq) - client-side
 * 2. Server CAPI (tRPC) - server-side
 * 
 * Uses the same event_id for deduplication so Meta doesn't count duplicates.
 */

import { trpc } from "@/lib/trpc";

/** Generate a unique event ID for deduplication */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** Get _fbp cookie value (set by Facebook Pixel) */
function getFbp(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/);
  return match ? match[1] : undefined;
}

/** Get _fbc cookie value (set by Facebook click ID) */
function getFbc(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/);
  return match ? match[1] : undefined;
}

/** Fire browser pixel event with event_id for deduplication */
function firePixelEvent(eventName: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName, params, { eventID: eventId });
  }
}

export function useFacebookCapi() {
  const trackMutation = trpc.capi.trackEvent.useMutation({ onError: (e) => console.warn("[CAPI] event failed", e.message) });

  /** Get user data from localStorage (phone/email from login) */
  function getUserData() {
    try {
      const authData = localStorage.getItem("nutriwow_session_v3");
      if (authData) {
        const u = JSON.parse(authData);
        return {
          phone: u.mobile || undefined,
          email: u.email || undefined,
        };
      }
    } catch {}
    return { phone: undefined, email: undefined };
  }

  /** Track ViewContent - when user views a product page */
  function trackViewContent(params: {
    productId: string;
    productName: string;
    productCategory?: string;
    value: number;
  }) {
    const eventId = generateEventId();
    const userData = getUserData();

    // 1. Fire browser pixel
    firePixelEvent("ViewContent", {
      content_ids: [params.productId],
      content_type: "product",
      content_name: params.productName,
      content_category: params.productCategory,
      value: params.value,
      currency: "INR",
    }, eventId);

    // 2. Send to server CAPI
    trackMutation.mutate({
      eventName: "ViewContent",
      eventId,
      value: params.value,
      contentIds: [params.productId],
      contentName: params.productName,
      contentCategory: params.productCategory,
      phone: userData.phone,
      email: userData.email,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  }

  /** Track AddToCart - when user adds a product to cart */
  function trackAddToCart(params: {
    productId: string;
    productName: string;
    productCategory?: string;
    value: number;
  }) {
    const eventId = generateEventId();
    const userData = getUserData();

    // 1. Fire browser pixel
    firePixelEvent("AddToCart", {
      content_ids: [params.productId],
      content_type: "product",
      content_name: params.productName,
      value: params.value,
      currency: "INR",
    }, eventId);

    // 2. Send to server CAPI
    trackMutation.mutate({
      eventName: "AddToCart",
      eventId,
      value: params.value,
      contentIds: [params.productId],
      contentName: params.productName,
      contentCategory: params.productCategory,
      phone: userData.phone,
      email: userData.email,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  }

  /** Track InitiateCheckout - when user starts checkout */
  function trackInitiateCheckout(params: {
    cartTotal: number;
    productIds: string[];
    numItems: number;
  }) {
    const eventId = generateEventId();
    const userData = getUserData();

    // 1. Fire browser pixel
    firePixelEvent("InitiateCheckout", {
      content_ids: params.productIds,
      content_type: "product",
      value: params.cartTotal,
      currency: "INR",
      num_items: params.numItems,
    }, eventId);

    // 2. Send to server CAPI
    trackMutation.mutate({
      eventName: "InitiateCheckout",
      eventId,
      value: params.cartTotal,
      contentIds: params.productIds,
      numItems: params.numItems,
      phone: userData.phone,
      email: userData.email,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  }

  function trackSearch(params: {
    searchQuery: string;
    resultCount: number;
  }) {
    const eventId = generateEventId();
    const userData = getUserData();

    firePixelEvent("Search", {
      search_string: params.searchQuery,
      content_category: "product",
      currency: "INR",
    }, eventId);

    trackMutation.mutate({
      eventName: "Search",
      eventId,
      searchQuery: params.searchQuery,
      numItems: params.resultCount,
      phone: userData.phone,
      email: userData.email,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  }

  function trackLead(params: {
    leadType: string;
  }) {
    const eventId = generateEventId();
    const userData = getUserData();

    firePixelEvent("Lead", {
      content_name: params.leadType,
      currency: "INR",
    }, eventId);

    trackMutation.mutate({
      eventName: "Lead",
      eventId,
      leadType: params.leadType,
      phone: userData.phone,
      email: userData.email,
      sourceUrl: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  }

  return {
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackSearch,
    trackLead,
  };
}
