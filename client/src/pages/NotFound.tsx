import { Home } from "lucide-react";
import { useLocation } from "wouter";
import SEO from "@/components/SEO";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Page Not Found | Foodondoor"
        description="The page you're looking for doesn't exist. Browse our premium dry fruits and healthy snacks collection."
        noIndex={true}
      />
      <AnnouncementBar />
      <Header />

      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center px-4">
          <p className="text-7xl font-bold text-gray-200 mb-4">404</p>
          <h1 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Sorry, the page you are looking for doesn't exist or has been moved. Let's get you back to shopping!
          </p>
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Home size={16} />
            Back to Home
          </button>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
