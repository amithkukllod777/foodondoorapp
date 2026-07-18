import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/auth.dart';
import '../theme.dart';
import '../widgets/product_card.dart';
import 'category.dart';
import 'login.dart';
import 'profile.dart';
import 'search.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  HomeData? _data;
  List<String> _categories = [];
  List<FeaturedCoupon> _coupons = [];
  Object? _error;

  @override
  void initState() {
    super.initState();
    _showCached();
    _load();
  }

  // Instant paint from last launch's cache while the network refresh runs.
  Future<void> _showCached() async {
    final cached = await NutriwowApi.cachedHomepage();
    final cats = await NutriwowApi.cachedCategories();
    if (!mounted) return;
    setState(() {
      if (cached != null && _data == null) _data = cached;
      if (cats.isNotEmpty && _categories.isEmpty) _categories = cats;
    });
  }

  /// Announcement text — mirrors the website's marquee: built from the first
  /// featured coupon (admin-managed), else a default line.
  String _announcement() {
    final c = _coupons.isNotEmpty ? _coupons.first : null;
    if (c != null) {
      final offer = c.discountType == 'percent'
          ? 'Get Extra ${c.discountValue.round()}% OFF*'
          : 'Flat ₹${c.discountValue.round()} OFF*';
      return 'Free Shipping on All Orders  •  $offer  •  Use Code: ${c.code}';
    }
    return 'Free Shipping on All Orders  •  100% Natural Premium Dry Fruits at Nutriwow';
  }

  Future<void> _load() async {
    setState(() => _error = null);
    // Categories & coupons are best-effort — a failure in either must NOT
    // blank out the whole home screen. Only the products call is critical.
    NutriwowApi.categories()
        .then((c) { if (mounted) setState(() => _categories = c); })
        .catchError((_) {});
    NutriwowApi.featuredCoupons()
        .then((c) { if (mounted) setState(() => _coupons = c); })
        .catchError((_) {});
    try {
      final data = await NutriwowApi.homepage();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NwColors.background,
      body: _error != null && _data == null
          ? _ErrorRetry(onRetry: _load)
          : RefreshIndicator(
              onRefresh: _load,
              color: NwColors.green,
              child: CustomScrollView(
                slivers: [
                  // ── Blinkit-style green header ──
                  _HomeHeader(message: _announcement()),
                  if (_data == null)
                    const SliverToBoxAdapter(child: _HomeSkeleton())
                  else
                    SliverList(
                      delegate: SliverChildListDelegate([
                        if (_categories.isNotEmpty)
                          _CategoryStrip(categories: _categories),
                        if (_coupons.isNotEmpty)
                          _CouponStrip(coupons: _coupons),
                        if (_data!.carousel.isNotEmpty)
                          _HeroCarousel(slides: _data!.carousel),
                        _Section(
                            title: 'Bestsellers 🔥',
                            products: _data!.bestseller),
                        _Section(
                            title: 'Trending Now', products: _data!.trending),
                        if (_data!.featured.isNotEmpty)
                          _Section(
                              title: 'Featured', products: _data!.featured),
                        if (_data!.explore.isNotEmpty)
                          _ExploreGrid(products: _data!.explore),
                        const SizedBox(height: 16),
                      ]),
                    ),
                ],
              ),
            ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  final String message;
  const _HomeHeader({required this.message});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [NwColors.green, Color(0xFF00990F)],
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Logo (left) + profile/login chip (right)
                Row(
                  children: [
                    ColorFiltered(
                      colorFilter: const ColorFilter.mode(
                          Colors.white, BlendMode.srcIn),
                      child: Image.asset('assets/nutriwow-logo.png',
                          height: 30, fit: BoxFit.contain),
                    ),
                    const Spacer(),
                    const _ProfileChip(),
                  ],
                ),
                const SizedBox(height: 8),
                // Animated running announcement (admin coupon text)
                _Marquee(text: message),
                const SizedBox(height: 12),
                // Search bar
                GestureDetector(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => const SearchScreen())),
                  child: Container(
                    height: 46,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 2)),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search,
                            color: NwColors.green, size: 20),
                        const SizedBox(width: 10),
                        Text('Search cashews, almonds, dates…',
                            style: TextStyle(
                                color: Colors.grey.shade500, fontSize: 13.5)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Top-right profile chip: "Login" when logged out, user's name when logged in.
class _ProfileChip extends StatelessWidget {
  const _ProfileChip();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final loggedIn = auth.isLoggedIn;
    final name = auth.profile?.name.trim() ?? '';
    final label = loggedIn
        ? (name.isNotEmpty ? name.split(' ').first : 'Account')
        : 'Login';

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          if (loggedIn) {
            Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfileScreen()));
          } else {
            showLoginSheet(context);
          }
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 5, 12, 5),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                    color: NwColors.greenLight, shape: BoxShape.circle),
                child: Icon(
                    loggedIn ? Icons.person : Icons.person_outline,
                    size: 14,
                    color: NwColors.green),
              ),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 90),
                child: Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: NwColors.green,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Infinite left-scrolling marquee for the header announcement.
