import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import '../pricing.dart';
import 'models.dart';
import 'trpc_client.dart';

/// Typed wrappers around the Nutriwow tRPC procedures the app uses.
class NutriwowApi {
  static final _c = TrpcClient.instance;

  static const _homeCacheKey = 'nw_home_cache_v1';
  static const _catCacheKey = 'nw_cat_cache_v1';

  // ── Catalog ────────────────────────────────────────────────────────────
  /// Instant load: returns the last cached homepage (or null). Home shows this
  /// immediately, then calls homepage() to refresh in the background.
  static Future<HomeData?> cachedHomepage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_homeCacheKey);
      if (raw == null) return null;
      return HomeData.fromJson(Map<String, dynamic>.from(jsonDecode(raw)));
    } catch (_) {
      return null;
    }
  }

  static Future<HomeData> homepage() async {
    final raw = await _c.query('homepage.getAll');
    final map = Map<String, dynamic>.from(raw);
    // Cache the fresh payload for next launch (best-effort).
    SharedPreferences.getInstance()
        .then((p) => p.setString(_homeCacheKey, jsonEncode(map)))
        .catchError((_) => false);
    return HomeData.fromJson(map);
  }

  /// Last cached category list (instant paint on repeat launches).
  static Future<List<String>> cachedCategories() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_catCacheKey);
      if (raw == null) return [];
      return List<String>.from(jsonDecode(raw) as List);
    } catch (_) {
      return [];
    }
  }

  static Future<List<String>> categories() async {
    final list = List<String>.from(await _c.query('categories.list') as List);
    SharedPreferences.getInstance()
        .then((p) => p.setString(_catCacheKey, jsonEncode(list)))
        .catchError((_) => false);
    return list;
  }

  static Future<List<Product>> byCategory(String category,
          {int limit = 50}) async =>
      _productList(await _c.query(
          'products.byCategory', {'category': category, 'limit': limit}));

  static Future<List<Product>> search(String term) async =>
      _productList(await _c.query('products.list', {'search': term}));

  static Future<Product?> byHandle(String handle) async {
    final j = await _c.query('products.getByHandle', {'handle': handle});
    return j == null ? null : Product.fromJson(Map<String, dynamic>.from(j));
  }

  static Future<List<Product>> bulkByIds(List<int> ids) async =>
      ids.isEmpty
          ? []
          : _productList(await _c.query('products.bulkByIds', {'ids': ids}));

  static Future<List<Product>> frequentlyBoughtTogether(int productId) async =>
      _productList(await _c
          .query('products.frequentlyBoughtTogether', {'productId': productId}));

  // ── Reviews ────────────────────────────────────────────────────────────
  static Future<List<Review>> reviews(int productId) async =>
      ((await _c.query('reviews.getByProduct', {'productId': productId}))
              as List)
          .whereType<Map>()
          .map((e) => Review.fromJson(Map<String, dynamic>.from(e)))
          .toList();

  static Future<RatingStats> ratingStats(int productId) async =>
      RatingStats.fromJson(Map<String, dynamic>.from(
          await _c.query('reviews.ratingStats', {'productId': productId})));

  static Future<void> addReview({
    required int productId,
    required String customerName,
    required int rating,
    String? title,
    String? body,
  }) =>
      _c.mutate('reviews.add', {
        'productId': productId,
        'customerName': customerName,
        'rating': rating,
        if (title != null && title.isNotEmpty) 'title': title,
        if (body != null && body.isNotEmpty) 'body': body,
      });

  // ── Auth ───────────────────────────────────────────────────────────────
  static Future<String> sendOtp(String mobile) async {
    final j = await _c.mutate('otp.send', {'mobile': mobile});
    return (j['message'] ?? 'OTP sent!') as String;
  }

  static Future<({CustomerProfile profile, List<Address> addresses})>
      verifyOtp(String mobile, String otp) async {
    final j = await _c.mutate('otp.verify', {'mobile': mobile, 'otp': otp});
    final profile =
        CustomerProfile.fromJson(Map<String, dynamic>.from(j['profile']));
    final addresses = ((j['addresses'] ?? []) as List)
        .whereType<Map>()
        .map((e) => Address.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    return (profile: profile, addresses: addresses);
  }

  static Future<bool> sessionValid() async {
    try {
      final j = await _c.query('customer.session');
      return j['valid'] == true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> logout() => _c.mutate('customer.logout');

  // ── Newsletter / offers opt-in ─────────────────────────────────────────
  static Future<void> subscribeNewsletterEmail(String email, {String? name}) =>
      _c.mutate('newsletter.subscribeEmail', {
        'email': email,
        if (name != null && name.isNotEmpty) 'name': name,
      });

  static Future<void> subscribeNewsletterWhatsapp(String phone, {String? name}) =>
      _c.mutate('newsletter.subscribe', {
        'phone': phone,
        if (name != null && name.isNotEmpty) 'name': name,
      });

  /// True if this phone/email is already a newsletter subscriber — used to hide
  /// the "Subscribe for our offers" opt-in from customers who've already joined.
  static Future<bool> isNewsletterSubscribed({String? phone, String? email}) async {
    try {
      final j = await _c.query('newsletter.isSubscribed', {
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
      });
      return j is Map && j['subscribed'] == true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> updateProfile({String? name, String? email}) =>
      _c.mutate('customer.updateProfile', {
        if (name != null && name.isNotEmpty) 'name': name,
        if (email != null && email.isNotEmpty) 'email': email,
      });

  // ── Addresses ──────────────────────────────────────────────────────────
  static Future<List<Address>> getAddresses() async =>
      ((await _c.query('customer.getAddresses')) as List)
          .whereType<Map>()
          .map((e) => Address.fromJson(Map<String, dynamic>.from(e)))
          .toList();

  static Future<Address> addAddress({
    required String name,
    required String phone,
    required String flat,
    String area = '',
    required String city,
    String state = '',
    required String pincode,
    bool isDefault = false,
  }) async =>
      Address.fromJson(Map<String, dynamic>.from(await _c.mutate(
        'customer.addAddress',
        {
          'name': name,
          'phone': phone,
          'flat': flat,
          if (area.isNotEmpty) 'area': area,
          'city': city,
          if (state.isNotEmpty) 'state': state,
          'pincode': pincode,
          'isDefault': isDefault,
        },
      )));

  /// Whether the admin enabled the veg mark on product cards (default false).
  static Future<bool> vegMarkEnabled() async {
    try {
      final j = await _c.query('settings.getPublic');
      final app = j?['appConfig'];
      return app is Map && app['vegMark'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Shipping config from public settings (fallback matches the website).
  static Future<ShippingConfig> shippingConfig() async {
    try {
      final j = await _c.query('settings.getPublic');
      final s = j?['shipping'];
      if (s is Map) {
        return ShippingConfig(
          fee: (s['fee'] as num?)?.round() ?? 49,
          freeAbove: (s['freeAbove'] as num?)?.round() ?? 499,
        );
      }
    } catch (_) {}
    return const ShippingConfig();
  }

  // ── Coupons / shipping ─────────────────────────────────────────────────
  /// All active (non-expired) coupons — featured first. Falls back to the
  /// featured-only endpoint on older servers that lack listActive.
  static Future<List<FeaturedCoupon>> featuredCoupons() async {
    try {
      final list = (await _c.query('coupons.listActive')) as List;
      return list
          .whereType<Map>()
          .map((e) => FeaturedCoupon.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      final list = (await _c.query('coupons.getFeatured')) as List;
      return list
          .whereType<Map>()
          .map((e) => FeaturedCoupon.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
  }

  static Future<CouponResult> validateCoupon(String code, num cartTotal) async =>
      CouponResult.fromJson(Map<String, dynamic>.from(await _c.mutate(
          'coupons.validate',
          {'code': code.toUpperCase(), 'cartTotal': cartTotal})));

  static Future<PincodeCheck> checkPincode(String pincode) async =>
      PincodeCheck.fromJson(Map<String, dynamic>.from(
          await _c.query('shipping.checkPincode', {'pincode': pincode})));

  // ── Payments / orders ──────────────────────────────────────────────────
  static Future<GatewayInfo> activeGateways() async =>
      GatewayInfo.fromJson(Map<String, dynamic>.from(
          await _c.query('payment.getActiveGateways')));

  /// Same order-id format the website generates.
  static String newOrderId() {
    final rand = Random();
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    final suffix =
        List.generate(4, (_) => chars[rand.nextInt(chars.length)]).join();
    return 'NW${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}$suffix';
  }

  static Future<Order> placeOrder(Map<String, dynamic> payload) async =>
      Order.fromJson(Map<String, dynamic>.from(
          await _c.mutate('customer.placeOrder', payload)));

  static Future<({String razorpayOrderId, String keyId, int amountPaise})>
      initiateRazorpay(String orderId) async {
    final j = await _c.mutate('payment.initiateRazorpay', {'orderId': orderId});
    return (
      razorpayOrderId: j['razorpayOrderId'] as String,
      keyId: j['keyId'] as String,
      amountPaise: (j['amount'] as num).toInt(),
    );
  }

  static Future<void> verifyRazorpay({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required String orderId,
  }) =>
      _c.mutate('payment.verifyRazorpay', {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
        'orderId': orderId,
      });

  static Future<List<Order>> myOrders() async =>
      ((await _c.query('customer.getOrders')) as List)
          .whereType<Map>()
          .map((e) => Order.fromJson(Map<String, dynamic>.from(e)))
          .toList();

  static Future<void> updateAddress({
    required int id,
    String? name,
    String? phone,
    String? flat,
    String? area,
    String? city,
    String? state,
    String? pincode,
    bool? isDefault,
  }) =>
      _c.mutate('customer.updateAddress', {
        'id': id,
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
        if (flat != null) 'flat': flat,
        if (area != null) 'area': area,
        if (city != null) 'city': city,
        if (state != null) 'state': state,
        if (pincode != null) 'pincode': pincode,
        if (isDefault != null) 'isDefault': isDefault,
      });

  static Future<void> deleteAddress(int id) =>
      _c.mutate('customer.deleteAddress', {'id': id});

  // ── PhonePe ────────────────────────────────────────────────────────────
  /// Initiate a PhonePe payment; returns the hosted checkout URL to open.
  static Future<String> initiatePhonePe(String orderId, String redirectUrl,
      {String? mobile}) async {
    final j = await _c.mutate('payment.initiate', {
      'orderId': orderId,
      'redirectUrl': redirectUrl,
      if (mobile != null && mobile.isNotEmpty) 'mobile': mobile,
    });
    return j['checkoutUrl'] as String;
  }

  /// PhonePe payment state for an order (e.g. COMPLETED / PENDING / FAILED).
  static Future<String> phonePeStatus(String orderId) async {
    final j = await _c.query('payment.status', {'orderId': orderId});
    return (j['state'] ?? 'UNKNOWN') as String;
  }

  // ── Order tracking ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> trackOrder(String orderId) async =>
      Map<String, dynamic>.from(
          await _c.query('orderTracking.track', {'orderId': orderId}));

  static Future<Map<String, dynamic>> gstInvoice(String orderId) async =>
      Map<String, dynamic>.from(
          await _c.query('customer.getGSTInvoice', {'orderId': orderId}));

  /// (Re)generates + persists the GST tax-invoice PDF and returns its public
  /// download URL. Requires login.
  static Future<String> invoiceUrl(String orderId) async {
    final j = await _c.mutate('customer.getInvoiceUrl', {'orderId': orderId});
    return (j is Map && j['url'] != null) ? j['url'].toString() : '';
  }

  // ── Loyalty wallet ─────────────────────────────────────────────────────
  /// Returns (points balance, rupee value). Requires login.
  static Future<({int balance, int value})> loyaltyBalance() async {
    final j = await _c.query('loyalty.getBalance');
    return (
      balance: (j['balance'] as num?)?.toInt() ?? 0,
      value: (j['value'] as num?)?.toInt() ?? 0,
    );
  }

  /// Loyalty ledger (last transactions) for the wallet history screen.
  static Future<List<Map<String, dynamic>>> loyaltyHistory() async =>
      ((await _c.query('loyalty.getHistory')) as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();

  /// Loyalty rules (points-per-discount, min/max redemption).
  static Future<Map<String, dynamic>> loyaltyRules() async =>
      Map<String, dynamic>.from(await _c.query('loyalty.getRules'));

  // ── Referral ───────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> referralCode() async =>
      Map<String, dynamic>.from(await _c.query('referral.getMyCode'));

  static Future<Map<String, dynamic>> referralStats() async =>
      Map<String, dynamic>.from(await _c.query('referral.getStats'));

  // ── Subscriptions (Subscribe & Save) ───────────────────────────────────
  static Future<List<Map<String, dynamic>>> subscriptions() async =>
      ((await _c.query('subscription.list')) as List)
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();

  static Future<void> cancelSubscription(int id) =>
      _c.mutate('subscription.cancel', {'id': id});

  // ── Wishlist ───────────────────────────────────────────────────────────
  static Future<List<int>> wishlist() async =>
      ((await _c.query('wishlist.list')) as List)
          .whereType<Map>()
          .map((e) => (e['productId'] as num).toInt())
          .toList();

  static Future<bool> toggleWishlist(int productId) async {
    final j = await _c.mutate('wishlist.toggle', {'productId': productId});
    return j['added'] == true;
  }

  static List<Product> _productList(dynamic v) => availableFirst((v as List)
      .whereType<Map>()
      .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
      .toList());
}
