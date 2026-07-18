/**
 * One-time seed script: inserts all 16 static blog posts into the DB as published.
 * Run: node seed-blogs.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const now = new Date();

const blogs = [
  {
    slug: "benefits-of-almonds",
    title: "10 Incredible Health Benefits of Almonds You Should Know",
    excerpt: "Almonds are a powerhouse of nutrients — from heart health to weight management. Discover why adding a handful of almonds to your daily diet can transform your health.",
    coverImage: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Nuts",
    author: "Priya Sharma",
    tags: "almonds,health,nuts,nutrition",
    seoTitle: "10 Health Benefits of Almonds | Nutriwow",
    seoDescription: "Almonds are a powerhouse of nutrients. Discover 10 incredible health benefits of almonds and why you should eat them daily.",
    content: `<h2>Why Almonds Are One of the Healthiest Foods on Earth</h2>
<p>Almonds (<em>Prunus dulcis</em>) are among the world's most popular tree nuts. They are highly nutritious and rich in healthy fats, antioxidants, vitamins and minerals.</p>
<h2>1. Almonds Deliver a Massive Amount of Nutrients</h2>
<p>A 28-gram (1 oz) serving of almonds contains: Fibre: 3.5 grams, Protein: 6 grams, Fat: 14 grams (9 of which are monounsaturated), Vitamin E: 37% of the RDI, Manganese: 32% of the RDI, Magnesium: 20% of the RDI.</p>
<h2>2. Almonds Are Loaded With Antioxidants</h2>
<p>Almonds are a fantastic source of antioxidants. Antioxidants help protect against oxidative stress, which can damage molecules in your cells and contribute to inflammation, ageing and diseases like cancer.</p>
<h2>3. Almonds Are High in Vitamin E</h2>
<p>Vitamin E is a family of fat-soluble antioxidants. These antioxidants tend to build up in cell membranes in your body, protecting your cells from oxidative damage.</p>
<h2>4. Almonds Can Assist With Blood Sugar Control</h2>
<p>Nuts are low in carbs but high in healthy fats, protein and fibre. This makes them a perfect choice for people with diabetes.</p>
<h2>5. Magnesium Also Benefits Blood Pressure Levels</h2>
<p>The magnesium in almonds may additionally help lower blood pressure levels. High blood pressure is one of the leading drivers of heart attacks, strokes and kidney failure.</p>
<h2>6. Almonds Can Lower Cholesterol Levels</h2>
<p>High levels of LDL lipoproteins in your blood — also known as "bad" cholesterol — is a well-known risk factor for heart disease. Your diet can have major effects on LDL levels.</p>
<h2>7. Almonds Prevent Harmful Oxidation of LDL Cholesterol</h2>
<p>Almonds do more than just lower LDL levels in your blood. They also protect LDL from oxidation, which is a crucial step in the heart disease process.</p>
<h2>8. Eating Almonds Reduces Hunger, Lowering Your Overall Calorie Intake</h2>
<p>Almonds are low in carbs and high in protein and fibre. Both protein and fibre are known to increase feelings of fullness. This can help you eat fewer calories.</p>
<h2>9. Almonds May Be Effective For Weight Loss</h2>
<p>Nuts contain several nutrients that your body struggles to break down and digest. Your body does not absorb about 10–15% of the calories in nuts.</p>
<h2>10. Almonds Are Incredibly Good For Your Brain</h2>
<p>Almonds contain nutrients that help in the development of the brain. They are considered an important food item for growing children. Mothers are often told to give soaked almonds to their children daily.</p>
<h2>How to Buy Almonds from Nutriwow</h2>
<p>Shop premium quality <a href="/products/1">Nutriwow Almonds</a> — sourced directly from the finest farms, delivered fresh to your door.</p>`
  },
  {
    slug: "cashews-for-heart-health",
    title: "Cashews and Heart Health: What the Science Says",
    excerpt: "Rich in monounsaturated fats and magnesium, cashews are one of the best nuts for cardiovascular health. Here's everything you need to know.",
    coverImage: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    author: "Dr. Ankit Verma",
    tags: "cashews,heart health,nuts,cholesterol",
    seoTitle: "Cashews and Heart Health | Nutriwow",
    seoDescription: "Rich in monounsaturated fats and magnesium, cashews are one of the best nuts for cardiovascular health.",
    content: `<h2>Cashews: A Heart-Healthy Nut</h2>
<p>Cashews are kidney-shaped seeds sourced from the cashew tree — a tropical tree native to Brazil but now cultivated in various warm climates across the world.</p>
<h2>Nutritional Profile of Cashews</h2>
<p>A 28-gram (1 oz) serving of raw cashews contains: Calories: 157, Protein: 5 grams, Fat: 12 grams, Carbs: 9 grams, Fibre: 1 gram, Copper: 67% of the Daily Value (DV), Magnesium: 20% of the DV, Manganese: 20% of the DV.</p>
<h2>Cashews May Improve Heart Health</h2>
<p>Diets rich in nuts, including cashews, have been consistently linked to a lower risk of disease, such as stroke and heart disease. Several studies show that eating cashews regularly may reduce blood pressure and triglyceride levels.</p>
<h2>They May Help You Lose Weight</h2>
<p>Nuts are rich in calories and fat. Hence, people wishing to lose weight have traditionally been advised to limit their nut intake. However, research is beginning to suggest that eating nuts, including cashews, may be beneficial for weight loss.</p>
<h2>Cashews May Help Manage Type 2 Diabetes</h2>
<p>People with type 2 diabetes may benefit from adding cashews to their diet. That's in part because cashews are a good source of fibre, a nutrient that helps prevent blood sugar spikes and which is believed to offer protection against type 2 diabetes.</p>
<h2>Shop Premium Cashews</h2>
<p>Try <a href="/products/2">Nutriwow Premium Cashews</a> — W240 grade, handpicked for quality and freshness.</p>`
  },
  {
    slug: "makhana-superfood",
    title: "Makhana: The Ancient Indian Superfood Making a Modern Comeback",
    excerpt: "Fox nuts or makhana have been used in Ayurveda for centuries. Low in calories, high in protein — find out why nutritionists are calling it the snack of the future.",
    coverImage: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=1200&q=80",
    category: "Snacks",
    author: "Kavita Iyer",
    tags: "makhana,fox nuts,superfood,ayurveda",
    seoTitle: "Makhana: Ancient Indian Superfood | Nutriwow",
    seoDescription: "Makhana (fox nuts) have been used in Ayurveda for centuries. Low in calories, high in protein — the snack of the future.",
    content: `<h2>What is Makhana?</h2>
<p>Makhana, also known as fox nuts or lotus seeds, is a type of seed derived from the Euryale ferox plant. It is widely cultivated throughout Asia and often used in traditional forms of medicine and cooking.</p>
<h2>Rich in Nutrients</h2>
<p>Makhana is a great source of several important nutrients. A 100-gram serving contains: Calories: 347, Protein: 9.7 grams, Fat: 0.1 grams, Carbs: 76.9 grams, Fibre: 14.5 grams, Calcium: 60 mg, Iron: 1.4 mg.</p>
<h2>High in Antioxidants</h2>
<p>Makhana is rich in antioxidants, which are compounds that help neutralise harmful free radicals and prevent oxidative stress. Antioxidants play a central role in overall health and may protect against chronic conditions like heart disease, cancer, and type 2 diabetes.</p>
<h2>May Help Stabilise Blood Sugar</h2>
<p>Some research suggests that makhana may help support better blood sugar management. One animal study found that specific compounds found in makhana seeds helped improve several markers of diabetes in rats.</p>
<h2>May Support Weight Loss</h2>
<p>Makhana is low in calories but high in protein and fibre, both of which may be beneficial for weight loss. Protein, in particular, has been shown to reduce levels of ghrelin, the hormone responsible for stimulating feelings of hunger.</p>
<h2>Shop Makhana at Nutriwow</h2>
<p>Try <a href="/collections/Makhana">Nutriwow Makhana</a> — roasted, lightly salted, and packed fresh for maximum crunch.</p>`
  },
  {
    slug: "black-raisins-benefits",
    title: "Black Raisins: 8 Reasons to Soak and Eat Them Every Morning",
    excerpt: "Soaked black raisins on an empty stomach is an age-old remedy for iron deficiency, digestion, and glowing skin. Here's the science behind this simple habit.",
    coverImage: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=1200&q=80",
    category: "Berries",
    author: "Dr. Meena Pillai",
    tags: "raisins,black raisins,iron,digestion",
    seoTitle: "Black Raisins Benefits: 8 Reasons to Eat Daily | Nutriwow",
    seoDescription: "Soaked black raisins on an empty stomach is an age-old remedy for iron deficiency, digestion, and glowing skin.",
    content: `<h2>Why Black Raisins Are a Morning Superfood</h2>
<p>Black raisins are dried black grapes. They are packed with natural sugars, fibre, and a host of vitamins and minerals that make them one of the most nutritious dried fruits available.</p>
<h2>1. Rich in Iron</h2>
<p>Black raisins are one of the best plant-based sources of iron. Regular consumption can help prevent and treat iron-deficiency anaemia, especially in women and children.</p>
<h2>2. Excellent for Digestion</h2>
<p>The fibre in black raisins acts as a natural laxative, helping to relieve constipation and promote healthy bowel movements. Soaking them overnight makes them even easier to digest.</p>
<h2>3. Boosts Energy Instantly</h2>
<p>Black raisins are rich in natural sugars — fructose and glucose — that provide an immediate energy boost without the crash associated with refined sugars.</p>
<h2>4. Good for Bone Health</h2>
<p>Black raisins contain calcium and boron, both of which are essential for strong bones. Regular consumption may help prevent osteoporosis.</p>
<h2>5. Promotes Glowing Skin</h2>
<p>The antioxidants in black raisins fight free radicals that cause premature ageing. They also help purify the blood, which reflects in clearer, more radiant skin.</p>
<h2>6. Supports Heart Health</h2>
<p>The potassium and magnesium in black raisins help lower blood pressure and reduce the risk of cardiovascular disease.</p>
<h2>7. Helps Control Blood Sugar</h2>
<p>Despite being sweet, black raisins have a low to medium glycaemic index. The fibre slows sugar absorption, making them a safer sweet option for diabetics in moderation.</p>
<h2>8. Strengthens Immunity</h2>
<p>Black raisins are rich in Vitamin C and antioxidants that help strengthen the immune system and protect against infections.</p>
<h2>Shop Black Raisins</h2>
<p>Buy premium <a href="/collections/Berries">Nutriwow Black Raisins</a> — plump, juicy, and naturally sweet.</p>`
  },
  {
    slug: "walnuts-brain-food",
    title: "Why Walnuts Are Called 'Brain Food' — And the Science Behind It",
    excerpt: "Shaped like a brain and packed with omega-3 fatty acids, walnuts are nature's most powerful brain-boosting food. Learn how many to eat and when.",
    coverImage: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    author: "Dr. Rajesh Kumar",
    tags: "walnuts,brain food,omega-3,memory",
    seoTitle: "Walnuts: The Ultimate Brain Food | Nutriwow",
    seoDescription: "Shaped like a brain and packed with omega-3 fatty acids, walnuts are nature's most powerful brain-boosting food.",
    content: `<h2>Walnuts and Brain Health</h2>
<p>It's no coincidence that walnuts look like tiny brains. These wrinkled nuts are packed with nutrients that are specifically beneficial for brain health and cognitive function.</p>
<h2>Rich in Omega-3 Fatty Acids</h2>
<p>Walnuts are the only nut that contains significant amounts of alpha-linolenic acid (ALA), a plant-based omega-3 fatty acid. Omega-3s are essential for brain function and have been linked to improved memory and reduced risk of cognitive decline.</p>
<h2>High in Antioxidants</h2>
<p>Walnuts have higher antioxidant activity than any other common nut. This activity comes from vitamin E, melatonin, and plant compounds called polyphenols, which are particularly high in the papery skin of walnuts.</p>
<h2>May Reduce Inflammation</h2>
<p>Chronic inflammation is at the root of many diseases, including heart disease, type 2 diabetes, Alzheimer's disease, and cancer. Walnuts contain several nutrients that help fight this inflammation.</p>
<h2>Supports a Healthy Gut</h2>
<p>Eating walnuts may be one way to support the health of your microbiome and your gut. Research suggests that eating walnuts increases the bacteria that produce butyrate, a fat that nourishes your gut and promotes gut health.</p>
<h2>How Many Walnuts Should You Eat Daily?</h2>
<p>Most research suggests that eating 1–2 ounces (28–56 grams) of walnuts per day — about 7–14 whole walnuts — is optimal for health benefits.</p>
<h2>Shop Walnuts at Nutriwow</h2>
<p>Get premium <a href="/collections/Nuts">Nutriwow Walnuts</a> — California-grade, rich in omega-3, delivered fresh.</p>`
  },
  {
    slug: "dry-fruits-for-weight-loss",
    title: "Best Dry Fruits for Weight Loss: A Nutritionist's Guide",
    excerpt: "Contrary to popular belief, dry fruits can actually help with weight management when eaten in the right quantities. Here's which ones to choose and how much.",
    coverImage: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Healthy Mix",
    author: "Sunita Agarwal",
    tags: "weight loss,dry fruits,diet,nutrition",
    seoTitle: "Best Dry Fruits for Weight Loss | Nutriwow",
    seoDescription: "Dry fruits can help with weight management when eaten right. A nutritionist's guide to the best dry fruits for weight loss.",
    content: `<h2>Can Dry Fruits Help You Lose Weight?</h2>
<p>Many people avoid dry fruits when trying to lose weight because they are calorie-dense. But research suggests that eating the right dry fruits in the right amounts can actually support weight loss.</p>
<h2>1. Almonds — The Best Weight Loss Nut</h2>
<p>Almonds are high in protein and fibre, which keep you full for longer. Studies show that people who eat almonds as a snack consume fewer calories at their next meal.</p>
<h2>2. Walnuts — Curb Cravings Naturally</h2>
<p>Walnuts activate the region of the brain associated with impulse control and food cravings. Eating a handful of walnuts can help you make better food choices throughout the day.</p>
<h2>3. Pistachios — The Lowest Calorie Nut</h2>
<p>Pistachios have fewer calories per serving than most other nuts. Their shells also slow down eating, helping you consume less overall.</p>
<h2>4. Dates — A Healthy Sweet Substitute</h2>
<p>Dates are naturally sweet and can replace refined sugar in your diet. They are high in fibre, which slows digestion and prevents blood sugar spikes.</p>
<h2>5. Raisins — Natural Energy Without the Crash</h2>
<p>Raisins provide quick energy from natural sugars without the crash of refined sugar. They are also high in fibre, which supports digestive health.</p>
<h2>How Much Should You Eat?</h2>
<p>A handful (about 30 grams) of mixed dry fruits per day is the recommended amount for weight management. Avoid salted or sugar-coated varieties.</p>
<h2>Shop Healthy Mix at Nutriwow</h2>
<p>Try our <a href="/collections/Healthy Mix">Nutriwow Healthy Mix</a> — a perfectly balanced blend of nuts and dried fruits for weight management.</p>`
  },
  {
    slug: "top-10-health-benefits-of-almonds",
    title: "Top 10 Health Benefits of Eating Almonds Daily",
    excerpt: "Discover the top 10 science-backed health benefits of eating almonds daily — from heart health to weight management, find out why badam is India's favourite superfood.",
    coverImage: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80",
    category: "Nuts",
    author: "Nutriwow Nutrition Team",
    tags: "almonds,badam,health benefits,daily diet",
    seoTitle: "Top 10 Health Benefits of Almonds Daily | Nutriwow",
    seoDescription: "Discover the top 10 science-backed health benefits of eating almonds daily — heart health, weight management and more.",
    content: `<h2>Why You Should Eat Almonds Every Day</h2>
<p>Almonds (badam) are one of the most nutritious foods you can eat. Just a small handful provides an impressive amount of nutrients that support nearly every system in your body.</p>
<h2>1. Supports Heart Health</h2><p>Almonds are rich in monounsaturated fats, the same type found in olive oil, which are associated with reduced levels of LDL (bad) cholesterol and a lower risk of heart disease.</p>
<h2>2. Aids Weight Management</h2><p>Despite being calorie-dense, almonds are highly satiating. The combination of protein, fat, and fibre helps you feel full longer, reducing overall calorie intake.</p>
<h2>3. Regulates Blood Sugar</h2><p>Almonds have a low glycaemic index and are rich in magnesium, a mineral that plays a crucial role in blood sugar regulation.</p>
<h2>4. Strengthens Bones</h2><p>Almonds are a good source of calcium and phosphorus, both essential for strong, healthy bones.</p>
<h2>5. Boosts Brain Function</h2><p>Almonds contain riboflavin and L-carnitine, nutrients known to boost brain activity and may help prevent cognitive decline.</p>
<h2>6. Improves Skin Health</h2><p>The Vitamin E in almonds is a powerful antioxidant that protects skin cells from UV damage and keeps skin moisturised and youthful.</p>
<h2>7. Reduces Inflammation</h2><p>The antioxidants in almonds, particularly in the skin, help fight inflammation throughout the body.</p>
<h2>8. Supports Gut Health</h2><p>Almonds act as a prebiotic, feeding the beneficial bacteria in your gut and supporting a healthy microbiome.</p>
<h2>9. Lowers Blood Pressure</h2><p>The magnesium in almonds helps relax blood vessels, which can lower blood pressure in people with hypertension.</p>
<h2>10. Provides Sustained Energy</h2><p>The combination of healthy fats, protein, and fibre in almonds provides slow-releasing energy that keeps you going throughout the day.</p>
<h2>Shop Almonds at Nutriwow</h2>
<p>Get the freshest <a href="/products/1">Nutriwow Almonds</a> delivered to your door.</p>`
  },
  {
    slug: "cashews-vs-almonds-which-is-better",
    title: "Cashews vs Almonds: Which Nut is Better for You?",
    excerpt: "Cashews or almonds — which nut should you choose? We compare nutrition, health benefits, calories, and taste to help you decide which is right for your goals.",
    coverImage: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&q=80",
    category: "Nuts",
    author: "Nutriwow Nutrition Team",
    tags: "cashews,almonds,comparison,nutrition",
    seoTitle: "Cashews vs Almonds: Which is Better? | Nutriwow",
    seoDescription: "Cashews or almonds — we compare nutrition, health benefits, calories, and taste to help you decide.",
    content: `<h2>The Great Nut Debate: Cashews vs Almonds</h2>
<p>Both cashews and almonds are popular, nutritious nuts — but they have different nutritional profiles and health benefits. Here's a detailed comparison to help you choose.</p>
<h2>Nutritional Comparison (per 28g serving)</h2>
<p><strong>Almonds:</strong> 164 calories, 6g protein, 14g fat, 6g carbs, 3.5g fibre<br><strong>Cashews:</strong> 157 calories, 5g protein, 12g fat, 9g carbs, 1g fibre</p>
<h2>Almonds Win For:</h2>
<ul><li>Higher fibre content (great for digestion and weight loss)</li><li>More Vitamin E (better for skin and immunity)</li><li>Higher calcium (better for bones)</li><li>Lower glycaemic index (better for blood sugar)</li></ul>
<h2>Cashews Win For:</h2>
<ul><li>Higher iron content (better for anaemia prevention)</li><li>More zinc (better for immunity and wound healing)</li><li>Creamier taste (better for cooking and snacking)</li><li>Higher copper (supports energy production)</li></ul>
<h2>Which Should You Choose?</h2>
<p>If your goal is weight loss, blood sugar control, or skin health — choose almonds. If you want more iron, zinc, or prefer a creamier taste — choose cashews. Better yet, eat both! A mixed handful gives you the best of both worlds.</p>
<h2>Shop Both at Nutriwow</h2>
<p>Get premium <a href="/products/1">Nutriwow Almonds</a> and <a href="/products/2">Nutriwow Cashews</a> — both sourced from the finest farms.</p>`
  },
  {
    slug: "pumpkin-seeds-benefits-for-health",
    title: "7 Proven Benefits of Pumpkin Seeds for Men and Women",
    excerpt: "Pumpkin seeds are tiny but mighty. Discover 7 science-backed health benefits of pumpkin seeds for men and women — from better sleep to improved fertility.",
    coverImage: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80",
    category: "Seeds",
    author: "Nutriwow Nutrition Team",
    tags: "pumpkin seeds,seeds,fertility,sleep,zinc",
    seoTitle: "7 Proven Benefits of Pumpkin Seeds | Nutriwow",
    seoDescription: "Pumpkin seeds are tiny but mighty. 7 science-backed health benefits for men and women — from better sleep to improved fertility.",
    content: `<h2>Why Pumpkin Seeds Deserve a Place in Your Diet</h2>
<p>Pumpkin seeds (also called pepitas) are small but incredibly nutritious. They are one of the best natural sources of magnesium, zinc, and healthy fats.</p>
<h2>1. Incredibly High in Magnesium</h2><p>One quarter cup of pumpkin seeds contains nearly half of the recommended daily amount of magnesium. Magnesium is involved in more than 300 biochemical reactions in the body.</p>
<h2>2. Rich in Zinc for Immunity</h2><p>Pumpkin seeds are one of the best natural sources of zinc. Zinc is important for immunity, cell growth, wound healing, and sense of taste and smell.</p>
<h2>3. May Improve Prostate Health (Men)</h2><p>Pumpkin seeds have long been valued as an important natural food for men's health. Evidence suggests they may be particularly beneficial for prostate health.</p>
<h2>4. May Help With Menopause Symptoms (Women)</h2><p>Pumpkin seed oil is rich in natural phytoestrogens, which may help reduce hot flashes, headaches, and other menopausal symptoms in women.</p>
<h2>5. High in Antioxidants</h2><p>Pumpkin seeds contain antioxidants like carotenoids and Vitamin E. Antioxidants can reduce inflammation and protect your cells from harmful free radicals.</p>
<h2>6. May Improve Sleep Quality</h2><p>Pumpkin seeds are a natural source of tryptophan, an amino acid that promotes sleep. They are also rich in zinc, which helps the brain convert tryptophan into serotonin and then melatonin.</p>
<h2>7. Good for Heart Health</h2><p>Pumpkin seeds are a good source of antioxidants, magnesium, zinc, and fatty acids — all of which may help keep your heart healthy.</p>
<h2>Shop Pumpkin Seeds at Nutriwow</h2>
<p>Get fresh <a href="/collections/Seeds">Nutriwow Pumpkin Seeds</a> — raw, unsalted, and packed with nutrition.</p>`
  },
  {
    slug: "how-to-eat-dates-for-health-benefits",
    title: "How to Eat Dates for Maximum Health Benefits",
    excerpt: "Dates are nature's energy bars. Learn the best ways to eat dates, how many to eat daily, and how to maximise their impressive health benefits.",
    coverImage: "https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=1200&q=80",
    category: "Dates",
    author: "Nutriwow Nutrition Team",
    tags: "dates,khajoor,energy,fibre,natural sugar",
    seoTitle: "How to Eat Dates for Maximum Health Benefits | Nutriwow",
    seoDescription: "Dates are nature's energy bars. Learn the best ways to eat dates, how many daily, and how to maximise their health benefits.",
    content: `<h2>Dates: Nature's Original Energy Bar</h2>
<p>Dates are the fruit of the date palm tree, which is grown in many tropical regions of the world. They are one of the sweetest fruits available and also come with many health benefits.</p>
<h2>Nutritional Profile of Dates</h2>
<p>A 100g serving of dates provides: Calories: 277, Carbs: 75g, Fibre: 7g, Protein: 2g, Potassium: 696mg, Magnesium: 54mg, Vitamin B6: 12% of DV.</p>
<h2>Best Ways to Eat Dates</h2>
<p><strong>1. On an empty stomach:</strong> Eating 2-3 dates first thing in the morning provides instant energy and helps kickstart digestion.<br><strong>2. Before a workout:</strong> Dates provide quick-releasing natural sugars that fuel your workout without causing a blood sugar crash.<br><strong>3. As a natural sweetener:</strong> Blend dates into smoothies, energy balls, or use date paste as a sugar substitute in baking.<br><strong>4. With nuts:</strong> Pair dates with almonds or walnuts for a balanced snack that combines natural sugars with protein and healthy fats.</p>
<h2>How Many Dates Should You Eat Daily?</h2>
<p>3-5 dates per day is the recommended amount for most adults. This provides about 200-250 calories and significant amounts of fibre, potassium, and magnesium.</p>
<h2>Health Benefits of Dates</h2>
<ul><li>Natural energy boost without caffeine</li><li>Supports digestive health (high fibre)</li><li>Rich in antioxidants (flavonoids, carotenoids, phenolic acid)</li><li>May support brain health</li><li>Natural labour inducer (safe in late pregnancy)</li></ul>
<h2>Shop Premium Dates at Nutriwow</h2>
<p>Get the finest <a href="/collections/Dates">Nutriwow Dates</a> — Medjool, Kimia, and Safawi varieties available.</p>`
  },
  {
    slug: "makhana-for-weight-loss",
    title: "Makhana for Weight Loss: Does It Really Work?",
    excerpt: "Makhana (fox nuts) is trending as a weight loss superfood. But does the science back it up? We look at the evidence and how to use makhana effectively for weight management.",
    coverImage: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=1200&q=80",
    category: "Makhana",
    author: "Nutriwow Nutrition Team",
    tags: "makhana,weight loss,fox nuts,low calorie snack",
    seoTitle: "Makhana for Weight Loss: Does It Work? | Nutriwow",
    seoDescription: "Makhana (fox nuts) is trending as a weight loss superfood. Does the science back it up? Find out here.",
    content: `<h2>Is Makhana Really Good for Weight Loss?</h2>
<p>Makhana has been trending on social media as a weight loss superfood. But is the hype justified? Let's look at the science.</p>
<h2>Why Makhana May Help With Weight Loss</h2>
<p><strong>Low in calories:</strong> A 30g serving of plain makhana has only about 100 calories — significantly less than most other snacks.<br><strong>High in protein:</strong> Makhana contains about 9-10% protein, which promotes satiety and helps preserve muscle mass during weight loss.<br><strong>High in fibre:</strong> The fibre in makhana slows digestion, keeping you full for longer and reducing overall calorie intake.<br><strong>Low glycaemic index:</strong> Makhana doesn't cause blood sugar spikes, which means fewer cravings and more stable energy levels.</p>
<h2>How to Use Makhana for Weight Loss</h2>
<p><strong>As a snack:</strong> Replace chips, biscuits, or namkeen with roasted makhana. You get a satisfying crunch with far fewer calories.<br><strong>In the evening:</strong> Makhana is an ideal evening snack — light, satisfying, and won't disrupt your sleep.<br><strong>With spices:</strong> Roast makhana with turmeric, black pepper, and a pinch of salt for a flavourful, metabolism-boosting snack.</p>
<h2>The Verdict</h2>
<p>Yes, makhana can support weight loss when eaten as part of a balanced diet. It's not a magic bullet, but as a low-calorie, high-protein, high-fibre snack, it's one of the best options available.</p>
<h2>Shop Makhana at Nutriwow</h2>
<p>Try <a href="/collections/Makhana">Nutriwow Makhana</a> — roasted, lightly spiced, and perfectly crunchy.</p>`
  },
  {
    slug: "best-dry-fruits-for-diabetics",
    title: "Best Dry Fruits for Diabetics: A Complete Guide",
    excerpt: "Can diabetics eat dry fruits? Yes — but the right ones, in the right amounts. This guide covers the best and worst dry fruits for blood sugar management.",
    coverImage: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=80",
    category: "Healthy Mix",
    author: "Nutriwow Nutrition Team",
    tags: "diabetes,dry fruits,blood sugar,diabetic diet",
    seoTitle: "Best Dry Fruits for Diabetics | Nutriwow",
    seoDescription: "Can diabetics eat dry fruits? Yes — but the right ones. This guide covers the best dry fruits for blood sugar management.",
    content: `<h2>Dry Fruits and Diabetes: What You Need to Know</h2>
<p>Many diabetics avoid dry fruits because they are sweet. But the right dry fruits, eaten in moderation, can actually be beneficial for blood sugar management.</p>
<h2>Best Dry Fruits for Diabetics</h2>
<p><strong>1. Almonds:</strong> Low glycaemic index, high in magnesium which improves insulin sensitivity. Eat 6-8 almonds daily.<br><strong>2. Walnuts:</strong> Rich in omega-3 fatty acids that reduce inflammation associated with diabetes. Eat 2-3 walnuts daily.<br><strong>3. Pistachios:</strong> Studies show pistachios can lower post-meal blood sugar levels. Eat 10-15 pistachios daily.<br><strong>4. Cashews:</strong> Contain anacardic acid which may improve insulin sensitivity. Eat 4-5 cashews daily.<br><strong>5. Flaxseeds:</strong> High in fibre and omega-3s that help stabilise blood sugar. Add 1 tbsp to food daily.</p>
<h2>Dry Fruits to Limit or Avoid</h2>
<p><strong>Dates:</strong> Very high in natural sugars. Limit to 1-2 per day maximum.<br><strong>Raisins:</strong> High glycaemic index. Limit to a small handful (10-15 raisins) per day.<br><strong>Figs:</strong> High in natural sugars. Limit to 2-3 per day.</p>
<h2>General Guidelines for Diabetics</h2>
<ul><li>Always eat dry fruits with a protein source to slow sugar absorption</li><li>Avoid sugar-coated or salted varieties</li><li>Monitor your blood sugar after eating new dry fruits</li><li>Consult your doctor for personalised advice</li></ul>
<h2>Shop Diabetic-Friendly Dry Fruits</h2>
<p>Get unsalted, unsweetened <a href="/collections/Nuts">Nutriwow Nuts</a> — perfect for diabetics.</p>`
  },
  {
    slug: "pistachios-benefits-why-eat-pista-daily",
    title: "Pistachios Benefits: Why You Should Eat Pista Every Day",
    excerpt: "Pistachios are one of the most nutritious nuts you can eat. Discover the top health benefits of pista and why adding them to your daily diet is one of the best decisions you can make.",
    coverImage: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=1200&q=80",
    category: "Nuts",
    author: "Nutriwow Nutrition Team",
    tags: "pistachios,pista,nuts,antioxidants,heart health",
    seoTitle: "Pistachios Benefits: Why Eat Pista Daily | Nutriwow",
    seoDescription: "Pistachios are one of the most nutritious nuts. Discover the top health benefits of pista and why to eat them daily.",
    content: `<h2>Pistachios: The Ancient Nut With Modern Benefits</h2>
<p>Pistachios have been eaten for thousands of years. They were a favourite of the Queen of Sheba and are mentioned in the Old Testament. Today, science confirms what ancient wisdom always knew — pistachios are incredibly good for you.</p>
<h2>Nutritional Powerhouse</h2>
<p>A 28g serving of pistachios contains: Calories: 159, Protein: 6g, Fat: 13g, Carbs: 8g, Fibre: 3g, Vitamin B6: 28% of DV, Thiamine: 21% of DV, Copper: 41% of DV.</p>
<h2>Rich in Antioxidants</h2><p>Pistachios contain more antioxidants than most other nuts and seeds. They are particularly high in lutein and zeaxanthin, which are essential for eye health.</p>
<h2>Good for Heart Health</h2><p>Regular pistachio consumption has been shown to lower LDL cholesterol, raise HDL cholesterol, and reduce blood pressure — all key factors in heart health.</p>
<h2>Helps With Weight Management</h2><p>Pistachios are one of the lowest-calorie nuts. Their shells also slow down eating, helping you consume less. Studies show that people who eat pistachios in the shell consume 41% fewer calories.</p>
<h2>Supports Blood Sugar Control</h2><p>Pistachios have a low glycaemic index and are rich in fibre and protein, making them an excellent snack for people with diabetes or those trying to prevent it.</p>
<h2>Good for Gut Health</h2><p>The fibre in pistachios acts as a prebiotic, feeding beneficial gut bacteria and supporting a healthy microbiome.</p>
<h2>Shop Pistachios at Nutriwow</h2>
<p>Get premium <a href="/collections/Nuts">Nutriwow Pistachios</a> — roasted, lightly salted, and packed fresh.</p>`
  },
  {
    slug: "raisins-kishmish-health-benefits",
    title: "Raisins (Kishmish) Benefits: 8 Reasons to Eat Them Daily",
    excerpt: "Raisins (kishmish) are more than just a sweet snack. Packed with iron, antioxidants, and natural energy, here are 8 compelling reasons to eat raisins every day.",
    coverImage: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=1200&q=80",
    category: "Berries",
    author: "Nutriwow Nutrition Team",
    tags: "raisins,kishmish,iron,antioxidants,energy",
    seoTitle: "Raisins Benefits: 8 Reasons to Eat Daily | Nutriwow",
    seoDescription: "Raisins (kishmish) are packed with iron, antioxidants, and natural energy. 8 compelling reasons to eat them daily.",
    content: `<h2>Raisins: Small But Mighty</h2>
<p>Raisins are dried grapes that have been used as food since prehistoric times. Despite their small size, they pack a nutritional punch that makes them one of the most beneficial dried fruits.</p>
<h2>1. Excellent Source of Iron</h2><p>Raisins are one of the best plant-based sources of iron. A 100g serving provides about 1.9mg of iron — about 10% of the daily recommended intake.</p>
<h2>2. Rich in Antioxidants</h2><p>Raisins contain powerful antioxidants called phytonutrients, including phenols and polyphenols, that protect cells from damage caused by free radicals.</p>
<h2>3. Natural Energy Booster</h2><p>The natural sugars in raisins — fructose and glucose — provide a quick energy boost. They are a favourite snack of athletes for this reason.</p>
<h2>4. Supports Bone Health</h2><p>Raisins are a good source of calcium and boron, both essential for bone health. They may help prevent osteoporosis, especially in post-menopausal women.</p>
<h2>5. Promotes Digestive Health</h2><p>The fibre in raisins acts as a natural laxative, helping to relieve constipation and maintain regular bowel movements.</p>
<h2>6. May Lower Blood Pressure</h2><p>Raisins are rich in potassium, which helps lower blood pressure by counteracting the effects of sodium in the body.</p>
<h2>7. Supports Eye Health</h2><p>Raisins contain polyphenolic phytonutrients that have antioxidant properties and are very good for ocular health, protecting eyes from free radical damage.</p>
<h2>8. Good for Oral Health</h2><p>Despite being sweet, raisins may actually be good for your teeth. They contain oleanolic acid, which inhibits the growth of bacteria that cause cavities and gum disease.</p>
<h2>Shop Raisins at Nutriwow</h2>
<p>Get premium <a href="/collections/Berries">Nutriwow Raisins</a> — golden, green, and black varieties available.</p>`
  },
  {
    slug: "dry-fruits-during-pregnancy",
    title: "Dry Fruits During Pregnancy: What to Eat and What to Avoid",
    excerpt: "Dry fruits are nutrient-dense foods that can significantly benefit pregnant women. But not all dry fruits are safe in large quantities. Here is a complete guide for expecting mothers.",
    coverImage: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
    category: "Healthy Mix",
    author: "Nutriwow Nutrition Team",
    tags: "pregnancy,dry fruits,prenatal nutrition,iron,folate",
    seoTitle: "Dry Fruits During Pregnancy: Safe Guide | Nutriwow",
    seoDescription: "Not all dry fruits are safe during pregnancy. A complete guide for expecting mothers on what to eat and what to avoid.",
    content: `<h2>Dry Fruits and Pregnancy: A Complete Guide</h2>
<p>Pregnancy is a time when nutrition is more important than ever. Dry fruits can be an excellent source of the vitamins, minerals, and energy that pregnant women need.</p>
<h2>Best Dry Fruits During Pregnancy</h2>
<p><strong>Dates:</strong> Rich in folate, iron, and fibre. Studies suggest eating dates in the last trimester may ease labour. Safe: 3-5 per day.<br><strong>Almonds:</strong> High in folic acid, which prevents neural tube defects. Also rich in calcium and Vitamin E. Safe: 8-10 per day.<br><strong>Walnuts:</strong> Excellent source of omega-3 fatty acids essential for baby's brain development. Safe: 2-3 per day.<br><strong>Raisins:</strong> High in iron, which prevents anaemia in pregnancy. Safe: small handful per day.<br><strong>Apricots:</strong> Rich in iron, calcium, and Vitamin A. Safe: 3-5 per day.</p>
<h2>Dry Fruits to Limit During Pregnancy</h2>
<p><strong>Peanuts:</strong> If you have a family history of nut allergies, consult your doctor before eating peanuts.<br><strong>Cashews:</strong> High in fat and calories. Limit to 4-5 per day.<br><strong>Pistachios:</strong> Can cause digestive issues in large amounts. Limit to 10-15 per day.</p>
<h2>Important Safety Tips</h2>
<ul><li>Always wash dry fruits before eating to remove any pesticide residue</li><li>Avoid sugar-coated or salted varieties</li><li>Introduce new dry fruits gradually to watch for allergic reactions</li><li>Consult your gynaecologist for personalised advice</li></ul>
<h2>Shop Pregnancy-Safe Dry Fruits</h2>
<p>Get pure, natural <a href="/collections/Healthy Mix">Nutriwow Dry Fruits</a> — no added sugar, no preservatives, safe for the whole family.</p>`
  },
  {
    slug: "how-to-store-dry-fruits-fresh",
    title: "How to Store Dry Fruits to Keep Them Fresh for Months",
    excerpt: "Proper storage is the key to keeping dry fruits fresh, flavourful, and nutritious for months. Follow these simple tips to maximise the shelf life of your nuts, seeds, and dried fruits.",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    category: "Tips",
    author: "Nutriwow Nutrition Team",
    tags: "storage,dry fruits,shelf life,freshness,tips",
    seoTitle: "How to Store Dry Fruits Fresh for Months | Nutriwow",
    seoDescription: "Proper storage keeps dry fruits fresh for months. Simple tips to maximise the shelf life of your nuts, seeds, and dried fruits.",
    content: `<h2>Why Proper Storage Matters</h2>
<p>Dry fruits are expensive and nutritious — improper storage can lead to rancidity, mould, and loss of nutrients. Follow these tips to keep your dry fruits fresh for as long as possible.</p>
<h2>General Storage Rules</h2>
<p><strong>1. Airtight containers:</strong> Always store dry fruits in airtight glass or food-grade plastic containers. This prevents moisture and air from getting in, which causes rancidity and mould.<br><strong>2. Cool and dark:</strong> Store containers in a cool, dark place away from direct sunlight. Heat and light accelerate oxidation and nutrient loss.<br><strong>3. Away from strong odours:</strong> Dry fruits absorb odours easily. Keep them away from spices, onions, and garlic.</p>
<h2>Storage by Type</h2>
<p><strong>Nuts (almonds, cashews, walnuts, pistachios):</strong> Room temperature: 1-2 months. Refrigerator: 6-9 months. Freezer: 1-2 years.<br><strong>Dried fruits (raisins, dates, apricots):</strong> Room temperature: 6-12 months. Refrigerator: 12-18 months. Freezer: 2-3 years.<br><strong>Seeds (pumpkin, sunflower, flax):</strong> Room temperature: 2-3 months. Refrigerator: 6-12 months. Freezer: 1 year.</p>
<h2>Signs That Dry Fruits Have Gone Bad</h2>
<ul><li>Rancid or off smell</li><li>Visible mould</li><li>Unusual discolouration</li><li>Shrivelled or hardened texture beyond normal</li><li>Bitter taste</li></ul>
<h2>Pro Tips</h2>
<p>Buy in smaller quantities more frequently rather than in bulk if you don't have proper storage. Vacuum-sealed bags extend shelf life significantly. Always use clean, dry spoons to scoop dry fruits — moisture from wet hands can introduce bacteria.</p>
<h2>Shop Fresh Dry Fruits at Nutriwow</h2>
<p>All <a href="/">Nutriwow products</a> come in resealable, airtight packaging to keep them fresh from our warehouse to your home.</p>`
  }
];

async function seed() {
  const conn = await createConnection(DB_URL);
  console.log("Connected to DB. Seeding 16 blog posts...");

  let inserted = 0;
  let skipped = 0;

  for (const blog of blogs) {
    // Check if slug already exists
    const [existing] = await conn.execute(
      "SELECT id FROM blogPosts WHERE slug = ? LIMIT 1",
      [blog.slug]
    );
    if (existing.length > 0) {
      console.log(`  SKIP (exists): ${blog.slug}`);
      skipped++;
      continue;
    }

    await conn.execute(
      `INSERT INTO blogPosts (slug, title, excerpt, content, coverImage, category, tags, author, seoTitle, seoDescription, status, published, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', true, NOW(), NOW(), NOW())`,
      [
        blog.slug,
        blog.title,
        blog.excerpt,
        blog.content,
        blog.coverImage,
        blog.category,
        blog.tags,
        blog.author,
        blog.seoTitle,
        blog.seoDescription,
      ]
    );
    console.log(`  INSERTED: ${blog.slug}`);
    inserted++;
  }

  await conn.end();
  console.log(`\nDone! Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
}

seed().catch(err => { console.error(err); process.exit(1); });
