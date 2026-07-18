import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../api/api.dart';
import '../api/models.dart';
import '../state/auth.dart';
import '../state/cart.dart';
import '../theme.dart';
import 'order_success.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  // Address form
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _flat = TextEditingController();
  final _area = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _pincode = TextEditingController();
  int? _selectedAddressId;

  String _paymentMethod = 'COD'; // COD | Razorpay
  bool _subscribeOffers = true; // newsletter / offers opt-in
  bool _alreadySubscribed = false; // hide the opt-in for existing subscribers
  GatewayInfo? _gateways;
  bool _placing = false;
  String? _pendingOrderId; // set while a Razorpay payment is in flight

  late final Razorpay _razorpay;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError);

    final auth = context.read<AuthState>();
    _phone.text = auth.profile?.phone ?? '';
    _name.text = auth.profile?.name ?? '';
    _email.text = auth.profile?.email ?? '';
    final def = auth.addresses.where((a) => a.isDefault).firstOrNull ??
        auth.addresses.firstOrNull;
    if (def != null) _fillAddress(def);
    _loadGateways();
    _checkSubscribed();
  }

  Future<void> _checkSubscribed() async {
    final profile = context.read<AuthState>().profile;
    final phone = (profile?.phone.isNotEmpty ?? false) ? profile!.phone : _phone.text.trim();
    final email = (profile?.email.isNotEmpty ?? false) ? profile!.email : _email.text.trim();
    if (phone.isEmpty && email.isEmpty) return;
    final sub = await NutriwowApi.isNewsletterSubscribed(phone: phone, email: email);
    if (mounted && sub) {
      setState(() {
        _alreadySubscribed = true;
        _subscribeOffers = false; // don't re-subscribe
      });
    }
  }

  void _fillAddress(Address a) {
    _selectedAddressId = a.id;
    _name.text = a.name.isNotEmpty ? a.name : _name.text;
    _phone.text = a.phone.isNotEmpty ? a.phone : _phone.text;
    _flat.text = a.flat;
    _area.text = a.area;
    _city.text = a.city;
    _state.text = a.state;
    _pincode.text = a.pincode;
  }

  Future<void> _loadGateways() async {
    try {
      final g = await NutriwowApi.activeGateways();
      if (mounted) setState(() => _gateways = g);
    } catch (_) {}
  }

  @override
  void dispose() {
    _razorpay.clear();
    for (final c in [_name, _phone, _email, _flat, _area, _city, _state, _pincode]) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, dynamic> _orderPayload(String orderId, CartState cart,
      {required bool online}) {
    final email = _email.text.trim();
    return {
      'id': orderId,
      'customerName': _name.text.trim(),
      'phone': _phone.text.trim(),
      if (email.isNotEmpty) 'email': email,
      'address': [_flat.text.trim(), _area.text.trim()]
          .where((s) => s.isNotEmpty)
          .join(', '),
      'city': _city.text.trim(),
      'state': _state.text.trim(),
      'pincode': _pincode.text.trim(),
      'items': cart.lines
          .map((l) => OrderItem(
                id: l.product.id.toString(),
                name: l.product.name,
                price: l.unitPrice, // pre-bulk-discount variant unit price
                quantity: l.quantity,
                image: l.product.image,
                weight: l.variant.label,
              ).toJson())
          .toList(),
      'subtotal': cart.goodsTotal,
      if (cart.couponCode.isNotEmpty) 'couponCode': cart.couponCode,
      'couponDiscount': cart.couponDiscount,
      'total': cart.total,
      'paymentMethod': online ? 'Razorpay' : 'COD',
      'paymentPlan': online ? 'razorpay_full' : 'cod',
      'amountPaid': 0,
      if (online) 'status': 'pending_payment',
    };
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;
    final cart = context.read<CartState>();
    if (cart.lines.isEmpty) return;

    setState(() => _placing = true);
    final orderId = NutriwowApi.newOrderId();

    // Newsletter / offers opt-in (best-effort, fire-and-forget)
    if (_subscribeOffers) {
      final nm = _name.text.trim();
      final ph = _phone.text.trim();
      if (RegExp(r'^\d{10}$').hasMatch(ph)) {
        NutriwowApi.subscribeNewsletterWhatsapp(ph, name: nm).catchError((_) {});
      }
      final em = _email.text.trim();
      if (em.isNotEmpty) {
        NutriwowApi.subscribeNewsletterEmail(em, name: nm).catchError((_) {});
      }
    }

    try {
      // Save address for next time (best-effort)
      if (_selectedAddressId == null) {
        NutriwowApi.addAddress(
          name: _name.text.trim(),
          phone: _phone.text.trim(),
          flat: _flat.text.trim(),
          area: _area.text.trim(),
          city: _city.text.trim(),
          state: _state.text.trim(),
          pincode: _pincode.text.trim(),
          isDefault: true,
        ).then((_) {
          if (mounted) context.read<AuthState>().refreshAddresses();
        }).catchError((_) {});
      }

      if (_paymentMethod == 'COD') {
        final order = await NutriwowApi.placeOrder(
            _orderPayload(orderId, cart, online: false));
        if (!mounted) return;
        cart.clear();
        Navigator.of(context).pushReplacement(MaterialPageRoute(
            builder: (_) => OrderSuccessScreen(order: order)));
      } else {
        // Razorpay: pending order → initiate → open native checkout
        await NutriwowApi.placeOrder(
            _orderPayload(orderId, cart, online: true));
        final init = await NutriwowApi.initiateRazorpay(orderId);
        _pendingOrderId = orderId;
        _razorpay.open({
          'key': init.keyId,
          'order_id': init.razorpayOrderId,
          'amount': init.amountPaise,
          'currency': 'INR',
          'name': 'Nutriwow',
          'description': 'Order $orderId',
          'prefill': {
            'contact': _phone.text.trim(),
            'name': _name.text.trim(),
          },
          'theme': {'color': '#007A11'},
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted && _paymentMethod == 'COD') setState(() => _placing = false);
      if (mounted && _paymentMethod != 'COD') setState(() => _placing = false);
    }
  }

  Future<void> _onPaymentSuccess(PaymentSuccessResponse response) async {
    final orderId = _pendingOrderId;
    if (orderId == null) return;
    try {
      await NutriwowApi.verifyRazorpay(
        razorpayOrderId: response.orderId ?? '',
        razorpayPaymentId: response.paymentId ?? '',
        razorpaySignature: response.signature ?? '',
        orderId: orderId,
      );
      if (!mounted) return;
      final cart = context.read<CartState>();
      cart.clear();
      Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => OrderSuccessScreen(orderId: orderId)));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Payment verification failed: $e')));
      }
    }
  }

  void _onPaymentError(PaymentFailureResponse response) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content:
            Text(response.message ?? 'Payment cancelled. Please try again.')));
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final auth = context.watch<AuthState>();
    final razorpayAvailable = _gateways?.razorpay ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
          children: [
            // ── Saved addresses ──
            if (auth.addresses.isNotEmpty) ...[
              Text('Saved Addresses',
                  style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              ...auth.addresses.map((a) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: RadioListTile<int>(
                      value: a.id,
                      groupValue: _selectedAddressId,
                      onChanged: (_) => setState(() => _fillAddress(a)),
                      activeColor: NwColors.green,
                      title: Text(a.name,
                          style: const TextStyle(
                              fontSize: 13.5, fontWeight: FontWeight.w600)),
                      subtitle: Text(a.full,
                          style: const TextStyle(fontSize: 12)),
                    ),
                  )),
              TextButton.icon(
                onPressed: () => setState(() {
                  _selectedAddressId = null;
                  _flat.clear();
                  _area.clear();
                  _city.clear();
                  _state.clear();
                  _pincode.clear();
                }),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New address'),
              ),
              const SizedBox(height: 8),
            ],

            // ── Address form ──
            Text('Delivery Details',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 10),
            _field(_name, 'Full Name', validator: _required),
            _field(_phone, 'Mobile Number',
                keyboard: TextInputType.phone,
                validator: (v) => RegExp(r'^\d{10}$').hasMatch(v ?? '')
                    ? null
                    : 'Enter 10-digit mobile number'),
            _field(_email, 'Email (for invoice & offers)',
                keyboard: TextInputType.emailAddress,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? null // email is optional
                    : RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())
                        ? null
                        : 'Enter a valid email'),
            _field(_flat, 'Flat / House No, Building', validator: _required),
            _field(_area, 'Area / Street (optional)'),
            Row(
              children: [
                Expanded(child: _field(_city, 'City', validator: _required)),
                const SizedBox(width: 10),
                Expanded(child: _field(_state, 'State')),
              ],
            ),
            _field(_pincode, 'Pincode',
                keyboard: TextInputType.number,
                validator: (v) => RegExp(r'^\d{6}$').hasMatch(v ?? '')
                    ? null
                    : 'Enter 6-digit pincode'),

            const SizedBox(height: 16),

            // ── Payment method ──
            Text('Payment Method',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  RadioListTile<String>(
                    value: 'COD',
                    groupValue: _paymentMethod,
                    onChanged: (v) => setState(() => _paymentMethod = v!),
                    activeColor: NwColors.green,
                    title: const Text('Cash on Delivery',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Pay when your order arrives',
                        style: TextStyle(fontSize: 11.5)),
                  ),
                  if (razorpayAvailable)
                    RadioListTile<String>(
                      value: 'Razorpay',
                      groupValue: _paymentMethod,
                      onChanged: (v) => setState(() => _paymentMethod = v!),
                      activeColor: NwColors.green,
                      title: const Text('Pay Online',
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w600)),
                      subtitle: const Text(
                          'UPI, Cards, NetBanking — secure via Razorpay',
                          style: TextStyle(fontSize: 11.5)),
                    ),
                ],
              ),
            ),

            // ── Newsletter / offers opt-in — hidden for existing subscribers ──
            if (!_alreadySubscribed) ...[
            const SizedBox(height: 12),
            Card(
              color: NwColors.greenLight,
              child: CheckboxListTile(
                value: _subscribeOffers,
                onChanged: (v) => setState(() => _subscribeOffers = v ?? false),
                activeColor: NwColors.green,
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                title: const Text('Subscribe for our offers',
                    style:
                        TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                subtitle: const Text(
                    'Get exclusive discounts, new launches & recipes on WhatsApp/email',
                    style: TextStyle(fontSize: 11.5)),
              ),
            ),
            ],
          ],
        ),
      ),
      bottomSheet: Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(inr(cart.total),
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: NwColors.green)),
                Text('${cart.itemCount} items',
                    style:
                        const TextStyle(fontSize: 11, color: NwColors.muted)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: _placing ? null : _placeOrder,
                style: ElevatedButton.styleFrom(
                    backgroundColor: NwColors.orange),
                child: Text(_placing
                    ? 'Placing order...'
                    : _paymentMethod == 'COD'
                        ? 'Place Order (COD)'
                        : 'Pay ${inr(cart.total)}'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;

  Widget _field(TextEditingController c, String label,
      {TextInputType? keyboard, String? Function(String?)? validator}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: c,
        keyboardType: keyboard,
        validator: validator,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}
