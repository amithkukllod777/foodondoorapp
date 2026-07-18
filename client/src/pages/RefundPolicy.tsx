/**
 * Refund Policy Page
 * Required by PhonePe for payment gateway URL whitelisting
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useCustomPolicy, CustomPolicyBody } from "@/components/PolicyContent";

export default function RefundPolicy() {
  const custom = useCustomPolicy("refund");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Refund Policy | Foodondoor"
        description="Foodondoor's refund policy for premium dry fruits and healthy snacks. Learn about our refund process, timelines, and eligibility criteria."
        url="/refund-policy"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Refund Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: April 27, 2025</p>

          {custom ? <CustomPolicyBody text={custom} /> : (
          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Overview</h2>
              <p>
                Foodondoor is a brand of <strong>Foodondoor Private Limited</strong>. We are committed to ensuring your complete satisfaction. If you are not satisfied with your purchase, we offer refunds under the conditions outlined in this policy. Please read this policy carefully before placing an order.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Eligibility for Refund</h2>
              <p>You are eligible for a refund in the following cases:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>You received a <strong>damaged or defective product</strong>.</li>
                <li>You received the <strong>wrong product</strong> (different from what you ordered).</li>
                <li>The product was <strong>missing from your order</strong>.</li>
                <li>The product was <strong>expired</strong> at the time of delivery.</li>
                <li>Your order was <strong>not delivered</strong> within 15 business days of placing the order.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Non-Refundable Cases</h2>
              <p>Refunds will NOT be issued in the following cases:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>The product has been opened, partially consumed, or tampered with.</li>
                <li>The refund request is made after <strong>7 days</strong> from the date of delivery.</li>
                <li>The issue is due to incorrect delivery address provided by the customer.</li>
                <li>Change of mind after the order has been dispatched.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. How to Request a Refund</h2>
              <p>To initiate a refund request:</p>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Contact us within <strong>7 days</strong> of delivery via WhatsApp at <strong>+91 92431 77706</strong> or email at <a href="mailto:wecare@foodondoor.com" className="text-primary underline">wecare@foodondoor.com</a>.</li>
                <li>Provide your <strong>Order ID</strong> and a brief description of the issue.</li>
                <li>Attach <strong>photographs</strong> of the damaged/wrong/expired product as evidence.</li>
                <li>Our team will review your request within <strong>2 business days</strong>.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Refund Process and Timeline</h2>
              <p>
                Once your refund request is approved:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Online Payments (UPI, Card, Net Banking):</strong> Refund will be credited to your original payment method within <strong>5–7 business days</strong>.</li>
                <li><strong>Cash on Delivery (COD) Orders:</strong> Refund will be processed via bank transfer or UPI within <strong>7–10 business days</strong>. You will need to provide your bank account details or UPI ID.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Partial Refunds</h2>
              <p>
                In cases where only part of an order is affected (e.g., one item out of multiple is damaged), a partial refund will be issued for the affected item(s) only.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Cancellation Refunds</h2>
              <p>
                If you cancel an order before it is dispatched, a full refund will be processed within <strong>3–5 business days</strong>. Once an order is dispatched, cancellations are not accepted. Please refer to our <a href="/return-policy" className="text-primary underline">Return Policy</a> for post-delivery returns.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact Us</h2>
              <p>
                For refund-related queries, please contact:<br />
                <strong>Company:</strong> Foodondoor Private Limited<br />
                <strong>Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh – 466001<br />
                <strong>Email:</strong> <a href="mailto:wecare@foodondoor.com" className="text-primary underline">wecare@foodondoor.com</a><br />
                <strong>WhatsApp:</strong> +91 92431 77706<br />
                <strong>Hours:</strong> Monday to Saturday, 9 AM – 6 PM IST
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
