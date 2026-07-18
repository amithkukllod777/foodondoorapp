/**
 * Policy content override — lets the admin Settings → Policies tab replace a
 * storefront policy page's body with custom text. If the admin has saved
 * content for a policy key, that text is shown; otherwise the page renders its
 * own default (hardcoded) content.
 */
import { trpc } from "@/lib/trpc";

/** Returns the admin-saved policy text for `key`, or null to use the default. */
export function useCustomPolicy(key: string): string | null {
  const { data } = trpc.settings.getPublic.useQuery();
  const policies = (data as { policies?: Record<string, string> } | undefined)?.policies;
  const val = policies?.[key]?.trim();
  return val ? val : null;
}

/** Renders admin-saved policy text, preserving line breaks. */
export function CustomPolicyBody({ text }: { text: string }) {
  return (
    <div className="prose prose-gray max-w-none text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );
}
