/**
 * Return Policy Page
 * Required by PhonePe for payment gateway URL whitelisting
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useCustomPolicy, CustomPolicyBody } from "@/components/PolicyContent";

export default function ReturnPolicy() {
  const custom = useCustomPolicy("return");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Return Policy | Foodondoor"
        description="Foodondoor's return policy for premium dry fruits and healthy snacks. Understand our return process, conditions, and timelines."
        url="/return-policy"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Return Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: April 27, 2025</p>

          {custom ? <CustomPolicyBody text={custom} /> : (
          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Our Return Commitment</h2>
              <p>
                At Foodondoor (a brand of <strong>Foodondoor Private Limited</strong>), we take pride in the quality of our products. If you are not fully satisfied with your purchase, we are here to help. Please read our return policy carefully to understand the conditions and process for returning products.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Return Window</h2>
              <p>
                Returns must be initiated within <strong>7 days</strong> of the delivery date. Requests received after 7 days from delivery will not be accepted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Eligible Reasons for Return</h2>
              <p>We accept returns only in the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Damaged Product:</strong> The product was physically damaged during transit (broken packaging, crushed contents).</li>
                <li><strong>Defective Product:</strong> The product has quality issues (unusual smell, discoloration, foreign objects).</li>
                <li><strong>Wrong Product Delivered:</strong> You received a different product than what you ordered.</li>
                <li><strong>Expired Product:</strong> The product delivered was past its expiry date.</li>
                <li><strong>Incomplete Order:</strong> One or more items from your order were missing.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Non-Returnable Items</h2>
              <p>The following items are not eligible for return:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Products that have been opened and partially consumed (unless defective).</li>
                <li>Products with tampered or removed seals (unless defective).</li>
                <li>Products returned without original packaging.</li>
                <li>Returns initiated after 7 days from delivery.</li>
                <li>Products damaged due to improper storage by the customer.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. How to Initiate a Return</h2>
              <ol className="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <strong>Contact Us:</strong> Reach out within 7 days of delivery via:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>WhatsApp: <strong>+91 92431 77706</strong></li>
                    <li>Email: <a href="mailto:wecare@foodondoor.com" className="text-primary underline">wecare@foodondoor.com</a></li>
                  </ul>
                </li>
                <li><strong>Provide Details:</strong> Share your Order ID, the item(s) you wish to return, and the reason for return.</li>
                <li><strong>Submit Evidence:</strong> Attach clear photographs/videos of the damaged, defective, or wrong product.</li>
                <li><strong>Return Approval:</strong> Our team will review your request within 2 business days and confirm if the return is approved.</li>
                <li><strong>Return Pickup:</strong> If approved, we will arrange a reverse pickup from your delivery address at no additional cost to you.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Return Pickup Timeline</h2>
              <p>
                Once your return is approved, a reverse pickup will be arranged within <strong>3–5 business days</strong>. Please keep the product in its original packaging (or as received) for the pickup.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. Refund After Return</h2>
              <p>
                Once the returned product is received and inspected by our team:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>If the return is approved, a full refund will be processed within <strong>5–7 business days</strong> to your original payment method.</li>
                <li>For COD orders, refund will be via bank transfer or UPI within <strong>7–10 business days</strong>.</li>
                <li>You will be notified via SMS/WhatsApp once the refund is initiated.</li>
              </ul>
              <p className="mt-2">
                For detailed refund information, please refer to our <a href="/refund-policy" className="text-primary underline">Refund Policy</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Exchange Policy</h2>
              <p>
                We currently do not offer direct product exchanges. If you received a wrong or defective product, please initiate a return and place a fresh order for the correct product. The refund from your return will be credited to your original payment method.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact Us</h2>
              <p>
                For return-related queries, please contact:<br />
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
