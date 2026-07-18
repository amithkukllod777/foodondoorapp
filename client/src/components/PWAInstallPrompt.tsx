import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download } from "lucide-react";

/**
 * PWA Install Prompt — shows a subtle clay-styled bottom banner
 * prompting the user to install the app on their 2nd+ visit.
 * Only appears on devices where `beforeinstallprompt` fires (Android/desktop Chrome).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "nutriwow_visit_count";
const DISMISSED_KEY = "nutriwow_pwa_dismissed";

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already dismissed or already installed (standalone)
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    // Only show from 2nd visit onward
    if (visits < 2) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredPrompt.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up sm:left-auto sm:right-6 sm:max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-clay">
        {/* App icon */}
        <img
          src="/icon-192.png"
          alt="Foodondoor"
          className="h-12 w-12 shrink-0 rounded-xl"
        />

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm font-semibold text-gray-800 leading-tight">
            Install Foodondoor App
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Quick access &amp; offline browsing
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-nutrigreen px-4 py-2 text-sm font-semibold text-white shadow-clay-btn transition-transform active:translate-y-0.5"
        >
          <Download className="h-4 w-4" />
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
