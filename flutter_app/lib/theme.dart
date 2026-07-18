import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Nutriwow brand palette — same tokens as the website (client/src/index.css).
/// Green primary, orange CTAs, off-white background. Never re-theme
/// third-party brand colors (Razorpay navy, WhatsApp green, etc).
class NwColors {
  static const green = Color(0xFF007A11); // nutrigreen (primary)
  static const greenLight = Color(0xFFDFF6DE); // nutrigreen-light
  static const orange = Color(0xFFF87300); // nutriorange (cart / buy-now CTAs)
  static const orangeDark = Color(0xFFD55200);
  static const background = Color(0xFFFDFAF6); // off-white
  static const foreground = Color(0xFF201914); // near-black warm
  static const card = Colors.white;
  static const muted = Color(0xFF8A8178);
  static const border = Color(0xFFEDE7DF);
  static const gold = Color(0xFFD4A017); // %OFF shimmer badges
  static const footerDark = Color(0xFF1A1A1A);
  static const whatsapp = Color(0xFF25D366);
}

ThemeData nutriwowTheme() {
  final base = ThemeData(
    useMaterial3: true,
    // iOS look & feel everywhere: Cupertino page transitions, bouncy
    // scrolling, iOS back-swipe gesture — on Android too.
    platform: TargetPlatform.iOS,
    colorScheme: ColorScheme.fromSeed(
      seedColor: NwColors.green,
      primary: NwColors.green,
      surface: NwColors.background,
    ),
    scaffoldBackgroundColor: NwColors.background,
  );

  final textTheme = GoogleFonts.poppinsTextTheme(base.textTheme).copyWith(
    // Headings use Baloo 2 like the website (h1–h3)
    headlineLarge: GoogleFonts.baloo2(
        fontSize: 28, fontWeight: FontWeight.w700, color: NwColors.foreground),
    headlineMedium: GoogleFonts.baloo2(
        fontSize: 22, fontWeight: FontWeight.w700, color: NwColors.foreground),
    headlineSmall: GoogleFonts.baloo2(
        fontSize: 18, fontWeight: FontWeight.w700, color: NwColors.foreground),
    titleLarge: GoogleFonts.baloo2(
        fontSize: 17, fontWeight: FontWeight.w600, color: NwColors.foreground),
  );

  return base.copyWith(
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: NwColors.background,
      foregroundColor: NwColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: true, // iOS-style centered titles
      titleTextStyle: GoogleFonts.baloo2(
          fontSize: 19, fontWeight: FontWeight.w700, color: NwColors.foreground),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: NwColors.green,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: NwColors.green,
        side: const BorderSide(color: NwColors.green),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NwColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NwColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NwColors.green, width: 2),
      ),
    ),
    cardTheme: const CardThemeData(
      color: NwColors.card,
      elevation: 1.5,
      shadowColor: Color(0x1A000000),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: NwColors.foreground,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}

/// ₹ formatting — Indian grouping (1,23,456)
String inr(num amount) {
  final s = amount.round().toString();
  if (s.length <= 3) return '₹$s';
  final last3 = s.substring(s.length - 3);
  var rest = s.substring(0, s.length - 3);
  final parts = <String>[];
  while (rest.length > 2) {
    parts.insert(0, rest.substring(rest.length - 2));
    rest = rest.substring(0, rest.length - 2);
  }
  if (rest.isNotEmpty) parts.insert(0, rest);
  return '₹${parts.join(',')},$last3';
}
