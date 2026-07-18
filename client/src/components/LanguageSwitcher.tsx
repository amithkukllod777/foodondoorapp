/**
 * Language switcher — controlled by Settings → Languages.
 * When the admin enables more than one language, a Google Translate–powered
 * switcher appears so customers can translate the whole storefront. If only the
 * default language is enabled, nothing renders.
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

export default function LanguageSwitcher() {
  const { data } = trpc.settings.getPublic.useQuery();
  const language = (data as { language?: { default?: string; enabled?: string[] } } | undefined)?.language;
  const enabled = language?.enabled?.length ? language.enabled : ["en"];
  const pageLanguage = language?.default || "en";
  const show = enabled.length > 1;
  const includes = enabled.join(",");

  useEffect(() => {
    if (!show) return;
    const SCRIPT_ID = "google-translate-script";
    const g = () => (window as any).google;
    window.googleTranslateElementInit = () => {
      if (!g()?.translate?.TranslateElement) return;
      // Clear any previous widget before (re)initialising.
      const host = document.getElementById("google_translate_element");
      if (host) host.innerHTML = "";
      new (g().translate.TranslateElement)(
        { pageLanguage, includedLanguages: includes, autoDisplay: false },
        "google_translate_element",
      );
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(s);
    } else if (g()?.translate) {
      window.googleTranslateElementInit!();
    }
  }, [show, includes, pageLanguage]);

  if (!show) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px]" style={{ color: "#616161" }}>🌐</span>
      <div id="google_translate_element" />
    </div>
  );
}
