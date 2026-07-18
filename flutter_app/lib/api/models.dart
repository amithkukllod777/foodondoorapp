/// Data models mirroring the Nutriwow DB rows returned by the tRPC API.
/// All amounts are in RUPEES. Product.rating is stored ×10 (45 = 4.5★).

/// Available products first, out-of-stock pushed to the end (order preserved
/// within each group). Used across every product listing.
List<Product> availableFirst(List<Product> items) => [
      ...items.where((p) => p.available),
      ...items.where((p) => !p.available),
    ];

int _asInt(dynamic v) => (v as num?)?.toInt() ?? 0;
num _asNum(dynamic v) => (v as num?) ?? 0;
String _asStr(dynamic v) => (v as String?) ?? '';

List<String> _asStrList(dynamic v) {
  if (v is List) return v.whereType<String>().toList();
  return const [];
}

class Product {
  final int id;
  final String name;
  final String handle;
  final String category;
  final num price; // rupees (base variant unit price)
  final num mrp;
  final int discount; // percent
  final String weight; // base variant label e.g. "250g"
  final String description;
  final String ingredients;
  final String nutritionalInfo;
  final String shelfLife;
  final String storageInfo;
  final String image;
  final List<String> images;
  final bool isBestseller;
  final bool isTrending;
  final bool isNew;
  final bool available;
  final int rating; // ×10
  final int reviewCount;
  final List<String> dietaryPreferences;
  final Map<String, dynamic> metafields;

  Product.fromJson(Map<String, dynamic> j)
      : id = _asInt(j['id']),
        name = _asStr(j['name']),
        handle = _asStr(j['handle']),
        category = _asStr(j['category']),
        price = _asNum(j['price']),
        mrp = _asNum(j['mrp']),
        discount = _asInt(j['discount']),
        weight = _asStr(j['weight']),
        description = _asStr(j['description']),
        ingredients = _asStr(j['ingredients']),
        nutritionalInfo = _asStr(j['nutritionalInfo']),
        shelfLife = _asStr(j['shelfLife']),
        storageInfo = _asStr(j['storageInfo']),
        image = _asStr(j['image']),
        images = _asStrList(j['images']),
        isBestseller = j['isBestseller'] == true,
        isTrending = j['isTrending'] == true,
        isNew = j['isNew'] == true,
        available = j['available'] == true,
        rating = _asInt(j['rating']),
        reviewCount = _asInt(j['reviewCount']),
        dietaryPreferences = _asStrList(j['dietaryPreferences']),
        metafields = (j['metafields'] is Map)
            ? Map<String, dynamic>.from(j['metafields'] as Map)
            : const {};

  double get ratingValue => rating / 10.0;
  List<String> get gallery => images.isNotEmpty ? images : [image];
}

class HeroSlide {
  final String id;
  final String desktopImage;
  final String mobileImage;
  final String appImage;
  final String link;
  final String alt;

  HeroSlide.fromJson(Map<String, dynamic> j)
      : id = _asStr(j['id']),
        desktopImage = _asStr(j['desktopImage']),
        mobileImage = _asStr(j['mobileImage']),
        appImage = _asStr(j['appImage']),
        link = _asStr(j['link']),
        alt = _asStr(j['alt']);

  /// App banner (2:1) preferred; falls back to mobile square, then desktop.
  String get image => appImage.isNotEmpty
      ? appImage
      : (mobileImage.isNotEmpty ? mobileImage : desktopImage);
}

class HomeData {
  final List<Product> bestseller;
  final List<Product> trending;
  final List<Product> featured;
  final List<Product> explore;
  final List<HeroSlide> carousel;

  HomeData.fromJson(Map<String, dynamic> j)
      : bestseller = availableFirst(_products(j['bestseller'])),
        trending = availableFirst(_products(j['trending'])),
        featured = availableFirst(_products(j['featured'])),
        explore = availableFirst(_products(j['explore'])),
        carousel = (j['carousel'] is List)
            ? (j['carousel'] as List)
                .whereType<Map>()
                .map((e) => HeroSlide.fromJson(Map<String, dynamic>.from(e)))
                .toList()
            : const [];

  static List<Product> _products(dynamic v) => (v is List)
      ? v
          .whereType<Map>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList()
      : const [];
}

class Address {
  final int id;
  final String name;
  final String phone;
  final String flat;
  final String area;
  final String city;
  final String state;
  final String pincode;
  final bool isDefault;

  Address.fromJson(Map<String, dynamic> j)
      : id = _asInt(j['id']),
        name = _asStr(j['name']),
        phone = _asStr(j['phone']),
        flat = _asStr(j['flat']),
        area = _asStr(j['area']),
        city = _asStr(j['city']),
        state = _asStr(j['state']),
        pincode = _asStr(j['pincode']),
        isDefault = j['isDefault'] == true;

  String get oneLine =>
      [flat, area].where((s) => s.isNotEmpty).join(', ');
  String get full =>
      [flat, area, city, state, pincode].where((s) => s.isNotEmpty).join(', ');
}

class CustomerProfile {
  final int id;
  final String phone;
  final String name;
  final String email;

  CustomerProfile(
      {required this.id,
      required this.phone,
      this.name = '',
      this.email = ''});

  CustomerProfile.fromJson(Map<String, dynamic> j)
      : id = _asInt(j['id']),
        phone = _asStr(j['phone']),
        name = _asStr(j['name']),
        email = _asStr(j['email']);