class _Marquee extends StatefulWidget {
  final String text;
  const _Marquee({required this.text});

  @override
  State<_Marquee> createState() => _MarqueeState();
}

class _MarqueeState extends State<_Marquee>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
        vsync: this, duration: const Duration(seconds: 12))
      ..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
        color: Colors.white,
        fontSize: 11.5,
        fontWeight: FontWeight.w600,
        letterSpacing: .2);
    final unit = '${widget.text}      ';
    return SizedBox(
      height: 18,
      child: ClipRect(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return AnimatedBuilder(
              animation: _c,
              builder: (context, _) {
                // Scroll one text-block width per cycle; two copies keep it seamless.
                return OverflowBox(
                  maxWidth: double.infinity,
                  alignment: Alignment.centerLeft,
                  child: FractionalTranslation(
                    // -0.5 of the two-copy row = exactly one text block → seamless loop
                    translation: Offset(-0.5 * _c.value, 0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(unit, style: style),
                        Text(unit, style: style),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

/// Horizontal strip of available coupons — tap to copy the code.
class _CouponStrip extends StatelessWidget {
  final List<FeaturedCoupon> coupons;
  const _CouponStrip({required this.coupons});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 10),
            child: Text('Offers & Coupons 🎁',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          SizedBox(
            height: 78,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              itemCount: coupons.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) {
                final c = coupons[i];
                return GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: c.code));
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text('Coupon "${c.code}" copied!'),
                      duration: const Duration(seconds: 2),
                    ));
                  },
                  child: Container(
                    width: 220,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          NwColors.greenLight.withValues(alpha: 0.7),
                          const Color(0xFFFFF3D6),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: NwColors.green.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_offer,
                            color: NwColors.green, size: 26),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                children: [
                                  Text(c.offerText,
                                      style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: NwColors.green)),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(
                                          color: NwColors.green
                                              .withValues(alpha: 0.4)),
                                    ),
                                    child: Text(c.code,
                                        style: const TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w700,
                                            color: NwColors.foreground)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                  c.description.isNotEmpty
                                      ? c.description
                                      : (c.minOrderAmount > 0
                                          ? 'On orders above ${inr(c.minOrderAmount)} · Tap to copy'
                                          : 'Tap to copy code'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 10.5, color: NwColors.muted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal category chips row (Blinkit-style colourful tiles).
class _CategoryStrip extends StatelessWidget {
  final List<String> categories;
  const _CategoryStrip({required this.categories});

  static const _emoji = {
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

  static const _tints = [
    Color(0xFFFFF3D6),
    Color(0xFFE7F6E4),
    Color(0xFFFDE6E9),
    Color(0xFFEAEBFF),
    Color(0xFFFFEAD6),
    Color(0xFFE0F5F4),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 14),
      margin: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        height: 92,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          itemCount: categories.length,
          separatorBuilder: (_, __) => const SizedBox(width: 14),
          itemBuilder: (_, i) {
            final cat = categories[i];
            return GestureDetector(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => CategoryScreen(title: cat))),
              child: SizedBox(
                width: 66,
                child: Column(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: _tints[i % _tints.length],
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(_emoji[cat] ?? '🏷️',
                          style: const TextStyle(fontSize: 30)),
                    ),
                    const SizedBox(height: 5),
                    Text(cat,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            height: 1.1)),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _HeroCarousel extends StatefulWidget {
  final List<HeroSlide> slides;
  const _HeroCarousel({required this.slides});

  @override
  State<_HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<_HeroCarousel> {
  final _controller = PageController();
  int _page = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startAutoSlide();
  }

  void _startAutoSlide() {
    if (widget.slides.length < 2) return;
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_page + 1) % widget.slides.length;
      _controller.animateToPage(next,
          duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        children: [
          // 2:1 box + cover → banner poora bharta hai (no shrink). Banner
          // images ko 1200×600 px (2:1) me banayein taaki crop na ho.
          AspectRatio(
            aspectRatio: 2 / 1,
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.slides.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: CachedNetworkImage(
                    imageUrl: widget.slides[i].image,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                        color: NwColors.greenLight.withValues(alpha: 0.4)),
                    errorWidget: (_, __, ___) => const SizedBox(),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.slides.length,
              (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: _page == i ? 18 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: _page == i ? NwColors.green : NwColors.border,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Product> products;
  const _Section({required this.title, required this.products});

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineSmall),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => CategoryScreen(
                              title: title, initialProducts: products))),
                  child: const Text('See All',
                      style: TextStyle(
                          color: NwColors.green,
                          fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          SizedBox(
            height: 292,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (_, i) => ProductCard(product: products[i]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExploreGrid extends StatelessWidget {
  final List<Product> products;
  const _ExploreGrid({required this.products});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text('Explore More',
                style: Theme.of(context).textTheme.headlineSmall),
          ),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.62,
            ),
            itemCount: products.length,
            itemBuilder: (_, i) =>
                ProductCard(product: products[i], width: double.infinity),
          ),
        ],
      ),
    );
  }
}

class _ErrorRetry extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorRetry({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Something went wrong loading products.'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('Try Again')),
        ],
      ),
    );
  }
}

// ── Skeleton loader (Blinkit/Swiggy-style) shown on first launch before the
// homepage data (and cache) is available. A subtle shimmer makes the wait feel
// fast instead of a blank spinner.
class _ShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final double radius;
  const _ShimmerBox({required this.width, required this.height, this.radius = 8});

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox>
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

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    Widget card() => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            _ShimmerBox(width: 150, height: 150, radius: 14),
            SizedBox(height: 8),
            _ShimmerBox(width: 120, height: 12),
            SizedBox(height: 6),
            _ShimmerBox(width: 80, height: 12),
          ],
        );
    Widget section() => Padding(
          padding: const EdgeInsets.fromLTRB(14, 18, 14, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _ShimmerBox(width: 160, height: 18),
              const SizedBox(height: 14),
              SizedBox(
                height: 210,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: 3,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (_, __) => card(),
                ),
              ),
            ],
          ),
        );
    return Column(
      children: [
        // Category chips
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 16, 14, 0),
          child: Row(
            children: List.generate(
                4,
                (_) => const Padding(
                      padding: EdgeInsets.only(right: 12),
                      child: _ShimmerBox(width: 60, height: 60, radius: 30),
                    )),
          ),
        ),
        // Banner
        const Padding(
          padding: EdgeInsets.fromLTRB(14, 16, 14, 0),
          child: _ShimmerBox(width: double.infinity, height: 150, radius: 16),
        ),
        section(),
        section(),
        const SizedBox(height: 20),
      ],
    );
  }
}
