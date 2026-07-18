# Nutriwow Flutter App

Native Android/iOS app for [nutriwow.in](https://www.nutriwow.in). Talks to the
same live tRPC API as the website — products, prices, coupons, orders sab
website ke saath automatically sync rehte hain.

## Kya hai isme

- **Home** — hero carousel, Bestseller / Trending / Featured / Explore sections
- **Categories** — admin-managed category list se browse
- **Product page** — image gallery, weight variants (base / 2× / 4×), bulk
  discount (2 pc → 5%, 3+ → 10%), highlights / nutrition / ingredients
  accordions, reviews, frequently-bought-together
- **Cart** — coupon apply, free-shipping threshold, quantities
- **Login** — WhatsApp OTP (same as website), 180-din session
- **Checkout** — saved addresses, COD + Razorpay (native SDK)
- **Orders** — order history + shipment tracking link
- **Search**

## Zaroori baatein

- **Pricing logic** `lib/pricing.dart` mein hai — ye `shared/pricing.ts` ka
  EXACT mirror hai. Server order place karte waqt prices validate karta hai,
  isliye in dono ko hamesha sync rakhna (variant multipliers 1 / 1.85 / 3.5,
  bulk discount, rounding).
- **applicationId** `in.nutriwow.app` hai — wahi jo Play Store par already
  listed hai (Capacitor app). Play Store par update ke roop mein bhejne ke
  liye **wahi keystore** chahiye jo `android/keystore.properties` (repo root)
  mein configured hai. Alag test install ke liye applicationId badal lo.

## Build

```bash
cd flutter_app
flutter pub get
flutter run                 # debug on device/emulator
flutter build apk --release # release APK
```

GitHub Actions (`.github/workflows/flutter-apk.yml`) har push par APK build
karke artifact upload karta hai — Actions tab se download kar sakte ho.

## Test account

Mobile `9999900000`, OTP `1234` (Play Store review ke liye bana test bypass).
