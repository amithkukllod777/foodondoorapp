import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../pricing.dart';
import '../state/cart.dart';
import '../theme.dart';
import '../widgets/product_card.dart';
import '../widgets/review_sheet.dart';
import 'cart.dart';

// Owner asked to hide the weight selector on all products for now. Flip to
// true to bring back the "Select Weight" chips; the first variant stays default.
const bool kShowWeightSelector = false;

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late List<Variant> _variants;
  int _variantIdx = 0;
  int _qty = 1;
  int _imageIdx = 0;

  List<Review>? _reviews;
  RatingStats? _stats;
  List<Product>? _fbt;

  Product get product => widget.product;

  @override
  void initState() {
    super.initState();
    _variants = getProductVariants(product.weight);
    _loadExtras();
  }

  Future<void> _loadExtras() async {
    try {
      final results = await Future.wait([
        NutriwowApi.reviews(product.id),
        NutriwowApi.ratingStats(product.id),
        NutriwowApi.frequentlyBoughtTogether(product.id),
      ]);
      if (!mounted) return;
      setState(() {
        _reviews = results[0] as List<Review>;
        _stats = results[1] as RatingStats;
        _fbt = results[2] as List<Product>;
      });
    } catch (_) {}
  }

  Variant get _variant => _variants[_variantIdx];
  int get _unitPrice => variantUnitPrice(product.price, _variant.priceMultiplier);
  int get _unitMrp => variantUnitPrice(product.mrp, _variant.priceMultiplier);

  Future<void> _openReviewSheet() async {
    final posted = await showReviewSheet(context, product.id);
    if (posted && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Review submitted! Approval ke baad dikhega. Dhanyavaad 🙏'),
      ));
      _loadExtras(); // refresh in case it's auto-approved
    }
  }

  void _addToCart({bool buyNow = false}) {
    context.read<CartState>().add(product, _variant, quantity: _qty);
    if (buyNow) {
      Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => const CartScreen(standalone: true)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Added to cart'),
        duration: Duration(seconds: 1),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final gallery = product.gallery;
    return Scaffold(
      appBar: AppBar(title: Text(product.name, maxLines: 1)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          // ── Gallery ──
          AspectRatio(
            aspectRatio: 1,
            child: PageView.builder(
              itemCount: gallery.length,
              onPageChanged: (i) => setState(() => _imageIdx = i),
              itemBuilder: (_, i) => CachedNetworkImage(
                imageUrl: gallery[i],
                fit: BoxFit.cover,
                placeholder: (_, __) =>
                    Container(color: NwColors.greenLight.withValues(alpha: 0.4)),
                errorWidget: (_, __, ___) => const Icon(Icons.image, size: 60),
              ),
            ),
          ),
          if (gallery.length > 1)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  gallery.length,
                  (i) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: _imageIdx == i ? 16 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: _imageIdx == i ? NwColors.green : NwColors.border,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name,
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.star_rounded,
                        size: 18, color: Colors.amber.shade600),
                    Text(
                        ' ${(_stats?.avgRating ?? product.ratingValue).toStringAsFixed(1)}'
                        '  ·  ${_stats?.totalReviews ?? product.reviewCount} reviews',
                        style: const TextStyle(fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 12),

                // ── Price ──
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(inr(_unitPrice),
                        style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            color: NwColors.green)),
                    const SizedBox(width: 8),
                    if (_unitMrp > _unitPrice) ...[
                      Padding(
                        padding: const EdgeInsets.only(bottom: 3),
                        child: Text(inr(_unitMrp),
                            style: const TextStyle(
                                fontSize: 15,
                                color: NwColors.muted,
                                decoration: TextDecoration.lineThrough)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        margin: const EdgeInsets.only(bottom: 3),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: NwColors.gold,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                            '${(100 - _unitPrice * 100 / _unitMrp).round()}% OFF',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),

                // ── Variants ── (hidden for now, owner request)
                if (kShowWeightSelector && _variants.length > 1) ...[
                  const Text('Select Weight',
                      style:
                          TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: List.generate(_variants.length, (i) {
                      final v = _variants[i];
                      final selected = i == _variantIdx;
                      return ChoiceChip(
                        label: Text(
                            '${v.label} · ${inr(variantUnitPrice(product.price, v.priceMultiplier))}'),
                        selected: selected,
                        onSelected: (_) => setState(() => _variantIdx = i),
                        selectedColor: NwColors.greenLight,
                        labelStyle: TextStyle(
                            fontSize: 12.5,
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected
                                ? NwColors.green
                                : NwColors.foreground),
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Quantity + bulk hint ──
                Row(
                  children: [
                    const Text('Qty',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 12),
                    _QtyStepper(
                      value: _qty,
                      onChanged: (v) => setState(() => _qty = v),
                    ),
                    const SizedBox(width: 12),
                    if (_qty == 1)
                      const Expanded(
                        child: Text('Buy 2 → 5% off · Buy 3+ → 10% off',
                            style: TextStyle(
                                fontSize: 11.5, color: NwColors.orange)),
                      )
                    else
                      Expanded(
                        child: Text(
                            '${(getBulkDiscount(_qty) * 100).round()}% bulk discount applied 🎉',
                            style: const TextStyle(
                                fontSize: 11.5,
                                color: NwColors.green,
                                fontWeight: FontWeight.w600)),
                      ),
                  ],
                ),

                const SizedBox(height: 20),

                // ── Details accordions ──
                _Accordion(title: 'Product Description', body: product.description),
                if ((product.metafields['highlights'] as String?)?.isNotEmpty ??
                    false)
                  _Accordion(
                      title: 'Key Highlights',
                      bulletLines:
                          (product.metafields['highlights'] as String)
                              .split('\n')
                              .where((s) => s.trim().isNotEmpty)
                              .toList()),
                if (product.nutritionalInfo.isNotEmpty)
                  _Accordion(
                      title: 'Nutrition Information',
                      body: product.nutritionalInfo),
                _Accordion(
                  title: 'Ingredients & Storage',
                  body: [
                    if (product.ingredients.isNotEmpty)
                      'Ingredients: ${product.ingredients}',
                    if (product.shelfLife.isNotEmpty)
                      'Shelf Life: ${product.shelfLife}',
                    if (product.storageInfo.isNotEmpty)
                      'Storage: ${product.storageInfo}',
                    if ((product.metafields['countryOfOrigin'] as String?)
                            ?.isNotEmpty ??
                        false)
                      'Country of Origin: ${product.metafields['countryOfOrigin']}',
                  ].join('\n'),
                ),

                // ── Frequently bought together ──
                if (_fbt != null && _fbt!.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text('Frequently Bought Together',
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 308,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _fbt!.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, i) => ProductCard(product: _fbt![i]),
                    ),
                  ),
                ],

                // ── Ratings & Reviews (hamesha dikhta hai) ──
                const SizedBox(height: 20),
                Row(
                  children: [
                    Text('Ratings & Reviews',
                        style: Theme.of(context).textTheme.headlineSmall),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: _openReviewSheet,
                      icon: const Icon(Icons.edit_outlined, size: 16),
                      label: const Text('Write'),
                      style: TextButton.styleFrom(
                          foregroundColor: NwColors.green),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                if (_stats != null && _stats!.totalReviews > 0)
                  Row(
                    children: [
                      Icon(Icons.star_rounded,
                          size: 20, color: Colors.amber.shade600),
                      const SizedBox(width: 4),
                      Text(_stats!.avgRating.toStringAsFixed(1),
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                      Text('  ·  ${_stats!.totalReviews} review'
                          '${_stats!.totalReviews == 1 ? '' : 's'}',
                          style: const TextStyle(
                              fontSize: 13, color: NwColors.muted)),
                    ],
                  ),
                const SizedBox(height: 10),
                if (_reviews == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Center(
                        child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: NwColors.green))),
                  )
                else if (_reviews!.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F5F0),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      children: [
                        const Text('Abhi tak koi review nahi 😊',
                            style: TextStyle(
                                fontSize: 13, color: NwColors.muted)),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: _openReviewSheet,
                          child: const Text('Be the first to review'),
                        ),
                      ],
                    ),
                  )
                else
                  ..._reviews!.take(8).map((r) => _ReviewTile(review: r)),
              ],
            ),
          ),
        ],
      ),

      // ── Sticky bottom CTAs ──
      bottomSheet: !product.available
          ? Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              width: double.infinity,
              child: const Text('Currently out of stock',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Colors.red, fontWeight: FontWeight.w600)),
            )
          : Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _addToCart(),
                      child: const Text('Add to Cart'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _addToCart(buyNow: true),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: NwColors.orange),
                      child: const Text('Buy Now'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  const _QtyStepper({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: NwColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove, size: 18),
            onPressed: value > 1 ? () => onChanged(value - 1) : null,
            visualDensity: VisualDensity.compact,
          ),
          Text('$value',
              style:
                  const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          IconButton(
            icon: const Icon(Icons.add, size: 18),
            onPressed: () => onChanged(value + 1),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

class _Accordion extends StatelessWidget {
  final String title;
  final String? body;
  final List<String>? bulletLines;

  const _Accordion({required this.title, this.body, this.bulletLines});

  @override
  Widget build(BuildContext context) {
    if ((body == null || body!.trim().isEmpty) &&
        (bulletLines == null || bulletLines!.isEmpty)) {
      return const SizedBox.shrink();
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Text(title,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          iconColor: NwColors.green,
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          children: [
            if (bulletLines != null)
              ...bulletLines!.map((h) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('✓ ',
                            style: TextStyle(
                                color: NwColors.green,
                                fontWeight: FontWeight.w700)),
                        Expanded(
                            child: Text(h.trim(),
                                style: const TextStyle(
                                    fontSize: 12.5, height: 1.4))),
                      ],
                    ),
                  ))
            else
              Align(
                alignment: Alignment.centerLeft,
                child: Text(body!,
                    style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.5,
                        color: NwColors.foreground)),
              ),
          ],
        ),
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  final Review review;
  const _ReviewTile({required this.review});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ...List.generate(
                    5,
                    (i) => Icon(
                          i < review.rating
                              ? Icons.star_rounded
                              : Icons.star_outline_rounded,
                          size: 15,
                          color: Colors.amber.shade600,
                        )),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(review.customerName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12.5, fontWeight: FontWeight.w600)),
                ),
                if (review.verified)
                  const Row(
                    children: [
                      Icon(Icons.verified, size: 14, color: NwColors.green),
                      Text(' Verified',
                          style: TextStyle(
                              fontSize: 10.5, color: NwColors.green)),
                    ],
                  ),
              ],
            ),
            if (review.title.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(review.title,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600)),
            ],
            if (review.body.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(review.body,
                  style: const TextStyle(fontSize: 12.5, height: 1.4)),
            ],
          ],
        ),
      ),
    );
  }
}
