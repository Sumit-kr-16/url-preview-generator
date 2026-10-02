// =============================================================================
// URL Preview Generator — Popup Script
// =============================================================================

const form = document.getElementById("url-form");
const input = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const resultDiv = document.getElementById("result");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  setLoading(true);

  try {
    const response = await chrome.runtime.sendMessage({
      action: "getPreview",
      url,
    });

    if (response && response.success) {
      renderPreview(response.data);
    } else {
      renderError(response?.error || "Failed to load preview");
    }
  } catch (err) {
    renderError("Failed to connect to extension");
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? "Loading…" : "Preview";

  if (loading) {
    resultDiv.innerHTML = `
      <div class="card loading">
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
}

function renderPreview(preview) {
  const domain = getDomain(preview.url);
  const fallbackBadge = preview.isFallback
    ? `<span class="badge-fallback">Limited preview</span>`
    : "";

  const imageHtml = preview.image
    ? `<div class="card-image">
         <img src="${escapeAttr(preview.image)}" alt=""
              onerror="this.parentElement.style.display='none'" />
       </div>`
    : "";

  const descHtml = preview.description
    ? `<p class="card-description">${escapeHtml(preview.description)}</p>`
    : "";

  resultDiv.innerHTML = `
    <div class="card">
      ${imageHtml}
      <div class="card-content">
        <div class="card-site-info">
          ${preview.favicon ? `<img class="favicon" src="${escapeAttr(preview.favicon)}" alt="" onerror="this.style.display='none'" />` : ""}
          <span class="site-name">${escapeHtml(preview.siteName || domain)}</span>
          ${fallbackBadge}
        </div>
        <h3 class="card-title">${escapeHtml(preview.title)}</h3>
        ${descHtml}
        <a class="card-url" href="${escapeAttr(preview.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(preview.url)}
        </a>
      </div>
    </div>
  `;
}

function renderError(message) {
  resultDiv.innerHTML = `
    <div class="error-box">
      <span class="error-icon">⚠</span>
      <div>
        <strong>Something went wrong</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

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
