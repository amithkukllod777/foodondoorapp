import DOMPurify from "dompurify";

/**
 * Sanitize admin-authored blog HTML before injecting it via
 * dangerouslySetInnerHTML. Blog posts are stored as raw HTML and rendered on
 * public pages, so without sanitization a malicious or compromised author could
 * store XSS (script tags, onerror/onclick handlers, javascript: URLs) that runs
 * in every visitor's browser. DOMPurify's default HTML profile keeps the
 * formatting tags the editor produces (headings, lists, links, images,
 * blockquotes, etc.) and strips everything that can execute.
 *
 * Sanitizing at the render boundary (not just on write) also protects content
 * that was already stored before this guard existed.
 */
export function sanitizeBlogHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } });
}
