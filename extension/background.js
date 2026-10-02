// =============================================================================
// URL Preview Generator — Chrome Extension Service Worker
// =============================================================================

// -- Constants ----------------------------------------------------------------

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DESCRIPTION_LENGTH = 300;
const CACHE_PREFIX = "preview_";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; URLPreviewBot/1.0; +https://github.com/url-preview)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// -- URL Validation -----------------------------------------------------------

function validateAndNormalizeUrl(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return { success: false, error: "URL is required" };

  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = "https://" + urlString;
  }

  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { success: false, error: "Invalid URL format" };
    }
    return { success: true, url: parsed.href };
  } catch {
    return { success: false, error: "Invalid URL format" };
  }
}

// -- Webpage Fetching ---------------------------------------------------------

async function fetchWebpage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const chunks = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const actualSize = Math.min(totalBytes, MAX_BODY_BYTES);
    const merged = new Uint8Array(actualSize);
    let offset = 0;
    for (const chunk of chunks) {
      const remaining = merged.byteLength - offset;
      if (chunk.byteLength > remaining) {
        merged.set(chunk.subarray(0, remaining), offset);
        break;
      }
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    const finalUrl = response.url || url;
    return { html, finalUrl };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// -- Offscreen Document Management --------------------------------------------

let offscreenCreated = false;

async function ensureOffscreenDocument() {
  if (offscreenCreated) return;

  // Check if already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Parse HTML to extract metadata for URL previews",
  });
  offscreenCreated = true;
}

async function parseMetadataViaOffscreen(html, pageUrl) {
  await ensureOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "parseHTML", html, pageUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// -- Metadata Normalization ---------------------------------------------------

function normalizeMetadata(raw, url, isFallback = false) {
  const now = new Date();
  const ttl = isFallback ? FALLBACK_TTL_MS : CACHE_TTL_MS;

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
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
    isFallback,
  };
}

function truncate(text, maxLength) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 1) + "…";
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// -- Fallback Preview ---------------------------------------------------------

function createFallbackPreview(url) {
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
    expiresAt: new Date(now.getTime() + FALLBACK_TTL_MS).toISOString(),
    isFallback: true,
  };
}

// -- Cache (chrome.storage.local) ---------------------------------------------

async function getCachedPreview(url) {
  const key = CACHE_PREFIX + url;
  const result = await chrome.storage.local.get(key);
  const cached = result[key];

  if (!cached) return null;

  if (cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
    await chrome.storage.local.remove(key);
    return null;
  }

  return cached;
}

async function setCachedPreview(url, preview) {
  const key = CACHE_PREFIX + url;
  await chrome.storage.local.set({ [key]: preview });
}

// -- Request Deduplication ----------------------------------------------------

const pendingRequests = new Map();

// -- Preview Pipeline ---------------------------------------------------------

async function getPreview(rawUrl) {
  const validation = validateAndNormalizeUrl(rawUrl);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }
  const url = validation.url;

  // Deduplicate concurrent requests
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const promise = (async () => {
    // Check cache
    const cached = await getCachedPreview(url);
    if (cached) {
      return { success: true, data: cached };
    }

    // Fetch, parse via offscreen document, normalize
    let preview;
    try {
      const { html, finalUrl } = await fetchWebpage(url);
      const raw = await parseMetadataViaOffscreen(html, finalUrl);
      preview = normalizeMetadata(raw, url);
    } catch (err) {
      console.error("Preview fetch failed:", err);
      preview = createFallbackPreview(url);
    }

    // Cache result
    try {
      await setCachedPreview(url, preview);
    } catch (err) {
      console.error("Cache write failed:", err);
    }

    return { success: true, data: preview };
  })();

  pendingRequests.set(url, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(url);
  }
}

// -- Message Handler ----------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPreview" && message.url) {
    getPreview(message.url)
      .then(sendResponse)
      .catch((err) =>
        sendResponse({ success: false, error: err.message || "Unknown error" })
      );
    return true; // Keep the message channel open for async response
  }
});
