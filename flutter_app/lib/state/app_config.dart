import 'package:flutter/foundation.dart';

import '../api/api.dart';

/// App-wide display flags fetched from the server (settings.getPublic).
/// vegMark toggles the green veg indicator on product cards — default OFF so
/// product images stay clean unless the admin turns it on.
class AppConfigState extends ChangeNotifier {
  bool vegMark = false;

  Future<void> init() async {
    try {
      final v = await NutriwowApi.vegMarkEnabled();
      if (v != vegMark) {
        vegMark = v;
        notifyListeners();
      }
    } catch (_) {}
  }
}
