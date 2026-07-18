/**
 * Cookie consent banner — controlled by Settings → Privacy.
 * Shows a dismissible banner to new visitors when the admin enables it.
 * The visitor's choice is remembered in localStorage so it won't show again.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "nutriwow_cookie_consent";
const DEFAULT_MESSAGE =
  "We use cookies to improve your experience, analyse traffic, and for marketing. By continuing, you accept our use of cookies.";

export default function CookieBanner() {
  const { data } = trpc.settings.getPublic.useQuery();
  const privacy = (data as { privacy?: { cookieBanner?: boolean; cookieMessage?: string } } | undefined)?.privacy;
  const enabled = privacy?.cookieBanner === true;
  const message = privacy?.cookieMessage?.trim() || DEFAULT_MESSAGE;

  const [accepted, setAccepted] = useState(true);
  useEffect(() => {
    try { setAccepted(localStorage.getItem(STORAGE_KEY) === "1"); } catch { setAccepted(false); }
  }, []);

  if (!enabled || accepted) return null;

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setAccepted(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 sm:p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-clay-lg rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-[13px] text-gray-600 flex-1 leading-relaxed">{message}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="/privacy-policy" className="text-[12px] font-medium text-gray-500 hover:text-gray-700 underline px-2">
            Learn more
          </a>
          <button
            onClick={accept}
            className="px-4 py-2 bg-nutrigreen text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
