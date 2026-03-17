/* ================================================================
   WP → Markdown Converter · script.js
   Fallback chain: REST API → RSS Feed → HTML Scrape → oEmbed
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

td.remove(["script", "style", "iframe", "noscript", "form", "nav", "aside",
           "footer", "header", ".sharedaddy", ".jetpack-related-posts",
           ".wp-block-buttons", ".post-navigation", ".comments-area"]);

td.addRule("images", {
  filter: "img",
  replacement(_, node) {
    const alt = (node.getAttribute("alt") || "").replace(/"/g, "'");
    const src = node.getAttribute("src") || node.getAttribute("data-src") ||
                node.getAttribute("data-lazy-src") || node.getAttribute("data-original") || "";
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
  showLoader("Starting…");
  try {
    const { markdown, method } = await convertURL(url);
    currentMarkdown = markdown;
    currentFilename = slugFromURL(url) + ".md";
    showOutput(url, method);
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
    updateProgressItem(url, "pending", "converting…");
    setLoader(`Converting ${done + 1} / ${urls.length}…`);
    try {
      const { markdown, method } = await convertURL(url);
      const fname = slugFromURL(url) + ".md";
      zip.file(fname, markdown);
      done++;
      updateProgressItem(url, "ok", "done via " + method);
    } catch (e) {
      done++;
      updateProgressItem(url, "err", e.message);
    }
    progressBar.style.width = Math.round((done / urls.length) * 100) + "%";
    progressLabel.textContent = `${done} / ${urls.length} converted`;
  }

  setLoader("Packaging ZIP…");
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
// MASTER CONVERSION PIPELINE — tries all methods in order
// ================================================================
async function convertURL(rawURL) {
  const { base, slug } = parseURL(rawURL);

  const methods = [
    { name: "REST API",    fn: () => fetchViaRestAPI(base, slug, rawURL) },
    { name: "RSS Feed",    fn: () => fetchViaRSS(base, rawURL) },
    { name: "HTML Scrape", fn: () => fetchViaHTMLScrape(base, rawURL) },
    { name: "oEmbed",      fn: () => fetchViaOEmbed(base, rawURL) },
  ];

  const errors = [];

  for (const method of methods) {
    try {
      setLoader(`Trying ${method.name}…`);
      const data = await method.fn();
      setLoader("Converting to Markdown…");
      const markdown = generateMarkdown({ ...data, rawURL });
      return { markdown, method: method.name };
    } catch (e) {
      errors.push(`[${method.name}] ${e.message}`);
    }
  }

  throw new Error(
    "All extraction methods failed for this URL.\n\n" +
    errors.join("\n") +
    "\n\nThe site may be behind a login, paywalled, or blocking all access."
  );
}

// ================================================================
// METHOD 1 — WordPress REST API
// ================================================================
async function fetchViaRestAPI(base, slug, rawURL) {
  const apiURL = `${base}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=0`;
  const res  = await proxyFetch(apiURL);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Post not found for slug "${slug}"`);
  }

  const post = data[0];

  const [author, categories, tags, featuredImage] = await Promise.allSettled([
    fetchAuthor(base, post.author),
    fetchCategories(base, post.categories || []),
    fetchTags(base, post.tags || []),
    fetchFeaturedImage(base, post.featured_media),
  ]);

  return {
    title:         decodeHTMLEntities(post.title?.rendered || "Untitled"),
    description:   decodeHTMLEntities(stripHTML(post.excerpt?.rendered || "")),
    date:          post.date ? post.date.split("T")[0] : "",
    author:        author.status        === "fulfilled" ? author.value        : "Unknown",
    categories:    categories.status    === "fulfilled" ? categories.value    : [],
    tags:          tags.status          === "fulfilled" ? tags.value          : [],
    featuredImage: featuredImage.status === "fulfilled" ? featuredImage.value : "",
    content:       post.content?.rendered || "",
  };
}

async function fetchAuthor(base, authorId) {
  if (!authorId) return "Unknown";
  const res  = await proxyFetch(`${base}/wp-json/wp/v2/users/${authorId}`);
  const data = await res.json();
  return data.name || "Unknown";
}

async function fetchCategories(base, ids) {
  if (!ids?.length) return [];
  const names = await Promise.all(ids.map(async id => {
    const res  = await proxyFetch(`${base}/wp-json/wp/v2/categories/${id}`);
    const data = await res.json();
    return data.name || String(id);
  }));
  return names;
}

async function fetchTags(base, ids) {
  if (!ids?.length) return [];
  const names = await Promise.all(ids.map(async id => {
    const res  = await proxyFetch(`${base}/wp-json/wp/v2/tags/${id}`);
    const data = await res.json();
    return data.name || String(id);
  }));
  return names;
}

async function fetchFeaturedImage(base, mediaId) {
  if (!mediaId) return "";
  const res  = await proxyFetch(`${base}/wp-json/wp/v2/media/${mediaId}`);
  const data = await res.json();
  return data.source_url || data.link || "";
}

// ================================================================
// METHOD 2 — RSS / Atom Feed
// ================================================================
async function fetchViaRSS(base, rawURL) {
  const feedURLs = [
    `${base}/feed/`,
    `${base}/?feed=rss2`,
    `${base}/feed/rss/`,
    `${base}/atom/`,
    `${base}/?feed=atom`,
  ];

  let feedText = null;
  for (const feedURL of feedURLs) {
    try {
      const res = await proxyFetch(feedURL, "text/xml, application/rss+xml, application/xml, */*");
      const txt = await res.text();
      if (txt.includes("<item") || txt.includes("<entry")) {
        feedText = txt;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!feedText) throw new Error("No RSS feed found or accessible");

  const parser = new DOMParser();
  const xml    = parser.parseFromString(feedText, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("RSS feed could not be parsed");

  const items = [...xml.querySelectorAll("item, entry")];
  if (!items.length) throw new Error("RSS feed is empty");

  // Match item to requested URL by slug
  const { slug } = parseURL(rawURL);
  let item = items.find(i => {
    const link = i.querySelector("link")?.textContent ||
                 i.querySelector("link")?.getAttribute("href") || "";
    return link.includes(slug);
  }) || items[0];

  const title   = item.querySelector("title")?.textContent?.trim() || "Untitled";
  const link    = item.querySelector("link")?.textContent?.trim() ||
                  item.querySelector("link")?.getAttribute("href") || rawURL;

  const contentEncoded = item.getElementsByTagNameNS("*", "encoded")[0]?.textContent || "";
  const description    = item.querySelector("description")?.textContent || "";
  const content        = contentEncoded || description || "";

  const excerpt = contentEncoded
    ? stripHTML(description).substring(0, 300).trim()
    : stripHTML(content).substring(0, 300).trim();

  const pubDate = item.querySelector("pubDate")?.textContent ||
                  item.querySelector("published")?.textContent || "";
  const date    = pubDate ? new Date(pubDate).toISOString().split("T")[0] : "";

  const author  = item.querySelector("author name")?.textContent ||
                  item.getElementsByTagNameNS("*", "creator")[0]?.textContent ||
                  item.querySelector("author")?.textContent?.trim() || "Unknown";

  const categories = [...item.querySelectorAll("category")]
    .map(c => c.getAttribute("nicename") || c.textContent?.trim())
    .filter(Boolean);

  let featuredImage = item.getElementsByTagNameNS("*", "content")[0]?.getAttribute("url") ||
                      item.querySelector("enclosure")?.getAttribute("url") || "";
  if (!featuredImage && content) {
    const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) featuredImage = m[1];
  }

  return {
    title:         decodeHTMLEntities(title),
    description:   decodeHTMLEntities(excerpt),
    date,
    author:        decodeHTMLEntities(author.replace(/<[^>]*>/g, "").trim()),
    categories:    categories.slice(0, 10),
    tags:          [],
    featuredImage,
    content,
  };
}

