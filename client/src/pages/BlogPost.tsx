/**
 * Nutriwow - Blog Article Detail Page
 * Route: /blog/:slug
 * SEO-focused full article content
 */

import { useRoute, Link } from "wouter";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO, { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/components/SEO";
import { Calendar, Clock, ArrowLeft, Tag, Share2, Facebook, Twitter, ShoppingBag, Loader2 } from "lucide-react";
import { dbProductToFrontend } from "@/lib/products";
import { trpc } from "@/lib/trpc";
import { optImg, BLOG_FALLBACK_IMAGE } from "@/lib/img";
import { sanitizeBlogHtml } from "@/lib/sanitize";

// Map blog category to product category for internal linking
const BLOG_TO_PRODUCT_CATEGORY: Record<string, string> = {
  "Nuts": "Nuts",
  "Snacks": "Snacks",
  "Seeds": "Seeds",
  "Berries": "Berries",
  "Dates": "Dates",
  "Makhana": "Makhana",
};

// Full blog post content
const BLOG_POSTS: Record<string, {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  authorRole: string;
  tags: string[];
  content: string;
}> = {
  "benefits-of-almonds": {
    slug: "benefits-of-almonds",
    title: "10 Incredible Health Benefits of Almonds You Should Know",
    excerpt: "Almonds are a powerhouse of nutrients — from heart health to weight management. Discover why adding a handful of almonds to your daily diet can transform your health.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Nuts",
    readTime: "4 min read",
    date: "March 28, 2025",
    author: "Priya Sharma",
    authorRole: "Certified Nutritionist",
    tags: ["almonds", "health benefits", "nuts", "protein"],
    content: `
## Why Almonds Are Called Nature's Superfood

Almonds have been consumed for thousands of years across cultures — from ancient Persia to modern India. Today, nutritional science confirms what our ancestors knew intuitively: almonds are one of the most nutrient-dense foods available.

A single 28g serving (about 23 almonds) provides:
- **6g of protein** — essential for muscle repair
- **3.5g of fiber** — supports digestive health
- **14g of healthy fats** — mostly monounsaturated
- **37% of daily Vitamin E** — a powerful antioxidant
- **20% of daily Magnesium** — critical for 300+ enzyme reactions

## 10 Science-Backed Health Benefits

### 1. Heart Health Protection
Multiple studies published in the *Journal of Nutrition* show that regular almond consumption reduces LDL (bad) cholesterol by up to 12%. The monounsaturated fats and antioxidants in almonds work together to protect arterial walls from oxidative damage.

### 2. Blood Sugar Control
Almonds have a very low glycemic index. Research shows that eating almonds with high-carb meals significantly reduces the post-meal blood sugar spike — making them ideal for diabetics and pre-diabetics.

### 3. Weight Management
Despite being calorie-dense, almonds are remarkably filling. A study in the *European Journal of Clinical Nutrition* found that people who snacked on almonds consumed fewer calories at subsequent meals, leading to net caloric reduction.

### 4. Brain Function & Memory
Almonds are rich in riboflavin (Vitamin B2) and L-carnitine — both linked to increased brain activity and reduced risk of Alzheimer's disease. In Ayurveda, almonds soaked overnight are traditionally given to children to improve memory.

### 5. Bone Strength
Almonds provide calcium, magnesium, and phosphorus — the three minerals most critical for bone density. Regular consumption can help prevent osteoporosis, especially in post-menopausal women.

### 6. Skin & Hair Health
Vitamin E in almonds is one of the most effective antioxidants for skin health. It protects against UV damage, reduces inflammation, and promotes collagen production. Almond oil is widely used in Ayurvedic hair care.

### 7. Gut Microbiome Support
Almonds act as a prebiotic — feeding beneficial bacteria in the gut. A 2021 study found that almond consumption significantly increased populations of *Bifidobacterium* and *Lactobacillus* — bacteria associated with reduced inflammation and better immunity.

### 8. Reduced Inflammation
Almonds contain flavonoids and Vitamin E that work synergistically to reduce inflammatory markers like CRP (C-reactive protein). Chronic inflammation is linked to heart disease, diabetes, and cancer.

### 9. Energy & Metabolism
The combination of protein, healthy fats, and B vitamins in almonds makes them an excellent sustained-energy food. Unlike sugar-based snacks, almonds provide energy without the crash.

### 10. Pregnancy Nutrition
Almonds are rich in folate — critical for fetal neural tube development. They also provide iron, calcium, and protein that support both mother and baby during pregnancy.

## How to Eat Almonds for Maximum Benefit

**Soaked Almonds (Best Method):** Soak 8-10 almonds overnight in water. Peel and eat in the morning on an empty stomach. Soaking reduces phytic acid, which otherwise blocks mineral absorption.

**Raw Almonds:** Excellent as a snack between meals. Keep a small pouch at your desk.

**Roasted Almonds:** Great for taste, but some heat-sensitive nutrients are reduced. Prefer lightly roasted over deep-fried.

**Daily Quantity:** 20-25 almonds (28g) per day is the optimal amount for most adults. More is not always better — almonds are calorie-dense.

## Nutriwow Premium Almonds

Nutriwow sources California almonds — known for their superior size, crunch, and nutrient density. Our almonds are:
- **Non-GMO** and naturally grown
- **Vacuum-sealed** for maximum freshness
- **FSSAI certified** for quality assurance
- Available in whole, roasted & salted variants

Start your almond journey today — your heart, brain, and skin will thank you.
    `
  },
  "cashews-for-heart-health": {
    slug: "cashews-for-heart-health",
    title: "Cashews and Heart Health: What the Science Says",
    excerpt: "Rich in monounsaturated fats and magnesium, cashews are one of the best nuts for cardiovascular health. Here's everything you need to know.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "March 15, 2025",
    author: "Dr. Ankit Verma",
    authorRole: "Cardiologist & Nutritionist",
    tags: ["cashews", "heart health", "magnesium"],
    content: `
## Cashews: The Heart-Friendly Nut

For decades, nuts were avoided by heart patients due to their fat content. But modern nutritional science has completely reversed this thinking. Cashews, in particular, have emerged as one of the most heart-protective foods available.

## The Nutritional Profile of Cashews

Per 28g serving (about 18 cashews):
- **5g protein** — complete amino acid profile
- **12g healthy fats** — 60% monounsaturated, 20% polyunsaturated
- **9g carbohydrates** — lower than most nuts
- **82mg Magnesium** — 20% of daily requirement
- **1.9mg Zinc** — immune system support
- **0mg Cholesterol** — naturally cholesterol-free

## How Cashews Protect Your Heart

### Monounsaturated Fats
Cashews are rich in oleic acid — the same heart-healthy fat found in olive oil. Research consistently shows that replacing saturated fats with monounsaturated fats reduces LDL cholesterol and increases HDL cholesterol.

### Magnesium: The Heart Mineral
Magnesium is essential for maintaining healthy heart rhythm, regulating blood pressure, and preventing arterial calcification. A 2019 meta-analysis in *Nutrients* found that higher magnesium intake was associated with a 22% lower risk of ischemic heart disease.

### Antioxidant Protection
Cashews contain proanthocyanidins — flavonoids that reduce platelet aggregation (blood clotting) and protect LDL particles from oxidation. Oxidized LDL is the primary driver of atherosclerosis (arterial plaque buildup).

### Blood Pressure Reduction
The potassium and magnesium in cashews work together to relax blood vessel walls, reducing both systolic and diastolic blood pressure. A study in the *American Journal of Clinical Nutrition* found that nut consumption reduced blood pressure by an average of 1.3 mmHg.

## Cashews vs. Other Nuts for Heart Health

| Nut | Monounsaturated Fat | Magnesium | Omega-3 |
|-----|---------------------|-----------|---------|
| Cashews | 60% | High | Low |
| Almonds | 65% | High | Low |
| Walnuts | 23% | Moderate | Very High |
| Pistachios | 55% | Moderate | Low |

Each nut has unique benefits — variety is key for optimal heart health.

## How Many Cashews Per Day?

**Optimal:** 15-20 cashews (28g) per day
**Maximum:** 30-40 cashews — beyond this, caloric intake becomes a concern

**Best time to eat:** Morning as a snack, or pre-workout for sustained energy.

## Nutriwow Premium Cashews

Our cashews are W240 grade — the premium whole cashew grade preferred by chefs and health enthusiasts. Sourced from Goa and Kerala, they're:
- **Large, whole kernels** with no broken pieces
- **Naturally processed** without chemical bleaching
- **Available roasted & salted** or raw whole
- **FSSAI certified** for food safety

Add cashews to your heart-healthy diet today.
    `
  },
  "makhana-superfood": {
    slug: "makhana-superfood",
    title: "Makhana: The Ancient Indian Superfood Making a Modern Comeback",
    excerpt: "Fox nuts or makhana have been used in Ayurveda for centuries. Low in calories, high in protein — find out why nutritionists are calling it the snack of the future.",
    image: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=1200&q=80",
    category: "Snacks",
    readTime: "6 min read",
    date: "March 5, 2025",
    author: "Kavita Iyer",
    authorRole: "Ayurvedic Nutritionist",
    tags: ["makhana", "fox nuts", "superfood", "ayurveda"],
    content: `
## What is Makhana?

Makhana (Euryale ferox), also known as fox nuts or lotus seeds, is harvested from the prickly water lily plant found in ponds and wetlands across Bihar, Manipur, and Assam. India produces 90% of the world's makhana supply.

In Ayurveda, makhana is classified as a **Sattvic food** — pure, light, and conducive to mental clarity. It has been prescribed for kidney health, reproductive wellness, and anti-aging for over 3,000 years.

## Nutritional Powerhouse

Per 100g of makhana:
- **Calories:** 347 kcal (lower than most nuts)
- **Protein:** 9.7g
- **Carbohydrates:** 76.9g (complex, slow-digesting)
- **Fat:** 0.1g (extremely low!)
- **Fiber:** 14.5g
- **Calcium:** 60mg
- **Magnesium:** 67mg
- **Phosphorus:** 200mg
- **Potassium:** 500mg

## Why Nutritionists Love Makhana

### 1. Perfect Snack for Weight Loss
With only 347 calories per 100g and extremely low fat content, makhana is one of the most guilt-free snacks available. The high fiber content keeps you full for hours, reducing overall caloric intake.

### 2. Anti-Aging Properties
Makhana contains kaempferol — a natural flavonoid that inhibits inflammation and cellular aging. Studies show it may help prevent age-related diseases including Alzheimer's and certain cancers.

### 3. Kidney & Reproductive Health
In Ayurvedic medicine, makhana is considered a kidney tonic. Modern research confirms it contains compounds that support kidney function and reduce oxidative stress in renal tissue. It's also traditionally used to improve male fertility.

### 4. Blood Sugar Management
The complex carbohydrates in makhana digest slowly, preventing blood sugar spikes. The glycemic index of makhana is significantly lower than rice or wheat — making it suitable for diabetics.

### 5. Heart Health
Makhana is naturally low in sodium and high in potassium — the ideal combination for blood pressure management. The magnesium content supports healthy heart rhythm.

### 6. Bone Strength
Makhana provides calcium and phosphorus in a highly bioavailable form. Regular consumption supports bone density and may help prevent osteoporosis.

## Makhana in Ayurveda

**Vata Dosha:** Makhana is warming and grounding — ideal for Vata types prone to anxiety and dryness.

**Pitta Dosha:** Its cooling properties when prepared with ghee make it suitable for Pitta types.

**Kapha Dosha:** Light and easy to digest, makhana is excellent for Kapha types who need low-fat snacking options.

**Navratri & Fasting:** Makhana is one of the few foods consumed during Hindu fasting periods — a testament to its sattvic, pure nature.

## How to Eat Makhana

**Roasted Makhana:** Dry roast in a pan with a little ghee and salt. Add spices like black pepper, chaat masala, or turmeric for flavor.

**Makhana Kheer:** A traditional dessert made with milk, sugar, and makhana — popular during festivals.

**Makhana Curry:** Used in gravies and curries in North Indian cuisine.

**As a Snack:** Nutriwow's flavored makhana (Tangy Tomato, Peri Peri, Classic Salt) are ready-to-eat and perfect for office snacking.

## Nutriwow Makhana Range

Our makhana is sourced directly from Bihar — India's makhana heartland — where the best quality lotus seeds are grown in clean, natural ponds. We offer:
- **Classic Roasted Makhana** — simple, wholesome
- **Tangy Tomato Makhana** — a flavor explosion
- **Peri Peri Makhana** — for spice lovers
- **Himalayan Salt Makhana** — clean and crispy

All variants are FSSAI certified, preservative-free, and vacuum-sealed for freshness.
    `
  },
  "black-raisins-benefits": {
    slug: "black-raisins-benefits",
    title: "Black Raisins: 8 Reasons to Soak and Eat Them Every Morning",
    excerpt: "Soaked black raisins on an empty stomach is an age-old remedy for iron deficiency, digestion, and glowing skin. Here's the science behind this simple habit.",
    image: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=1200&q=80",
    category: "Berries",
    readTime: "4 min read",
    date: "February 20, 2025",
    author: "Dr. Meena Pillai",
    authorRole: "Integrative Medicine Physician",
    tags: ["raisins", "iron", "digestion", "skin"],
    content: `
## The Morning Ritual That Changes Everything

Across India, grandmothers have been prescribing soaked raisins for generations. "Kali kishmish paani mein bhigo ke khao" — soak black raisins overnight and eat them in the morning. Modern science is now validating this ancient wisdom.

## Why Soak Raisins?

Soaking raisins in water overnight:
1. **Activates enzymes** that improve nutrient absorption
2. **Reduces phytic acid** — an anti-nutrient that blocks iron and zinc absorption
3. **Increases bioavailability** of iron, potassium, and B vitamins
4. **Softens the skin** — making them easier to digest
5. **Creates raisin water** — the soaking water itself is rich in antioxidants

## 8 Reasons to Start This Habit Today

### 1. Iron Deficiency Anemia
Black raisins are one of the richest plant sources of iron — providing 1.9mg per 28g serving. Combined with Vitamin C (eat with citrus or amla), iron absorption increases by 300%. This makes soaked raisins a natural remedy for anemia, especially in women.

### 2. Digestive Health
Raisins contain tartaric acid and dietary fiber that stimulate bowel movement and relieve constipation. The natural sugars (fructose and glucose) feed beneficial gut bacteria, improving the overall microbiome.

### 3. Liver Detoxification
The antioxidants in raisins — particularly resveratrol and catechins — support liver function by neutralizing free radicals and promoting bile production. Traditional Ayurvedic medicine uses raisins specifically for liver cleansing.

### 4. Bone Health
Raisins contain boron — a trace mineral critical for bone formation and calcium absorption. A study in *Environmental Health Perspectives* found that boron deficiency is associated with increased risk of osteoporosis.

### 5. Blood Pressure Control
The potassium in raisins (749mg per 100g) helps counteract the effects of sodium, relaxing blood vessel walls and reducing blood pressure. Regular consumption is associated with lower risk of hypertension.

### 6. Skin Glow & Anti-Aging
Resveratrol in raisins is one of the most potent anti-aging compounds known. It protects skin cells from UV damage, reduces inflammation, and promotes collagen synthesis. Many dermatologists recommend raisins as a dietary supplement for skin health.

### 7. Energy & Athletic Performance
The natural sugars in raisins provide quick, sustained energy — making them an excellent pre-workout snack. Athletes use raisins as a natural alternative to energy gels.

### 8. Reproductive Health
In Ayurveda, raisins are considered a reproductive tonic (Vajikarna). They contain arginine — an amino acid that improves blood flow and supports reproductive function in both men and women.

## How to Do the Soaked Raisin Morning Ritual

1. Take 10-15 black raisins
2. Soak in a glass of clean water overnight (8-10 hours)
3. In the morning, eat the raisins on an empty stomach
4. Drink the soaking water — it's rich in antioxidants
5. Wait 30 minutes before breakfast

**Duration:** Do this for 4 weeks consistently to see noticeable results in energy, digestion, and skin.

## Nutriwow Green Raisins

While black raisins are most commonly used for the morning ritual, Nutriwow's premium green raisins (kishmish) offer similar benefits with a sweeter, more delicate flavor. Sourced from Afghanistan and Iran — the world's finest raisin-producing regions — our raisins are:
- **Naturally sun-dried** without sulfur dioxide
- **Plump and juicy** — not dry or shriveled
- **Available in 500g and 1Kg packs**
- **FSSAI certified** for purity
    `
  },
  "walnuts-brain-food": {
    slug: "walnuts-brain-food",
    title: "Why Walnuts Are Called 'Brain Food' — And the Science Behind It",
    excerpt: "Shaped like a brain and packed with omega-3 fatty acids, walnuts are nature's most powerful brain-boosting food. Learn how many to eat and when.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "February 10, 2025",
    author: "Dr. Rajesh Kumar",
    authorRole: "Neurologist & Brain Health Researcher",
    tags: ["walnuts", "omega-3", "brain health", "DHA"],
    content: `
## Nature's Brain-Shaped Superfood

It's not a coincidence that walnuts look like miniature brains. They are, without question, the most brain-protective food available in nature. The science behind this claim is overwhelming and continues to grow.

## The Omega-3 Connection

The human brain is approximately 60% fat — and the most critical fat for brain function is DHA (docosahexaenoic acid), an omega-3 fatty acid. Walnuts are the only nut with significant amounts of ALA (alpha-linolenic acid) — the plant-based precursor to DHA.

Per 28g serving of walnuts:
- **2.5g ALA** (omega-3) — highest of any nut
- **4g protein**
- **2g fiber**
- **Vitamin E:** 1.3mg
- **Magnesium:** 45mg
- **Copper:** 0.45mg (brain neurotransmitter function)
- **Manganese:** 1mg (antioxidant enzyme activation)

## 7 Ways Walnuts Boost Brain Health

### 1. Memory & Learning
A landmark UCLA study found that adults who regularly consumed walnuts scored significantly higher on cognitive function tests — including memory, concentration, and information processing speed — compared to non-consumers.

### 2. Depression & Anxiety Reduction
Omega-3 fatty acids are critical for serotonin and dopamine production. Multiple clinical trials show that omega-3 supplementation reduces symptoms of depression by 30-50%. Walnuts are one of the most accessible natural sources.

### 3. Alzheimer's Prevention
The polyphenols in walnuts (ellagitannins) reduce oxidative stress and inflammation in the brain — two primary drivers of Alzheimer's disease. Animal studies show walnut consumption reduces amyloid plaque formation by up to 40%.

### 4. Neurogenesis (New Brain Cell Growth)
Walnuts contain compounds that increase BDNF (Brain-Derived Neurotrophic Factor) — a protein that promotes the growth of new neurons and strengthens existing neural connections. Higher BDNF is associated with better mood, learning, and memory.

### 5. Stress Reduction
The combination of omega-3s, magnesium, and polyphenols in walnuts helps regulate the HPA axis (stress response system). Studies show walnut consumption reduces cortisol levels and improves stress resilience.

### 6. Sleep Quality
Walnuts are one of the few foods that naturally contain melatonin — the sleep hormone. Eating a small handful of walnuts in the evening may improve sleep onset and quality.

### 7. Neuroprotection Against Aging
As we age, the brain naturally loses volume and cognitive function. The antioxidants in walnuts — particularly ellagic acid and quercetin — protect neurons from age-related damage and may slow cognitive decline.

## How Many Walnuts Per Day?

**Optimal:** 5-7 whole walnuts (28g) per day
**Maximum:** 10-12 walnuts — beyond this, the caloric load outweighs additional benefits

**Best time:** Morning (with breakfast) or afternoon (as a snack between meals)

**Preparation:** Walnuts can be eaten raw, soaked overnight, or lightly toasted. Avoid heavily salted or flavored varieties that add unnecessary sodium.

## Walnuts vs. Fish Oil for Brain Health

| Source | DHA/EPA | Convenience | Vegan | Cost |
|--------|---------|-------------|-------|------|
| Walnuts (ALA) | Indirect (conversion) | High | Yes | Low |
| Fish Oil | Direct DHA/EPA | Medium | No | Medium |
| Algae Oil | Direct DHA/EPA | Medium | Yes | High |

For vegetarians and vegans, walnuts are the best plant-based source of brain-supporting omega-3s.

## Nutriwow Premium Walnuts

Our walnuts are sourced from Jammu & Kashmir — India's finest walnut-growing region, where the cool Himalayan climate produces exceptionally large, oil-rich kernels. Available in:
- **Whole Walnuts** (in shell) — maximum freshness
- **Walnut Kernels** — ready to eat, no shelling needed
- **Roasted Walnuts** — for enhanced flavor

All products are FSSAI certified and vacuum-sealed to preserve the delicate omega-3 oils.
    `
  },
  "dry-fruits-for-weight-loss": {
    slug: "dry-fruits-for-weight-loss",
    title: "Best Dry Fruits for Weight Loss: A Nutritionist's Guide",
    excerpt: "Contrary to popular belief, dry fruits can actually help with weight management when eaten in the right quantities. Here's which ones to choose and how much.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Healthy Mix",
    readTime: "7 min read",
    date: "January 28, 2025",
    author: "Sunita Agarwal",
    authorRole: "Clinical Nutritionist & Dietitian",
    tags: ["weight loss", "dry fruits", "diet", "nutrition"],
    content: `
## The Dry Fruits & Weight Loss Paradox

"Dry fruits are fattening" — this is one of the most persistent myths in Indian nutrition culture. The truth is more nuanced and, for most people, more encouraging.

Yes, dry fruits are calorie-dense. But calorie density alone doesn't determine weight gain. What matters is:
1. **Satiety** — how full they make you feel
2. **Nutrient density** — how much nutrition per calorie
3. **Effect on metabolism** — how they influence fat burning
4. **Portion control** — how much you actually eat

## The Science of Nuts & Weight Management

A comprehensive meta-analysis of 33 clinical trials published in *Obesity Reviews* found that regular nut consumption was associated with:
- **Lower body weight** in most studies
- **Reduced waist circumference**
- **No significant increase in body fat**

The key mechanism: nuts increase satiety hormones (CCK, GLP-1) and reduce hunger hormones (ghrelin), leading to spontaneous reduction in overall caloric intake.

## Best Dry Fruits for Weight Loss

### 1. Almonds — The #1 Weight Loss Nut
**Why:** Highest protein content among common nuts. The protein + fiber combination creates powerful satiety. Studies show almond snackers consume 200-300 fewer calories at subsequent meals.
**Portion:** 20-25 almonds (28g) as a mid-morning snack

### 2. Pistachios — The Mindful Eating Nut
**Why:** Pistachios in shells slow down eating — the act of shelling each nut forces mindful consumption. Research shows pistachio eaters consume fewer calories than those eating other nuts.
**Portion:** 30-40 pistachios (28g) — the shells act as a visual cue of how much you've eaten

### 3. Walnuts — The Metabolism Booster
**Why:** Omega-3 fatty acids in walnuts activate fat-burning genes and reduce fat storage. They also reduce cortisol (stress hormone) — high cortisol is linked to belly fat accumulation.
**Portion:** 5-7 walnuts (28g) daily

### 4. Dates — The Smart Sweet Substitute
**Why:** When you crave sweets, dates provide natural sugar with fiber, preventing the blood sugar spike-crash cycle that leads to overeating. Two dates satisfy most sweet cravings.
**Portion:** 2-3 dates as a dessert substitute

### 5. Raisins — Pre-Workout Energy
**Why:** The natural sugars in raisins provide quick energy for exercise without causing fat storage (unlike refined sugars). Post-workout, they replenish glycogen stores.
**Portion:** 30g (2 tablespoons) before exercise

### 6. Figs — The Digestive Aid
**Why:** Figs are one of the highest-fiber dry fruits. Fiber slows digestion, increases satiety, and feeds beneficial gut bacteria that regulate metabolism.
**Portion:** 2-3 dried figs daily

## Dry Fruits to Limit During Weight Loss

**Cashews:** Higher in carbs than other nuts — limit to 10-15 per day if actively trying to lose weight.

**Coconut (dried):** Very high in saturated fat — use sparingly.

**Candied/Sugared Dry Fruits:** These are NOT the same as natural dry fruits. Avoid completely.

## The Ideal Weight Loss Dry Fruit Schedule

| Time | Dry Fruit | Amount | Purpose |
|------|-----------|--------|---------|
| Morning (empty stomach) | Soaked almonds | 8-10 | Metabolism boost |
| Mid-morning snack | Mixed nuts | 28g | Satiety |
| Pre-workout | Raisins | 30g | Energy |
| Post-workout | Dates + walnuts | 2 dates + 4 walnuts | Recovery |
| Evening snack | Pistachios | 30-40 | Mindful snacking |

## Common Mistakes That Cause Weight Gain

1. **Eating too many:** Even healthy foods cause weight gain in excess. Stick to 28-30g per serving.
2. **Choosing flavored/salted varieties:** Added salt increases water retention and sodium intake.
3. **Eating as "extra" food:** Replace unhealthy snacks with dry fruits — don't add them on top.
4. **Eating at night:** Dry fruits are best consumed in the morning or afternoon, not before bed.

## Nutriwow's Weight Loss Pack

We offer a curated selection of weight-loss-friendly dry fruits:
- **Premium Almonds** — California whole almonds, ideal for morning ritual
- **Mixed Nuts** — Almonds, cashews, and walnuts in perfect ratio
- **Green Raisins** — Natural, unsulfured, perfect pre-workout snack
- **Omani Dates** — Naturally sweet, fiber-rich dessert alternative

All products are natural, preservative-free, and FSSAI certified. Start your healthy snacking journey today.
    `
  },
  "top-10-health-benefits-of-almonds": {
    slug: "top-10-health-benefits-of-almonds",
    title: "Top 10 Health Benefits of Eating Almonds Daily",
    excerpt: "Discover the top 10 science-backed health benefits of eating almonds daily — from heart health to weight management, find out why badam is India's favourite superfood.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Nuts",
    readTime: "6 min read",
    date: "April 20, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["almonds", "health benefits", "badam", "nutrition", "immunity"],
    content: `
## Introduction
Almonds, known as badam in Hindi, have been a cornerstone of Indian nutrition for centuries. From being soaked overnight and fed to children every morning to being blended into rich badam milk, this humble nut holds a special place in every Indian household. But beyond tradition, modern science has confirmed what our grandmothers always knew — almonds are extraordinarily good for you.

## 1. Packed with Essential Nutrients
A single 28g serving (about 23 almonds) delivers 6g of protein, 3.5g of fibre, 14g of healthy fats, and significant amounts of Vitamin E, magnesium, and manganese. This makes almonds one of the most nutrient-dense snacks available.

## 2. Rich in Antioxidants
Almonds are among the world's best sources of Vitamin E, a powerful fat-soluble antioxidant. Vitamin E protects cell membranes from oxidative damage, which is linked to ageing, inflammation, and chronic diseases like cancer and heart disease.

## 3. Supports Heart Health
Multiple studies have shown that regular almond consumption reduces LDL (bad) cholesterol levels while maintaining HDL (good) cholesterol. The monounsaturated fats, fibre, and antioxidants in almonds work together to protect the cardiovascular system.

## 4. Helps Control Blood Sugar
Almonds are low in carbohydrates but high in healthy fats, protein, and fibre — a combination that makes them ideal for blood sugar management. Research shows that people who eat almonds regularly have lower fasting blood sugar and improved insulin sensitivity.

## 5. Aids in Weight Management
Despite being calorie-dense, almonds are one of the best snacks for weight management. Their high protein and fibre content increases satiety, reducing overall calorie intake throughout the day.

## 6. Strengthens Bones
Almonds are a good source of calcium, magnesium, and phosphorus — three minerals essential for bone health. Regular consumption helps maintain bone density and reduces the risk of osteoporosis.

## 7. Boosts Brain Function
Almonds contain riboflavin (Vitamin B2) and L-carnitine, two nutrients known to boost brain activity and reduce the risk of Alzheimer's disease. This is why soaked almonds have been recommended in Ayurveda for centuries as a brain tonic.

## 8. Improves Skin Health
The Vitamin E and antioxidants in almonds nourish the skin from within, reducing signs of ageing, improving skin tone, and protecting against UV damage.

## 9. Supports Gut Health
Almonds act as a prebiotic, feeding the beneficial bacteria in your gut. A healthy gut microbiome is linked to better digestion, stronger immunity, and improved mental health.

## 10. Reduces Inflammation
The Vitamin E, healthy fats, and polyphenols in almonds have been shown to reduce inflammatory markers in the blood. Including almonds in your daily diet is one of the simplest ways to keep inflammation in check.

## How Many Almonds Should You Eat Daily?
Nutritionists recommend eating 20–25 almonds (approximately 28g) per day. Soaking them overnight makes them easier to digest and increases nutrient absorption.
    `
  },
  "cashews-vs-almonds-which-is-better": {
    slug: "cashews-vs-almonds-which-is-better",
    title: "Cashews vs Almonds: Which Nut is Better for You?",
    excerpt: "Cashews or almonds — which nut should you choose? We compare nutrition, health benefits, calories, and taste to help you decide which is right for your goals.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "April 18, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["cashews", "almonds", "kaju", "badam", "comparison"],
    content: `
## Introduction
Walk into any Indian kitchen and you will find both cashews (kaju) and almonds (badam) in the pantry. Both are beloved, both are nutritious, and both are incredibly versatile. But when it comes to health benefits, which one wins?

## Nutritional Comparison (Per 28g Serving)

| Nutrient | Cashews | Almonds |
|---|---|---|
| Calories | 157 kcal | 164 kcal |
| Protein | 5.2g | 6g |
| Fat | 12.4g | 14g |
| Carbohydrates | 8.6g | 6g |
| Fibre | 0.9g | 3.5g |
| Vitamin E | 0.3mg | 7.3mg |
| Magnesium | 83mg | 76mg |
| Iron | 1.9mg | 1.1mg |

## Where Almonds Win
Almonds are clearly superior when it comes to Vitamin E, fibre, and protein. Their higher fibre content makes them better for digestion and blood sugar control. If weight loss or blood sugar management is your goal, almonds are the better choice.

## Where Cashews Win
Cashews have a higher iron content, making them particularly beneficial for people with anaemia. Cashews also contain more magnesium per gram than almonds, supporting muscle function, sleep quality, and energy production.

## Heart Health
Both nuts are excellent for heart health. Almonds reduce LDL cholesterol more effectively due to their higher fibre and Vitamin E content. Cashews contain oleic acid — the same heart-healthy fat found in olive oil.

## For Weight Loss
Almonds edge ahead here. Their higher protein and fibre content keeps you fuller for longer, reducing overall calorie intake.

## The Verdict
There is no single winner — both cashews and almonds deserve a place in your diet. If you had to choose one for daily snacking, almonds offer a slight nutritional edge. But for cooking, iron intake, and versatility, cashews are unbeatable.
    `
  },
  "pumpkin-seeds-benefits-for-health": {
    slug: "pumpkin-seeds-benefits-for-health",
    title: "7 Proven Benefits of Pumpkin Seeds for Men and Women",
    excerpt: "Pumpkin seeds are tiny but mighty. Discover 7 science-backed health benefits of pumpkin seeds for men and women — from better sleep to improved fertility.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80",
    category: "Seeds",
    readTime: "5 min read",
    date: "April 15, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["pumpkin seeds", "zinc", "magnesium", "men health", "women health"],
    content: `
## Introduction
Pumpkin seeds, also known as pepitas, may be small but they pack an extraordinary nutritional punch. Rich in zinc, magnesium, healthy fats, and antioxidants, they offer specific benefits for both men and women that few other foods can match.

## 1. Exceptional Source of Zinc
Pumpkin seeds are one of the richest plant-based sources of zinc, with a 28g serving providing nearly 20% of the daily recommended intake. Zinc is critical for immune function, wound healing, and DNA synthesis. For men, zinc supports testosterone production and prostate health.

## 2. Improves Sleep Quality
Pumpkin seeds contain tryptophan, an amino acid that the body converts into serotonin and then melatonin — the sleep hormone. They are also rich in magnesium, which has a calming effect on the nervous system.

## 3. Supports Prostate Health in Men
Research has shown that pumpkin seed extract can help reduce symptoms of benign prostatic hyperplasia (BPH). The zinc and phytosterols in pumpkin seeds appear to inhibit the conversion of testosterone to DHT, a hormone linked to prostate enlargement.

## 4. Beneficial for Women's Health
Pumpkin seeds are rich in phytoestrogens that may help balance oestrogen levels. Studies suggest that pumpkin seed oil may help reduce hot flashes and joint pain in postmenopausal women. Their iron content is also valuable for women of reproductive age.

## 5. Heart Health
The magnesium, zinc, fatty acids, and antioxidants in pumpkin seeds all contribute to cardiovascular health. Magnesium helps regulate blood pressure, while antioxidants reduce oxidative stress and inflammation.

## 6. Rich in Antioxidants
Pumpkin seeds contain carotenoids and Vitamin E, both powerful antioxidants that protect cells from free radical damage linked to chronic diseases.

## 7. Supports Bladder Health
Research suggests that pumpkin seed extract may help with overactive bladder and urinary incontinence, significantly reducing urinary frequency and urgency in both men and women.

## How to Eat Pumpkin Seeds
A daily serving of 28–30g is ideal. They make an excellent addition to salads, smoothies, yoghurt, and oatmeal.
    `
  },
  "how-to-eat-dates-for-health-benefits": {
    slug: "how-to-eat-dates-for-health-benefits",
    title: "How to Eat Dates for Maximum Health Benefits",
    excerpt: "Dates are nature's energy bars. Learn the best ways to eat dates, how many to eat daily, and how to maximise their impressive health benefits.",
    image: "https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=1200&q=80",
    category: "Dates",
    readTime: "5 min read",
    date: "April 12, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["dates", "khajur", "Omani dates", "energy", "iron"],
    content: `
## Introduction
Dates (khajur) are one of the oldest cultivated fruits in the world, prized for their natural sweetness, rich flavour, and remarkable nutritional profile. Whether you eat them as a quick energy snack, blend them into smoothies, or use them as a natural sweetener in desserts, dates offer a wealth of health benefits.

## Nutritional Profile of Dates
A serving of 3–4 Medjool or Omani dates (approximately 70g) provides around 190 calories, 5g of fibre, 2g of protein, and significant amounts of potassium, magnesium, copper, and Vitamin B6.

## Best Time to Eat Dates

**Morning:** Eating 2–3 dates on an empty stomach provides an instant energy boost and helps kickstart digestion.

**Pre-Workout:** Dates are an excellent natural pre-workout snack. Their combination of natural sugars provides rapid and sustained energy, making them ideal 30–45 minutes before exercise.

**Before Bed:** A small serving of dates before bed, combined with warm milk, can promote better sleep due to their tryptophan and magnesium content.

## Should You Soak Dates?
Soaking dates in water for 6–8 hours makes them easier to digest and may increase the bioavailability of certain nutrients. Soaked dates are particularly recommended for people with digestive issues.

## How Many Dates Per Day?
For most healthy adults, 3–5 dates per day is an ideal serving. People with diabetes should consult their doctor, though dates can generally be included in a diabetic diet in moderation.

## Health Benefits of Eating Dates Regularly
Dates are one of the best natural sources of iron, making them excellent for preventing anaemia. Their high potassium content supports heart health and blood pressure regulation. Research also suggests that dates may support brain health by reducing inflammatory markers linked to Alzheimer's disease.

## Dates as a Natural Sweetener
Date paste (made by blending soaked dates with water) can substitute sugar in cakes, energy balls, smoothies, and chutneys, providing sweetness along with fibre and nutrients.
    `
  },
  "makhana-for-weight-loss": {
    slug: "makhana-for-weight-loss",
    title: "Makhana for Weight Loss: Does It Really Work?",
    excerpt: "Makhana (fox nuts) is trending as a weight loss superfood. But does the science back it up? We look at the evidence and how to use makhana effectively for weight management.",
    image: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=1200&q=80",
    category: "Makhana",
    readTime: "5 min read",
    date: "April 10, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["makhana", "fox nuts", "weight loss", "low calorie"],
    content: `
## Introduction
Makhana, also known as fox nuts or lotus seeds (phool makhana), has exploded in popularity as a healthy snack in India. But beyond the hype, does makhana actually help with weight loss? The answer is a nuanced yes — and here is why.

## What Makes Makhana Good for Weight Loss?

**Low in Calories:** A 30g serving of makhana contains only around 100–110 calories, compared to 150+ calories for the same amount of potato chips.

**High in Fibre:** Makhana contains dietary fibre which slows digestion, promotes satiety, and reduces overall calorie intake.

**Low Glycaemic Index:** Unlike most snack foods, makhana has a low glycaemic index, meaning it does not cause rapid spikes in blood sugar. Stable blood sugar levels reduce cravings.

**High in Protein:** Makhana contains more protein than most grain-based snacks, which supports muscle maintenance during weight loss.

## Makhana vs Other Popular Snacks

| Snack (30g) | Calories | Protein | Fat |
|---|---|---|---|
| Makhana (plain roasted) | 105 | 3.5g | 0.5g |
| Potato chips | 160 | 2g | 10g |
| Roasted peanuts | 170 | 7g | 14g |
| Digestive biscuits | 140 | 2g | 6g |

## How to Eat Makhana for Weight Loss
Plain roasted makhana with a light sprinkle of rock salt and black pepper is the ideal version. Avoid heavily buttered or cheese-coated varieties. A 30–40g serving as an afternoon snack is practical and satisfying.

## Other Health Benefits of Makhana
Beyond weight loss, makhana is rich in magnesium and potassium, supporting heart health and blood pressure regulation. Its anti-inflammatory properties make it beneficial for arthritis and joint pain.
    `
  },
  "best-dry-fruits-for-diabetics": {
    slug: "best-dry-fruits-for-diabetics",
    title: "Best Dry Fruits for Diabetics: A Complete Guide",
    excerpt: "Can diabetics eat dry fruits? Yes — but the right ones, in the right amounts. This guide covers the best and worst dry fruits for blood sugar management.",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80",
    category: "Healthy Mix",
    readTime: "6 min read",
    date: "April 8, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["dry fruits for diabetics", "diabetes", "blood sugar", "low GI"],
    content: `
## Introduction
Dry fruits are often misunderstood by people with diabetes. Several dry fruits are not only safe for diabetics but can actually support better blood sugar management when consumed in the right amounts.

## Best Dry Fruits for Diabetics

**Almonds (GI: ~0):** Almonds have virtually no impact on blood sugar. Their high fibre, protein, and healthy fat content actually helps slow the absorption of sugar from other foods.

**Walnuts (GI: ~15):** Walnuts are rich in ALA omega-3 fatty acids that improve insulin sensitivity. Regular walnut consumption has been linked to lower fasting blood sugar.

**Cashews (GI: ~25):** Despite being slightly higher in carbohydrates, cashews have a low GI and contain anacardic acid which may improve insulin sensitivity. 10–15 cashews per day is safe for most diabetics.

**Pistachios (GI: ~15):** One of the best nuts for diabetics. Studies show eating pistachios after a carbohydrate-rich meal significantly reduces the glycaemic response.

**Flaxseeds (GI: ~35):** Exceptionally high in soluble fibre which dramatically slows glucose absorption.

## Dry Fruits to Eat in Moderation

**Dates (GI: ~42–55):** Diabetics can typically enjoy 1–2 dates per day, ideally paired with a protein source like nuts.

**Raisins (GI: ~64):** Should be consumed in small quantities (10–15 raisins) by diabetics. Pairing with nuts helps reduce glycaemic impact.

## Dry Fruits to Avoid
Sweetened or sugar-coated dry fruits should be avoided entirely by diabetics.

## Practical Tips
Always pair dry fruits with a protein source. Stick to unsweetened varieties. Keep portion sizes to 28–30g per serving.
    `
  },
  "pistachios-benefits-why-eat-pista-daily": {
    slug: "pistachios-benefits-why-eat-pista-daily",
    title: "Pistachios Benefits: Why You Should Eat Pista Every Day",
    excerpt: "Pistachios are one of the most nutritious nuts you can eat. Discover the top health benefits of pista and why adding them to your daily diet is one of the best decisions you can make.",
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=1200&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "April 5, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["pistachios", "pista", "heart health", "antioxidants"],
    content: `
## Introduction
Pistachios — or pista as they are affectionately called in India — are among the most beloved and nutritious nuts in the world. With their distinctive green colour, satisfying crunch, and rich flavour, pistachios are as delicious as they are healthy.

## Nutritional Profile (Per 28g / ~49 kernels)
Pistachios provide 159 calories, 6g of protein, 8g of carbohydrates, 3g of fibre, and 13g of fat (mostly monounsaturated and polyunsaturated). They are one of the highest-protein nuts available.

## 1. Exceptional Antioxidant Content
Pistachios contain more antioxidants than most nuts. They are particularly rich in lutein and zeaxanthin, two carotenoids that protect eye health and reduce the risk of age-related macular degeneration.

## 2. Heart Health Champion
Regular consumption has been shown to reduce LDL cholesterol, lower blood pressure, and improve the ratio of LDL to HDL cholesterol.

## 3. Weight Management
Despite being calorie-dense, pistachios are one of the best nuts for weight management. Their high protein and fibre content promotes satiety. Studies show people who snack on pistachios have lower BMI.

## 4. Blood Sugar Control
Pistachios have a low glycaemic index and have been shown to reduce post-meal blood sugar spikes when eaten alongside carbohydrate-rich foods.

## 5. Gut Health
The fibre in pistachios acts as a prebiotic, feeding beneficial gut bacteria. A healthy gut microbiome is linked to better immunity and improved mood.

## 6. Eye Health
The lutein and zeaxanthin in pistachios accumulate in the retina and protect against blue light damage and oxidative stress.

## 7. Muscle Recovery
With 6g of protein per serving and a good amino acid profile, pistachios are an excellent post-workout snack.

## How Many Pistachios Per Day?
A daily serving of 28–30g (approximately 49 kernels) provides meaningful health benefits without excessive calorie intake.
    `
  },
  "raisins-kishmish-health-benefits": {
    slug: "raisins-kishmish-health-benefits",
    title: "Raisins (Kishmish) Benefits: 8 Reasons to Eat Them Daily",
    excerpt: "Raisins (kishmish) are more than just a sweet snack. Packed with iron, antioxidants, and natural energy, here are 8 compelling reasons to eat raisins every day.",
    image: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=1200&q=80",
    category: "Berries",
    readTime: "5 min read",
    date: "April 3, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["raisins", "kishmish", "iron", "energy", "digestion"],
    content: `
## Introduction
Raisins, known as kishmish in Hindi, are dried grapes that have been consumed for thousands of years across cultures. Small, sweet, and incredibly versatile, raisins are a staple in Indian cooking — from biryani and kheer to trail mixes and energy bars.

## 1. Natural Energy Booster
Raisins are rich in natural sugars — glucose and fructose — that provide quick, sustained energy. This makes them an ideal snack before or during physical activity.

## 2. Excellent Source of Iron
Raisins are one of the best plant-based sources of iron, making them particularly valuable for vegetarians and women who are at higher risk of iron deficiency anaemia.

## 3. Supports Digestive Health
The fibre in raisins acts as a natural laxative, promoting regular bowel movements and preventing constipation. Raisins also contain tartaric acid with anti-inflammatory properties.

## 4. Bone Health
Raisins are a good source of calcium and boron, two nutrients essential for bone health. Regular raisin consumption has been associated with better bone density in older adults.

## 5. Dental Health
Raisins contain oleanolic acid, a phytochemical that inhibits the growth of bacteria responsible for cavities and gum disease.

## 6. Heart Health
The potassium in raisins helps regulate blood pressure. Their fibre content reduces LDL cholesterol, and their polyphenol antioxidants protect the cardiovascular system.

## 7. Antioxidant Protection
Raisins are rich in polyphenols, including resveratrol — the same antioxidant found in red wine linked to longevity and cardiovascular protection.

## 8. Supports Eye Health
The polyphenolic phytonutrients in raisins protect the eyes from free radical damage that can lead to cataracts and macular degeneration.

## How to Eat Raisins for Maximum Benefit
Soaking raisins overnight in water and eating them on an empty stomach in the morning is a traditional Ayurvedic practice believed to enhance their nutritional benefits.
    `
  },
  "dry-fruits-during-pregnancy": {
    slug: "dry-fruits-during-pregnancy",
    title: "Dry Fruits During Pregnancy: What to Eat and What to Avoid",
    excerpt: "Dry fruits are nutrient-dense foods that can significantly benefit pregnant women. But not all dry fruits are safe in large quantities. Here is a complete guide for expecting mothers.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
    category: "Healthy Mix",
    readTime: "6 min read",
    date: "April 1, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["pregnancy", "dry fruits", "prenatal nutrition", "iron", "folate"],
    content: `
## Introduction
Pregnancy is a time when nutritional needs increase dramatically. Dry fruits, with their concentrated nutrients and natural energy, can be a valuable addition to a pregnancy diet.

## Best Dry Fruits to Eat During Pregnancy

**Almonds:** Rich in folate, Vitamin E, calcium, and protein. Folate is critical in the first trimester for preventing neural tube defects. A daily serving of 10–15 almonds is ideal.

**Walnuts:** The only nut with significant ALA omega-3 fatty acids, essential for the baby's brain and eye development. Eating 4–5 walnuts daily supports neurological development.

**Dates:** Research found that women who ate dates in the last four weeks of pregnancy had significantly better cervical dilation and were less likely to require induced labour. Dates are also rich in iron and potassium.

**Raisins:** High in iron and natural sugars, raisins help prevent anaemia and provide quick energy. Their fibre content also helps with constipation.

**Cashews:** Rich in iron, zinc, and magnesium — all critical nutrients during pregnancy.

**Figs (Anjeer):** An excellent source of calcium, iron, and fibre. They support bone development in the baby.

## Dry Fruits to Limit or Avoid

**Papaya (dried):** Contains latex which can trigger uterine contractions. Should be avoided during pregnancy.

**Pineapple (dried):** Contains bromelain which in large amounts may soften the cervix. Occasional small amounts are likely safe.

## Practical Tips
Always choose unsweetened, unsulphured dry fruits. Keep total daily intake to 30–50g of mixed dry fruits. Consult your gynaecologist if you have specific concerns.
    `
  },
  "how-to-store-dry-fruits-fresh": {
    slug: "how-to-store-dry-fruits-fresh",
    title: "How to Store Dry Fruits to Keep Them Fresh for Months",
    excerpt: "Proper storage is the key to keeping dry fruits fresh, flavourful, and nutritious for months. Follow these simple tips to maximise the shelf life of your nuts, seeds, and dried fruits.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    category: "Tips",
    readTime: "4 min read",
    date: "March 28, 2025",
    author: "Nutriwow Nutrition Team",
    authorRole: "Certified Nutritionists",
    tags: ["storage tips", "dry fruits", "freshness", "shelf life"],
    content: `
## Introduction
You have invested in premium quality dry fruits — now the question is how to keep them fresh and nutritious for as long as possible. Improper storage is one of the most common reasons dry fruits go stale or lose their nutritional value.

## Why Proper Storage Matters
Dry fruits are susceptible to three main enemies: moisture, heat, and light. Moisture causes mould growth. Heat accelerates oxidation of healthy fats, causing rancidity. Light degrades vitamins and antioxidants.

## General Storage Principles

**Use Airtight Containers:** Transfer dry fruits to airtight glass or food-grade plastic containers immediately after opening. Mason jars with rubber-sealed lids are ideal.

**Store in a Cool, Dark Place:** A kitchen cupboard away from the stove is a good option. The ideal storage temperature is between 10–20°C.

**Refrigeration for Longer Storage:** Nuts with high fat content — particularly walnuts and pecans — benefit from refrigeration, extending shelf life from 3 months to 6–12 months.

**Freezing for Maximum Longevity:** Almost all dry fruits can be frozen for up to 12–24 months without significant loss of quality.

## Storage Guide by Type

| Dry Fruit | Room Temperature | Refrigerated | Frozen |
|---|---|---|---|
| Almonds | 6 months | 12 months | 24 months |
| Cashews | 3 months | 6 months | 12 months |
| Walnuts | 2–3 months | 6 months | 12 months |
| Raisins | 6 months | 12 months | 18 months |
| Dates | 3 months | 12 months | 24 months |
| Makhana | 3 months | 6 months | 12 months |
| Pumpkin Seeds | 2–3 months | 6 months | 12 months |

## Signs That Dry Fruits Have Gone Bad
Rancid nuts have a bitter, paint-like smell. Mouldy dry fruits show visible spots and should be discarded. When in doubt, trust your nose — fresh dry fruits have a pleasant, nutty aroma.

## Tips for Buying and Storing
Buy in quantities you will use within the recommended timeframe. Label containers with the purchase date. If buying in bulk, freeze what you will not use within a month.
    `
  }
};

const CATEGORY_COLORS: Record<string, string> = {
  "Nuts": "bg-clay-butter text-clay-brown",
  "Snacks": "bg-clay-green text-nutrigreen",
  "Berries": "bg-clay-pink text-clay-brown",
  "Healthy Mix": "bg-clay-peach text-clay-brown",
  "Seeds": "bg-clay-green text-nutrigreen",
  "Dates": "bg-clay-peach text-clay-brown",
  "Makhana": "bg-clay-butter text-clay-brown",
  "Tips": "bg-clay-pink text-clay-brown",
};

function renderContent(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4">
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("| ")) {
      // Table
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("| ")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(row => row.split("|").filter(c => c.trim()).map(c => c.trim()));
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-clay-butter">
                {headers.map((h, hi) => (
                  <th key={hi} className="border border-transparent px-4 py-2 text-left font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-card" : "bg-muted/50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-200 px-4 py-2 text-muted-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.startsWith("- **")) {
      // Bold list item
      const text = line.replace("- **", "").replace("**", "");
      const [bold, ...rest] = text.split(":**");
      elements.push(
        <li key={i} className="text-muted-foreground text-sm leading-relaxed mb-1">
          <strong className="text-foreground">{bold}:</strong>{rest.join(":")}
        </li>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="text-muted-foreground text-sm leading-relaxed mb-1">
          {line.replace("- ", "")}
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={i} className="text-muted-foreground text-sm leading-relaxed mb-1 list-decimal ml-4">
          {line.replace(/^\d+\. /, "")}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      // Regular paragraph — handle **bold** inline
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={i} className="text-muted-foreground text-sm leading-relaxed mb-3">
          {parts.map((part, pi) =>
            pi % 2 === 1 ? <strong key={pi} className="text-foreground font-semibold">{part}</strong> : part
          )}
        </p>
      );
    }
    i++;
  }

  return elements;
}

// Separate component so tRPC hook runs at component level (not inside IIFE)
function RelatedProductsSection({ relatedCat }: { relatedCat: string }) {
  const { data: relatedDbProducts = [] } = trpc.products.byCategory.useQuery(
    { category: relatedCat, limit: 4 },
    { enabled: !!relatedCat }
  );
  const relatedProducts = relatedDbProducts.map(dbProductToFrontend);
  if (relatedProducts.length === 0) return null;
  return (
    <div className="mb-8 pt-8 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag size={18} className="text-nutrigreen" />
        <h3 className="text-lg font-bold text-foreground">Shop Related Products</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {relatedProducts.map(p => (
          <Link key={p.id} href={`/products/${p.handle}`}
            className="group bg-card rounded-2xl shadow-clay-sm p-3 hover:-translate-y-1 hover:shadow-clay-lg hover:border-nutrigreen transition-all">
            <img src={optImg(p.image, 384)} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-2" loading="lazy" />
            <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-nutrigreen transition-colors">{p.name}</p>
            <p className="text-xs text-nutrigreen font-bold mt-1">₹{p.price}</p>
          </Link>
        ))}
      </div>
      <Link href={`/collections/${encodeURIComponent(relatedCat)}`}
        className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-nutrigreen hover:underline">
        View all {relatedCat} →
      </Link>
    </div>
  );
}

export default function BlogPost() {
  const [, params] = useRoute("/blogs/news/:slug");
  const slug = params?.slug || "";

  // Try DB first, fall back to static
  const { data: dbPost, isLoading } = trpc.blog.getBySlug.useQuery({ slug }, { enabled: !!slug });

  // Normalize post from DB or static
  const staticPost = BLOG_POSTS[slug];
  const post = (() => {
    if (dbPost) {
      return {
        slug: dbPost.slug,
        title: dbPost.title,
        excerpt: dbPost.excerpt || "",
        image: dbPost.coverImage || BLOG_FALLBACK_IMAGE,
        category: dbPost.category || "Health",
        readTime: "5 min read",
        date: dbPost.publishedAt ? new Date(dbPost.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "",
        author: dbPost.author || "Nutriwow Team",
        authorRole: "Nutrition Expert",
        tags: dbPost.tags ? dbPost.tags.split(",").map((t: string) => t.trim()) : [],
        content: dbPost.content || "",
        isHtml: true, // DB content is HTML
      };
    }
    if (staticPost) return { ...staticPost, isHtml: false };
    return null;
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background" >
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <Loader2 size={20} className="animate-spin" />
            Loading article...
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-background" >
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
            <Link href="/blog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold  transition-colors">
              <ArrowLeft size={16} /> Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = encodeURIComponent(post.title);

  // Related products from DB by category
  const relatedCat = BLOG_TO_PRODUCT_CATEGORY[post.category] || "Nuts";

  return (
    <div className="min-h-screen flex flex-col bg-background" >
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image}
        url={`/blogs/news/${post.slug}`}
        type="article"
        keywords={post.tags.join(", ") + ", dry fruits, healthy snacks, nutriwow"}
        jsonLd={[
          buildArticleJsonLd({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            coverImage: post.image,
            createdAt: post.date,
            author: post.author,
          }),
          buildBreadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blogs/news/${post.slug}` },
          ]),
        ]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-foreground font-medium line-clamp-1">{post.title}</span>
          </div>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-muted-foreground"}`}>
                {post.category}
              </span>
              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <Clock size={12} /> {post.readTime}
              </span>
              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <Calendar size={12} /> {post.date}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
              {post.title}
            </h1>

            <p className="text-muted-foreground text-base leading-relaxed mb-6">{post.excerpt}</p>

            {/* Author */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-clay-peach flex items-center justify-center text-clay-brown font-bold text-sm">
                  {post.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.authorRole}</p>
                </div>
              </div>

              {/* Share buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70 flex items-center gap-1"><Share2 size={12} /> Share:</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Facebook size={14} />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors"
                >
                  <Twitter size={14} />
                </a>
                <a
                  href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors text-xs font-bold"
                >
                  W
                </a>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="rounded-2xl overflow-hidden mb-8 shadow-md">
            <img
              src={optImg(post.image, 1080)}
              alt={post.title}
              className="w-full h-64 sm:h-80 object-cover"
            />
          </div>

          {/* Article Content */}
          <div className="bg-card rounded-3xl p-6 sm:p-10 shadow-clay mb-8">
            {post.isHtml ? (
              <div
                className="prose prose-sm max-w-none text-foreground [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-4 [&_li]:mb-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
              />
            ) : (
              <ul className="list-disc ml-4 space-y-0.5">
                {renderContent(post.content)}
              </ul>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-clay-butter text-clay-brown border border-transparent px-3 py-1 rounded-full">
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>

          {/* Related Products — Internal Linking for SEO (DB-backed) */}
          <RelatedProductsSection relatedCat={relatedCat} />

          {/* Back to Blog */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link href="/blog" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline transition-colors">
              <ArrowLeft size={16} /> Back to All Articles
            </Link>
            <Link href="/collections/Nuts" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
              Shop Premium Dry Fruits →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
