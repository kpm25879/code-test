/* ================================================================
   WP → Markdown Converter · script.js
   Pure browser JS — no dependencies beyond turndown.js & zip.js
   ================================================================ */

"use strict";

// ── Turndown instance ──────────────────────────────────────────
const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  strongDelimiter: "**",
  emDelimiter: "_",
});

// Remove noise elements from conversion
td.remove(["script", "style", "iframe", "noscript", "form", "nav", "aside", ".sharedaddy", ".jetpack-related-posts"]);

// Keep images
td.addRule("images", {
  filter: "img",
  replacement(_, node) {
    const alt = (node.getAttribute("alt") || "").replace(/"/g, "'");
    const src = node.getAttribute("src") || node.getAttribute("data-src") || "";
    return src ? `![${alt}](${src})` : "";
  },
});

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const panelSingle   = $("panel-single");
const panelBatch    = $("panel-batch");
const inputSingle   = $("single-url");
const inputBatch    = $("batch-urls");
const btnSingle     = $("btn-convert-single");
const btnBatch      = $("btn-convert-batch");
const loaderWrap    = $("loader");
const loaderText    = $("loader-text");
const errorBox      = $("error-box");
const errorMsg      = $("error-msg");
const outputPanel   = $("output-panel");
const outputMeta    = $("output-meta");
const previewCode   = $("preview-code");
const btnCopy       = $("btn-copy");
const btnDownload   = $("btn-download");
const batchProgress = $("batch-progress");
const progressBar   = $("progress-bar");
const progressLabel = $("progress-label");
const progressList  = $("progress-list");
const tabBtns       = document.querySelectorAll(".tab-btn");

// ── State ─────────────────────────────────────────────────────
let currentMarkdown = "";
let currentFilename = "post.md";

// ================================================================
// TAB SWITCHING
// ================================================================
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mode = btn.dataset.mode;
    panelSingle.classList.toggle("hidden", mode !== "single");
    panelBatch.classList.toggle("hidden",  mode !== "batch");
    hideAll();
  });
});

// ================================================================
// SINGLE CONVERSION
// ================================================================
btnSingle.addEventListener("click", async () => {
  const url = inputSingle.value.trim();
  if (!url) return showError("Please paste a WordPress post URL.");
  hideAll();
  showLoader("Fetching post…");
  try {
    const md = await convertURL(url);
    currentMarkdown = md;
    currentFilename = slugFromURL(url) + ".md";
    showOutput(url);
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoader();
  }
});

inputSingle.addEventListener("keydown", e => {
  if (e.key === "Enter") btnSingle.click();
});

// ================================================================
// BATCH CONVERSION
// ================================================================
btnBatch.addEventListener("click", async () => {
  const raw = inputBatch.value.trim();
  if (!raw) return showError("Please paste at least one URL.");

  const urls = raw.split(/\n+/).map(l => l.trim()).filter(l => l.startsWith("http"));
  if (!urls.length) return showError("No valid URLs found. Each URL must start with http.");

  hideAll();
  showBatchProgress(urls);
  btnBatch.disabled = true;

  const zip = new JSZip();
  let done = 0;

  for (const url of urls) {
    updateProgressItem(url, "pending", "⋯ converting…");
    setLoader(`Converting ${done + 1} / ${urls.length}…`);
    try {
      const md = await convertURL(url);
      const fname = slugFromURL(url) + ".md";
      zip.file(fname, md);
      done++;
      updateProgressItem(url, "ok", "✓ done");
    } catch (e) {
      done++;
      updateProgressItem(url, "err", "✕ " + e.message);
    }
    progressBar.style.width = Math.round((done / urls.length) * 100) + "%";
    progressLabel.textContent = `${done} / ${urls.length} converted`;
  }

  // Generate ZIP
  updateLoaderText("Packaging ZIP…");
  try {
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, "wordpress-posts.zip");
  } catch {
    showError("Failed to generate ZIP file.");
  }

  hideLoader();
  btnBatch.disabled = false;
});

