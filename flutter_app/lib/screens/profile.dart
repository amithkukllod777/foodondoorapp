import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../api/api.dart';
import '../state/auth.dart';
import '../theme.dart';
import 'login.dart';
import 'orders.dart';
import 'addresses.dart';
import '../api/models.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (auth.isLoggedIn)
            Card(
              child: ListTile(
                onTap: () => _editProfile(context, auth.profile!),
                leading: CircleAvatar(
                  backgroundColor: NwColors.greenLight,
                  child: Text(
                    auth.profile!.name.isNotEmpty
                        ? auth.profile!.name[0].toUpperCase()
                        : '👤',
                    style: const TextStyle(
                        color: NwColors.green, fontWeight: FontWeight.w700),
                  ),
                ),
                title: Text(
                    auth.profile!.name.isNotEmpty
                        ? auth.profile!.name
                        : 'Nutriwow Customer',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text([
                  '+91 ${auth.profile!.phone}',
                  if (auth.profile!.email.isNotEmpty) auth.profile!.email,
                ].join('\n')),
                isThreeLine: auth.profile!.email.isNotEmpty,
                trailing: const Icon(Icons.edit_outlined, size: 18),
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Text('Login to view your orders & wishlist',
                        style: TextStyle(fontSize: 13.5)),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => showLoginSheet(context),
                        child: const Text('Login / Register'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),

          // ── Rewards wallet (logged-in only) ──
          if (auth.isLoggedIn) const _WalletCard(),

          if (auth.isLoggedIn) ...[
            _tile(context, Icons.receipt_long, 'My Orders', () {
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OrdersScreen()));
            }),
            _tile(context, Icons.location_on_outlined, 'My Addresses', () {
              Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AddressesScreen()));
            }),
            _tile(context, Icons.person_outline, 'Edit Profile',
                () => _editProfile(context, auth.profile!)),
          ],
          _tile(context, Icons.chat, 'WhatsApp Support', () {
            launchUrl(Uri.parse('https://wa.me/919993883710'),
                mode: LaunchMode.externalApplication);
          }),
          _tile(context, Icons.call, 'Call Us (+91 99938 83710)', () {
            launchUrl(Uri.parse('tel:+919993883710'));
          }),
          _tile(context, Icons.language, 'Visit Website', () {
            launchUrl(Uri.parse('https://www.nutriwow.in'),
                mode: LaunchMode.externalApplication);
          }),
          _tile(context, Icons.privacy_tip_outlined, 'Privacy Policy', () {
            launchUrl(Uri.parse('https://www.nutriwow.in/privacy-policy'),
                mode: LaunchMode.externalApplication);
          }),
          _tile(context, Icons.assignment_return_outlined, 'Return Policy',
              () {
            launchUrl(Uri.parse('https://www.nutriwow.in/return-policy'),
                mode: LaunchMode.externalApplication);
          }),

          if (auth.isLoggedIn) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                await auth.logout();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Logged out')));
                }
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
              ),
              child: const Text('Logout'),
            ),
          ],

          const SizedBox(height: 20),
          // ── Follow Us ──
          const Center(
            child: Text('FOLLOW US',
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                    color: NwColors.muted)),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _social(Icons.facebook, const Color(0xFF1877F2),
                  'https://www.facebook.com/nutriwowindia'),
              const SizedBox(width: 14),
              _social(Icons.camera_alt, const Color(0xFFE1306C),
                  'https://www.instagram.com/nutriwowindia'),
              const SizedBox(width: 14),
              _social(Icons.chat, const Color(0xFF25D366),
                  'https://wa.me/919993883710'),
            ],
          ),

          const SizedBox(height: 24),
          const Center(
            child: Text('Nutriwow · Premium Dry Fruits & Healthy Snacks\nFSSAI Lic. No: 11424999000246',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: NwColors.muted)),
          ),
          const SizedBox(height: 8),
          // App version — read from the build at runtime, so it always
          // matches the installed APK/AAB (versionName+versionCode).
          Center(
            child: FutureBuilder<PackageInfo>(
              future: PackageInfo.fromPlatform(),
              builder: (context, snap) {
                final v = snap.hasData
                    ? 'Version ${snap.data!.version} (${snap.data!.buildNumber})'
                    : '';
                return Text(v,
                    style: const TextStyle(fontSize: 10.5, color: NwColors.muted));
              },
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _social(IconData icon, Color color, String url) {
    return InkWell(
      onTap: () => launchUrl(Uri.parse(url),
          mode: LaunchMode.externalApplication),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }

  Widget _tile(
      BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: NwColors.green, size: 22),
        title: Text(title,
            style:
                const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
        trailing: const Icon(CupertinoIcons.chevron_right, size: 16, color: NwColors.muted),
        onTap: onTap,
      ),
    );
  }

  void _editProfile(BuildContext context, CustomerProfile profile) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EditProfileSheet(profile: profile),
    );
  }
}

