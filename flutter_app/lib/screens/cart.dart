import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/auth.dart';
import '../state/cart.dart';
import '../theme.dart';
import 'checkout.dart';
import 'login.dart';

class CartScreen extends StatefulWidget {
  /// standalone=true when pushed as its own route (Buy Now) rather than a tab.
  final bool standalone;
  const CartScreen({super.key, this.standalone = false});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _couponController = TextEditingController();
  bool _applying = false;
  List<FeaturedCoupon> _featured = [];

  @override
  void initState() {
    super.initState();
    NutriwowApi.featuredCoupons().then((list) {
      if (mounted) setState(() => _featured = list);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  Future<void> _applyCoupon() => _applyCode(_couponController.text);

  Future<void> _applyCode(String rawCode) async {
    final cart = context.read<CartState>();
    final code = rawCode.trim().toUpperCase();
    if (code.isEmpty) return;
    _couponController.text = code;
    cart.setCouponNotice('');
    setState(() => _applying = true);
    try {
      final result = await NutriwowApi.validateCoupon(code, cart.goodsTotal);
      if (!mounted) return;
      if (result.valid) {
        cart.applyCoupon(code,
            type: result.discountType,
            value: result.discountValue,
            minOrder: result.minOrderAmount);
        cart.setCouponNotice('✓ ${result.message}');
      } else {
        cart.clearCoupon();
        cart.setCouponNotice(result.message);
      }
    } catch (e) {
      if (mounted) cart.setCouponNotice('Could not apply coupon');
    } finally {
      if (mounted) setState(() => _applying = false);
    }
  }

  void _checkout() {
    final auth = context.read<AuthState>();
    if (!auth.isLoggedIn) {
      showLoginSheet(context, onSuccess: () {
        if (mounted) {
          Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CheckoutScreen()));
        }
      });
      return;
    }
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const CheckoutScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();

    return Scaffold(
      appBar: AppBar(
        title: Text('Cart${cart.itemCount > 0 ? ' (${cart.itemCount})' : ''}'),
        automaticallyImplyLeading: widget.standalone,
      ),
      body: cart.lines.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shopping_cart_outlined,
                      size: 64, color: NwColors.muted),
                  SizedBox(height: 12),
                  Text('Your cart is empty',
                      style: TextStyle(color: NwColors.muted)),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 220),
              children: [
                ...cart.lines.map((line) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: line.product.image,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) =>
                                    const Icon(Icons.image),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(line.product.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 2),
                                  Text(line.variant.label,
                                      style: const TextStyle(
                                          fontSize: 11.5,
                                          color: NwColors.muted)),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(inr(line.lineTotal),
                                          style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: NwColors.green)),
                                      if (line.lineBulkSavings > 0)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(left: 6),
                                          child: Text(
                                              'saved ${inr(line.lineBulkSavings)}',
                                              style: const TextStyle(
                                                  fontSize: 10.5,
                                                  color: NwColors.green)),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                Row(
                                  children: [
                                    _RoundIcon(
                                      icon: Icons.remove,
                                      onTap: () => cart.setQuantity(
                                          line, line.quantity - 1),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10),
                                      child: Text('${line.quantity}',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700)),
                                    ),
                                    _RoundIcon(
                                      icon: Icons.add,
                                      onTap: () => cart.setQuantity(
                                          line, line.quantity + 1),
                                    ),
                                  ],
                                ),
                                TextButton(
                                  onPressed: () => cart.remove(line),
                                  child: const Text('Remove',
                                      style: TextStyle(
                                          fontSize: 11, color: Colors.red)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )),

                // ── Free shipping progress (website jaisa) ──
                if (cart.shippingCfg.fee > 0 && cart.shippingCfg.freeAbove > 0)
                  Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cart.shipping == 0
                                ? "🚚 You've unlocked FREE shipping! 🎉"
                                : '🚚 Add ${inr(cart.shippingCfg.freeAbove - cart.goodsTotal)} more for FREE shipping!',
                            style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: cart.shipping == 0
                                    ? NwColors.green
                                    : NwColors.orange),
                          ),
                          const SizedBox(height: 8),
                          // Animated fill (website jaisa smooth transition)
                          TweenAnimationBuilder<double>(
                            tween: Tween(
                                begin: 0,
                                end: (cart.goodsTotal /
                                        cart.shippingCfg.freeAbove)
                                    .clamp(0.0, 1.0)
                                    .toDouble()),
                            duration: const Duration(milliseconds: 600),
                            curve: Curves.easeOutCubic,
                            builder: (context, value, _) => ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: value,
                                minHeight: 9,
                                backgroundColor: NwColors.border,
                                color: cart.shipping == 0
                                    ? NwColors.green
                                    : NwColors.orange,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // ── Coupon ──
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (cart.couponCode.isNotEmpty)
                          Row(
                            children: [
                              const Icon(Icons.local_offer,
                                  size: 16, color: NwColors.green),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                    '${cart.couponCode} applied — ${inr(cart.couponDiscount)} off',
                                    style: const TextStyle(
                                        fontSize: 13,
                                        color: NwColors.green,
                                        fontWeight: FontWeight.w600)),
                              ),
                              TextButton(
                                onPressed: () {
                                  cart.clearCoupon();
                                  cart.setCouponNotice('');
                                },
                                child: const Text('Remove'),
                              ),
                            ],
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _couponController,
                                  textCapitalization:
                                      TextCapitalization.characters,
                                  decoration: const InputDecoration(
                                      hintText: 'Coupon code',
                                      isDense: true),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _applying ? null : _applyCoupon,
                                child: Text(_applying ? '...' : 'Apply'),
                              ),
                            ],
                          ),
                        if (cart.couponNotice.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(cart.couponNotice,
                                style: TextStyle(
                                    fontSize: 11.5,
                                    color: cart.couponNotice.startsWith('✓')
                                        ? NwColors.green
                                        : Colors.red)),
                          ),

                        // ── Available coupons (tap to apply) ──
                        if (_featured.isNotEmpty &&
                            cart.couponCode.isEmpty) ...[
                          const Padding(
                            padding: EdgeInsets.only(top: 12, bottom: 6),
                            child: Text('AVAILABLE COUPONS',
                                style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: NwColors.muted)),
                          ),
                          ..._featured.map((c) => InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap:
                                    _applying ? null : () => _applyCode(c.code),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: NwColors.greenLight
                                        .withValues(alpha: 0.5),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        color: NwColors.green
                                            .withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.local_offer,
                                          size: 16, color: NwColors.green),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                                '${c.code} · ${c.offerText}',
                                                style: const TextStyle(
                                                    fontSize: 12.5,
                                                    fontWeight:
                                                        FontWeight.w700,
                                                    color: NwColors.green)),
                                            if (c.description.isNotEmpty)
                                              Text(c.description,
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                      fontSize: 11,
                                                      color: NwColors.muted))
                                            else if (c.minOrderAmount > 0)
                                              Text(
                                                  'On orders above ${inr(c.minOrderAmount)}',
                                                  style: const TextStyle(
                                                      fontSize: 11,
                                                      color: NwColors.muted)),
                                          ],
                                        ),
                                      ),
                                      const Text('TAP TO APPLY',
                                          style: TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w700,
                                              color: NwColors.orange)),
                                    ],
                                  ),
                                ),
                              )),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
      bottomSheet: cart.lines.isEmpty
          ? null
          : Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _row('Subtotal', inr(cart.preBulkSubtotal)),
                  if (cart.bulkSavings > 0)
                    _row('Bulk discount', '-${inr(cart.bulkSavings)}',
                        color: NwColors.green),
                  if (cart.couponDiscount > 0)
                    _row('Coupon (${cart.couponCode})',
                        '-${inr(cart.couponDiscount)}',
                        color: NwColors.green),
                  _row(
                      'Shipping',
                      cart.shipping == 0
                          ? 'FREE'
                          : inr(cart.shipping),
                      color: cart.shipping == 0 ? NwColors.green : null),
                  const Divider(height: 16),
                  _row('Total', inr(cart.total), bold: true),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _checkout,
                      style: ElevatedButton.styleFrom(
                          backgroundColor: NwColors.orange),
                      child: const Text('Proceed to Checkout'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _row(String label, String value, {bool bold = false, Color? color}) {
    final style = TextStyle(
      fontSize: bold ? 16 : 13,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
      color: color,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: style), Text(value, style: style)],
      ),
    );
  }
}

class _RoundIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIcon({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: Border.all(color: NwColors.border),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 16),
      ),
    );
  }
}
