import 'package:flutter_test/flutter_test.dart';
import 'package:nutriwow_app/pricing.dart';

/// These mirror shared/pricing.ts EXACTLY — the server validates checkout
/// against those formulas, so any drift here means rejected orders.
void main() {
  group('getProductVariants (labels must match server byte-for-byte)', () {
    test('gram weights produce base/2x/4x with server multipliers', () {
      final v = getProductVariants('250g');
      expect(v.length, 3);
      expect(v[0].label, '250g');
      expect(v[0].priceMultiplier, 1);
      expect(v[1].label, '500g');
      expect(v[1].priceMultiplier, 1.85);
      expect(v[2].label, '1000g');
      expect(v[2].priceMultiplier, 3.5);
    });

    test('leading digits parse like parseInt (e.g. "400g(200 Pack of 2)")', () {
      final v = getProductVariants('400g(200 Pack of 2)');
      expect(v[0].label, '400g(200 Pack of 2)'); // base keeps original label
      expect(v[1].label, '800g');
      expect(v[2].label, '1600g');
    });

    test('non-numeric labels default to 250 base like the server', () {
      final v = getProductVariants('Pack of 2');
      expect(v[0].label, 'Pack of 2');
      expect(v[1].label, '500g');
      expect(v[2].label, '1000g');
    });

    test('empty weight falls back to 250g label', () {
      final v = getProductVariants('');
      expect(v[0].label, '250g');
      expect(v[1].label, '500g');
      expect(v[2].label, '1000g');
    });
  });

  group('bulk discount (server: qty 2 → 5%, qty 3+ → 10%)', () {
    test('quantities map to correct discount', () {
      expect(getBulkDiscount(1), 0);
      expect(getBulkDiscount(2), 0.05);
      expect(getBulkDiscount(3), 0.10);
      expect(getBulkDiscount(10), 0.10);
    });

    test('bulk price and savings use server rounding', () {
      // server: getBulkPrice = round(unit*(1-d)); savings = round(unit*d)*qty
      expect(getBulkPrice(499, 1), 499);
      expect(getBulkPrice(499, 2), 474); // 474.05 → 474
      expect(getBulkPrice(499, 3), 449); // 449.1 → 449
      expect(getBulkSavings(499, 2), 50); // round(24.95)=25 ×2
      expect(getBulkSavings(499, 3), 150); // round(49.9)=50 ×3
    });
  });

  group('variantUnitPrice matches server rounding', () {
    test('rounds like Math.round(price * multiplier)', () {
      expect(variantUnitPrice(499, 1), 499);
      expect(variantUnitPrice(499, 1.85), 923); // 923.15 → 923
      expect(variantUnitPrice(499, 3.5), 1747); // 1746.5 → 1747 (half-up)
      expect(variantUnitPrice(347, 1.85), 642); // 641.95 → 642
    });
  });

  group('computeShipping mirrors server', () {
    test('default: flat ₹49 below ₹499, free at/above', () {
      const cfg = ShippingConfig();
      expect(computeShipping(498, cfg), 49);
      expect(computeShipping(499, cfg), 0);
      expect(computeShipping(1500, cfg), 0);
    });

    test('fee<=0 means always free', () {
      expect(computeShipping(10, const ShippingConfig(fee: 0, freeAbove: 499)), 0);
    });

    test('freeAbove<=0 means fee always applies', () {
      expect(
          computeShipping(99999, const ShippingConfig(fee: 49, freeAbove: 0)),
          49);
    });
  });
}