/// Edit name + email (phone is the login identity and stays fixed).
class _EditProfileSheet extends StatefulWidget {
  final CustomerProfile profile;
  const _EditProfileSheet({required this.profile});

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final _name = TextEditingController(text: widget.profile.name);
  late final _email = TextEditingController(text: widget.profile.email);
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final email = _email.text.trim();
    if (email.isNotEmpty && !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Enter a valid email')));
      return;
    }
    setState(() => _saving = true);
    try {
      await NutriwowApi.updateProfile(name: _name.text.trim(), email: email);
      if (!mounted) return;
      await context
          .read<AuthState>()
          .applyProfileEdit(name: _name.text.trim(), email: email);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Edit Profile',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Full name'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 10),
          TextField(
            enabled: false,
            controller:
                TextEditingController(text: '+91 ${widget.profile.phone}'),
            decoration: const InputDecoration(
                labelText: 'Mobile number (login ID — can\'t be changed)'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: NwColors.green),
              child: Text(_saving ? 'Saving…' : 'Save'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Customer rewards wallet — shows loyalty points balance + rupee value.
class _WalletCard extends StatefulWidget {
  const _WalletCard();

  @override
  State<_WalletCard> createState() => _WalletCardState();
}

class _WalletCardState extends State<_WalletCard> {
  int? _balance;
  int _value = 0;

  @override
  void initState() {
    super.initState();
    NutriwowApi.loyaltyBalance().then((r) {
      if (mounted) setState(() { _balance = r.balance; _value = r.value; });
    }).catchError((_) {
      if (mounted) setState(() => _balance = 0);
    });
  }

  Future<void> _showHistory(BuildContext context) async {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => FutureBuilder<List<Map<String, dynamic>>>(
        future: NutriwowApi.loyaltyHistory(),
        builder: (ctx, snap) {
          final rows = snap.data ?? const <Map<String, dynamic>>[];
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Points History',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                if (snap.connectionState == ConnectionState.waiting)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (rows.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text('No points activity yet.',
                        style: TextStyle(color: NwColors.muted)),
                  )
                else
                  ...rows.map((r) {
                    final pts = (r['points'] as num?)?.toInt() ?? 0;
                    final desc = (r['description'] ?? r['type'] ?? '').toString();
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(desc,
                                style: const TextStyle(fontSize: 13)),
                          ),
                          Text(pts >= 0 ? '+$pts' : '$pts',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: pts >= 0
                                      ? NwColors.green
                                      : NwColors.orange)),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showHistory(context),
      child: Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0B8A17), Color(0xFF00A414)],
        ),
        boxShadow: [
          BoxShadow(
              color: NwColors.green.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.account_balance_wallet,
                color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Rewards Wallet',
                    style: TextStyle(
                        color: Colors.white70,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                Text(
                    _balance == null
                        ? 'Loading…'
                        : '${_balance!} points  ·  worth ₹$_value',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white70),
        ],
      ),
      ),
    );
  }
}
