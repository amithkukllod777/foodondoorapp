/**
 * Contact Us Page
 * Contact information and support details for Foodondoor
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { Mail, Phone, MessageCircle, MapPin, Clock, Facebook, Instagram } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Contact Us | Foodondoor - Get in Touch"
        description="Contact Foodondoor for orders, queries, or support. Reach us via email, phone, or WhatsApp. Located in Sehore, Madhya Pradesh."
        url="/contact"
        keywords="contact nutriwow, nutriwow customer care, nutriwow phone number, nutriwow email, nutriwow address"
        jsonLd={[{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Foodondoor",
          url: "https://www.foodondoor.com/contact",
          mainEntity: {
            "@type": "LocalBusiness",
            name: "Foodondoor",
            telephone: "+91-92431-77706",
            email: "wecare@foodondoor.com",
            url: "https://www.foodondoor.com",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Sherpur Square, Indore Bhopal Highway",
              addressLocality: "Sehore",
              addressRegion: "Madhya Pradesh",
              postalCode: "466001",
              addressCountry: "IN"
            },
            openingHours: "Mo-Sa 09:00-19:00"
          }
        }]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-sm text-muted-foreground mb-8">
            We'd love to hear from you! Reach out to us for orders, queries, or support.
          </p>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Email */}
            <a
              href="mailto:wecare@foodondoor.com"
              className="flex items-start gap-4 bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Email</p>
                <p className="text-sm text-muted-foreground mt-0.5">wecare@foodondoor.com</p>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:+919243177706"
              className="flex items-start gap-4 bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Phone</p>
                <p className="text-sm text-muted-foreground mt-0.5">+91 92431 77706</p>
              </div>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/919243177706"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                <p className="text-sm text-muted-foreground mt-0.5">Chat with us on WhatsApp</p>
              </div>
            </a>

            {/* Address */}
            <div className="flex items-start gap-4 bg-white rounded-xl border border-border p-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Address</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sherpur Square, Indore Bhopal Highway,<br />
                  Sehore, Madhya Pradesh - 466001
                </p>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-xl border border-border p-5 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Business Hours</p>
            </div>
            <div className="ml-[52px] space-y-1 text-sm text-muted-foreground">
              <p>Monday - Saturday: 9:00 AM - 7:00 PM IST</p>
              <p>Sunday: Closed</p>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-xl border border-border p-5 mb-8">
            <p className="text-sm font-semibold text-foreground mb-2">Registered Company</p>
            <p className="text-sm text-muted-foreground">Foodondoor Private Limited</p>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-xl border border-border p-5 mb-8">
            <p className="text-sm font-semibold text-foreground mb-3">Follow Us</p>
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com/foodondoor.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Facebook className="w-5 h-5" />
                <span>Facebook</span>
              </a>
              <a
                href="https://instagram.com/foodondoor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-5 h-5" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          {/* Response Time Note */}
          <p className="text-sm text-muted-foreground text-center">
            We typically respond within 24 hours during business days.
          </p>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
