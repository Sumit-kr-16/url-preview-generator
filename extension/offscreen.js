// =============================================================================
// URL Preview Generator — Offscreen Document
// Handles HTML parsing using DOMParser (not available in service workers)
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseHTML") {
    const result = parseMetadata(message.html, message.pageUrl);
    sendResponse(result);
  }
});

function parseMetadata(html, pageUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const title = getTitle(doc);
  const description = getDescription(doc);
  const image = getImage(doc, pageUrl);
  const siteName = getSiteName(doc);
  const favicon = getFavicon(doc, pageUrl);

  return { title, description, image, siteName, favicon };
}

function getTitle(doc) {
  return (
    getMetaContent(doc, "og:title") ||
    getMetaContent(doc, "twitter:title") ||
    doc.querySelector("title")?.textContent?.trim() ||
    doc.querySelector("h1")?.textContent?.trim() ||
    null
  );
}

function getDescription(doc) {
  return (
    getMetaContent(doc, "og:description") ||
    getMetaContent(doc, "twitter:description") ||
    getMetaByName(doc, "description") ||
    null
  );
}

function getImage(doc, pageUrl) {
  const raw =
    getMetaContent(doc, "og:image") ||
    getMetaContent(doc, "twitter:image") ||
    getMetaContent(doc, "twitter:image:src") ||
    null;

  if (!raw) return null;
  return resolveUrl(raw, pageUrl);
}

function getSiteName(doc) {
  return (
    getMetaContent(doc, "og:site_name") ||
    getMetaByName(doc, "application-name") ||
    null
  );
}

function getFavicon(doc, pageUrl) {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomputed"]',
  ];

  for (const selector of selectors) {
    const href = doc.querySelector(selector)?.getAttribute("href");
    if (href) return resolveUrl(href, pageUrl);
  }

  try {
    return new URL("/favicon.ico", pageUrl).href;
  } catch {
    return null;
  }
}

function getMetaContent(doc, property) {
  const el =
    doc.querySelector(`meta[property="${property}"]`) ||
    doc.querySelector(`meta[name="${property}"]`);
  return el?.getAttribute("content")?.trim() || null;
}

function getMetaByName(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute("content")?.trim() || null;
}

function resolveUrl(raw, base) {
  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}
