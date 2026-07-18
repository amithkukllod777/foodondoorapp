import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-clay-lg flex items-center justify-center hover:brightness-110 transition-all active:translate-y-0.5"
      aria-label="Scroll to top"
    >
      <ChevronUp size={20} />
    </button>
  );
}
