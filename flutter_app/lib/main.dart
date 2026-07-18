import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api.dart';
import 'api/trpc_client.dart';
import 'screens/cart.dart';
import 'screens/categories.dart';
import 'screens/home.dart';
import 'screens/profile.dart';
import 'state/app_config.dart';
import 'state/auth.dart';
import 'state/cart.dart';
import 'state/wishlist.dart';
import 'theme.dart';
import 'widgets/cart_bar.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NutriwowApp());
}

class NutriwowApp extends StatelessWidget {
  const NutriwowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()),
        ChangeNotifierProvider(create: (_) => CartState()),
        ChangeNotifierProvider(create: (_) => WishlistState()),
        ChangeNotifierProvider(create: (_) => AppConfigState()),
      ],
      child: MaterialApp(
        title: 'Nutriwow',
        debugShowCheckedModeBanner: false,
        theme: nutriwowTheme(),
        home: const RootShell(),
      ),
    );
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await TrpcClient.instance.init();
    if (!mounted) return;
    final auth = context.read<AuthState>();
    final cart = context.read<CartState>();
    final wishlist = context.read<WishlistState>();
    final appConfig = context.read<AppConfigState>();
    // Restore session + saved cart + shipping config + wishlist in parallel
    await Future.wait([
      auth.init(),
      wishlist.init(),
      appConfig.init(),
      NutriwowApi.shippingConfig().then(cart.setShippingConfig),
      () async {
        final saved = await cart.loadSaved();
        if (saved.isEmpty) return;
        final ids = saved
            .map((r) => (r['productId'] as num?)?.toInt())
            .whereType<int>()
            .toSet()
            .toList();
        try {
          final products = await NutriwowApi.bulkByIds(ids);
          cart.restore(saved, products);
        } catch (_) {}
      }(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartState>().itemCount;
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: const [
          HomeScreen(),
          CategoriesScreen(),
          CartScreen(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Blinkit-style floating cart bar (hidden on the Cart tab itself)
          if (_tab != 2) CartBar(onView: () => setState(() => _tab = 2)),
          _buildTabBar(cartCount),
        ],
      ),
    );
  }

  Widget _buildTabBar(int cartCount) {
    return CupertinoTabBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        backgroundColor: Colors.white.withValues(alpha: 0.92),
        activeColor: NwColors.green,
        inactiveColor: const Color(0xFF8E8E93),
        border: const Border(
            top: BorderSide(color: Color(0x33000000), width: 0.3)),
        items: [
          const BottomNavigationBarItem(
              icon: Icon(CupertinoIcons.house),
              activeIcon: Icon(CupertinoIcons.house_fill),
              label: 'Home'),
          const BottomNavigationBarItem(
              icon: Icon(CupertinoIcons.square_grid_2x2),
              activeIcon: Icon(CupertinoIcons.square_grid_2x2_fill),
              label: 'Categories'),
          BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: cartCount > 0,
                label: Text('$cartCount'),
                backgroundColor: NwColors.orange,
                child: const Icon(CupertinoIcons.cart),
              ),
              activeIcon: Badge(
                isLabelVisible: cartCount > 0,
                label: Text('$cartCount'),
                backgroundColor: NwColors.orange,
                child: const Icon(CupertinoIcons.cart_fill),
              ),
              label: 'Cart'),
          const BottomNavigationBarItem(
              icon: Icon(CupertinoIcons.person),
              activeIcon: Icon(CupertinoIcons.person_fill),
              label: 'Account'),
        ],
      );
  }
}