// ================================================================
// CORE CONVERSION PIPELINE
// ================================================================
async function convertURL(rawURL) {
  const { base, slug } = parseURL(rawURL);
  setLoader(`Fetching post "${slug}"…`);

  const post = await fetchPost(base, slug);

  setLoader("Resolving metadata…");
  const [author, categories, tags, featuredImage] = await Promise.all([
    fetchAuthor(base, post.author),
    fetchCategories(base, post.categories || []),
    fetchTags(base, post.tags || []),
    fetchFeaturedImage(base, post.featured_media),
  ]);

  setLoader("Converting HTML to Markdown…");
  const md = generateMarkdown({ post, author, categories, tags, featuredImage, rawURL });
  return md;
}

// ================================================================
// URL PARSING
// ================================================================
function parseURL(rawURL) {
  let url;
  try {
    url = new URL(rawURL.trim());
  } catch {
    throw new Error("Invalid URL. Make sure it starts with https://");
  }
  const base = url.origin;
  // Extract the last meaningful path segment as slug
  const parts = url.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (!parts.length) throw new Error("Could not extract a slug from the URL. Make sure it's a post link.");
  const slug = parts[parts.length - 1];
  return { base, slug };
}

function slugFromURL(rawURL) {
  try {
    const { slug } = parseURL(rawURL);
    return slug;
  } catch {
    return "post";
  }
}

