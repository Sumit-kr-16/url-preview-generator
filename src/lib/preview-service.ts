import type { UrlPreview } from "@/types/preview";
import { validateAndNormalizeUrl } from "./url-validator";
import { fetchWebpage } from "./fetch-webpage";
import { parseMetadata } from "./metadata-parser";
import { normalizeMetadata } from "./metadata-normalizer";
import { getCachedPreview, setCachedPreview } from "./cache";
import { createFallbackPreview } from "./fallback";

export async function getPreview(rawUrl: string): Promise<UrlPreview> {
  // 1. Validate and normalize URL
  const validation = validateAndNormalizeUrl(rawUrl);
  if (!validation.success) {
    throw new Error(validation.error);
  }
  const url = validation.url;

  // 2. Check cache
  const cached = getCachedPreview(url);
  if (cached) {
    return cached;
  }

  // 3. Fetch, parse, normalize — with fallback on failure
  let preview: UrlPreview;
  try {
    const { html, finalUrl } = await fetchWebpage(url);
    const rawMetadata = parseMetadata(html, finalUrl);
    preview = normalizeMetadata(rawMetadata, url);
  } catch (error) {
    console.error(`Failed to fetch preview for ${url}:`, error);
    preview = createFallbackPreview(url);
  }

  // 4. Cache result
  try {
    setCachedPreview(preview);
  } catch (error) {
    // Cache write failure is non-fatal
    console.error("Failed to cache preview:", error);
  }

  return preview;
}
