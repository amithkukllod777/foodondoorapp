/**
 * Terms and Conditions Page
 * Required by PhonePe for payment gateway URL whitelisting
 */

import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useCustomPolicy, CustomPolicyBody } from "@/components/PolicyContent";

export default function TermsAndConditions() {
  const custom = useCustomPolicy("terms");
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Terms and Conditions | Nutriwow"
        description="Read the Terms and Conditions for using Nutriwow's website and purchasing our premium dry fruits, nuts, and healthy snacks."
        url="/terms-and-conditions"
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: April 27, 2025</p>

          {custom ? <CustomPolicyBody text={custom} /> : (
          <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the website <strong>www.nutriwow.in</strong> ("Website"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our Website. These terms apply to all visitors, users, and customers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">2. Business Information</h2>
              <p>
                Nutriwow is a brand of <strong>Foodondoor Private Limited</strong>, a company registered under the laws of India. We sell premium dry fruits, nuts, seeds, and healthy snacks online across India.
              </p>
              <p className="mt-2">
                <strong>Registered Company Name:</strong> Foodondoor Private Limited<br />
                <strong>Registered Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh, India – 466001<br />
                <strong>FSSAI Licence No.:</strong> 11424999000246<br />
                <strong>Email:</strong> <a href="mailto:wecare@nutriwow.in" className="text-primary underline">wecare@nutriwow.in</a><br />
                <strong>Website:</strong> www.nutriwow.in
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">3. Products and Pricing</h2>
              <p>
                All products listed on the Website are priced in Indian Rupees (INR). Prices are inclusive of applicable taxes unless stated otherwise. We reserve the right to change prices at any time without prior notice. Product images are for illustrative purposes only; actual product appearance may vary slightly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">4. Orders and Payments</h2>
              <p>
                By placing an order, you confirm that the information provided is accurate and complete. We accept payments via UPI, credit/debit cards, net banking, and Cash on Delivery (COD) where available. All online payments are processed securely through PhonePe Payment Gateway. We reserve the right to cancel any order in case of pricing errors, stock unavailability, or suspected fraudulent activity.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">5. Delivery</h2>
              <p>
                We deliver across India. Estimated delivery timelines are 3–7 business days depending on your location. Delivery timelines are indicative and may vary due to courier delays, public holidays, or unforeseen circumstances. Free shipping is available on orders above ₹499.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">6. Intellectual Property</h2>
              <p>
                All content on this Website, including text, images, logos, and product descriptions, is the property of Nutriwow India and is protected by applicable intellectual property laws. You may not reproduce, distribute, or use any content without prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">7. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss resulting from unauthorized access to your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Nutriwow India shall not be liable for any indirect, incidental, or consequential damages arising from the use of our Website or products. Our total liability shall not exceed the amount paid by you for the specific order in question.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">9. Governing Law</h2>
              <p>
                These Terms and Conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Sehore, Madhya Pradesh, India.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">10. Changes to Terms</h2>
              <p>
                We reserve the right to update these Terms and Conditions at any time. Changes will be effective immediately upon posting to the Website. Continued use of the Website after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact Us</h2>
              <p>
                For any questions regarding these Terms and Conditions, please contact us at:<br />
                <strong>Company:</strong> Foodondoor Private Limited<br />
                <strong>Address:</strong> Sherpur Square, Indore Bhopal Highway, Sehore, Madhya Pradesh – 466001<br />
                <strong>Email:</strong> <a href="mailto:wecare@nutriwow.in" className="text-primary underline">wecare@nutriwow.in</a><br />
                <strong>WhatsApp:</strong> +91 95463 34633<br />
                <strong>Website:</strong> www.nutriwow.in
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