// ================================================================
// FETCH POST
// ================================================================
async function fetchPost(base, slug) {
  const url = `${base}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=0`;
  const res = await safeFetch(url, `Cannot reach WordPress REST API at ${base}. Make sure the site has the API enabled.`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Post not found for slug "${slug}". Check the URL and try again.`);
  }
  return data[0];
}

// ================================================================
// FETCH AUTHOR
// ================================================================
async function fetchAuthor(base, authorId) {
  if (!authorId) return "Unknown";
  try {
    const url = `${base}/wp-json/wp/v2/users/${authorId}`;
    const res = await safeFetch(url);
    const data = await res.json();
    return data.name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// ================================================================
// FETCH CATEGORIES
// ================================================================
async function fetchCategories(base, ids) {
  if (!ids || !ids.length) return [];
  try {
    const names = await Promise.all(ids.map(async id => {
      const res = await safeFetch(`${base}/wp-json/wp/v2/categories/${id}`);
      const data = await res.json();
      return data.name || String(id);
    }));
    return names;
  } catch {
    return [];
  }
}

// ================================================================
// FETCH TAGS
// ================================================================
async function fetchTags(base, ids) {
  if (!ids || !ids.length) return [];
  try {
    const names = await Promise.all(ids.map(async id => {
      const res = await safeFetch(`${base}/wp-json/wp/v2/tags/${id}`);
      const data = await res.json();
      return data.name || String(id);
    }));
    return names;
  } catch {
    return [];
  }
}

// ================================================================
// FETCH FEATURED IMAGE
// ================================================================
async function fetchFeaturedImage(base, mediaId) {
  if (!mediaId) return "";
  try {
    const res = await safeFetch(`${base}/wp-json/wp/v2/media/${mediaId}`);
    const data = await res.json();
    return data.source_url || data.link || "";
  } catch {
    return "";
  }
}

// ================================================================
// CONVERT HTML → MARKDOWN
// ================================================================
function convertHTMLtoMarkdown(html) {
  if (!html) return "";
  // Sanitize: strip script/style content before passing to Turndown
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/class="[^"]*"/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  return td.turndown(clean);
}

// ================================================================
// GENERATE MARKDOWN
// ================================================================
function generateMarkdown({ post, author, categories, tags, featuredImage, rawURL }) {
  const title       = decodeHTMLEntities(post.title?.rendered || "Untitled");
  const description = decodeHTMLEntities(stripHTML(post.excerpt?.rendered || ""));
  const date        = post.date ? post.date.split("T")[0] : "";
  const content     = convertHTMLtoMarkdown(post.content?.rendered || "");

  const catStr  = categories.length ? `[${categories.map(c => `"${c}"`).join(", ")}]` : "[]";
  const tagStr  = tags.length       ? `[${tags.map(t => `"${t}"`).join(", ")}]`       : "[]";

  const frontmatter = [
    "---",
    `title: "${escapeYAML(title)}"`,
    `description: "${escapeYAML(description)}"`,
    `author: "${escapeYAML(author)}"`,
    `date: ${date}`,
    `categories: ${catStr}`,
    `tags: ${tagStr}`,
    `source: ${rawURL.trim()}`,
    featuredImage ? `featured_image: ${featuredImage}` : null,
    "---",
  ].filter(l => l !== null).join("\n");

  return `${frontmatter}\n\n${content.trim()}\n`;
}

// ================================================================
// DOWNLOAD MARKDOWN
// ================================================================
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, filename);
}

// ================================================================
// BATCH ZIP
// ================================================================
function createZip() {
  return new JSZip();
}

// ================================================================
// UTILITIES
// ================================================================
// CORS proxy list — tried in order on failure
const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function safeFetch(url, customErr) {
  // 1. Try direct request first
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res;
    if (res.status === 404) throw new Error(customErr || `Post not found (404): ${url}`);
    // Non-404 server error — fall through to proxies
  } catch (e) {
    // If it's our own 404 error, rethrow immediately
    if (e.message.includes("404") || e.message.includes("not found")) throw e;
    // Otherwise it's likely a CORS/network error — try proxies
  }

  // 2. Try each CORS proxy in sequence
  for (const makeProxy of CORS_PROXIES) {
    const proxyURL = makeProxy(url);
    try {
      const res = await fetch(proxyURL, { headers: { Accept: "application/json" } });
      if (res.ok) return res;
    } catch {
      // Try next proxy
    }
  }

  // 3. All attempts failed
  throw new Error(
    customErr ||
    `Cannot reach the WordPress API at this URL.\n` +
    `• The site may not have the REST API enabled\n` +
    `• The post slug may be incorrect\n` +
    `• CORS proxies may be temporarily unavailable`
  );
}

function stripHTML(html) {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || "";
}

function decodeHTMLEntities(str) {
  const d = document.createElement("textarea");
  d.innerHTML = str;
  return d.value;
}

function escapeYAML(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ================================================================
// UI HELPERS
// ================================================================
function showLoader(msg) {
  loaderText.textContent = msg;
  loaderWrap.classList.remove("hidden");
}

function setLoader(msg) {
  loaderText.textContent = msg;
}

function updateLoaderText(msg) { loaderText.textContent = msg; }

function hideLoader() {
  loaderWrap.classList.add("hidden");
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove("hidden");
}

function hideAll() {
  errorBox.classList.add("hidden");
  outputPanel.classList.add("hidden");
  batchProgress.classList.add("hidden");
  loaderWrap.classList.add("hidden");
}

function showOutput(sourceURL) {
  outputPanel.classList.remove("hidden");

  // Meta line
  const slug = slugFromURL(sourceURL);
  outputMeta.innerHTML = `<strong>${slug}.md</strong> · ${currentMarkdown.length.toLocaleString()} chars`;

  // Render with mild syntax tinting
  previewCode.textContent = currentMarkdown;
}

function showBatchProgress(urls) {
  batchProgress.classList.remove("hidden");
  progressBar.style.width = "0%";
  progressLabel.textContent = `0 / ${urls.length} converted`;
  progressList.innerHTML = "";
  urls.forEach(url => {
    const li = document.createElement("li");
    li.dataset.url = url;
    li.className = "pending";
    li.innerHTML = `<span class="pi">⋯</span> ${escapeHTML(url)}`;
    progressList.appendChild(li);
  });
}

function updateProgressItem(url, status, msg) {
  const li = progressList.querySelector(`[data-url="${CSS.escape(url)}"]`);
  if (!li) return;
  li.className = status;
  li.innerHTML = `<span class="pi">${status === "ok" ? "✓" : status === "err" ? "✕" : "⋯"}</span> ${escapeHTML(url)} <span style="opacity:.6">${msg.replace(/^[✓✕⋯]\s/, "")}</span>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ================================================================
// COPY BUTTON
// ================================================================
btnCopy.addEventListener("click", async () => {
  if (!currentMarkdown) return;
  try {
    await navigator.clipboard.writeText(currentMarkdown);
    btnCopy.textContent = "Copied!";
    btnCopy.classList.add("copied");
    setTimeout(() => {
      btnCopy.textContent = "Copy";
      btnCopy.classList.remove("copied");
    }, 2000);
  } catch {
    showError("Clipboard access denied. Please copy the text manually.");
  }
});

// ================================================================
// DOWNLOAD BUTTON
// ================================================================
btnDownload.addEventListener("click", () => {
  if (!currentMarkdown) return;
  downloadMarkdown(currentMarkdown, currentFilename);
});
