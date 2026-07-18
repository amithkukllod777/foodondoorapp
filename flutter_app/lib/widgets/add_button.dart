import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../pricing.dart';
import '../state/cart.dart';
import '../theme.dart';

/// Blinkit-signature ADD control, sized to sit on the product image's bottom
/// edge. Outlined green "ADD" (+ "N options" hint for multi-variant products)
/// that morphs into a filled green [− qty +] stepper once in the cart.
class AddButton extends StatelessWidget {
  final Product product;
  final double width;

  const AddButton({super.key, required this.product, this.width = 64});

  @override
  Widget build(BuildContext context) {
    if (!product.available) {
      return Container(
        width: width,
        height: 31,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: NwColors.border),
        ),
        child: Text('Sold Out',
            style: TextStyle(
                fontSize: 10, fontWeight: FontWeight.w700, color: Colors.red.shade400)),
      );
    }

    final variant = getProductVariants(product.weight).first;
    final cart = context.watch<CartState>();
    final line = cart.lines
        .where((l) => l.key == '${product.id}_${variant.label}')
        .firstOrNull;
    final qty = line?.quantity ?? 0;

    if (qty == 0) {
      return SizedBox(
        width: width,
        height: 31,
        child: Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9),
          child: InkWell(
            borderRadius: BorderRadius.circular(9),
            onTap: () => cart.add(product, variant),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: NwColors.green, width: 1.4),
                color: NwColors.green.withValues(alpha: 0.06),
              ),
              child: const Text('ADD',
                  style: TextStyle(
                      color: NwColors.green,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4)),
            ),
          ),
        ),
      );
    }

    return Container(
      width: width,
      height: 31,
      decoration: BoxDecoration(
        color: NwColors.green,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _Step(icon: Icons.remove, onTap: () => cart.setQuantity(line!, qty - 1)),
          Text('$qty',
              style: const TextStyle(
                  color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
          _Step(icon: Icons.add, onTap: () => cart.setQuantity(line!, qty + 1)),
        ],
      ),
    );
  }
}

class _Step extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _Step({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(9),
      child: SizedBox(
        width: 22,
        height: double.infinity,
        child: Icon(icon, size: 15, color: Colors.white),
      ),
    );
  }
}
