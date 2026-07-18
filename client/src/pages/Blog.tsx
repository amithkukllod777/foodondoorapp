/**
 * Nutriwow - Blog / Health Articles Page
 * SEO-focused health content to drive organic traffic
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Link } from "wouter";
import { Calendar, Clock, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { optImg, BLOG_FALLBACK_IMAGE } from "@/lib/img";
import SEO from "@/components/SEO";

// Static blog posts for SEO — can be moved to DB later
const BLOG_POSTS = [
  {
    slug: "benefits-of-almonds",
    title: "10 Incredible Health Benefits of Almonds You Should Know",
    excerpt: "Almonds are a powerhouse of nutrients — from heart health to weight management. Discover why adding a handful of almonds to your daily diet can transform your health.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80",
    category: "Nuts",
    readTime: "4 min read",
    date: "March 28, 2025",
    tags: ["almonds", "health benefits", "nuts", "protein"],
  },
  {
    slug: "cashews-for-heart-health",
    title: "Cashews and Heart Health: What the Science Says",
    excerpt: "Rich in monounsaturated fats and magnesium, cashews are one of the best nuts for cardiovascular health. Here's everything you need to know.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "March 15, 2025",
    tags: ["cashews", "heart health", "magnesium"],
  },
  {
    slug: "makhana-superfood",
    title: "Makhana: The Ancient Indian Superfood Making a Modern Comeback",
    excerpt: "Fox nuts or makhana have been used in Ayurveda for centuries. Low in calories, high in protein — find out why nutritionists are calling it the snack of the future.",
    image: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=600&q=80",
    category: "Snacks",
    readTime: "6 min read",
    date: "March 5, 2025",
    tags: ["makhana", "fox nuts", "superfood", "ayurveda"],
  },
  {
    slug: "black-raisins-benefits",
    title: "Black Raisins: 8 Reasons to Soak and Eat Them Every Morning",
    excerpt: "Soaked black raisins on an empty stomach is an age-old remedy for iron deficiency, digestion, and glowing skin. Here's the science behind this simple habit.",
    image: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=600&q=80",
    category: "Berries",
    readTime: "4 min read",
    date: "February 20, 2025",
    tags: ["raisins", "iron", "digestion", "skin"],
  },
  {
    slug: "walnuts-brain-food",
    title: "Why Walnuts Are Called 'Brain Food' — And the Science Behind It",
    excerpt: "Shaped like a brain and packed with omega-3 fatty acids, walnuts are nature's most powerful brain-boosting food. Learn how many to eat and when.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "February 10, 2025",
    tags: ["walnuts", "omega-3", "brain health", "DHA"],
  },
  {
    slug: "dry-fruits-for-weight-loss",
    title: "Best Dry Fruits for Weight Loss: A Nutritionist's Guide",
    excerpt: "Contrary to popular belief, dry fruits can actually help with weight management when eaten in the right quantities. Here's which ones to choose and how much.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80",
    category: "Healthy Mix",
    readTime: "7 min read",
    date: "January 28, 2025",
    tags: ["weight loss", "dry fruits", "diet", "nutrition"],
  },
  {
    slug: "top-10-health-benefits-of-almonds",
    title: "Top 10 Health Benefits of Eating Almonds Daily",
    excerpt: "Discover the top 10 science-backed health benefits of eating almonds daily — from heart health to weight management, find out why badam is India's favourite superfood.",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80",
    category: "Nuts",
    readTime: "6 min read",
    date: "April 20, 2025",
    tags: ["almonds", "health benefits", "badam", "nutrition", "immunity"],
  },
  {
    slug: "cashews-vs-almonds-which-is-better",
    title: "Cashews vs Almonds: Which Nut is Better for You?",
    excerpt: "Cashews or almonds — which nut should you choose? We compare nutrition, health benefits, calories, and taste to help you decide which is right for your goals.",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "April 18, 2025",
    tags: ["cashews", "almonds", "kaju", "badam", "comparison"],
  },
  {
    slug: "pumpkin-seeds-benefits-for-health",
    title: "7 Proven Benefits of Pumpkin Seeds for Men and Women",
    excerpt: "Pumpkin seeds are tiny but mighty. Discover 7 science-backed health benefits of pumpkin seeds for men and women — from better sleep to improved fertility.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
    category: "Seeds",
    readTime: "5 min read",
    date: "April 15, 2025",
    tags: ["pumpkin seeds", "zinc", "magnesium", "men health", "women health"],
  },
  {
    slug: "how-to-eat-dates-for-health-benefits",
    title: "How to Eat Dates for Maximum Health Benefits",
    excerpt: "Dates are nature's energy bars. Learn the best ways to eat dates, how many to eat daily, and how to maximise their impressive health benefits.",
    image: "https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=600&q=80",
    category: "Dates",
    readTime: "5 min read",
    date: "April 12, 2025",
    tags: ["dates", "khajur", "Omani dates", "energy", "iron"],
  },
  {
    slug: "makhana-for-weight-loss",
    title: "Makhana for Weight Loss: Does It Really Work?",
    excerpt: "Makhana (fox nuts) is trending as a weight loss superfood. But does the science back it up? We look at the evidence and how to use makhana effectively.",
    image: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=600&q=80",
    category: "Makhana",
    readTime: "5 min read",
    date: "April 10, 2025",
    tags: ["makhana", "fox nuts", "weight loss", "low calorie"],
  },
  {
    slug: "best-dry-fruits-for-diabetics",
    title: "Best Dry Fruits for Diabetics: A Complete Guide",
    excerpt: "Can diabetics eat dry fruits? Yes — but the right ones, in the right amounts. This guide covers the best and worst dry fruits for blood sugar management.",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80",
    category: "Healthy Mix",
    readTime: "6 min read",
    date: "April 8, 2025",
    tags: ["dry fruits for diabetics", "diabetes", "blood sugar", "low GI"],
  },
  {
    slug: "pistachios-benefits-why-eat-pista-daily",
    title: "Pistachios Benefits: Why You Should Eat Pista Every Day",
    excerpt: "Pistachios are one of the most nutritious nuts you can eat. Discover the top health benefits of pista and why adding them to your daily diet is one of the best decisions you can make.",
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
    category: "Nuts",
    readTime: "5 min read",
    date: "April 5, 2025",
    tags: ["pistachios", "pista", "heart health", "antioxidants"],
  },
  {
    slug: "raisins-kishmish-health-benefits",
    title: "Raisins (Kishmish) Benefits: 8 Reasons to Eat Them Daily",
    excerpt: "Raisins (kishmish) are more than just a sweet snack. Packed with iron, antioxidants, and natural energy, here are 8 compelling reasons to eat raisins every day.",
    image: "https://images.unsplash.com/photo-1596591868231-05e808fd131d?w=600&q=80",
    category: "Berries",
    readTime: "5 min read",
    date: "April 3, 2025",
    tags: ["raisins", "kishmish", "iron", "energy", "digestion"],
  },
  {
    slug: "dry-fruits-during-pregnancy",
    title: "Dry Fruits During Pregnancy: What to Eat and What to Avoid",
    excerpt: "Dry fruits are nutrient-dense foods that can significantly benefit pregnant women. But not all dry fruits are safe in large quantities. Here is a complete guide for expecting mothers.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
    category: "Healthy Mix",
    readTime: "6 min read",
    date: "April 1, 2025",
    tags: ["pregnancy", "dry fruits", "prenatal nutrition", "iron", "folate"],
  },
  {
    slug: "how-to-store-dry-fruits-fresh",
    title: "How to Store Dry Fruits to Keep Them Fresh for Months",
    excerpt: "Proper storage is the key to keeping dry fruits fresh, flavourful, and nutritious for months. Follow these simple tips to maximise the shelf life of your nuts, seeds, and dried fruits.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    category: "Tips",
    readTime: "4 min read",
    date: "March 28, 2025",
    tags: ["storage tips", "dry fruits", "freshness", "shelf life"],
  },
];

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

export default function Blog() {
  const { data: dbPosts, isLoading } = trpc.blog.list.useQuery({ limit: 100 });

  // Merge DB posts with static fallback: DB posts take priority, static fills the rest
  const allPosts = (() => {
    if (dbPosts && dbPosts.length > 0) {
      // Use DB posts, map to same shape as static
      return dbPosts.map(p => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || "",
        image: p.coverImage || BLOG_FALLBACK_IMAGE,
        category: p.category || "Health",
        readTime: "5 min read",
        date: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "",
        tags: p.tags ? p.tags.split(",").map(t => t.trim()) : [],
      }));
    }
    // Fallback to static data
    return BLOG_POSTS;
  })();

  const featured = allPosts[0];
  const rest = allPosts.slice(1);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background" >
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <Loader2 size={20} className="animate-spin" />
            Loading articles...
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="min-h-screen flex flex-col bg-background" >
        <AnnouncementBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground/70">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p>No blog posts yet. Check back soon!</p>
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" >
      <SEO
        title="Health Blog | Dry Fruits, Nutrition & Wellness Tips"
        description="Read expert articles on dry fruits, nuts, seeds, and healthy snacks. Science-backed nutrition tips, recipes, and wellness guides from Nutriwow."
        url="/blog"
        keywords="dry fruits health benefits, nutrition blog, healthy snacks India, almonds benefits, cashews benefits, makhana benefits"
        type="website"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-clay-peach text-clay-brown px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
              <BookOpen size={14} />
              Health & Nutrition
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Nutriwow Health Blog
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Expert-backed articles on nutrition, dry fruits, and healthy living — to help you make the best food choices.
            </p>
          </div>

          {/* Featured Post */}
          <div className="mb-10">
            <Link href={`/blogs/news/${featured.slug}`}>
              <div className="group bg-card rounded-3xl overflow-hidden shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all cursor-pointer">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative overflow-hidden h-64 lg:h-auto">
                    <img
                      src={optImg(featured.image, 1080)}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Featured</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[featured.category] || "bg-gray-100 text-muted-foreground"}`}>
                        {featured.category}
                      </span>
                      <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                        <Clock size={12} /> {featured.readTime}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{featured.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                        <Calendar size={12} /> {featured.date}
                      </span>
                      <span className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read More <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Rest of Posts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blogs/news/${post.slug}`}>
                <div className="group bg-card rounded-3xl overflow-hidden shadow-clay hover:-translate-y-1 hover:shadow-clay-lg transition-all cursor-pointer h-full flex flex-col">
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={optImg(post.image, 640)}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-muted-foreground"}`}>
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {post.date}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {post.readTime}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read Article <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
