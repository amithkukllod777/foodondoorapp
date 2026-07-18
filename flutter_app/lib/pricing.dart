/// EXACT mirror of shared/pricing.ts — the server validates checkout prices
/// against these rules, so every formula and rounding here must match it.
library;

class Variant {
  final String label;
  final double priceMultiplier;
  const Variant(this.label, this.priceMultiplier);
}

const variantMultipliers = [1.0, 1.85, 3.5];

/// parseInt-like: leading digits of the weight label, default 250.
int baseWeightGrams(String? productWeight) {
  final m = RegExp(r'^\s*(\d+)').firstMatch(productWeight ?? '');
  final n = m == null ? 0 : int.parse(m.group(1)!);
  return n == 0 ? 250 : n;
}

/// The three weight variants offered for a product — labels must be byte-for-
/// byte identical to the server's, since placeOrder validates item.weight
/// against this list.
List<Variant> getProductVariants(String? productWeight) {
  final base = baseWeightGrams(productWeight);
  final baseLabel = (productWeight != null && productWeight.trim().isNotEmpty)
      ? productWeight
      : '${base}g';
  return [
    Variant(baseLabel, variantMultipliers[0]),
    Variant('${base * 2}g', variantMultipliers[1]),
    Variant('${base * 4}g', variantMultipliers[2]),
  ];
}

/// Per-line bulk discount fraction: qty 2 → 5%, qty 3+ → 10%.
double getBulkDiscount(int quantity) {
  if (quantity >= 3) return 0.10;
  if (quantity >= 2) return 0.05;
  return 0;
}

/// JS Math.round semantics (half-up, including exact .5) — Dart's round() is
/// half-away-from-zero which matches for positive amounts.
int _jsRound(num v) => v.round();

/// Variant unit price the server expects in placeOrder items (pre-bulk).
int variantUnitPrice(num basePrice, double multiplier) =>
    _jsRound(basePrice * multiplier);

/// Unit price after bulk discount — server: Math.round(unitPrice * (1 - d)).
int getBulkPrice(int unitPrice, int quantity) =>
    _jsRound(unitPrice * (1 - getBulkDiscount(quantity)));

/// Line savings — server: Math.round(unitPrice * d) * quantity.
int getBulkSavings(int unitPrice, int quantity) =>
    _jsRound(unitPrice * getBulkDiscount(quantity)) * quantity;

/// Shipping config comes from settings.getPublic → "shipping"; the website
/// falls back to ₹49 flat / free at ₹499 when unset.
class ShippingConfig {
  final int fee;
  final int freeAbove;
  const ShippingConfig({this.fee = 49, this.freeAbove = 499});
}

/// Mirror of computeShipping(): fee<=0 → free; free at/above freeAbove.
int computeShipping(num goodsTotal, ShippingConfig cfg) {
  if (cfg.fee <= 0) return 0;
  if (cfg.freeAbove > 0 && goodsTotal >= cfg.freeAbove) return 0;
  return cfg.fee;
}
