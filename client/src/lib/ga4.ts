declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity: number;
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackViewItem(product: {
  id: number;
  name: string;
  category: string;
  price: number;
}) {
  gtag("event", "view_item", {
    currency: "INR",
    value: product.price,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: 1,
      },
    ],
  });
}

export function trackAddToCart(product: {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
}) {
  gtag("event", "add_to_cart", {
    currency: "INR",
    value: product.price * product.quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });
}

export function trackBeginCheckout(
  items: Array<{ id: number; name: string; price: number; quantity: number; category?: string }>,
  value: number,
  coupon?: string,
) {
  const ga4Items: GA4Item[] = items.map((i) => ({
    item_id: String(i.id),
    item_name: i.name,
    item_category: i.category,
    price: i.price,
    quantity: i.quantity,
  }));
  gtag("event", "begin_checkout", {
    currency: "INR",
    value,
    coupon,
    items: ga4Items,
  });
}

export function trackPurchase(
  transactionId: string,
  value: number,
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  shipping?: number,
  coupon?: string,
) {
  const ga4Items: GA4Item[] = items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
  }));
  gtag("event", "purchase", {
    transaction_id: transactionId,
    currency: "INR",
    value,
    shipping: shipping ?? 0,
    coupon,
    items: ga4Items,
  });
}
