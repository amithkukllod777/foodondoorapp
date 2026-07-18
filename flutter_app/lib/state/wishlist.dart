import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api.dart';

/// Wishlist of product ids. Persisted locally so it works logged-out; when the
/// customer is logged in, toggles also sync to the server (best-effort).
class WishlistState extends ChangeNotifier {
  final Set<int> _ids = {};
  static const _prefsKey = 'nw_wishlist_v1';

  Set<int> get ids => _ids;
  bool contains(int id) => _ids.contains(id);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw != null) {
      try {
        _ids.addAll((jsonDecode(raw) as List).whereType<int>());
        notifyListeners();
      } catch (_) {}
    }
    // Merge server wishlist if logged in (best-effort)
    try {
      final server = await NutriwowApi.wishlist();
      if (server.isNotEmpty) {
        _ids.addAll(server);
        await _persist();
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> toggle(int id) async {
    if (_ids.contains(id)) {
      _ids.remove(id);
    } else {
      _ids.add(id);
    }
    notifyListeners();
    await _persist();
    // Sync to server if logged in — ignore failures (e.g. logged out)
    NutriwowApi.toggleWishlist(id).catchError((_) => false);
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(_ids.toList()));
  }
}
