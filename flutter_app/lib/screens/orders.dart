import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../theme.dart';
import '../widgets/skeletons.dart';

const _statusColors = {
  'placed': Colors.blue,
  'processing': Colors.amber,
  'shipped': Colors.purple,
  'delivered': NwColors.green,
  'cancelled': Colors.red,
  'pending_payment': Colors.orange,
};

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order>? _orders;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _failed = false);
    try {
      final orders = await NutriwowApi.myOrders();
      if (mounted) setState(() => _orders = orders);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: _failed
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Could not load orders.'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                      onPressed: _load, child: const Text('Try Again')),
                ],
              ),
            )
          : _orders == null
              ? const ListSkeleton()
              : _orders!.isEmpty
                  ? const Center(
                      child: Text('No orders yet',
                          style: TextStyle(color: NwColors.muted)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: NwColors.green,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _orders!.length,
                        itemBuilder: (_, i) => _OrderCard(order: _orders![i]),
                      ),
                    ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColors[order.status] ?? NwColors.muted;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('#${order.id}',
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    order.status == 'pending_payment'
                        ? 'Payment Pending'
                        : order.status[0].toUpperCase() +
                            order.status.substring(1),
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: statusColor),
                  ),
                ),
              ],
            ),
            if (order.createdAt != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                    DateFormat('d MMM yyyy, h:mm a').format(order.createdAt!),
                    style: const TextStyle(
                        fontSize: 11, color: NwColors.muted)),
              ),
            const Divider(height: 18),
            ...order.items.take(3).map((i) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('• ${i.name} × ${i.quantity}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5)),
                )),
            if (order.items.length > 3)
              Text('+ ${order.items.length - 3} more items',
                  style:
                      const TextStyle(fontSize: 11.5, color: NwColors.muted)),
            const Divider(height: 18),
            _tracker(order.status),
            if (order.awbCode.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('AWB: ${order.awbCode}',
                    style: const TextStyle(fontSize: 11, color: NwColors.muted)),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(inr(order.total),
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: NwColors.green)),
                Text('  ·  ${order.paymentMethod}',
                    style:
                        const TextStyle(fontSize: 12, color: NwColors.muted)),
                const Spacer(),
                if (order.trackingUrl.isNotEmpty)
                  TextButton.icon(
                    onPressed: () => launchUrl(Uri.parse(order.trackingUrl),
                        mode: LaunchMode.externalApplication),
                    icon: const Icon(Icons.local_shipping_outlined, size: 16),
                    label: const Text('Track Shipment'),
                  ),
              ],
            ),
            // Download invoice — hidden for unpaid/cancelled orders
            if (order.status != 'pending_payment' &&
                order.status != 'cancelled') ...[
              const SizedBox(height: 4),
              _InvoiceButton(orderId: order.id),
            ],
          ],
        ),
      ),
    );
  }

  // Order progress timeline (Placed → Processing → Shipped → Delivered).
  Widget _tracker(String status) {
    const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
    const idx = {
      'placed': 0,
      'processing': 1,
      'shipped': 2,
      'out_for_delivery': 2,
      'delivered': 3,
    };
    if (status == 'cancelled' || status == 'pending_payment') {
      return Text(
        status == 'cancelled' ? 'Order cancelled' : 'Awaiting payment',
        style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: status == 'cancelled' ? Colors.red : NwColors.orange),
      );
    }
    final current = idx[status] ?? 0;
    return Column(
      children: [
        Row(
          children: [
            for (int i = 0; i < steps.length; i++) ...[
              CircleAvatar(
                radius: 8,
                backgroundColor:
                    i <= current ? NwColors.green : const Color(0xFFD9D9D9),
                child: i <= current
                    ? const Icon(Icons.check, size: 10, color: Colors.white)
                    : null,
              ),
              if (i < steps.length - 1)
                Expanded(
                  child: Container(
                    height: 2,
                    color: i < current
                        ? NwColors.green
                        : const Color(0xFFD9D9D9),
                  ),
                ),
            ],
          ],
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (int i = 0; i < steps.length; i++)
              Text(steps[i],
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight:
                          i == current ? FontWeight.w700 : FontWeight.w400,
                      color: i <= current ? NwColors.green : NwColors.muted)),
          ],
        ),
      ],
    );
  }
}

/// "Download Invoice" — fetches the persisted GST invoice PDF URL and opens it.
class _InvoiceButton extends StatefulWidget {
  final String orderId;
  const _InvoiceButton({required this.orderId});

  @override
  State<_InvoiceButton> createState() => _InvoiceButtonState();
}

class _InvoiceButtonState extends State<_InvoiceButton> {
  bool _loading = false;

  Future<void> _download() async {
    setState(() => _loading = true);
    try {
      final url = await NutriwowApi.invoiceUrl(widget.orderId);
      if (url.isEmpty) throw Exception('No invoice URL');
      final ok = await launchUrl(Uri.parse(url),
          mode: LaunchMode.externalApplication);
      if (!ok) throw Exception('Could not open invoice');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Could not download invoice. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _loading ? null : _download,
        style: OutlinedButton.styleFrom(
          foregroundColor: NwColors.green,
          side: const BorderSide(color: NwColors.green),
          padding: const EdgeInsets.symmetric(vertical: 8),
        ),
        icon: _loading
            ? const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: NwColors.green))
            : const Icon(Icons.download_outlined, size: 16),
        label: Text(_loading ? 'Preparing invoice…' : 'Download Invoice'),
      ),
    );
  }
}
