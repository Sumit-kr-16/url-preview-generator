import * as cheerio from "cheerio";

export interface RawMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

/**
 * Extract metadata from HTML using a priority-based approach:
 * 1. Open Graph tags (og:*)
 * 2. Twitter Card tags (twitter:*)
 * 3. Standard HTML meta tags
 * 4. Fallback to <title> and other elements
 */
export function parseMetadata(html: string, pageUrl: string): RawMetadata {
  const $ = cheerio.load(html);

  const title = getTitle($);
  const description = getDescription($);
  const image = getImage($, pageUrl);
  const siteName = getSiteName($);
  const favicon = getFavicon($, pageUrl);

  return { title, description, image, siteName, favicon };
}

function getTitle($: cheerio.CheerioAPI): string | null {
  return (
    getMeta($, "og:title") ||
    getMeta($, "twitter:title") ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    null
  );
}

function getDescription($: cheerio.CheerioAPI): string | null {
  return (
    getMeta($, "og:description") ||
    getMeta($, "twitter:description") ||
    getMetaByName($, "description") ||
    null
  );
}

function getImage($: cheerio.CheerioAPI, pageUrl: string): string | null {
  const raw =
    getMeta($, "og:image") ||
    getMeta($, "twitter:image") ||
    getMeta($, "twitter:image:src") ||
    null;

  if (!raw) return null;
  return resolveUrl(raw, pageUrl);
}

function getSiteName($: cheerio.CheerioAPI): string | null {
  return (
    getMeta($, "og:site_name") ||
    getMetaByName($, "application-name") ||
    null
  );
}

function getFavicon($: cheerio.CheerioAPI, pageUrl: string): string | null {
  // Check link tags for favicon
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomputed"]',
  ];

  for (const selector of iconSelectors) {
    const href = $(selector).first().attr("href");
    if (href) {
      return resolveUrl(href, pageUrl);
    }
  }

  // Fallback to /favicon.ico
  try {
    const base = new URL(pageUrl);
    return `${base.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

function getMeta($: cheerio.CheerioAPI, property: string): string | null {
  const content =
    $(`meta[property="${property}"]`).attr("content") ||
    $(`meta[name="${property}"]`).attr("content");
  return content?.trim() || null;
}

function getMetaByName($: cheerio.CheerioAPI, name: string): string | null {
  const content = $(`meta[name="${name}"]`).attr("content");
  return content?.trim() || null;
}

function resolveUrl(raw: string, base: string): string {
  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}