  CustomerProfile copyWith({String? name, String? email}) => CustomerProfile(
      id: id, phone: phone, name: name ?? this.name, email: email ?? this.email);
}

class OrderItem {
  final String id; // product id as string
  final String name;
  final num price; // unit price (pre-bulk-discount, variant-adjusted)
  final int quantity;
  final String image;
  final String weight;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.image = '',
    this.weight = '',
  });

  OrderItem.fromJson(Map<String, dynamic> j)
      : id = j['id']?.toString() ?? '',
        name = _asStr(j['name']),
        price = _asNum(j['price']),
        quantity = _asInt(j['quantity']),
        image = _asStr(j['image']),
        weight = _asStr(j['weight']);

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'quantity': quantity,
        if (image.isNotEmpty) 'image': image,
        if (weight.isNotEmpty) 'weight': weight,
      };
}

class Order {
  final String id;
  final String customerName;
  final String phone;
  final String address;
  final String city;
  final String state;
  final String pincode;
  final List<OrderItem> items;
  final num subtotal;
  final String couponCode;
  final num couponDiscount;
  final num total;
  final String paymentMethod;
  final String paymentPlan;
  final num amountPaid;
  final String status;
  final String awbCode;
  final String trackingUrl;
  final DateTime? createdAt;

  Order.fromJson(Map<String, dynamic> j)
      : id = _asStr(j['id']),
        customerName = _asStr(j['customerName']),
        phone = _asStr(j['phone']),
        address = _asStr(j['address']),
        city = _asStr(j['city']),
        state = _asStr(j['state']),
        pincode = _asStr(j['pincode']),
        items = (j['items'] is List)
            ? (j['items'] as List)
                .whereType<Map>()
                .map((e) => OrderItem.fromJson(Map<String, dynamic>.from(e)))
                .toList()
            : const [],
        subtotal = _asNum(j['subtotal']),
        couponCode = _asStr(j['couponCode']),
        couponDiscount = _asNum(j['couponDiscount']),
        total = _asNum(j['total']),
        paymentMethod = _asStr(j['paymentMethod']),
        paymentPlan = _asStr(j['paymentPlan']),
        amountPaid = _asNum(j['amountPaid']),
        status = _asStr(j['status']),
        awbCode = _asStr(j['awbCode']),
        trackingUrl = _asStr(j['trackingUrl']),
        createdAt = j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'].toString())
            : null;
}

class Review {
  final int id;
  final String customerName;
  final int rating; // 1-5
  final String title;
  final String body;
  final List<String> images;
  final bool verified;
  final DateTime? createdAt;

  Review.fromJson(Map<String, dynamic> j)
      : id = _asInt(j['id']),
        customerName = _asStr(j['customerName']),
        rating = _asInt(j['rating']),
        title = _asStr(j['title']),
        body = _asStr(j['body']),
        images = _asStrList(j['images']),
        verified = j['verified'] == true,
        createdAt = j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'].toString())
            : null;
}

class RatingStats {
  final double avgRating; // real 0-5
  final int totalReviews;
  final Map<int, int> distribution;

  RatingStats.fromJson(Map<String, dynamic> j)
      : avgRating = (j['avgRating'] as num?)?.toDouble() ?? 0,
        totalReviews = _asInt(j['totalReviews']),
        distribution = (j['distribution'] is Map)
            ? (j['distribution'] as Map).map((k, v) =>
                MapEntry(int.tryParse(k.toString()) ?? 0, _asInt(v)))
            : const {};
}

class FeaturedCoupon {
  final String code;
  final String description;
  final String discountType; // percent | flat
  final num discountValue;
  final num minOrderAmount;

  FeaturedCoupon.fromJson(Map<String, dynamic> j)
      : code = _asStr(j['code']),
        description = _asStr(j['description']),
        discountType = _asStr(j['discountType']),
        discountValue = _asNum(j['discountValue']),
        minOrderAmount = _asNum(j['minOrderAmount']);

  String get offerText => discountType == 'percent'
      ? '${discountValue.round()}% OFF'
      : '₹${discountValue.round()} OFF';
}

class CouponResult {
  final bool valid;
  final num discount; // rupees (computed at validate time — for display fallback)
  final String message;
  final String discountType; // 'percent' | 'flat'
  final num discountValue; // percent (0-100) or flat rupees
  final num minOrderAmount;

  CouponResult.fromJson(Map<String, dynamic> j)
      : valid = j['valid'] == true,
        discount = _asNum(j['discount']),
        message = _asStr(j['message']),
        discountType = j['coupon'] is Map
            ? _asStr((j['coupon'] as Map)['discountType'])
            : 'flat',
        discountValue = j['coupon'] is Map
            ? _asNum((j['coupon'] as Map)['discountValue'])
            : _asNum(j['discount']),
        minOrderAmount = j['coupon'] is Map
            ? _asNum((j['coupon'] as Map)['minOrderAmount'])
            : 0;
}

class GatewayInfo {
  final bool phonepe;
  final bool razorpay;
  final String razorpayKeyId;

  GatewayInfo.fromJson(Map<String, dynamic> j)
      : phonepe = j['phonepe'] == true,
        razorpay = j['razorpay'] == true,
        razorpayKeyId = _asStr(j['razorpayKeyId']);
}

class PincodeCheck {
  final bool deliverable;
  final String estimatedDays;
  final String courierName;

  PincodeCheck.fromJson(Map<String, dynamic> j)
      : deliverable = j['deliverable'] == true,
        estimatedDays = _asStr(j['estimatedDays']),
        courierName = _asStr(j['courierName']);
}
