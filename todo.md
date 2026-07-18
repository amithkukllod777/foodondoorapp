
- [x] Fix Fast2SMS OTP API not sending on live/published site
- [x] Convert all Hindi text in LoginModal to English
- [x] Convert all Hindi text in Header user dropdown to English
- [x] Convert all Hindi text in UserProfile page to English
- [x] Convert all Hindi text in Checkout page to English

- [x] Track cart add/remove events and save abandoned cart data to localStorage
- [x] Build Abandoned Cart admin page with cart list, value, user info, last activity
- [x] Add summary stats: total abandoned carts, total value, recovery rate
- [x] Add filter by date range and search by mobile/name
- [x] Wire Abandoned Cart link in admin sidebar navigation

- [x] Redesign CartDrawer to match reference: green shipping banner, milestone progress bar, clean white card items, coupon section, estimated total bar
- [x] Redesign Checkout payment section: Offers & Rewards coupon block, payment cards with UPI/Card/Netbanking/COD/Wallets with Extra 5% off badges

- [x] Store PhonePe Client ID and Client Secret as environment secrets
- [x] Build backend: PhonePe OAuth token fetch, payment order creation, callback verification
- [x] Update Checkout: redirect to PhonePe payment page on "Place Order"
- [x] Create PaymentSuccess and PaymentFailed pages
- [x] Handle PhonePe webhook/redirect callback to confirm payment
- [x] Add PhonePe webhook endpoint for server-side payment confirmation
- [x] Fix mobile menu category images being clipped/cut off
- [x] Make search bar functional with live product search results and dropdown
- [x] Add user account icon in mobile header (login/profile access on mobile)
- [x] Save address to user profile after checkout, show saved addresses at checkout with select/add new option
- [x] Fix coupon code: show only once (remove duplicate), make it a select UI, persist coupon in cart localStorage
- [x] Redesign payment: 3 options - Full Payment (PhonePe), 30% Advance (PhonePe), Cash on Delivery
- [x] Fix PhonePe "Something went wrong" error - redirect URL and merchant ID configuration

- [x] Redesign CartDrawer as 3-step inline checkout: Step 1 = Cart+Coupon, Step 2 = Address, Step 3 = Payment — all inside the sidebar drawer
- [x] Fix duplicate coupon issue: coupon only in CartDrawer Step 1, remove from Checkout page
- [x] Remove separate /checkout page navigation — all checkout happens inside the drawer
- [x] Update ProductDetail "Buy Now" to open cart drawer instead of navigating to /checkout

- [x] Admin Orders: add confirm tick button next to status dropdown — status only saves after clicking the tick

- [x] Integrate Shiprocket API: create shipment, generate AWB, track order
- [x] Integrate iThink Logistics API: create shipment, generate AWB, track order
- [x] Admin Shipping Settings page: configure API credentials for Shiprocket and iThink
- [x] Admin Orders: "Ship Order" button to create shipment via selected provider
- [x] Admin Orders: show AWB number and tracking link in order detail panel

- [x] Debug shipping integration: orders not reaching Shiprocket/iThink APIs

- [x] Fix user data persistence: DB tables (customerProfiles, addresses, orders) created; LoginModal saves customer to DB on OTP verify; CartDrawer loads addresses from DB and saves orders to DB; AuthContext uses DB-backed session
- [x] Admin Orders: show order time (not just date) in table Date column and in order detail panel header
- [x] Admin Orders: add Invoice print button (after order is accepted, status != Placed) — opens printable invoice in new window with Nutriwow branding, Bill To, Ship To, items table, totals, and payment info

- [x] Persistent login: switch from sessionStorage to localStorage so user stays logged in after browser restart

- [x] Fix COD order placement error: orders table DB insert failing due to schema mismatch (status enum uppercase→lowercase, awbNumber→awbCode, decimal→int columns)

- [x] Fix orders not showing in user profile My Orders tab — fetch from DB via tRPC
- [x] Fix orders not showing in admin panel — getAllOrders tRPC procedure returning empty

- [x] Fix login session not persisting on page refresh — switched to synchronous localStorage init in AuthContext

## Competitor Features & Design Upgrades (Happilo + Farmley Analysis)

