import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme.dart';

class OrderSuccessScreen extends StatelessWidget {
  final Order? order;
  final String? orderId;

  const OrderSuccessScreen({super.key, this.order, this.orderId});

  @override
  Widget build(BuildContext context) {
    final id = order?.id ?? orderId ?? '';
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.check_circle,
                  size: 88, color: NwColors.green),
              const SizedBox(height: 20),
              Text('Order Placed! 🎉',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 8),
              Text('Order ID: $id',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: NwColors.muted)),
              const SizedBox(height: 8),
              const Text(
                'Aapka order confirm ho gaya hai. WhatsApp par updates milte rahenge.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: NwColors.muted),
              ),
              if (order != null) ...[
                const SizedBox(height: 24),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        ...order!.items.map((i) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                        '${i.name} × ${i.quantity}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style:
                                            const TextStyle(fontSize: 12.5)),
                                  ),
                                  Text(inr(i.price * i.quantity),
                                      style: const TextStyle(fontSize: 12.5)),
                                ],
                              ),
                            )),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total',
                                style: TextStyle(
                                    fontWeight: FontWeight.w700)),
                            Text(inr(order!.total),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: NwColors.green)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((r) => r.isFirst),
                child: const Text('Continue Shopping'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