// ================================================================
// METHOD 3 — HTML Scraping (Open Graph + article tags + JSON-LD)
// ================================================================
async function fetchViaHTMLScrape(base, rawURL) {
  const res  = await proxyFetch(rawURL, "text/html, */*");
  const html = await res.text();

  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, "text/html");

  const og   = prop => doc.querySelector(`meta[property="og:${prop}"]`)?.getAttribute("content") || "";
  const meta = name => doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
  const ld   = getLDJSON(doc);

  // Title
  const title =
    og("title") ||
    ld?.headline ||
    doc.querySelector("h1.entry-title, h1.post-title, .post-title h1, h1")?.textContent?.trim() ||
    doc.title?.replace(/\s*[|–—\-].*$/, "").trim() ||
    "Untitled";

  // Description
  const description =
    og("description") ||
    meta("description") ||
    ld?.description || "";

  // Date
  const rawDate =
    ld?.datePublished ||
    doc.querySelector("time[datetime]")?.getAttribute("datetime") ||
    meta("article:published_time") ||
    og("article:published_time") || "";
  const date = rawDate ? new Date(rawDate).toISOString().split("T")[0] : "";

  // Author
  const author =
    ld?.author?.name ||
    meta("author") ||
    doc.querySelector(".author-name, .byline-author, [rel='author'], .entry-author-name")?.textContent?.trim() ||
    doc.querySelector(".author, .byline")?.textContent?.replace(/^by\s*/i, "").trim() ||
    "Unknown";

  // Featured image
  const featuredImage = og("image") || ld?.image?.url || ld?.image || "";

  // Categories
  const categories = [...doc.querySelectorAll(".cat-links a, .category a, [rel='category tag'], .post-categories a")]
    .map(a => a.textContent?.trim()).filter(Boolean);

  // Tags
  const tags = [...doc.querySelectorAll(".tags-links a, .tag-links a, [rel='tag'], .post-tags a")]
    .map(a => a.textContent?.trim()).filter(Boolean);

  // Content — try selectors in priority order
  const contentSelectors = [
    ".entry-content", ".post-content", ".article-content", ".post-body",
    ".blog-content", ".content-area article", "[itemprop='articleBody']",
    "article .content", "article", "main article", ".single-content", "main",
  ];

  let contentEl = null;
  for (const sel of contentSelectors) {
    const el = doc.querySelector(sel);
    if (el) { contentEl = el; break; }
  }

  if (contentEl) {
    const noisy = contentEl.querySelectorAll(
      "script, style, iframe, .sharedaddy, .jp-relatedposts, " +
      ".post-navigation, .comments-area, .sidebar, #sidebar, " +
      "[id*='ad-'], [class*='adsbygoogle'], .advertisement, .widget"
    );
    noisy.forEach(el => el.remove());
  }

  const content = contentEl?.innerHTML || "";
  if (!content.trim()) throw new Error("Could not find article content in page HTML");

  return {
    title:         decodeHTMLEntities(title),
    description:   decodeHTMLEntities(description),
    date,
    author:        decodeHTMLEntities(author),
    categories,
    tags,
    featuredImage,
    content,
  };
}

