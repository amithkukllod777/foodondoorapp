import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SEO from "@/components/SEO";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    title: "Orders & Shipping",
    items: [
      {
        question: "How long does delivery take?",
        answer:
          "Delivery takes 3-7 business days across India. Metro cities typically receive orders in 3-4 days, while other areas may take 5-7 days.",
      },
      {
        question: "Is there free shipping?",
        answer:
          "Yes! We offer free shipping on all orders above ₹499. For orders below ₹499, a small delivery charge applies.",
      },
      {
        question: "How can I track my order?",
        answer:
          "You can visit our Track Order page to check your order status. A tracking link is also sent via WhatsApp and email after your order is dispatched.",
      },
      {
        question: "Do you deliver all over India?",
        answer:
          "Yes, we offer pan-India delivery through our logistics partner Shiprocket, covering all major cities and towns across the country.",
      },
    ],
  },
  {
    title: "Products & Quality",
    items: [
      {
        question: "Are your products 100% natural?",
        answer:
          "Absolutely! All our products are 100% natural with no preservatives, no artificial colors, and no added flavors. Every batch is lab tested for purity and quality.",
      },
      {
        question: "What is the shelf life of your products?",
        answer:
          "Shelf life varies by product but is typically 6-12 months. Please check the packaging for the exact best-before date.",
      },
      {
        question: "Are your products FSSAI certified?",
        answer:
          "Yes, all our products comply with FSSAI (Food Safety and Standards Authority of India) standards and regulations.",
      },
      {
        question: "How should I store dry fruits?",
        answer:
          "Store your dry fruits in a cool, dry place away from direct sunlight. After opening, we recommend transferring them to airtight containers to maintain freshness.",
      },
    ],
  },
  {
    title: "Payments & Returns",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept UPI, Credit/Debit Cards, Net Banking, PhonePe, Razorpay, and Cash on Delivery (COD) for your convenience.",
      },
      {
        question: "What is your return policy?",
        answer:
          "We offer a 7-day return policy on damaged or wrong items. Please contact us within 48 hours of delivery with photos of the issue for a quick resolution.",
      },
      {
        question: "How do I get a refund?",
        answer:
          "Once your return is approved and the item is picked up, refunds are processed within 5-7 business days to your original payment method.",
      },
      {
        question: "Is COD available?",
        answer:
          "Yes, Cash on Delivery (COD) is available on most orders across India.",
      },
    ],
  },
];

// Flatten all questions for JSON-LD
const allQuestions = faqData.flatMap((cat) => cat.items);

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: allQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <span className="font-medium text-foreground text-sm sm:text-base">
          {item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setOpenIndex((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Frequently Asked Questions | Foodondoor"
        description="Find answers to common questions about Foodondoor's dry fruits, ordering, shipping, payments, and returns. Get help with your queries."
        url="/faq"
        keywords="nutriwow faq, dry fruits questions, nutriwow shipping, nutriwow returns, nutriwow payment methods"
        jsonLd={[faqJsonLd]}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Got questions? We have answers. Browse through the most common
            queries below.
          </p>

          <div className="space-y-8">
            {faqData.map((category, catIdx) => (
              <section key={catIdx}>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {category.title}
                </h2>
                <div className="space-y-3">
                  {category.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    return (
                      <AccordionItem
                        key={key}
                        item={item}
                        isOpen={openIndex === key}
                        onToggle={() => handleToggle(key)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
