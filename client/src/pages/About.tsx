/**
 * About Us Page
 * Company info, mission, and values for Nutriwow by Foodondoor Private Limited
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="About Us | Nutriwow - Premium Dry Fruits & Healthy Snacks"
        description="Learn about Nutriwow by Foodondoor Private Limited. We bring you 100% natural, premium dry fruits and healthy snacks directly from the finest farms across India."
        url="/about"
        keywords="about nutriwow, nutriwow story, premium dry fruits brand India, foodondoor private limited"
        jsonLd={[{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Nutriwow",
          url: "https://www.nutriwow.in/about",
          mainEntity: {
            "@type": "Organization",
            name: "Nutriwow",
            legalName: "Foodondoor Private Limited",
            url: "https://www.nutriwow.in",
            logo: "https://www.nutriwow.in/nutriwow-logo.png",
            foundingLocation: "Sehore, Madhya Pradesh, India",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Sherpur Square, Indore Bhopal Highway",
              addressLocality: "Sehore",
              addressRegion: "Madhya Pradesh",
              postalCode: "466001",
              addressCountry: "IN"
            },
            contactPoint: {
              "@type": "ContactPoint",
              telephone: "+91-95463-34633",
              contactType: "customer service",
              email: "wecare@nutriwow.in",
              availableLanguage: ["English", "Hindi"]
            },
            sameAs: [
              "https://www.facebook.com/nutriwowindia",
              "https://www.instagram.com/nutriwowindia"
            ]
          }
        }]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">About Us</h1>
          <p className="text-sm text-muted-foreground mb-8">Nutriwow — A brand by Foodondoor Private Limited</p>

          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Our Story</h2>
              <p>
                Nutriwow was born out of a simple belief — that wholesome, premium-quality dry fruits and healthy snacks should be accessible to every Indian household. Based in <strong>Sehore, Madhya Pradesh</strong>, we started our journey with a passion for bringing the finest nuts, dried fruits, seeds, and natural snacks straight from trusted farms to your doorstep.
              </p>
              <p>
                As a brand of <strong>Foodondoor Private Limited</strong>, Nutriwow combines deep-rooted knowledge of India's rich agricultural heritage with modern quality standards. Every product we offer is carefully sourced, rigorously tested, and thoughtfully packaged to preserve its natural goodness.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Our Mission</h2>
              <p>
                Our mission is to make healthy snacking simple, enjoyable, and accessible for everyone. We believe that choosing nutritious food should never mean compromising on taste or breaking the bank. From premium California almonds and Afghan cashews to wholesome trail mixes and flavoured dry fruit combos, we curate products that fit naturally into your daily routine — whether it's a quick office snack, a post-workout boost, or a festive gift.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Why Choose Nutriwow?</h2>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>100% Natural:</strong> No artificial colours, flavours, or preservatives. What you see is what you get — pure, natural goodness.</li>
                <li><strong>Lab Tested & FSSAI Certified:</strong> Every batch is tested for quality and safety. We are fully FSSAI licensed, ensuring our products meet the highest food safety standards in India.</li>
                <li><strong>Direct from Farms:</strong> We work closely with farmers and trusted suppliers across India and the world to source the freshest produce at the best value.</li>
                <li><strong>Freshness Guaranteed:</strong> Our products are packed in food-grade, moisture-proof packaging to lock in freshness and flavour from our facility to your home.</li>
                <li><strong>Wide Selection:</strong> From raw and roasted dry fruits to healthy seed mixes, flavoured snacks, and festive gift packs — we have something for everyone.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Our Values</h2>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Quality First:</strong> We never compromise on the quality of our products. Each item is handpicked and inspected before it reaches you.</li>
                <li><strong>Freshness Always:</strong> We maintain short supply chains and small-batch processing to ensure you always receive the freshest products.</li>
                <li><strong>Transparency:</strong> Honest pricing, clear product descriptions, and no hidden charges. We believe trust is earned through consistency.</li>
                <li><strong>Customer First:</strong> Your satisfaction is our priority. From easy ordering to responsive customer support, we strive to make your experience seamless.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Company Information</h2>
              <p>
                <strong>Legal Entity:</strong> Foodondoor Private Limited<br />
                <strong>Brand:</strong> Nutriwow<br />
                <strong>FSSAI Lic. No:</strong> 11424999000246<br />
                <strong>Registered Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh – 466001<br />
                <strong>Email:</strong> <a href="mailto:wecare@nutriwow.in" className="text-primary underline">wecare@nutriwow.in</a><br />
                <strong>Phone / WhatsApp:</strong> <a href="https://wa.me/919546334633" className="text-primary underline">+91 95463 34633</a><br />
                <strong>Website:</strong> <a href="https://www.nutriwow.in" className="text-primary underline">www.nutriwow.in</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">Connect With Us</h2>
              <p>
                Follow us on social media for the latest products, offers, and healthy snacking tips:<br />
                <strong>Facebook:</strong> <a href="https://www.facebook.com/nutriwowindia" className="text-primary underline" target="_blank" rel="noopener noreferrer">facebook.com/nutriwowindia</a><br />
                <strong>Instagram:</strong> <a href="https://www.instagram.com/nutriwowindia" className="text-primary underline" target="_blank" rel="noopener noreferrer">instagram.com/nutriwowindia</a><br />
                <strong>WhatsApp:</strong> <a href="https://wa.me/919546334633" className="text-primary underline" target="_blank" rel="noopener noreferrer">+91 95463 34633</a>
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