function getLDJSON(doc) {
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const raw   = JSON.parse(s.textContent);
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        const type = item["@type"];
        if (type === "Article" || type === "BlogPosting" || type === "NewsArticle") return item;
      }
      if (items[0]?.headline) return items[0];
    } catch { /* bad JSON-LD */ }
  }
  return null;
}

// ================================================================
// METHOD 4 — oEmbed (limited, last resort)
// ================================================================
async function fetchViaOEmbed(base, rawURL) {
  const oembedURL = `${base}/wp-json/oembed/1.0/proxy?url=${encodeURIComponent(rawURL)}`;
  const res  = await proxyFetch(oembedURL);
  const data = await res.json();

  if (!data.title) throw new Error("oEmbed returned no usable data");

  return {
    title:         data.title || "Untitled",
    description:   "",
    date:          "",
    author:        data.author_name || "Unknown",
    categories:    [],
    tags:          [],
    featuredImage: data.thumbnail_url || "",
    content:       data.html || `<p><a href="${rawURL}">${data.title}</a></p>`,
  };
}

// ================================================================
// URL PARSING
// ================================================================
function parseURL(rawURL) {
  let url;
  try { url = new URL(rawURL.trim()); }
  catch { throw new Error("Invalid URL. Make sure it starts with https://"); }
  const base  = url.origin;
  const parts = url.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (!parts.length) throw new Error("Could not extract a slug from the URL.");
  const slug  = parts[parts.length - 1];
  return { base, slug };
}

