import 'package:flutter/material.dart';

/// Lightweight shimmer placeholder — no external package. A pulsing grey box
/// used to build content-shaped loading states (Blinkit/Swiggy style).
class ShimmerBox extends StatefulWidget {
  final double? width;
  final double height;
  final double radius;
  const ShimmerBox({super.key, this.width, required this.height, this.radius = 8});

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1050))
        ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Color.lerp(
              const Color(0xFFEDEDED), const Color(0xFFDCDCDC), _c.value),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// 2-column grid of shimmer product cards — for category / search listings.
class ProductGridSkeleton extends StatelessWidget {
  final int count;
  const ProductGridSkeleton({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.62,
      ),
      itemCount: count,
      itemBuilder: (_, __) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Expanded(child: ShimmerBox(width: double.infinity, height: 0, radius: 14)),
          SizedBox(height: 8),
          ShimmerBox(width: 120, height: 12),
          SizedBox(height: 6),
          ShimmerBox(width: 70, height: 12),
          SizedBox(height: 8),
          ShimmerBox(width: double.infinity, height: 32, radius: 10),
        ],
      ),
    );
  }
}

/// Vertical list of shimmer cards — for the orders screen.
class ListSkeleton extends StatelessWidget {
  final int count;
  const ListSkeleton({super.key, this.count = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEEEEEE)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            ShimmerBox(width: 140, height: 14),
            SizedBox(height: 10),
            ShimmerBox(width: double.infinity, height: 12),
            SizedBox(height: 6),
            ShimmerBox(width: 200, height: 12),
            SizedBox(height: 12),
            ShimmerBox(width: 100, height: 16),
          ],
        ),
      ),
    );
  }
}
