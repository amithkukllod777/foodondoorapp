import 'package:flutter/material.dart';

import '../api/api.dart';
import '../widgets/skeletons.dart';
import 'category.dart';

const _categoryEmojis = {
  'Nuts': '🥜',
  'Seeds': '🌻',
  'Berries': '🫐',
  'Snacks': '🍿',
  'Healthy Mix': '🥗',
  'Exotic Dried Fruits': '🥭',
  'Combos': '🎁',
  'Dates': '🌴',
  'Makhana': '🍥',
  'Ready to cook': '🍳',
  'Ready to Eat': '🍱',
};

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<String>? _categories;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final cats = await NutriwowApi.categories();
      if (mounted) setState(() => _categories = cats);
    } catch (_) {
      if (mounted) setState(() => _categories = _categoryEmojis.keys.toList());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      body: _categories == null
          ? const ProductGridSkeleton()
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
              ),
              itemCount: _categories!.length,
              itemBuilder: (_, i) {
                final cat = _categories![i];
                return InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => CategoryScreen(title: cat))),
                  child: Card(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_categoryEmojis[cat] ?? '🏷️',
                            style: const TextStyle(fontSize: 34)),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(cat,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 13.5)),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