function slugFromURL(rawURL) {
  try { return parseURL(rawURL).slug; } catch { return "post"; }
}

// ================================================================
// HTML → MARKDOWN
// ================================================================
function convertHTMLtoMarkdown(html) {
  if (!html) return "";
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/style="[^"]*"/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ins\s[^>]*class="adsbygoogle[^>]*>[\s\S]*?<\/ins>/gi, "");
  return td.turndown(clean).trim();
}

// ================================================================
// GENERATE MARKDOWN FILE
// ================================================================
function generateMarkdown({ title, description, date, author, categories, tags, featuredImage, content, rawURL }) {
  const body   = convertHTMLtoMarkdown(content);
  const catStr = categories.length ? `[${categories.map(c => `"${escapeYAML(c)}"`).join(", ")}]` : "[]";
  const tagStr = tags.length       ? `[${tags.map(t => `"${escapeYAML(t)}"`).join(", ")}]`       : "[]";

  const lines = [
    "---",
    `title: "${escapeYAML(title)}"`,
    `description: "${escapeYAML(description)}"`,
    `author: "${escapeYAML(author)}"`,
    `date: ${date || ""}`,
    `categories: ${catStr}`,
    `tags: ${tagStr}`,
    `source: ${rawURL.trim()}`,
  ];
  if (featuredImage) lines.push(`featured_image: ${featuredImage}`);
  lines.push("---");

  return lines.join("\n") + "\n\n" + body + "\n";
}

// ================================================================
// DOWNLOAD MARKDOWN
// ================================================================
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, filename);
}

// ================================================================
// FETCH WITH CORS PROXY FALLBACK
// ================================================================
const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function proxyFetch(url, acceptHeader = "application/json") {
  const headers = { "Accept": acceptHeader };

  // 1. Direct request
  try {
    const res = await fetch(url, { headers });
    if (res.ok) return res;
    if (res.status === 404) throw new Error(`404 Not Found: ${url}`);
  } catch (e) {
    if (e.message.includes("404")) throw e;
    // CORS / network error — fall through to proxies
  }

  // 2. CORS proxies in sequence
  for (const makeProxy of CORS_PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { headers });
      if (res.ok) return res;
    } catch {
      // try next proxy
    }
  }

  throw new Error(`Unreachable after all proxy attempts: ${new URL(url).hostname}`);
}

// ================================================================
// UTILITIES
// ================================================================
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
  loaderWrap.classList.remove("hidden");
  loaderText.textContent = msg;
}

function hideLoader() { loaderWrap.classList.add("hidden"); }

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

function showOutput(sourceURL, method) {
  outputPanel.classList.remove("hidden");
  const slug        = slugFromURL(sourceURL);
  const methodLabel = method ? ` · via <strong>${escapeHTML(method)}</strong>` : "";
  outputMeta.innerHTML = `<strong>${escapeHTML(slug)}.md</strong> · ${currentMarkdown.length.toLocaleString()} chars${methodLabel}`;
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
  const icon = status === "ok" ? "✓" : status === "err" ? "✕" : "⋯";
  li.innerHTML = `<span class="pi">${icon}</span> ${escapeHTML(url)} <span style="opacity:.6">${escapeHTML(msg)}</span>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    setTimeout(() => { btnCopy.textContent = "Copy"; btnCopy.classList.remove("copied"); }, 2000);
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
