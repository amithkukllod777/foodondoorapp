import { useEffect } from "react";

const UTM_STORAGE_KEY = "nutriwow_utm";
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export interface UtmData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export function useUtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasUtm = UTM_PARAMS.some((p) => params.has(p));
    if (!hasUtm) return;

    const data: UtmData = {};
    if (params.get("utm_source")) data.utmSource = params.get("utm_source")!;
    if (params.get("utm_medium")) data.utmMedium = params.get("utm_medium")!;
    if (params.get("utm_campaign")) data.utmCampaign = params.get("utm_campaign")!;
    if (params.get("utm_content")) data.utmContent = params.get("utm_content")!;
    if (params.get("utm_term")) data.utmTerm = params.get("utm_term")!;

    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
  }, []);
}

export function getStoredUtm(): UtmData | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