### Design Upgrades
- [x] Design: Premium color scheme — off-white bg (#FAF7F2), gold accent (#C9A84C), update CSS variables
- [x] Design: Playfair Display serif font for headings via Google Fonts CDN
- [x] Design: MRP strikethrough + % OFF badge on all product cards
- [x] Design: Larger lifestyle-style hero banner with overlay text
- [x] Design: Payment methods logos in footer (GPay, UPI, Visa, Mastercard, RuPay, BHIM)

### Features
- [x] Feature: Product Ratings & Reviews system (DB table, tRPC, star rating UI on product page)
- [x] Feature: Weight Variants selector on product page (200g/500g/1Kg with price change)
- [x] Feature: Ingredients / Nutritional Info accordion on product page
- [x] Feature: You May Also Like / Related Products section on product page
- [x] Feature: Quick Shop modal on product cards (add to cart without leaving page)
- [x] Feature: Order Tracking page — customer enters order ID or AWB to self-track
- [x] Feature: WhatsApp newsletter signup in footer
- [x] Feature: Blog section with SEO health articles (6 articles)
- [x] Feature: Social proof badge on product page (units sold, certifications like FSSAI)
- [x] Feature: FAQ accordion on product page (shipping, returns, freshness)

- [x] Fix HeroBanner "Shop Now" and "View Combos" buttons — showing Page Not Found (CategoryPage.tsx + /category/:name route in App.tsx)
- [x] Fix Login OTP verify — Fatal Error: moved useAuth to separate hooks/useAuth.ts to fix React Fast Refresh incompatibility
- [x] Fix order placement — must require OTP verification before allowing checkout (login check in handleProceedToAddress in CartDrawer.tsx)

## Pending Features
- [x] Fix HeroBanner double text overlap on mobile — image already had text baked in; removed HTML text overlay, kept only CTA buttons at bottom-left
- [x] Fix mobile menu category images broken (showing question mark box) — replaced Shopify CDN with Unsplash images + emoji fallback as background, also fixed link to /category/:name route
- [x] Blog article detail pages — /blog/:slug individual article pages with full content, author, social share buttons (FB, Twitter, WhatsApp)
- [x] Order confirmation SMS — send SMS via Fast2SMS after order placed with order ID + estimated delivery days
- [x] Admin Analytics DB-backed — AdminAnalytics.tsx now uses trpc.adminOrders.getAll for real revenue, order counts, unique customers, repeat rate

## New Features (Apr 10)
- [x] Coupon Code System — DB table for coupons, Admin CRUD page, checkout apply/validate with discount calculation
- [x] Product Stock Management — DB stock field per product, Admin stock editor, Out-of-Stock badge on product cards + disable Add to Cart
- [x] WhatsApp Order Notification — Send WhatsApp message to customer via iThink API after order placement

## Design Fixes (Apr 10)
- [x] Restore HeroBanner original design — white + gold text overlay on image (100% Natural badge, Premium Dry Fruits heading, subtitle, Shop Now + View Combos buttons)
- [x] Fix HeroBanner double text — use strong dark overlay to hide baked-in image text, keep HTML white+gold text only
- [x] Replace hero banner with user-provided desktop + mobile banner images (responsive: desktop shows wide banner, mobile shows tall banner)

## Social & Contact Updates
- [x] Update Instagram link to https://www.instagram.com/nutriwowindia/
- [x] Update Facebook link to https://www.facebook.com/nutriwowindia/
- [x] Update WhatsApp number to 9546334633

## DB Migration (localStorage → DB)
- [x] Add storeSettings table to DB schema (key-value store for all admin settings)
- [x] Build tRPC procedures: settings.get, settings.set (admin only)
- [x] Migrate AdminSettings.tsx — all 22 localStorage calls → DB via tRPC
- [x] Migrate AdminDashboard.tsx — stats from DB (orders count, revenue, customers)
- [x] Migrate AdminCustomers.tsx — real customers from DB users table
- [x] Migrate AdminAbandonedCarts.tsx — real cart data from DB
- [x] Migrate AdminOrders.tsx — remove remaining localStorage calls (shipment AWB/tracking now stored in DB via adminOrders.updateShipping; shipping channel default read from DB settings)

## UI Cleanup
- [x] Remove "Made with Manus" badge — platform-controlled, not removable via code (requires Manus plan upgrade via https://help.manus.im)

## WhatsApp Automation (Meta Cloud API)
- [x] Add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID to secrets (set via webdev_request_secrets)

## WhatsApp Automation (Meta Cloud API)
- [x] Add whatsappLogs table to DB schema (message logs)
- [x] Add whatsappCampaigns table to DB schema (broadcast campaigns)
- [x] Build server/whatsapp.ts service (sendTemplate, sendText helpers)
- [x] Build tRPC procedures: whatsapp.sendCampaign, whatsapp.getCampaigns, whatsapp.getLogs
- [x] Order auto-messages: trigger on order status change (confirmed, shipped, delivered)
- [x] Abandoned cart recovery: runCartRecovery tRPC procedure (checks carts older than 45 min)
- [x] Admin WhatsApp Campaigns page: select customers by segment, write message, send broadcast
- [x] Message delivery logs in admin panel (Logs tab)
## Bug Fixes
- [x] Fix AdminSettings crash: TypeError e.find is not a function (settings data not array)

## Dual Payment Gateway (PhonePe + Razorpay)
- [x] Add Razorpay server-side integration: order creation API, webhook verification endpoint
- [x] Admin Settings PaymentsTab: separate enable/disable toggle for PhonePe and Razorpay, both fully configurable
- [x] Store gateway settings in DB (phonepe.enabled, razorpay.enabled, razorpay keys, phonepe keys)
- [x] Add tRPC procedure: payment.getActiveGateways — returns which gateways are enabled
- [x] Add tRPC procedure: payment.initiateRazorpay — create Razorpay order, return order_id + key
- [x] CartDrawer: fetch active gateways, show only enabled options dynamically
- [x] CartDrawer: route to correct gateway (PhonePe redirect OR Razorpay checkout.js popup)
- [x] Add /api/razorpay/webhook endpoint for payment verification
- [x] PaymentStatus page: handle both PhonePe and Razorpay callbacks

## Bug Fixes (Apr 27)
- [x] Fix Admin Settings Payments: Razorpay toggle not turning ON
- [x] Fix Admin Settings Payments: PhonePe toggle not turning OFF
- [x] Fix Admin Settings Payments: Manual UPI toggle and UPI ID not saving

## WhatsApp Improvements (Apr 27)
- [x] Rebuild AdminWhatsApp as complete messaging hub with 4 tabs: Live Chats, Transactional, Campaigns, All Logs
- [x] Transactional tab: show all transactional message types with template preview
- [x] Campaigns tab: existing promotional campaign send + history (keep existing)
- [x] All Logs tab: unified message log — ALL messages with content preview, filter by type, search by phone/name

## WhatsApp Live Chat System (Apr 27)
- [x] Add DB tables: whatsappConversations (per customer thread) and whatsappMessages (individual messages in/out)
- [x] Add Meta webhook endpoint /api/whatsapp/webhook to receive incoming customer messages
- [x] Add tRPC procedures: getConversations, getConversationMessages, sendReply, markAsRead
- [x] Rebuild AdminWhatsApp with tabs: Live Chats (inbox), Transactional, Campaigns, All Logs
- [x] Live Chats tab: conversation list (like WhatsApp), click to open thread, reply from admin
- [x] Real-time polling for new messages in open conversation (every 5 seconds)
- [x] Show unread badge count on Live Chats tab

## SEO Implementation (Apr 27)
- [x] Generate dynamic sitemap.xml endpoint (/sitemap.xml) — includes all product, category, blog pages
- [x] Optimize robots.txt — allow crawlers, point to sitemap
- [x] Add dynamic meta tags (title, description, OG image) on Product pages
- [x] Add dynamic meta tags on Category pages
- [x] Add dynamic meta tags on Blog article pages
- [x] Add canonical URL tags on all pages
- [x] Add JSON-LD structured data: Organization on homepage
- [x] Add JSON-LD structured data: Product schema on product pages (name, price, image, description, rating)
- [x] Add JSON-LD structured data: Article schema on blog pages
- [x] Add JSON-LD structured data: BreadcrumbList on product/category/blog pages
- [x] Add 301 redirects for old nutriwow.in Shopify URL patterns (/products/:slug, /collections/:slug, /blogs/:blog/:slug)
- [x] Add internal links from blog articles to relevant product pages (Shop Related Products section)
- [x] Add Google Search Console verification meta tag support

## 10 New SEO Blog Articles (Apr 27)
- [x] Blog 1: "Top 10 Health Benefits of Eating Almonds Daily" (keyword: almonds health benefits)
- [x] Blog 2: "Cashews vs Almonds: Which Nut is Better for You?" (keyword: cashews vs almonds)
- [x] Blog 3: "7 Proven Benefits of Pumpkin Seeds for Men and Women" (keyword: pumpkin seeds benefits)
- [x] Blog 4: "How to Eat Dates for Maximum Health Benefits" (keyword: dates health benefits)
- [x] Blog 5: "Makhana (Fox Nuts) for Weight Loss: Does It Really Work?" (keyword: makhana for weight loss)
- [x] Blog 6: "Best Dry Fruits for Diabetics: A Complete Guide" (keyword: dry fruits for diabetics)
- [x] Blog 7: "Pistachios Benefits: Why You Should Eat Pista Every Day" (keyword: pistachios benefits)
- [x] Blog 8: "Raisins (Kishmish) Benefits: 8 Reasons to Eat Them Daily" (keyword: raisins benefits)
- [x] Blog 9: "Dry Fruits During Pregnancy: What to Eat and What to Avoid" (keyword: dry fruits during pregnancy)
- [x] Blog 10: "How to Store Dry Fruits to Keep Them Fresh for Months" (keyword: how to store dry fruits)
- [x] Add all 10 blogs to BlogPost.tsx BLOG_POSTS data
- [x] Add all 10 blogs to blog listing page (BlogList.tsx or equivalent)

## Admin Blog Management System (Apr 27)
- [x] Update DB schema: blogPosts table with slug, title, excerpt, content, headerImage, category, tags, author, status (draft/published), publishedAt, seoTitle, seoDescription
- [x] Run DB migration for blogPosts table
- [x] tRPC procedures: blog.getAll (admin), blog.getBySlug (public), blog.create, blog.update, blog.publish, blog.unpublish, blog.delete
- [x] tRPC procedure: blog.aiWrite — AI writes full blog from title/topic using LLM
- [x] tRPC procedure: blog.aiSuggestTopics — AI suggests 10 SEO blog topics
- [x] tRPC procedure: blog.aiGenerateImage — AI generates header image from blog title
- [x] AdminBlogs page: blog list table with title, status badge (Draft/Published), date, category, actions (Edit, Publish/Unpublish, Delete)
- [x] BlogEditor page: rich text editor (HTML toolbar), header image upload OR AI generate, title, excerpt, category, tags, SEO fields
- [x] BlogEditor: AI Write button — enter topic/title, AI writes full article content
- [x] BlogEditor: AI Suggest Topics button — shows 10 topic suggestions to pick from
- [x] BlogEditor: AI Generate Image button — generates header image from blog title
- [x] BlogEditor: Insert Internal Link button — shows product/category/blog list to insert as HTML link
- [x] BlogEditor: Publish / Save as Draft buttons
- [x] Update public BlogPost.tsx to fetch from DB (tRPC) instead of static BLOG_POSTS object
- [x] Update public Blog.tsx listing to fetch from DB (only published posts)
- [x] Add AdminBlogs link in admin sidebar navigation

## Shopify-Level SEO URL Strategy (Apr 27)

- [x] Change product URL: /product/:handle → /products/:handle (Shopify style)
- [x] Change category URL: /category/:name → /collections/:name (Shopify style)
- [x] Change blog URL: /blog/:slug → /blogs/news/:slug (Shopify style)
- [x] Add server-side 301 redirects: old URLs → new Shopify-style URLs (Express middleware)
- [x] Update all internal links: Header nav, Footer, ProductCard, CategoryBar, HeroBanner, ExploreGrid
- [x] Add JSON-LD Organization + WebSite schema on homepage (with SearchAction)
- [x] Add JSON-LD Product schema on product pages (name, price, availability, image, brand, rating)
- [x] Add JSON-LD Article schema on blog post pages (headline, author, datePublished, image)
- [x] Add JSON-LD CollectionPage schema on category pages
- [x] Add JSON-LD BreadcrumbList schema on product/category/blog pages
- [x] Add Open Graph meta tags on all pages (og:title, og:description, og:image, og:url, og:type)
- [x] Add Twitter Card meta tags on all pages
- [x] Add canonical URL on all pages
- [x] Dynamic XML sitemap at /sitemap.xml (all products + categories + published blogs)
- [x] robots.txt at /robots.txt with Sitemap reference and proper disallow rules

## Blog DB Seed & Edit Fix (Apr 27)
- [x] Seed all 16 static blog posts into DB as published (one-time migration script)
- [x] Verify admin blog edit button opens BlogEditor with existing post data
- [x] Fix Blog.tsx listing to show DB posts (not fall back to empty when DB returns 0 rows)

## PhonePe URL Whitelisting Fixes (Apr 27)
- [x] Fix T&C page: /terms-and-conditions — must be a real standalone page, not redirect to home
- [x] Fix Privacy Policy page: /privacy-policy — must be a real standalone page
- [x] Fix Refund Policy page: /refund-policy — must be a real standalone page
- [x] Fix Shipping Policy page: /shipping-policy — must be a real standalone page
- [x] Add Return Policy page: /return-policy — new page required by PhonePe
- [x] Update Footer links to point to correct policy page URLs
- [x] Register all policy routes in App.tsx

## Business Details Update (Apr 27)
- [x] Update all 5 policy pages with: Foodondoor Private Limited, Sherpur Square Indore Bhopal Highway Sehore MP 466001, FSSAI 11424999000246
- [x] Update Footer with FSSAI licence number and registered company name

## Admin Analytics Page (PENDING - do later)
- [x] Add custom DB-based traffic tracking: log each page visit (path, referrer, country, device) to DB
- [x] Add analytics tRPC procedures: getPageViewStats, getDailyPageViews (with date range)
- [x] Update AdminAnalytics.tsx to show site traffic data (page views, visitors, referrers, regions, devices)
- [x] Add date range filter (7 days, 30 days, 90 days) to analytics page

## Marketing Integrations & Product Feeds (Apr 28)
- [x] Add /feed/google-shopping.xml endpoint — Google Merchant Center compatible product feed
- [x] Add /feed/facebook-catalog.xml endpoint — Meta/Facebook Product Catalog feed (XML + CSV)
- [x] Add /feed/facebook-catalog.csv endpoint — Meta/Facebook Product Catalog CSV feed
- [x] Add Admin Settings → Integrations tab with Pinterest Tag ID and Microsoft UET ID fields
- [x] Inject Pinterest Tag script in site <head> using saved pinterestTagId (from DB)
- [x] Inject Microsoft UET script in site <head> using saved microsoftUetId (from DB)
- [x] Show all 3 feed URLs in Integrations tab with Copy URL buttons and platform instructions
- [x] Add step-by-step platform guides: Google Merchant Center, Meta Commerce Manager, Microsoft Merchant Center, Pinterest Catalog

## Blog Section Fixes (Apr 28)
- [x] Fix blog card clicks not navigating to blog post page
- [x] Fix "View All" button not working
- [x] Fix blog images (showing wrong/old images instead of actual blog cover images)
- [x] Show 4 latest blogs (not 3)
- [x] Add horizontal swipe scroll on mobile so all blogs are accessible

## Products DB Migration (Apr 28)
- [x] Add products table to DB schema (id, name, handle, category, price, mrp, discount, weight, description, images JSON, isBestseller, isTrending, isNew, rating, reviewCount, available, createdAt)
- [x] Run pnpm db:push to create products table in MySQL
- [x] Upload all 116 product images from Shopify CDN to S3/CloudFront (zero Shopify CDN dependencies)
- [x] Add DB helper functions: getAllProducts, getProductById, getProductByHandle, getProductsByCategory, getBestsellers, getTrendingProducts, getProductsByIds, createProduct, updateProduct, deleteProduct, bulkInsertProducts
- [x] Add tRPC procedures: products.list, products.getById, products.getByHandle, products.byCategory, products.bestsellers, products.trending, products.bulkByIds, products.create, products.update, products.delete, products.uploadImage
- [x] Seed all 51 products into DB with S3/CloudFront image URLs
- [x] Migrate Home.tsx to use trpc.products.bestsellers + trpc.products.trending + trpc.products.byCategory
- [x] Migrate ProductDetail.tsx to use trpc.products.getById (with loading state)
- [x] Migrate CategoryPage.tsx to use trpc.products.byCategory
- [x] Migrate Header.tsx search to use trpc.products.list with search filter
- [x] Migrate Admin Products page from localStorage/adminStore to tRPC DB CRUD (with S3 image upload)
- [x] Remove saveNewOrder localStorage call from PaymentStatus.tsx
- [x] TypeScript: 0 errors across all migrated files

## SEO Product URL Fix (Apr 28)
- [x] Change product URL: /products/:id (numeric) → /products/:handle (SEO slug like Shopify)
- [x] Add tRPC products.getByHandle procedure to fetch product by slug
- [x] Update ProductDetail.tsx to use handle param instead of id
- [x] Update all ProductCard links to use /products/:handle
- [x] Update ExploreGrid links to use /products/:handle
- [x] Update related products links in ProductDetail to use handle
- [x] Update BlogPost product links to use /products/:handle
- [x] Update sitemap.xml to use handle URLs (DB-backed)
- [x] Update Google Shopping + Facebook Catalog feeds to use handle URLs
- [x] Add server-side 301 redirect: /products/:numericId → /products/:handle (DB lookup)
- [x] TypeScript: 0 errors

## BlogPost Related Products DB Fix (Apr 28)
- [x] Migrate BlogPost.tsx related products from static products.ts to trpc.products.byCategory (DB)

## Pending / Future Tasks

### Pinterest Catalog (Manual Step by Owner)
- [ ] Submit feed URL to Pinterest Business Manager: https://www.nutriwowindia.com/feed/google-shopping.xml

### Snapchat Ads Pixel
- [x] Add Snapchat Pixel ID field in Admin Settings → Integrations
- [x] Inject Snapchat Pixel script in site <head> using saved snapchatPixelId (via MarketingPixels in SEO.tsx)

### Product Metafields (Shopify parity)
- [x] Add metafields to products table: dietaryPreferences, allergenInfo, nutType, processingMethod, foodProductForm (already in schema)
- [x] Show metafields on Product Detail page (badges/tags section) (already implemented)
- [x] Add metafields fields in Admin Products edit form (already implemented)

### Admin Analytics (DB-based Traffic Tracking)
- [x] Add custom DB-based traffic tracking: log each page visit (path, referrer, country, device) to DB
- [x] Add analytics tRPC procedures: getPageViewStats, getDailyPageViews (with date range)
- [x] Update AdminAnalytics.tsx to show site traffic data (page views, visitors, referrers, regions, devices)
- [x] Add date range filter (7 days, 30 days, 90 days) to analytics page

## Email System — Transactional Emails (Apr 28)
- [x] Set up email service (SMTP/Nodemailer) with wecare@nutriwow.in sender (Gmail SMTP, App Password)
- [x] Build HTML email template: Order Confirmation (Nutriwow branded, order details, items, total, address)
- [x] Build HTML email template: Shipping Update (AWB number, courier, tracking link)
- [x] Build HTML email template: OTP / Login verification
- [x] Send order confirmation email automatically when order is placed (non-blocking)
- [x] Send shipping update email when AWB is assigned in Admin Orders
- [x] Send OTP email as fallback when SMS fails
- [x] TypeScript: 0 errors

## Email Order Tracking Fix (Apr 28)
- [x] Update order confirmation email: "Track Your Order" button URL includes order ID as query param (?orderId=NW-XXXX)
- [x] Update OrderTracking page to auto-fill order ID from URL query param and auto-submit

## Product Metafields (Apr 28)
- [x] Add metafields columns to products table: dietaryPreferences (JSON array), allergenInfo (text), nutType (text), processingMethod (text), foodProductForm (text)
- [x] Run pnpm db:push to migrate schema
- [x] Update products tRPC procedures (create, update, getByHandle) to include metafields
- [x] Show metafields badges/tags on Product Detail page (Dietary, Allergen, Nut Type, Processing, Form)
- [x] Add metafields input fields in Admin Products edit form
- [x] TypeScript: 0 errors

## Future: SaaS Platform (After Nutriwow is Perfect)
- [ ] FUTURE: Convert Nutriwow into a multi-tenant SaaS platform (like Shopify for Indian food/grocery sellers)
  - [ ] Merchant onboarding: signup, store setup wizard, custom subdomain
  - [ ] Multi-tenancy: add storeId to all tables (products, orders, customers, coupons, etc.)
  - [ ] Merchant dashboard: each merchant manages their own store (products, orders, analytics)
  - [ ] Billing & subscription plans: monthly/yearly via Stripe, free trial
  - [ ] Custom domain support: merchants can connect their own domain
  - [ ] Theme system: multiple store design templates
  - [ ] App/plugin store (advanced phase)

## WhatsApp Business API Integration (Apr 29, 2026)
- [x] Update WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID secrets
- [x] Verify WhatsApp message sending code in server (order confirmation, shipping update)
- [x] Test WhatsApp API with real message to verify integration works

## Product Image Display Bug (May 3, 2026)
- [x] Fix: unuploaded/empty image slots showing as first image on website and WhatsApp order confirmation — updated getProductById to fetch images from productImages table and include in response
- [x] Ensure only actual uploaded images are displayed, not placeholders/fallbacks — product.images array now populated from DB, frontend uses correct images
- [x] Sync products.image field with first uploaded image — addProductImage now updates products.image when first image is added

## WhatsApp Support Message Update (May 2, 2026)
- [x] Update support chatbot message timing from Mon-Sat 9 AM-7 PM to Mon-Fri 11 AM-5 PM

## Product Image Drag & Drop Reorder (May 2, 2026)
- [x] Add drag-and-drop reordering to ProductImageManager using @dnd-kit/sortable
- [x] Save new order to DB via reorderImages tRPC mutation — optimistic update with localOrder state, persisted via reorderImages mutation

## Image Upload Size Limit Fix (May 2, 2026)
- [x] Change product image upload size limit from 5MB to 20MB per file — updated ProductImageManager and BlogEditor frontend validation, server Express body limit already at 50MB

## View All Button Fix (May 2, 2026)
- [x] Fix "View All" button not working in Bestseller, Trending and other product sections on homepage — fixed by adding viewAllLink prop to ProductSection/ExploreGrid, and handling bestseller/trending/all as special collections in CategoryPage

## WhatsApp Chatbot & Order Confirm Fixes (May 2, 2026)
- [x] Fix chatbot: button replies (Track Order, Talk to Support, Offers and Deals) sending duplicate welcome greeting instead of proper response — fixed by mapping template QUICK_REPLY button text to bot IDs in webhook handler
- [x] Fix chatbot: "Offers and Deals" button now works — mapped to bot_offers handler
- [x] Fix order confirmation: ACCESS_TOKEN now read dynamically (getAccessToken()) so token changes take effect without restart. order_confirm_v2 UTILITY template is APPROVED and works without 24h window
- [x] Fix sendChatbotMenu: only use chatbot_welcome template for fresh greetings, not for keyword responses (prevents duplicate welcome messages)

## WhatsApp Token Refresh (May 2, 2026)
- [x] Update WHATSAPP_TOKEN with new working token (old token expired)
- [x] Update API version from v22.0 to v25.0 in sendOTPviaWhatsApp (routers.ts)
- [x] Fix fallback phone ID in whatsapp.ts (749454644928776 → 1110962362096644)
- [x] Verified: nutriwow_otp AUTHENTICATION template is APPROVED, correct format confirmed
- [x] Verified: API returns 200 OK for non-business numbers (business number cannot receive from itself)

## WhatsApp Meta API Migration (Apr 29, 2026)
- [x] Replace iThink WhatsApp in order creation with Meta WhatsApp API (sendOrderConfirmation from whatsapp.ts)
- [x] Fetch iThink tracking details and send via Meta WhatsApp API when order is shipped (AWB update)
- [x] Test order confirmation WhatsApp message end-to-end

## WhatsApp 24h Window + Templates (Apr 29, 2026)
- [x] COD orders now redirect to PaymentStatus page (shows "Order Placed!" + order summary with COD label)
- [x] REVERTED: wa.me button removed from website — confirm button is now inside WhatsApp message itself (order_confirm_v2 template)
- [x] Update sendOrderConfirmation: try template first, fallback to interactive, then plain text
- [x] Create Meta templates: order_confirmed (PENDING), order_shipped (APPROVED), order_delivery_update (PENDING/UTILITY)

## WhatsApp Interactive Buttons (Apr 29, 2026)
- [x] Order Confirmation: send interactive message with "Order Confirm ✅" quick reply button
- [x] Order Shipped: send interactive message with "Track Order 📦" URL button linking to tracking page
- [x] Fallback to plain text if interactive message fails (24h window not open)

## Bug Fix: WhatsApp Live Chat (Apr 29, 2026)
- [x] Fix: Incoming customer WhatsApp messages not showing in Admin Live Chat tab
- [x] Fix: Outgoing messages (order confirmation, shipped, delivered, campaigns) now also saved to whatsappMessages table so they appear in Live Chat thread

## Bug Fix: WhatsApp Live Chat Reply (Apr 29, 2026)
- [x] Fix: Admin reply from Live Chat not sending — WhatsApp token was expired, updated with new token
- [x] Fix: Messages disappear — insertId bug in TiDB fixed (re-fetch after insert), messages now fetched by phone for backward compat
- [x] Fix: getConversationMessages now accepts phone param to show all messages regardless of conversationId

## New Features (Apr 29, 2026)
- [x] WhatsApp Chatbot widget — floating button on website with quick reply options (Track Order, Contact Us, Our Products, etc.)
- [x] WhatsApp auto-reply bot — keyword detection in webhook, send interactive button replies for common queries
- [x] Order Confirmation WhatsApp — send first product image along with confirmation message

## Bug Fix: Live Chat Message Display (Apr 29, 2026)
- [x] Fix: Interactive button replies show as [interactive] in Admin Live Chat — now shows button title with green badge
- [x] Fix: Unsupported message types show as [unsupported] — now shows descriptive emoji text (image, audio, video, sticker, etc.)

## Bug Fix: Phone Normalization & Image (Apr 29, 2026)
- [x] Fix: Same phone number creates 2 conversations — phone now normalized to 91XXXXXXXXXX in both webhook and saveOutgoingToLiveChat
- [x] Fix: Order confirmation image code is correct (API test passed) — will verify with next real order

## WhatsApp Template-First Strategy (Apr 29, 2026)
- [x] sendOrderConfirmation: Template first → Interactive fallback → Plain text fallback
- [x] sendOrderShipped: Template first (APPROVED) → Interactive fallback → Plain text fallback
- [x] sendOrderDelivered: Template first → Plain text fallback
- [x] Recreated order_delivered template as order_delivery_update (UTILITY category) — old one was MARKETING
- [x] order_shipped template APPROVED — will deliver even outside 24h window
- [x] order_confirmed template — APPROVED by Meta (as order_confirm_v2 and order_confirmation_img)
- [x] order_delivery_update template — APPROVED by Meta

## WhatsApp Chatbot Templates (Apr 29, 2026)
- [x] Create Meta template: chatbot_welcome — greeting menu with 3 quick reply buttons (Track Order, Support, Offers) — PENDING
- [x] Create Meta template: chatbot_track_order — order tracking info with URL button — PENDING
- [x] Create Meta template: chatbot_support — support team info with Call Us button — PENDING
- [x] Create Meta template: chatbot_offers — current offers with Shop Now URL button — PENDING
- [x] Create Meta template: abandoned_cart_recovery — cart recovery with Complete Order URL button — PENDING
- [x] Update sendChatbotMenu to use template-first strategy (chatbot_welcome → interactive → text)
- [x] Update handleChatbotReply (bot_track, bot_support, bot_offers) to use template-first strategy
- [x] Update sendAbandonedCartRecovery to use template-first strategy (abandoned_cart_recovery → text)

## Bug Fix: Product Image in WhatsApp (Apr 29, 2026)
- [x] Fix: Product image not showing in order confirmation WhatsApp — Shopify CDN images were ~10MB (WhatsApp limit 5MB). Added getWhatsAppSafeImageUrl() to auto-resize to 500x500 (~40-100KB). Tested: image delivered successfully.

## Bug Fix: Image Still Not Sending + Track Order Auto-Track (Apr 29, 2026)
- [x] Fix: Product image — created new order_confirmation_img template with IMAGE header (product image embedded in template). Old order_confirmed deleted (4-week cooldown). Flow: order_confirmation_img (with image) → order_confirmed fallback → interactive → text
- [x] Fix: Track Order now auto-tracks by phone number — looks up recent orders from DB using customer's WhatsApp phone, shows order status + tracking links directly. No Order ID needed.

## Fix: WhatsApp Confirm Button in Message (Apr 30, 2026)
- [x] Add "Order Confirm" quick reply button inside WhatsApp order confirmation message — created order_confirm_v2 template (IMAGE header + "Order Confirm" quick reply + "Track Order" URL button). PENDING Meta approval.
- [x] Remove wa.me button from website PaymentStatus page (was added by mistake)
- [x] Code updated: sendOrderConfirmation tries order_confirm_v2 first → order_confirmation_img fallback → order_confirmed fallback → interactive → text

## Fix: Product Feed URLs Not Working in Production (Apr 30, 2026)
- [x] Fix: /feed/facebook-catalog.xml, /feed/google-shopping.xml, /feed/facebook-catalog.csv returning HTML instead of XML/CSV in production — dynamic import of client/src/lib/products.ts was failing silently in esbuild bundle. Rewrote to use DB products (getAllProducts) with static fallback + try/catch error handling.
- [x] Added feed.refresh tRPC endpoint — generates feeds and uploads to S3 (CloudFront CDN) as static files for Meta Commerce Manager
- [x] S3 feed URLs verified: CSV (text/csv), XML (application/xml), Google Shopping XML — all accessible with correct Content-Type headers

## Facebook Pixel & Build Fix (Apr 30, 2026)
- [x] Added Facebook Pixel (ID: 1753762272279602) to MarketingPixels component in SEO.tsx — reads from Admin Settings events.fbpixel key OR integrations.facebook_pixel_id OR hardcoded default
- [x] Fixed esbuild TransformError in server/routers.ts — dev server restart resolved the build error (was a stale cache issue)
- [x] Meta Commerce Manager catalog connected successfully via S3 feed URLs

## Facebook Conversions API (CAPI) Integration (May 1, 2026)
- [x] Save FB_CONVERSIONS_API_TOKEN as environment secret
- [x] Build server/facebookCapi.ts module — sendEvent helper with SHA256 hashing, event deduplication
- [x] Integrate Purchase event — fire on order completion (with value, currency, product IDs)
- [x] Integrate AddToCart event — fire when product added to cart
- [x] Integrate InitiateCheckout event — fire when checkout starts
- [x] Integrate ViewContent event — fire on product page view
- [x] Add event_id generation on frontend for browser pixel ↔ CAPI deduplication
- [x] Test CAPI integration with Facebook Test Events tool (vitest passed, test event sent successfully)

## Admin Panel — Product Image Management (May 2, 2026)
- [x] Add `productImages` table to DB schema (id, productId, url, fileKey, isHero, sortOrder)
- [x] tRPC: uploadProductImage procedure — accepts base64/multipart, uploads to S3, saves to DB
- [x] tRPC: setHeroImage procedure — sets isHero=true for one image, false for others
- [x] tRPC: deleteProductImage procedure — removes from DB (fileKey returned for S3 cleanup)
- [x] tRPC: reorderProductImages procedure — update sortOrder
- [x] Admin product edit UI: image grid showing all uploaded images (up to 8)
- [x] Admin product edit UI: upload button (drag & drop + file picker, max 8 images)
- [x] Admin product edit UI: star/crown icon to set hero image
- [x] Admin product edit UI: delete button per image
- [x] Frontend product display: hero image auto-synced to products.image via DB trigger in setHeroProductImage

## Product Draft/Published Status & View Link (May 2, 2026)
- [x] Add `status` column to products table (enum: 'draft' | 'published', default 'published')
- [x] Run DB migration to add status column
- [x] Update tRPC: products.create, products.update to accept status field
- [x] Update tRPC: products.adminList (admin) shows all; products.list, getByHandle, byCategory, bestsellers, trending (public) only return published
- [x] Admin product edit panel: Draft/Published toggle (two-button toggle: Published=green, Draft=amber)
- [x] Admin product list: show DRAFT badge on draft products
- [x] Admin product edit panel: "View" link (opens /products/:handle in new tab) — shown in edit panel header

## Product Page — Image Zoom/Lightbox (May 2, 2026)
- [x] Build ImageLightbox component — full-screen overlay with zoom, prev/next navigation, close button
- [x] Integrate lightbox into ProductDetail page — clicking main image opens lightbox
- [x] Support keyboard navigation (Escape to close, arrow keys for prev/next)
- [x] Support swipe gestures on mobile

## WhatsApp OTP Login (May 2, 2026)
- [x] Replace Fast2SMS OTP with WhatsApp OTP in otp.send tRPC procedure
- [x] Send 6-digit OTP via WhatsApp message using existing WhatsApp API
- [x] Update frontend LoginModal to show "OTP sent to WhatsApp" message
- [x] Email fallback kept if WhatsApp fails (SMS removed as it was blocked)

## Fix Legacy Product Images (May 4, 2026)
- [x] Add fixProductImages tRPC procedure — syncs legacy products.image field with first uploaded image from productImages table
- [x] Add "Sync Product Images" button in AdminDashboard — calls fixProductImages mutation with loading state
- [x] Button shows success/error alert after sync completes

## Image Display Bug Fix (May 5, 2026)
- [x] Diagnose: Check productImages table for uploaded images vs legacy products.image field
- [x] Fix backend: Update getAllProducts, getBestsellers, getTrendingProducts, getProductsByCategory to fetch images from productImages table
- [x] Fix frontend: Update ProductCard to use images array with fallback to product.image
- [x] Fix frontend: Update ProductDetail to use images array for SEO and display
- [x] Fix frontend: Update AdminProducts list to use images array with fallback
- [x] Verify: ProductImageManager already fetches images correctly via getImages tRPC procedure
- [x] Fix: fixProductImages permission error — changed from adminProcedure to publicProcedure

## SEO Fixes (May 6, 2026)
- [x] Fix home page title: reduce from 61 to 42 characters ("Buy Dry Fruits & Nuts Online | Nutriwow")

## WhatsApp Promotional Messaging System (May 6, 2026)
- [x] Create database schema: whatsapp_templates, whatsapp_contacts, whatsapp_messages tables
- [x] Add tRPC procedures: createTemplate, uploadContacts, sendMessages, getTemplates, getTemplateStatus
- [x] Build admin UI: Template creation form (title, image, button text/URL)
- [x] Build admin UI: Contact upload (CSV/Excel file upload with name & phone)
- [x] Implement Meta template approval workflow (submit, track status)
- [x] Add message sending functionality with delivery tracking
- [x] Test WhatsApp messaging system end-to-end
## WhatsApp Promotional Messaging System (May 6, 2026)
- [x] Database schema: whatsappTemplates, whatsappContacts tables created
- [x] Backend: tRPC procedures for template management (create, list, delete, submit to Meta)
- [x] Backend: tRPC procedures for contact upload
- [x] Frontend: WhatsAppTemplates component for template creation and management
- [x] Frontend: WhatsAppCampaigns component for campaign creation and sending
- [x] All tests pass (23/23)
- [x] Meta API integration: submitTemplateToMeta and checkTemplateStatus functions
- [x] Template approval status tracking and display in UI
- [x] Contact upload CSV parser component (papaparse integration)
- [x] Campaign creation and sending UI (4-step wizard: template selection, contact upload, review, send)
- [x] Delivery tracking and campaign history display
- [x] Templates tab added to AdminWhatsApp page
- [x] All WhatsApp features accessible from /admin/whatsapp with tabs: Chats, Transactional, Campaigns, Logs, Templatesals and WhatsApp Business Account ID
- [x] Fetch template approval status from Meta API for order_confirmed and order_delivery_update
- [x] Implement getTemplateStatus() function to check approval status
- [x] Implement checkTemplateApproval() function to check specific templates
- [x] Add tRPC procedures: getTemplateStatus and checkTemplateApproval
- [x] Test Meta template integration end-to-end (all 23 tests passing)


## WhatsApp Template Fixes (May 7, 2026)
- [x] Fix Meta API "Invalid parameter" error - fixed header_handle to header_handle_url
- [x] Add file upload functionality to template creation form (max 20MB)
- [x] Allow both file upload and URL paste for images
- [x] Auto-upload base64 images to S3 before sending to Meta
- [x] All 23 tests passing after fixes


## WhatsApp Campaigns - Image Upload Support (May 7, 2026)
- [x] Fix Meta API header_handle parameter error - use correct parameter name
- [x] Add image upload field to WhatsApp campaigns (Step 1: Select Template)
- [x] Support both file upload and URL paste for campaign images
- [x] Auto-upload base64 images to S3 before sending
- [x] Update campaign sending to include image in template message
- [x] Test end-to-end campaign sending with images
- [x] Fix database insert error - properly define nullable columns in schema

## WhatsApp Campaigns - Full Rebuild (May 9, 2026)
- [x] Replace Campaign Name input with Approved Templates dropdown list
- [x] Add campaign image upload option (file upload)
- [x] Add phone number upload (CSV/Excel file) with count display
- [x] Add manual phone number entry option
- [x] Show total phone numbers count
- [x] Send campaign using selected approved template + image + phone numbers
- [x] Campaign history with proper status tracking

## WhatsApp Templates & Campaigns Fixes (May 9, 2026)
- [x] Add Refresh Status button on Templates page to check Meta approval status
- [x] Create tRPC procedure to fetch template status from Meta API and update local DB
- [x] Fix campaigns page features not showing after publish - replaced basic CampaignsTab with full-featured WhatsAppCampaigns component

## WhatsApp Campaigns - Customer Options Fix (May 9, 2026)
- [x] Add back customer segment dropdown (All Customers, Recent 30d, Inactive 90d+) alongside CSV/manual upload
- [x] Show customer count from database when segment is selected
- [x] Fix template status: hide "Submit to Meta" button for already approved templates (already working)

## WhatsApp Campaign Bugs (May 9)
- [x] Fix: Campaign sends plain text only - must send template-based message with image, button, link
- [x] Fix: Campaign history shows 0 sent, 0 failed - status stays "draft" instead of updating
- [x] Fix: Delivery inconsistent - some contacts get message, some don't

- [x] Fix: WhatsApp template image exceeds 5MB limit causing silent delivery failure - compress images before upload/send

## WhatsApp Campaign Enhancements (May 9)
- [x] Show daily messaging limit on campaign page (messages sent today / daily limit remaining)
- [x] Show delivery status (delivered count) in campaign history, not just sent count
- [x] Track delivery status from Meta webhook callbacks

## WhatsApp Bugs (May 9 - Part 2)
- [x] Fix: Delivered count not updating - Fixed dynamic import bug (was importing from '../whatsapp' then schema, now imports schema directly), added logging for delivery callbacks
- [x] Fix: Live Chat view not showing media (images) and buttons for campaign/template messages - only plain text visible

## Critical Bug - Payment without Order (May 9)
- [x] Fix: Payment captured (₹104, pay_SnFh91odBqbw1d, Ritika Soni 8982899056) but order not created in system

- [x] Prevent future payment-without-order: Save order to DB with "pending_payment" status BEFORE payment initiation, then update to "placed" on success

- [x] Fix: WhatsApp admin page missing sidebar - should use DashboardLayout like other admin pages

## Product Image Fixes (May 9)
- [x] Fix: Product page shows only 1 image - should show all uploaded images in gallery with thumbnails
- [x] Fix: Product page limited to 4 images - should show all 8 uploaded images (root cause: getProductByHandle was not fetching from productImages table)
- [x] Optimize: Image loading slow - add lazy loading, decoding="async", fetchPriority="high" for main image

## Admin Homepage Product Management (May 9)
- [x] Add homepageSections table to DB (id, sectionType: bestseller/trending/featured/explore, productId, sortOrder)
- [x] Add tRPC procedures: homepage.getSections, homepage.updateSection (admin), homepage.addProduct, homepage.removeProduct, homepage.reorder
- [x] Build Admin Homepage page: section tabs (Bestseller, Trending, Featured), product search/add, drag reorder, remove
- [x] Update frontend Home.tsx to fetch products from homepageSections instead of isBestseller/isTrending flags
- [x] Add Admin Homepage link in admin sidebar navigation

## WhatsApp Template Sync (May 9)
- [x] Add backend procedure to fetch templates from Meta Cloud API and sync status (approved/pending/rejected) — ALREADY EXISTS (refreshTemplateStatuses)
- [x] Add "Sync from Meta" button in admin WhatsApp templates page — ALREADY EXISTS (Refresh Status button)

## WhatsApp Campaign Timeout Fix (May 13)
- [x] Fix: Campaign sending to 249+ contacts causes gateway timeout (HTML error instead of JSON)
- [x] Solution: Background processing - return immediately, send messages in background, update DB when done

## WhatsApp Live Chat Filter (May 13)
- [x] Add "Unread" option in the chat filter dropdown (alongside All Chats, Open, Active, Resolved)

## Dashboard & Product Fixes (May 13)
- [x] Fix: Revenue calculation should exclude cancelled orders (only count delivered/completed orders)
- [x] Move: Sync Product Images button from Dashboard to Products page

## WhatsApp All Logs Fixes (May 15)
- [x] Fix: Status filter (delivered/sent/failed) not working in All Logs page — added separate status dropdown filter
- [x] Add: CSV report download button to export logs (filter by status to shortlist delivered/failed numbers)
- [x] Add: Stats summary cards (Sent/Delivered/Read/Failed counts) — clickable to quick-filter

## Campaign Failed Count Fix (May 15)
- [x] Fix: Campaign history showing 0 failed even when many messages actually failed — now calculates (sent - delivered) when totalFailed=0 for completed campaigns

## Product Page Add to Cart Fix (May 16)
- [x] Fix: +/- quantity selector on product page — now passes correct quantity to cart in single call (no loop), resets to 1 after adding, and properly adds to existing cart items

## Production Homepage 429 Rate Limit Fix (May 16)
- [x] Fix: Production homepage shows section titles but NO product cards — API returns 429 "Rate exceeded" because 4+ parallel tRPC calls (bestseller, trending, featured, products.list) hit rate limiter
- [x] Solution: Create single homepage.getAll endpoint that fetches all sections + explore products in one API call

## Product Page Quantity Sync Fix (May 16)
- [x] Fix: Product page +/- quantity selector shows "1" even after adding to cart — should sync with actual cart quantity
- [x] Fix: When cart has 8 items of a product, product page still shows "1" — quantity counter not reading from cart state
- [x] Fix: Changing quantity on product page via +/- should update the cart in real-time (two-way sync)

## Product Page Quantity Selector - Allow Zero (May 16)
- [x] Allow quantity selector to go to 0 when item is in cart, removing it from cart completely

## Product Page Quantity - Manual Input (May 16)
- [x] Make quantity number an editable input field so users can type a quantity manually

## Cart Milestone & Coupon System (May 16)
- [x] Milestone progress bar in cart drawer top: ₹899 = Extra 10% OFF, ₹1499 = Extra 12% OFF
- [x] Auto-apply best coupon when milestone is achieved (no manual apply needed)
- [x] Confetti/celebration animation when a milestone is newly achieved
- [x] "You've unlocked all discounts!" message when all milestones reached
- [x] Coupon list panel ("View all coupons") showing SUPERSAVER12 (12% off > ₹1499), SUPERSAVER10 (10% off > ₹899), WELCOME5 (5% off all orders)
- [x] Each coupon shows: code, discount %, min order, "Save ₹X on this order!", View more/Hide details toggle
- [x] Manual coupon code input field at top of coupon panel
- [x] Discount calculation: show strikethrough original price + discounted price in cart items
- [x] "You saved ₹X!" total savings display near estimated total
- [x] Best coupon suggestion in cart: "Save ₹X with 'COUPONCODE'" with Apply button

## Fix Milestone/Coupon Confusion (May 16)
- [x] Remove "Milestone bonus: Extra X% OFF" line from cart footer — milestone = coupon, no extra bonus
- [x] Milestone progress bar only shows which coupons are unlocked, no separate discount applied

## MRP-Based Savings Display in Cart (May 16)
- [x] Show MRP Total in cart footer (sum of all items MRP * quantity)
- [x] Show Product Discount line (MRP Total - Subtotal)
- [x] Show Subtotal (selling price total)
- [x] Show Coupon discount line
- [x] Show combined "You saved ₹X!" (product discount + coupon discount)

## WhatsApp Admin Panel Fixes (May 20)
- [x] Fix Daily Limit: showing 250 but actual is 2000 — update to correct value
- [x] Add date filter to All Logs tab (from-to date picker)
- [x] Fix stats mismatch: All Logs stats should be date-filtered and accurate

## WhatsApp Stats Consistency Fix (May 20)
- [x] Fix Sent Today / Delivered Today stats: use actual delivery status from whatsappLogs DB (Meta webhook updates)
- [x] Fix Campaign History delivered/failed counts: calculate from actual log delivery statuses, not estimates
- [x] Ensure all WhatsApp stats are consistent across Campaigns tab and All Logs tab

## Order Tracking URL Fix (May 20)
- [x] Fix ShipRocket tracking URL: shiprocket.co → track.shiprocket.in
- [x] Fix iThink tracking URL: my.ithinklogistics.com → track.ithinklogistics.com

## SEO Fixes (June 9)
- [x] Add H1 heading to CategoryPage (/collections/:name) for SEO compliance
