import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Detect device type from user agent
 */
function getDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

/**
 * Detect browser from user agent
 */
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

/**
 * Detect OS from user agent
 */
function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Other";
}

/**
 * Get or create a session ID for this browser session
 */
function getSessionId(): string {
  let sid = sessionStorage.getItem("nw_session_id");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("nw_session_id", sid);
  }
  return sid;
}

/**
 * Hook that logs page views to the backend on every route change.
 * Place this in App.tsx or a top-level layout component.
 */
export function usePageTracker() {
  const [location] = useLocation();
  const logView = trpc.analytics.logView.useMutation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    // Don't log admin pages or duplicate same-path
    if (location.startsWith("/admin")) return;
    if (location === lastPath.current) return;
    lastPath.current = location;

    logView.mutate({
      path: location,
      referrer: document.referrer || undefined,
      device: getDevice(),
      browser: getBrowser(),
      os: getOS(),
      sessionId: getSessionId(),
    });
  }, [location]);
}
