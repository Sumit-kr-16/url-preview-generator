import type { RawMetadata } from "./metadata-parser";
import type { UrlPreview } from "@/types/preview";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_DESCRIPTION_LENGTH = 300;

export function normalizeMetadata(
  raw: RawMetadata,
  url: string,
  isFallback: boolean = false
): UrlPreview {
  const now = new Date();

  return {
    url,
    title: truncate(raw.title || extractDomain(url), 200),
    description: raw.description
      ? truncate(raw.description, MAX_DESCRIPTION_LENGTH)
      : null,
    image: raw.image || null,
    siteName: raw.siteName || extractDomain(url),
    favicon: raw.favicon || null,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
    isFallback,
  };
}

function truncate(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 1) + "…";
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
