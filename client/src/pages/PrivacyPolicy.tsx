/**
 * Privacy Policy Page
 * Required by PhonePe for payment gateway URL whitelisting
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useCustomPolicy, CustomPolicyBody } from "@/components/PolicyContent";

export default function PrivacyPolicy() {
  const custom = useCustomPolicy("privacy");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Privacy Policy | Foodondoor"
        description="Learn how Foodondoor collects, uses, and protects your personal information when you shop for premium dry fruits and healthy snacks."
        url="/privacy-policy"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: April 27, 2025</p>

          {custom ? <CustomPolicyBody text={custom} /> : (
          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
              <p>
                Foodondoor is a brand of <strong>Foodondoor Private Limited</strong> ("we", "us", "our"), a company registered in India. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit <strong>www.foodondoor.com</strong> or make a purchase from us.
              </p>
              <p className="mt-2">
                <strong>Registered Company:</strong> Foodondoor Private Limited<br />
                <strong>Registered Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh, India – 466001
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
              <p>We may collect the following types of information:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Personal Information:</strong> Name, mobile number, email address, delivery address.</li>
                <li><strong>Order Information:</strong> Products purchased, order value, payment method, transaction ID.</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, pages visited.</li>
                <li><strong>Communication Data:</strong> Messages sent to us via WhatsApp, email, or contact forms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Process and fulfill your orders.</li>
                <li>Send order confirmations and delivery updates via SMS/WhatsApp.</li>
                <li>Respond to customer service inquiries.</li>
                <li>Improve our website, products, and services.</li>
                <li>Send promotional offers and newsletters (only with your consent).</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Payment Information</h2>
              <p>
                We do not store your credit/debit card details on our servers. All payment transactions are processed securely through <strong>PhonePe Payment Gateway</strong> and <strong>Razorpay</strong>, which are PCI-DSS compliant payment processors. Please refer to their respective privacy policies for information on how they handle your payment data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Sharing of Information</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Logistics Partners:</strong> Shiprocket, iThink Logistics — for order delivery.</li>
                <li><strong>Payment Processors:</strong> PhonePe, Razorpay — for payment processing.</li>
                <li><strong>Communication Services:</strong> Fast2SMS, Meta WhatsApp API — for OTP and order notifications.</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Cookies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your browsing experience, remember your cart, and analyze website traffic. You can disable cookies in your browser settings, but this may affect certain features of the Website.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Order data is retained for a minimum of 3 years for legal and accounting purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Access the personal information we hold about you.</li>
                <li>Request correction of inaccurate information.</li>
                <li>Request deletion of your personal data (subject to legal obligations).</li>
                <li>Opt out of promotional communications at any time.</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <a href="mailto:wecare@foodondoor.com" className="text-primary underline">wecare@foodondoor.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of our Website after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact Us</h2>
              <p>
                For any privacy-related queries, please contact:<br />
                <strong>Company:</strong> Foodondoor Private Limited<br />
                <strong>Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh – 466001<br />
                <strong>Email:</strong> <a href="mailto:wecare@foodondoor.com" className="text-primary underline">wecare@foodondoor.com</a><br />
                <strong>WhatsApp:</strong> +91 92431 77706<br />
                <strong>Website:</strong> www.foodondoor.com
              </p>
            </section>

          </div>
          )}
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
