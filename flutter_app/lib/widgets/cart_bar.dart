import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/cart.dart';
import '../theme.dart';

/// Blinkit-style floating "View Cart" bar shown above the bottom nav whenever
/// the cart has items and the user is not already on the Cart tab.
class CartBar extends StatelessWidget {
  final VoidCallback onView;
  const CartBar({super.key, required this.onView});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    if (cart.lines.isEmpty) return const SizedBox.shrink();

    final firstImage = cart.lines.first.product.image;
    final more = cart.lines.length - 1;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onView,
        child: Container(
          margin: const EdgeInsets.fromLTRB(10, 0, 10, 8),
          height: 54,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: NwColors.green,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                  color: NwColors.green.withValues(alpha: 0.35),
                  blurRadius: 12,
                  offset: const Offset(0, 4)),
            ],
          ),
          child: Row(
            children: [
              // stacked thumbnails
              SizedBox(
                width: more > 0 ? 46 : 34,
                height: 34,
                child: Stack(
                  children: [
                    _thumb(firstImage),
                    if (more > 0)
                      Positioned(
                        left: 14,
                        child: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white, width: 1),
                          ),
                          alignment: Alignment.center,
                          child: Text('+$more',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${cart.itemCount} item${cart.itemCount == 1 ? '' : 's'}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500)),
                  Text(inr(cart.total),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800)),
                ],
              ),
              const Spacer(),
              const Text('View Cart',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800)),
              const SizedBox(width: 2),
              const Icon(Icons.arrow_forward_ios,
                  color: Colors.white, size: 14),
            ],
          ),
        ),
      ),
    );
  }

  Widget _thumb(String url) => Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.antiAlias,
        child: Image.network(url,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                const Icon(Icons.image, size: 16, color: NwColors.muted)),
      );
}
