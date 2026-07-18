import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api.dart';
import '../api/models.dart';

class AuthState extends ChangeNotifier {
  CustomerProfile? profile;
  List<Address> addresses = [];

  bool get isLoggedIn => profile != null;

  static const _prefsKey = 'nw_auth_v1';

  /// App start: restore saved profile, then verify the session cookie is
  /// still valid server-side (it auto-renews on this call).
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw != null) {
      try {
        profile = CustomerProfile.fromJson(
            Map<String, dynamic>.from(jsonDecode(raw)));
        notifyListeners();
      } catch (_) {}
    }
    if (profile != null) {
      final valid = await NutriwowApi.sessionValid();
      if (!valid) {
        await _clear();
      } else {
        try {
          addresses = await NutriwowApi.getAddresses();
          notifyListeners();
        } catch (_) {}
      }
    }
  }

  Future<void> onLoggedIn(CustomerProfile p, List<Address> addrs) async {
    profile = p;
    addresses = addrs;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _prefsKey,
        jsonEncode({
          'id': p.id,
          'phone': p.phone,
          'name': p.name,
          'email': p.email,
        }));
    notifyListeners();
  }

  Future<void> refreshAddresses() async {
    if (!isLoggedIn) return;
    try {
      addresses = await NutriwowApi.getAddresses();
      notifyListeners();
    } catch (_) {}
  }

  /// Update the locally-stored profile (name/email) after a successful
  /// customer.updateProfile call, and re-persist.
  Future<void> applyProfileEdit({String? name, String? email}) async {
    if (profile == null) return;
    profile = profile!.copyWith(name: name, email: email);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        _prefsKey,
        jsonEncode({
          'id': profile!.id,
          'phone': profile!.phone,
          'name': profile!.name,
          'email': profile!.email,
        }));
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await NutriwowApi.logout();
    } catch (_) {}
    await _clear();
  }

  Future<void> _clear() async {
    profile = null;
    addresses = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
    notifyListeners();
  }
}
