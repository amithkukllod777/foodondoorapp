import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/models.dart';
import '../pricing.dart';

class CartLine {
  final Product product;
  final Variant variant;
  int quantity;

  CartLine({required this.product, required this.variant, this.quantity = 1});

  /// Server-validated unit price for this variant (pre-bulk-discount).
  int get unitPrice => variantUnitPrice(product.price, variant.priceMultiplier);
  int get unitMrp => variantUnitPrice(product.mrp, variant.priceMultiplier);

  /// Server formula: per-unit bulk price × qty (rounding matches server).
  int get lineTotal => getBulkPrice(unitPrice, quantity) * quantity;
  int get lineBulkSavings => getBulkSavings(unitPrice, quantity);

  String get key => '${product.id}_${variant.label}';

  Map<String, dynamic> toJson() => {
        'productId': product.id,
        'variantLabel': variant.label,
        'quantity': quantity,
      };
}

class CartState extends ChangeNotifier {
  final List<CartLine> lines = [];
  String couponCode = '';
  // Coupon is stored by type + value so the discount RECOMPUTES whenever the
  // cart changes (fixes: discount stayed frozen when quantity changed).
  String _couponType = 'flat'; // 'percent' | 'flat'
  num _couponValue = 0;
  num _couponMinOrder = 0;

  /// Live coupon discount for the CURRENT cart — never a stale fixed amount.
  /// Mirrors the server (validateCoupon): percent → % of goods; flat → capped
  /// to goods; 0 if below the coupon's minimum order.
  num get couponDiscount {
    if (couponCode.isEmpty) return 0;
    if (goodsTotal < _couponMinOrder) return 0;
    if (_couponType == 'percent') {
      return (goodsTotal * _couponValue / 100).round();
    }
    return _couponValue.clamp(0, goodsTotal);
  }

  /// Shipping config from settings.getPublic (website fallback: ₹49 / free ≥₹499)
  ShippingConfig shippingCfg = const ShippingConfig();

  num get goodsTotal => lines.fold<num>(0, (s, l) => s + l.lineTotal);
  // Sum of unit prices × qty BEFORE the quantity/bulk discount — shown as the
  // "Subtotal", with bulk savings as a separate line so the discount is visible.
  num get preBulkSubtotal => lines.fold<num>(0, (s, l) => s + l.unitPrice * l.quantity);
  num get bulkSavings => lines.fold<num>(0, (s, l) => s + l.lineBulkSavings);

  /// Reactive coupon status message (applied / removed / error) so the UI never
  /// shows a stale note.
  String couponNotice = '';
  void setCouponNotice(String s) {
    couponNotice = s;
    notifyListeners();
  }
  num get mrpTotal =>
      lines.fold<num>(0, (s, l) => s + l.unitMrp * l.quantity);
  // Website computes shipping on the goods total (after bulk, before coupon).
  num get shipping => lines.isEmpty ? 0 : computeShipping(goodsTotal, shippingCfg);
  num get total => (goodsTotal - couponDiscount).clamp(0, double.infinity) + shipping;
  int get itemCount => lines.fold(0, (s, l) => s + l.quantity);

  void setShippingConfig(ShippingConfig cfg) {
    shippingCfg = cfg;
    notifyListeners();
  }

  void add(Product product, Variant variant, {int quantity = 1}) {
    final key = '${product.id}_${variant.label}';
    final existing = lines.where((l) => l.key == key).firstOrNull;
    if (existing != null) {
      existing.quantity += quantity;
    } else {
      lines.add(CartLine(product: product, variant: variant, quantity: quantity));
    }
    _revalidateCoupon();
    _persist();
    notifyListeners();
  }

  void setQuantity(CartLine line, int quantity) {
    if (quantity <= 0) {
      lines.remove(line);
    } else {
      line.quantity = quantity;
    }
    _revalidateCoupon();
    _persist();
    notifyListeners();
  }

  void remove(CartLine line) {
    lines.remove(line);
    _revalidateCoupon();
    _persist();
    notifyListeners();
  }

  void applyCoupon(String code, {required String type, required num value, num minOrder = 0}) {
    couponCode = code;
    _couponType = type;
    _couponValue = value;
    _couponMinOrder = minOrder;
    notifyListeners();
  }

  void clearCoupon() {
    couponCode = '';
    _couponType = 'flat';
    _couponValue = 0;
    _couponMinOrder = 0;
    notifyListeners();
  }

  /// Auto-remove the coupon if the cart is empty or drops below the coupon's
  /// minimum order — so a below-min coupon is REMOVED, not left showing ₹0.
  void _revalidateCoupon() {
    if (couponCode.isEmpty) return;
    if (lines.isEmpty) {
      clearCoupon();
      couponNotice = '';
      return;
    }
    if (_couponMinOrder > 0 && goodsTotal < _couponMinOrder) {
      final min = _couponMinOrder;
      clearCoupon();
      couponNotice = 'Coupon removed — add ₹${(min - goodsTotal).ceil()} more to use it (min ₹${min.toStringAsFixed(0)}).';
    }
  }

  void clear() {
    lines.clear();
    clearCoupon();
    _persist();
    notifyListeners();
  }

  // ── Persistence: product ids + variant labels; products re-fetched on load ──
  static const _prefsKey = 'nw_cart_v1';

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _prefsKey, jsonEncode(lines.map((l) => l.toJson()).toList()));
  }

  /// Restore cart lines given a product lookup (fetched via bulkByIds).
  Future<List<Map<String, dynamic>>> loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) return [];
    try {
      return List<Map<String, dynamic>>.from(
          (jsonDecode(raw) as List).whereType<Map>().map(
              (e) => Map<String, dynamic>.from(e)));
    } catch (_) {
      return [];
    }
  }

  void restore(List<Map<String, dynamic>> saved, List<Product> products) {
    final byId = {for (final p in products) p.id: p};
    for (final row in saved) {
      final product = byId[row['productId']];
      if (product == null) continue;
      final variants = getProductVariants(product.weight);
      final variant = variants
              .where((v) => v.label == row['variantLabel'])
              .firstOrNull ??
          variants.first;
      lines.add(CartLine(
        product: product,
        variant: variant,
        quantity: (row['quantity'] as num?)?.toInt() ?? 1,
      ));
    }
    notifyListeners();
  }
}
