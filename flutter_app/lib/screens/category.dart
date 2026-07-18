import 'package:flutter/material.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../widgets/skeletons.dart';
import '../widgets/product_card.dart';

/// Product grid for a category (or a pre-loaded section like Bestseller).
class CategoryScreen extends StatefulWidget {
  final String title;
  final List<Product>? initialProducts;

  const CategoryScreen({super.key, required this.title, this.initialProducts});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  List<Product>? _products;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialProducts != null) {
      _products = widget.initialProducts;
    } else {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() => _failed = false);
    try {
      final products = await NutriwowApi.byCategory(widget.title);
      if (mounted) setState(() => _products = products);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: _failed
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Could not load products.'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                      onPressed: _load, child: const Text('Try Again')),
                ],
              ),
            )
          : _products == null
              ? const ProductGridSkeleton()
              : _products!.isEmpty
                  ? const Center(child: Text('No products in this category yet.'))
                  : GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.62,
                      ),
                      itemCount: _products!.length,
                      itemBuilder: (_, i) => ProductCard(
                          product: _products![i], width: double.infinity),
                    ),
    );
  }
}
