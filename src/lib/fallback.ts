import type { UrlPreview } from "@/types/preview";

/**
 * Generate a fallback preview when fetching or parsing fails.
 * Always returns something usable so the UI never breaks.
 */
export function createFallbackPreview(url: string): UrlPreview {
  const domain = extractDomain(url);
  const now = new Date();

  return {
    url,
    title: domain,
    description: "Preview could not be loaded for this URL.",
    image: null,
    siteName: domain,
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), // 5 min cache for fallbacks
    isFallback: true,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
