import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { optImg } from "@/lib/img";

const SESSION_KEY = "socialProofShownCount";
const MAX_NOTIFICATIONS = 5;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Pages where the toast should appear */
function shouldShow(path: string): boolean {
  if (path === "/") return true;
  if (path.startsWith("/products/")) return true;
  return false;
}

type Purchase = {
  productName: string;
  productImage: string;
  city: string;
  createdAt: string;
};

export default function SocialProofToast() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Purchase | null>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: purchases } = trpc.orders.recentPurchases.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: shouldShow(location),
  });

  const getShownCount = useCallback((): number => {
    try {
      return parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  }, []);

  const incrementShown = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, String(getShownCount() + 1));
    } catch {}
  }, [getShownCount]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  const showNext = useCallback(() => {
    if (!purchases || purchases.length === 0) return;
    if (getShownCount() >= MAX_NOTIFICATIONS) return;
    if (!shouldShow(location)) return;

    const idx = indexRef.current % purchases.length;
    setCurrent(purchases[idx]);
    indexRef.current = idx + 1;
    setVisible(true);
    incrementShown();

    // Auto-dismiss after 4 seconds
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 4000);
  }, [purchases, location, getShownCount, incrementShown]);

  useEffect(() => {
    if (!purchases || purchases.length === 0) return;
    if (!shouldShow(location)) return;
    if (getShownCount() >= MAX_NOTIFICATIONS) return;

    // First show after a 5-second delay
    const initialDelay = setTimeout(() => {
      showNext();

      // Then schedule recurring shows every 15-20 seconds
      const scheduleNext = () => {
        const delay = 15000 + Math.random() * 5000;
        timerRef.current = setTimeout(() => {
          if (getShownCount() < MAX_NOTIFICATIONS && shouldShow(location)) {
            showNext();
            scheduleNext();
          }
        }, delay);
      };
      scheduleNext();
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [purchases, location, getShownCount, showNext]);

  if (!current || !shouldShow(location)) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 max-w-[280px] transition-all duration-500 ease-out
        sm:bottom-4 bottom-20
        ${visible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`}
    >
      <div className="bg-card rounded-2xl shadow-clay-lg p-3 relative">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-[10px] leading-none"
          aria-label="Close notification"
        >
          &#x2715;
        </button>

        <div className="flex items-center gap-2.5 pr-4">
          {/* Product image */}
          {current.productImage ? (
            <img
              src={optImg(current.productImage, 64, 60)}
              alt=""
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-clay-green flex-shrink-0" />
          )}

          <div className="min-w-0">
            {/* Live indicator + city */}
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                Someone in {current.city}
              </span>
            </div>
            {/* Product name */}
            <p className="text-[12px] font-semibold text-foreground leading-tight truncate">
              purchased {current.productName}
            </p>
            {/* Time ago */}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {timeAgo(current.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
