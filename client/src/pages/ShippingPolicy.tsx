/**
 * Shipping Policy Page
 * Required by PhonePe for payment gateway URL whitelisting
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useCustomPolicy, CustomPolicyBody } from "@/components/PolicyContent";

export default function ShippingPolicy() {
  const custom = useCustomPolicy("shipping");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Shipping Policy | Foodondoor"
        description="Learn about Foodondoor's shipping policy, delivery timelines, charges, and coverage across India for premium dry fruits and healthy snacks."
        url="/shipping-policy"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Shipping Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: April 27, 2025</p>

          {custom ? <CustomPolicyBody text={custom} /> : (
          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Shipping Coverage</h2>
              <p>
                Foodondoor, a brand of <strong>Foodondoor Private Limited</strong>, ships to all major cities and towns across India. We use trusted logistics partners including <strong>Shiprocket</strong> and <strong>iThink Logistics</strong> to ensure safe and timely delivery of your orders.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Shipping Charges</h2>
              <table className="w-full border-collapse border border-border mt-2">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-semibold">Order Value</th>
                    <th className="border border-border px-3 py-2 text-left font-semibold">Shipping Charge</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2">Below ₹499</td>
                    <td className="border border-border px-3 py-2">₹49 (flat rate)</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-3 py-2">₹499 and above</td>
                    <td className="border border-border px-3 py-2"><strong>FREE Shipping</strong></td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Order Processing Time</h2>
              <p>
                Orders are processed within <strong>1–2 business days</strong> of payment confirmation. Orders placed on weekends or public holidays will be processed on the next business day. You will receive an order confirmation SMS/WhatsApp message after your order is placed.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Estimated Delivery Timeline</h2>
              <table className="w-full border-collapse border border-border mt-2">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-semibold">Location</th>
                    <th className="border border-border px-3 py-2 text-left font-semibold">Estimated Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2">Metro Cities (Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata)</td>
                    <td className="border border-border px-3 py-2">2–4 business days</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-3 py-2">Tier 2 and Tier 3 Cities</td>
                    <td className="border border-border px-3 py-2">4–6 business days</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2">Remote Areas</td>
                    <td className="border border-border px-3 py-2">6–10 business days</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Note: These are estimated timelines and may vary due to courier delays, weather conditions, or public holidays.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Order Tracking</h2>
              <p>
                Once your order is dispatched, you will receive a tracking number via SMS/WhatsApp. You can track your order using the AWB number on the courier partner's website or through our <a href="/track-order" className="text-primary underline">Order Tracking</a> page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Packaging</h2>
              <p>
                All products are carefully packed to maintain freshness and prevent damage during transit. We use food-grade, tamper-evident packaging for all dry fruits, nuts, and seeds. If you receive a damaged package, please take photographs and contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Non-Delivery</h2>
              <p>
                If your order has not been delivered within <strong>15 business days</strong> of placing the order, please contact us. We will investigate with the courier partner and either arrange a re-delivery or issue a full refund.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Incorrect Address</h2>
              <p>
                Please ensure your delivery address is complete and accurate at the time of placing the order. Foodondoor India is not responsible for non-delivery due to incorrect or incomplete address provided by the customer. Address changes after dispatch may not be possible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact Us</h2>
              <p>
                For shipping-related queries, please contact:<br />
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
