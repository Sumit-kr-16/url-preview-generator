// =============================================================================
// URL Preview Generator — Content Script
// Detects link hovers and typed URLs, renders tooltip preview cards
// =============================================================================

(() => {
  // -- Constants --------------------------------------------------------------

  const HOVER_DEBOUNCE_MS = 300;
  const LEAVE_GRACE_MS = 200;
  const TYPING_DEBOUNCE_MS = 800;
  const TOOLTIP_WIDTH = 360;
  const TOOLTIP_MARGIN = 8;
  const URL_PATTERN = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;

  // -- State ------------------------------------------------------------------

  let hoverTimer = null;
  let leaveTimer = null;
  let typingTimer = null;
  let tooltipHost = null;
  let shadowRoot = null;
  let cardEl = null;
  let currentAnchor = null;
  let currentInputEl = null;

  // -- Shadow DOM Tooltip Container -------------------------------------------

  function ensureTooltip() {
    if (tooltipHost) return;

    tooltipHost = document.createElement("div");
    tooltipHost.id = "url-preview-ext-tooltip";
    shadowRoot = tooltipHost.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = getTooltipStyles();
    shadowRoot.appendChild(style);

    cardEl = document.createElement("div");
    cardEl.className = "preview-card";
    shadowRoot.appendChild(cardEl);

    document.body.appendChild(tooltipHost);

    // Keep tooltip alive when hovering over it
    tooltipHost.addEventListener("mouseenter", () => {
      clearTimeout(leaveTimer);
    });
    tooltipHost.addEventListener("mouseleave", () => {
      removeTooltip();
    });
  }

  function removeTooltip() {
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    if (tooltipHost) {
      tooltipHost.style.display = "none";
    }
    currentAnchor = null;
    currentInputEl = null;
  }

  // -- Tooltip Positioning ----------------------------------------------------

  function positionTooltip(anchorRect) {
    if (!tooltipHost) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.left;
    let top = anchorRect.bottom + TOOLTIP_MARGIN;

    // Clamp horizontally
    if (left + TOOLTIP_WIDTH > vw - TOOLTIP_MARGIN) {
      left = vw - TOOLTIP_WIDTH - TOOLTIP_MARGIN;
    }
    if (left < TOOLTIP_MARGIN) {
      left = TOOLTIP_MARGIN;
    }

    // Flip above if not enough room below
    const estimatedHeight = 220;
    if (top + estimatedHeight > vh - TOOLTIP_MARGIN) {
      top = anchorRect.top - estimatedHeight - TOOLTIP_MARGIN;
    }
    if (top < TOOLTIP_MARGIN) {
      top = TOOLTIP_MARGIN;
    }

    tooltipHost.style.cssText = `
      display: block;
      position: fixed;
      left: ${left}px;
      top: ${top}px;
      z-index: 2147483647;
      width: ${TOOLTIP_WIDTH}px;
      pointer-events: auto;
    `;
  }

  // -- Render Functions -------------------------------------------------------

  function showLoading() {
    if (!cardEl) return;
    cardEl.innerHTML = `
      <div class="loading">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-site"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-desc"></div>
          <div class="skeleton skeleton-desc short"></div>
          <div class="skeleton skeleton-url"></div>
        </div>
      </div>
    `;
  }

  function renderPreview(preview) {
    if (!cardEl) return;

    const domain = getDomain(preview.url);
    const fallbackBadge = preview.isFallback
      ? `<span class="badge-fallback">Limited preview</span>`
      : "";

    const imageHtml = preview.image
      ? `<div class="preview-image">
           <img src="${escapeAttr(preview.image)}" alt="" loading="lazy"
                onerror="this.parentElement.style.display='none'" />
         </div>`
      : "";

    const descHtml = preview.description
      ? `<p class="preview-description">${escapeHtml(preview.description)}</p>`
      : "";

    cardEl.innerHTML = `
      ${imageHtml}
      <div class="preview-content">
        <div class="preview-site-info">
          ${preview.favicon ? `<img class="favicon" src="${escapeAttr(preview.favicon)}" alt="" onerror="this.style.display='none'" />` : ""}
          <span class="site-name">${escapeHtml(preview.siteName || domain)}</span>
          ${fallbackBadge}
        </div>
        <h3 class="preview-title">${escapeHtml(preview.title)}</h3>
        ${descHtml}
        <a class="preview-url" href="${escapeAttr(preview.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(preview.url)}
        </a>
      </div>
    `;
  }

  function showError(message) {
    if (!cardEl) return;
    cardEl.innerHTML = `
      <div class="preview-content error-content">
        <div class="error-icon">⚠</div>
        <p class="error-message">${escapeHtml(message)}</p>
      </div>
    `;
  }

  // -- Fetch Preview ----------------------------------------------------------

  async function fetchAndShowPreview(url, anchorRect) {
    ensureTooltip();
    positionTooltip(anchorRect);
    showLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        action: "getPreview",
        url,
      });

      // Check if tooltip was dismissed while fetching
      if (tooltipHost.style.display === "none") return;

      if (response && response.success) {
        renderPreview(response.data);
      } else {
        showError(response?.error || "Failed to load preview");
      }
    } catch (err) {
      if (tooltipHost.style.display === "none") return;
      showError("Failed to connect to extension");
    }
  }

  // -- Link Hover Detection ---------------------------------------------------

  document.addEventListener(
    "mouseover",
    (e) => {
      const link = e.target.closest("a[href]");
      if (!link || link === currentAnchor) return;

      const href = link.href;
      if (
        !href ||
        href.startsWith("javascript:") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      clearTimeout(hoverTimer);
      clearTimeout(leaveTimer);

      hoverTimer = setTimeout(() => {
        currentAnchor = link;
        currentInputEl = null;
        const rect = link.getBoundingClientRect();
        fetchAndShowPreview(href, rect);
      }, HOVER_DEBOUNCE_MS);
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;

      clearTimeout(hoverTimer);

      leaveTimer = setTimeout(() => {
        if (tooltipHost && tooltipHost.style.display !== "none") {
          // Check if mouse moved to the tooltip
          const tooltipRect = tooltipHost.getBoundingClientRect();
          // If mouse isn't over tooltip, remove it
          removeTooltip();
        }
      }, LEAVE_GRACE_MS);
    },
    true
  );

  // -- URL Typing Detection ---------------------------------------------------

  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (
        !el ||
        (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") ||
        el.type === "password" ||
        el.type === "email" ||
        el.type === "number"
      ) {
        return;
      }

      clearTimeout(typingTimer);

      typingTimer = setTimeout(() => {
        const value = (el.value || "").trim();
        if (value.length > 5 && URL_PATTERN.test(value)) {
          currentInputEl = el;
          currentAnchor = null;
          const rect = el.getBoundingClientRect();
          fetchAndShowPreview(value, rect);
        } else if (currentInputEl === el) {
          removeTooltip();
        }
      }, TYPING_DEBOUNCE_MS);
    },
    true
  );

  // -- Dismiss on outside click -----------------------------------------------

  document.addEventListener(
    "click",
    (e) => {
      if (tooltipHost && !tooltipHost.contains(e.target)) {
        removeTooltip();
      }
    },
    true
  );

  // -- Dismiss on scroll ------------------------------------------------------

  window.addEventListener("scroll", () => removeTooltip(), { passive: true });

  // -- Utilities --------------------------------------------------------------

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  // -- Tooltip Styles (injected into Shadow DOM) ------------------------------

  function getTooltipStyles() {
    return `
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .preview-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #1f2937;
        animation: fadeIn 0.15s ease-out;
      }

      @media (prefers-color-scheme: dark) {
        .preview-card {
          background: #1f2937;
          border-color: #374151;
          color: #f3f4f6;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0, 0, 0, 0.3);
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Image */
      .preview-image {
        width: 100%;
        height: 160px;
        overflow: hidden;
        background: #f3f4f6;
      }

      @media (prefers-color-scheme: dark) {
        .preview-image { background: #374151; }
      }

      .preview-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      /* Content */
      .preview-content {
        padding: 14px;
      }

      .preview-site-info {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }

      .favicon {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        flex-shrink: 0;
      }

      .site-name {
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (prefers-color-scheme: dark) {
        .site-name { color: #9ca3af; }
      }

      .badge-fallback {
        font-size: 10px;
        font-weight: 500;
        background: #fef3c7;
        color: #b45309;
        padding: 1px 6px;
        border-radius: 9999px;
        white-space: nowrap;
      }

      @media (prefers-color-scheme: dark) {
        .badge-fallback {
          background: rgba(180, 83, 9, 0.2);
          color: #fbbf24;
        }
      }

      .preview-title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.3;
        margin-bottom: 4px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .preview-description {
        font-size: 13px;
        color: #4b5563;
        line-height: 1.4;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      @media (prefers-color-scheme: dark) {
        .preview-description { color: #d1d5db; }
      }

      .preview-url {
        font-size: 12px;
        color: #2563eb;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }

      .preview-url:hover {
        text-decoration: underline;
      }

      @media (prefers-color-scheme: dark) {
        .preview-url { color: #60a5fa; }
      }

      /* Error */
      .error-content {
        text-align: center;
        padding: 20px 14px;
      }

      .error-icon {
        font-size: 24px;
        margin-bottom: 6px;
      }

      .error-message {
        font-size: 13px;
        color: #dc2626;
      }

      @media (prefers-color-scheme: dark) {
        .error-message { color: #f87171; }
      }

      /* Loading Skeleton */
      .loading {
        overflow: hidden;
      }

      .skeleton {
        background: #e5e7eb;
        border-radius: 4px;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @media (prefers-color-scheme: dark) {
        .skeleton { background: #374151; }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .skeleton-image {
        width: 100%;
        height: 160px;
        border-radius: 0;
      }

      .skeleton-body {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .skeleton-site {
        width: 80px;
        height: 14px;
      }

      .skeleton-title {
        width: 75%;
        height: 18px;
      }

      .skeleton-desc {
        width: 100%;
        height: 14px;
      }

      .skeleton-desc.short {
        width: 60%;
      }

      .skeleton-url {
        width: 50%;
        height: 12px;
      }
    `;
  }
})();
