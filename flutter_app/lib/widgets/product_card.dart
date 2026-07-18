import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/models.dart';
import '../screens/product_detail.dart';
import '../state/app_config.dart';
import '../state/wishlist.dart';
import '../theme.dart';
import 'add_button.dart';

/// Blinkit-style product card: image (heart, veg-mark, weight, ADD-on-edge),
/// then price → name → rating BELOW the image.
class ProductCard extends StatelessWidget {
  final Product product;
  final double width;

  const ProductCard({super.key, required this.product, this.width = 176});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ProductDetailScreen(product: product))),
      child: SizedBox(
        width: width == double.infinity ? null : width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image tile ──
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: NwColors.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    // Use gallery's first image (matches admin thumbnail:
                    // images[0] || image) — the hero column can be stale.
                    // cover → har image poora square bharti hai, sab same size
                    child: CachedNetworkImage(
                      imageUrl: product.gallery.first,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      // Decode at ~card resolution instead of full size — much
                      // faster to decode and far less memory when scrolling.
                      memCacheWidth: 400,
                      fadeInDuration: const Duration(milliseconds: 150),
                      placeholder: (_, __) => Container(
                          color: NwColors.greenLight.withValues(alpha: 0.3)),
                      errorWidget: (_, __, ___) =>
                          const Icon(Icons.image, color: NwColors.muted),
                    ),
                  ),
                  // Veg mark — admin-toggleable (off by default = clean image)
                  if (context.watch<AppConfigState>().vegMark)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        width: 15,
                        height: 15,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(
                              color: const Color(0xFF0A8F1A), width: 1.5),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: const Center(
                          child: SizedBox(
                            width: 7,
                            height: 7,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                  color: Color(0xFF0A8F1A),
                                  shape: BoxShape.circle),
                            ),
                          ),
                        ),
                      ),
                    ),
                  // Wishlist heart
                  Positioned(
                    top: 5,
                    right: 5,
                    child: _HeartButton(productId: product.id),
                  ),
                  // Discount ribbon
                  if (product.discount > 0)
                    Positioned(
                      top: 26,
                      left: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: const BoxDecoration(
                          color: NwColors.green,
                          borderRadius: BorderRadius.only(
                              topRight: Radius.circular(7),
                              bottomRight: Radius.circular(7)),
                        ),
                        child: Text('${product.discount}% OFF',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800)),
                      ),
                    ),
                  // ADD button, overlapping bottom-right of the image edge
                  Positioned(
                    right: 4,
                    bottom: -6,
                    child: AddButton(product: product),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            // ── Price → weight → name → rating (all BELOW the image, no overlap) ──
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(inr(product.price),
                    style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: NwColors.foreground)),
                if (product.mrp > product.price) ...[
                  const SizedBox(width: 5),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 1),
                    child: Text(inr(product.mrp),
                        style: const TextStyle(
                            fontSize: 11,
                            color: NwColors.muted,
                            decoration: TextDecoration.lineThrough)),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 2),
            Text(product.weight,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600,
                    color: Color(0xFF6A6359))),
            const SizedBox(height: 3),
            SizedBox(
              height: 32,
              child: Text(product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 11.5, height: 1.22, color: Color(0xFF4B463F))),
            ),
            if (product.reviewCount > 0)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Row(
                  children: [
                    Icon(Icons.star_rounded, size: 12, color: Colors.amber.shade600),
                    Text(' ${product.ratingValue.toStringAsFixed(1)}',
                        style: const TextStyle(
                            fontSize: 10.5, fontWeight: FontWeight.w700)),
                    Text(' (${product.reviewCount})',
                        style: const TextStyle(
                            fontSize: 10, color: NwColors.muted)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HeartButton extends StatelessWidget {
  final int productId;
  const _HeartButton({required this.productId});

  @override
  Widget build(BuildContext context) {
    final wl = context.watch<WishlistState>();
    final active = wl.contains(productId);
    return GestureDetector(
      onTap: () => wl.toggle(productId),
      child: Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 3,
                offset: const Offset(0, 1)),
          ],
        ),
        child: Icon(active ? Icons.favorite : Icons.favorite_border,
            size: 13,
            color: active ? Colors.red.shade400 : const Color(0xFFC9C2B8)),
      ),
    );
  }
}
