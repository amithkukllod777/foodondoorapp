import { Facebook, Instagram, Mail, MessageCircle, MapPin, Phone, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import LanguageSwitcher from "./LanguageSwitcher";
import { trpc } from "@/lib/trpc";

export default function Footer() {
  const { data: publicSettings } = trpc.settings.getPublic.useQuery();
  const marketplaces = ((publicSettings as { marketplaces?: { name: string; url: string }[] } | undefined)?.marketplaces) ?? [];
  const sisterBrands = ((publicSettings as { sisterBrands?: { name: string; url: string; logo: string }[] } | undefined)?.sisterBrands) ?? [];
  return (
    <footer style={{ background: "#1A1A1A", color: "#E5E5E5" }}>
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <img
              src="/foodondoor-logo.png"
              alt="Foodondoor"
              className="h-10 mb-4 brightness-0 invert"
            />
            <p className="text-xs leading-relaxed mb-4" style={{ color: "#9E9E9E" }}>
              Premium Dry Fruits & Healthy Snacks. 100% natural, protein-rich, and sourced from the finest farms.
            </p>
            <div className="flex gap-3 mb-4">
              <a
                href="https://www.facebook.com/foodondoor.in"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all hover:opacity-80"
                style={{ background: "#1877F2" }}
                aria-label="Facebook"
              >
                <Facebook size={15} className="text-white" />
              </a>
              <a
                href="https://www.instagram.com/foodondoor"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all hover:opacity-80"
                style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
                aria-label="Instagram"
              >
                <Instagram size={15} className="text-white" />
              </a>
              <a
                href="https://wa.me/919243177706"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all hover:opacity-80"
                style={{ background: "#25D366" }}
                aria-label="WhatsApp"
              >
                <MessageCircle size={15} className="text-white" />
              </a>
            </div>
            {/* Download App */}
            <div className="mt-4 mb-3">
              <p className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: "#9E9E9E" }}>DOWNLOAD APP</p>
              <a
                href="https://play.google.com/store/apps/details?id=com.foodondoor.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border transition-colors hover:border-gray-500"
                style={{ background: "#111111", borderColor: "#3A3A3A" }}
                aria-label="Download Foodondoor on Google Play"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none">
                  <path d="M3.61 1.814L13.792 12 3.61 22.186C3.22 21.976 3 21.576 3 21.1V2.9c0-.476.22-.876.61-1.086z" fill="#4285F4"/>
                  <path d="M17.04 8.265L5.765 1.5l8.027 8.027 3.248-1.262z" fill="#EA4335"/>
                  <path d="M20.391 10.5c.397.22.609.577.609 1-.001.422-.212.78-.609 1l-2.866 1.114L14.74 11.5l2.385-2.382 3.266 1.382z" fill="#FBBC04"/>
                  <path d="M5.765 22.5L17.04 15.735l-3.247-1.263L5.765 22.5z" fill="#34A853"/>
                </svg>
                <div>
                  <p className="text-[9px] leading-none" style={{ color: "#9E9E9E" }}>GET IT ON</p>
                  <p className="text-sm font-bold text-white leading-tight">Google Play</p>
                </div>
              </a>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-xs" style={{ color: "#9E9E9E" }}>
              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <span>Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh - 466001</span>
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Information</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/blog" className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                  Health Blogs
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Policies</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Refund Policy", href: "/refund-policy" },
                { label: "Return Policy", href: "/return-policy" },
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Terms and Conditions", href: "/terms-and-conditions" },
                { label: "Shipping Policy", href: "/shipping-policy" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-xs hover:text-amber-400 transition-colors" style={{ color: "#9E9E9E" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Contact Support</h3>
            <div className="space-y-3">
              <a
                href="mailto:wecare@foodondoor.com"
                className="flex items-center gap-2 text-xs hover:text-amber-400 transition-colors"
                style={{ color: "#9E9E9E" }}
              >
                <Mail size={14} className="text-amber-400 flex-shrink-0" />
                wecare@foodondoor.com
              </a>
              <a
                href="tel:+919243177706"
                className="flex items-center gap-2 text-xs hover:text-amber-400 transition-colors"
                style={{ color: "#9E9E9E" }}
              >
                <Phone size={14} className="text-amber-400 flex-shrink-0" />
                +91 92431 77706
              </a>
              <a
                href="https://wa.me/919243177706"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs hover:text-amber-400 transition-colors"
                style={{ color: "#9E9E9E" }}
              >
                <MessageCircle size={14} className="text-amber-400 flex-shrink-0" />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>

        {/* Also available on — marketplace links (admin: `marketplaces` setting) */}
        {marketplaces.length > 0 && (
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "#2E2E2E" }}>
            <p className="text-xs font-semibold text-center mb-4" style={{ color: "#9E9E9E" }}>
              Also available on
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {marketplaces.map((m) => (
                <a
                  key={m.name}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 h-9 hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-bold text-gray-800">{m.name}</span>
                  <ExternalLink size={11} className="text-gray-500" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Our brands — sister brands (admin: `sisterBrands` setting) */}
        {sisterBrands.length > 0 && (
          <div className="mt-10 pt-6 border-t" style={{ borderColor: "#2E2E2E" }}>
            <p className="text-xs font-semibold text-center mb-4" style={{ color: "#9E9E9E" }}>
              Our brands
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {sisterBrands.map((b) => {
                const inner = b.logo ? (
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="max-h-12 max-w-full w-auto object-contain"
                    onError={(e) => {
                      // Logo not uploaded yet → fall back to brand name text
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const span = document.createElement("span");
                      span.className = "text-sm font-bold text-gray-800";
                      span.textContent = b.name;
                      img.parentElement?.appendChild(span);
                    }}
                  />
                ) : (
                  <span className="text-sm font-bold text-gray-800">{b.name}</span>
                );
                // Uniform card size so logos of any aspect ratio align in a row
                const cardCls =
                  "bg-white rounded-xl w-40 h-20 flex items-center justify-center p-3";
                return b.url ? (
                  <a
                    key={b.name}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${cardCls} hover:opacity-80 transition-opacity`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={b.name} className={cardCls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="mt-10 pt-6 border-t" style={{ borderColor: "#2E2E2E" }}>
          <p className="text-xs font-semibold text-center mb-4" style={{ color: "#9E9E9E" }}>
            Secure Payments Accepted
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {/* GPay */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center gap-1.5 h-9">
              <span className="text-xs font-bold" style={{ color: "#4285F4" }}>G</span>
              <span className="text-xs font-bold text-gray-700">Pay</span>
            </div>
            {/* PhonePe */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center h-9">
              <span className="text-xs font-bold" style={{ color: "#5F259F" }}>PhonePe</span>
            </div>
            {/* UPI */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center h-9">
              <span className="text-xs font-bold text-gray-700">UPI</span>
            </div>
            {/* Visa */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center h-9">
              <span className="text-xs font-bold italic" style={{ color: "#1A1F71" }}>VISA</span>
            </div>
            {/* Mastercard */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center gap-1 h-9">
              <div className="w-5 h-5 rounded-full" style={{ background: "#EB001B" }} />
              <div className="w-5 h-5 rounded-full -ml-2.5" style={{ background: "#F79E1B", opacity: 0.85 }} />
            </div>
            {/* RuPay */}
            <div className="bg-[#FFFFFF] rounded-xl px-3 py-1.5 flex items-center h-9">
              <span className="text-xs font-bold" style={{ color: "#006A4E" }}>RuPay</span>
            </div>
            {/* COD */}
            <div className="rounded-xl px-3 py-1.5 flex items-center h-9 border" style={{ borderColor: "#2E2E2E", background: "#2A2A2A" }}>
              <span className="text-xs font-semibold text-amber-400">Cash on Delivery</span>
            </div>
          </div>

          {/* FSSAI & Company Info */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed" style={{ color: "#9E9E9E" }}>
              <span className="font-semibold">FSSAI Lic. No: 11424999000246</span>
            </p>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px]" style={{ color: "#616161" }}>
              &copy; 2026 Foodondoor | Foodondoor Private Limited. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="text-[11px]" style={{ color: "#616161" }}>🔒 100% Secure & Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
