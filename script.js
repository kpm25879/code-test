/* ============================================================
   MARKFORGE — script.js  (v3 — manual slug/desc + no double quotes in output)
   ============================================================ */
"use strict";

// ── DOM REFS ──────────────────────────────────────────────────
const inputText      = document.getElementById("inputText");
const outputText     = document.getElementById("outputText");
const generateBtn    = document.getElementById("generateBtn");
const copyBtn        = document.getElementById("copyBtn");
const downloadBtn    = document.getElementById("downloadBtn");
const regenerateBtn  = document.getElementById("regenerateBtn");
const clearBtn       = document.getElementById("clearBtn");
const wordCountEl    = document.getElementById("wordCount");
const charCountEl    = document.getElementById("charCount");
const outputOverlay  = document.getElementById("outputOverlay");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTextEl  = document.getElementById("loadingText");
const statsBar       = document.getElementById("statsBar");
const statCategoryVal= document.getElementById("statCategoryVal");
const statReadTimeVal= document.getElementById("statReadTimeVal");
const statTagsVal    = document.getElementById("statTagsVal");
const statViewsVal   = document.getElementById("statViewsVal");
const statSlugVal    = document.getElementById("statSlugVal");
const outputStats    = document.getElementById("outputStats");
const optFeatured    = document.getElementById("optFeatured");
const authorInput    = document.getElementById("authorInput");
const categoryGrid   = document.getElementById("categoryGrid");
const autoBadge      = document.getElementById("autoBadge");
const manualSlug     = document.getElementById("manualSlug");
const manualDesc     = document.getElementById("manualDesc");
const descCharCount  = document.getElementById("descCharCount");

// ── STATE ─────────────────────────────────────────────────────
let lastProcessedData = null;
let selectedCategory  = "auto";

// ── FIXED TAGS ────────────────────────────────────────────────
const FIXED_TAGS = [
  "free sex kahani",
  "indian sex stories",
  "hindi sex stories",
  "desi kahani",
  "desi sex stories",
  "desi sex kahani",
  "antarvasna",
  "kamvasna",
  "xxxvasna",
  "desigaramkahani",
  "hindi antarvasna",
  "antarvasna hindi",
  "sex kahani",
  "free hot sex stories",
  "hindi chudai kahani",
  "desi chudai stories",
  "hot hindi kahani",
  "adult hindi stories",
  "blue film kahani",
  "hindi sexy kahani"
];

// ── CATEGORY → SLUG MAP ───────────────────────────────────────
const CATEGORY_SLUGS = {
  "ऑफिस में चुदाई"          : "office-mein-chudai",
  "रंडी की चुदाई"            : "randi-ki-chudai",
  "पड़ोस में चुदाई"          : "pados-mein-chudai",
  "सील तोड़ चुदाई"           : "seal-tod-chudai",
  "लड़कियों की गांड़ चुदाई"  : "ladkiyon-ki-gaand-chudai",
  "गे चुदाई"                 : "gay-chudai",
  "बुआ की चुदाई"             : "bua-ki-chudai",
  "ग्रुप में चुदाई"          : "group-mein-chudai",
  "नजदीकी रिश्तों में चुदाई": "najdeeki-rishton-mein-chudai",
  "अदला बदली"                : "adla-badli",
  "लेस्बियन चुदाई"           : "lesbian-chudai",
  "नौकर नौकरानी चुदाई"       : "naukar-naukrani-chudai",
  "अजनबी की चुदाई"           : "ajnabi-ki-chudai",
  "भाभी की चुदाई"            : "bhabhi-ki-chudai",
  "चाची की चुदाई"            : "chachi-ki-chudai",
  "मामी की चुदाई"            : "mami-ki-chudai",
  "मौसी की चुदाई"            : "mausi-ki-chudai",
  "आंटी की चुदाई"            : "aunty-ki-chudai",
  "भाई बहन की चुदाई"         : "bhai-bahan-ki-chudai",
  "ससुर बहू की चुदाई"        : "sasur-bahu-ki-chudai",
  "बाप बेटी की चुदाई"        : "baap-beti-ki-chudai",
  "माँ की चुदाई"             : "maa-ki-chudai",
  "बीवी की चुदाई"            : "biwi-ki-chudai",
  "चुदाई की कहानी"           : "chudai-ki-kahani",
  "जीजा साली की चुदाई"       : "jija-sali-ki-chudai",
  "गर्लफ्रेंड की चुदाई"      : "girlfriend-ki-chudai",
  "हॉट सेक्स स्टोरी"         : "hot-sex-story",
};

// ── DESC CHAR COUNTER ─────────────────────────────────────────
manualDesc.addEventListener("input", () => {
  const len = manualDesc.value.length;
  descCharCount.textContent = len;
  const row = descCharCount.closest(".desc-counter");
  row.className = "desc-counter" + (len > 200 ? " over" : len > 160 ? " warn" : "");
});

// ── OVERRIDE CLEAR BUTTONS ────────────────────────────────────
document.querySelectorAll(".override-clear").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (target) { target.value = ""; target.focus(); target.dispatchEvent(new Event("input")); }
  });
});

// ── CATEGORY BUTTONS ─────────────────────────────────────────
categoryGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".cat-btn");
  if (!btn) return;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedCategory = btn.dataset.cat;
  if (selectedCategory === "auto") {
    autoBadge.textContent = "AUTO";
    autoBadge.style.cssText = "";
  } else {
    autoBadge.textContent = "MANUAL";
    autoBadge.style.cssText = "background:rgba(0,229,160,0.1);color:var(--accent3);border-color:rgba(0,229,160,0.3)";
  }
});

// ── WORD / CHAR COUNTER ───────────────────────────────────────
inputText.addEventListener("input", () => {
  const text  = inputText.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCountEl.textContent = words.toLocaleString();
  charCountEl.textContent = text.length.toLocaleString();
});

// ── CLEAR ─────────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  wordCountEl.textContent = "0";
  charCountEl.textContent = "0";
  inputText.focus();
  showToast("Input cleared", "info");
});

// ── GENERATE ──────────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const raw = inputText.value.trim();
  if (!raw)                          { showToast("Please paste some text first!", "error"); inputText.focus(); return; }
  if (raw.split(/\s+/).length < 5)   { showToast("Text is too short — paste more content!", "error"); return; }
  await runGeneration(raw);
});

// ── REGENERATE VIEWS ──────────────────────────────────────────
regenerateBtn.addEventListener("click", () => {
  if (!lastProcessedData) return;
  lastProcessedData.views = generateRandomViews();
  outputText.value = formatMarkdown(lastProcessedData);
  statViewsVal.textContent = lastProcessedData.views.toLocaleString();
  showToast("New views count generated!", "info");
});

// ── COPY ──────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showToast("Copied to clipboard!", "success");
    copyBtn.querySelector("span").textContent = "Copied!";
    setTimeout(() => { copyBtn.querySelector("span").textContent = "Copy"; }, 2000);
  } catch {
    outputText.select(); document.execCommand("copy");
    showToast("Copied!", "success");
  }
});

// ── DOWNLOAD ──────────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!outputText.value || !lastProcessedData) return;
  const slug = lastProcessedData.slug || "output";
  const blob = new Blob([outputText.value], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = slug + ".md";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast("Downloaded: " + slug + ".md", "success");
});

// ── MAIN GENERATION FLOW ──────────────────────────────────────
async function runGeneration(raw) {
  setLoading(true, "Analyzing content...");
  await delay(150);
  const cleaned = cleanText(raw);

  setLoading(true, "Extracting title and structure...");
  await delay(200);
  const title = generateTitle(cleaned);

  setLoading(true, "Generating SEO slug...");
  await delay(150);

  // Manual slug override
  const slugRaw   = manualSlug.value.trim();
  const slug      = slugRaw ? sanitizeSlug(slugRaw) : generateSlug(title);

  // Manual description override
  const descRaw   = manualDesc.value.trim();
  const description = descRaw ? stripQuotes(descRaw) : generateDescription(cleaned);

  setLoading(true, "Detecting category...");
  await delay(150);
  const category = (selectedCategory !== "auto") ? selectedCategory : detectCategory(cleaned);

  const readTime    = calculateReadTime(cleaned);
  const views       = generateRandomViews();
  const author      = stripQuotes(authorInput.value.trim() || "Admin");
  const featured    = optFeatured.checked;
  const publishDate = getTodayDate();

  setLoading(true, "Formatting markdown...");
  await delay(150);

  const data = {
    title, slug, description, author, category,
    tags: FIXED_TAGS,
    publishDate, readTime, featured, views, content: cleaned
  };
  lastProcessedData = data;

  const md = formatMarkdown(data);
  setLoading(false);

  outputOverlay.classList.add("hidden");
  outputText.value = md;
  copyBtn.disabled = downloadBtn.disabled = regenerateBtn.disabled = false;

  statCategoryVal.textContent = category;
  statReadTimeVal.textContent = readTime;
  statTagsVal.textContent     = "20 fixed tags";
  statViewsVal.textContent    = views.toLocaleString();
  statSlugVal.textContent     = slug;
  statsBar.classList.add("visible");

  const wc = cleaned.trim().split(/\s+/).length;
  outputStats.textContent = wc.toLocaleString() + " words";

  outputText.scrollTop = 0;
  outputText.scrollIntoView({ behavior: "smooth", block: "nearest" });
  showToast("Markdown generated successfully!", "success");
}

// ── UTILS ─────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setLoading(show, message) {
  if (show) {
    loadingTextEl.textContent = message || "Processing...";
    loadingOverlay.classList.add("visible");
    generateBtn.classList.add("loading");
    generateBtn.disabled = true;
  } else {
    loadingOverlay.classList.remove("visible");
    generateBtn.classList.remove("loading");
    generateBtn.disabled = false;
  }
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Remove all double and single quotes from a string
function stripQuotes(str) {
  return String(str).replace(/["']/g, "");
}

let toastTimer = null;
const toastEl  = document.getElementById("toast");
function showToast(msg, type) {
  toastEl.textContent = msg;
  toastEl.className   = "toast " + (type||"info") + " show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ============================================================
// CORE PROCESSING
// ============================================================

function cleanText(text) {
  let t = text
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,"").replace(/&#39;/g,"").replace(/&nbsp;/g," ");
  t = t.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  t = t.replace(/[\u200B-\u200D\uFEFF]/g,"");
  t = t.replace(/[^\S\n]+/g," ");
  t = t.replace(/\n{3,}/g,"\n\n");
  t = t.split("\n").map(l => l.trim()).join("\n");
  return t.trim();
}

function generateTitle(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0,5)) {
    const clean = line.replace(/^[#\-*>\s]+/,"").trim();
    if (clean.length > 3 && clean.length < 90 && !clean.endsWith("."))
      return capitaliseTitle(stripQuotes(clean));
  }
  const first = lines[0] || "";
  const s = (first.match(/[^.!?]+[.!?]*/)||[])[0];
  if (s && s.length > 5 && s.length < 90) return capitaliseTitle(stripQuotes(s.replace(/[.!?]+$/,"")));
  return capitaliseTitle(stripQuotes(lines[0].substring(0,60)));
}

function capitaliseTitle(str) {
  const minor = new Set(["a","an","the","and","but","or","for","nor","on","at",
    "to","by","in","of","up","as","ka","ki","ke","ne","se","ko","hai","tha","thi",
    "aur","ya","jo","jab","tab","ek"]);
  return str.replace(/[_\-]+/g," ").split(" ").map((w,i) => {
    const lower = w.toLowerCase();
    return (i === 0 || !minor.has(lower)) ? w.charAt(0).toUpperCase() + w.slice(1) : lower;
  }).join(" ").trim();
}

// ── HINDI TRANSLITERATION ─────────────────────────────────────
const HINDI_WORDS = {
  "शादी":"shaadi","प्यार":"pyaar","लड़की":"ladki","लड़का":"ladka",
  "मोहब्बत":"mohabbat","दिल":"dil","जिंदगी":"zindagi","यार":"yaar",
  "दोस्त":"dost","घर":"ghar","परिवार":"parivaar","माँ":"maa",
  "बाप":"baap","भाई":"bhai","बहन":"behen","पति":"pati","पत्नी":"patni",
  "कहानी":"kahani","किस्सा":"kissa","बात":"baat","रात":"raat",
  "दिन":"din","सच":"sach","सपना":"sapna","इश्क":"ishq","दर्द":"dard",
  "खुशी":"khushi","याद":"yaad","रिश्ता":"rishta","देश":"desh",
  "गाँव":"gaanv","शहर":"sheher","सफर":"safar","मंजिल":"manzil",
};

const HINDI_MAP = {
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ए":"e","ऐ":"ai","ओ":"o","औ":"au",
  "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","े":"e","ै":"ai","ो":"o","ौ":"au",
  "ं":"n","ः":"h","्":"",
  "क":"k","ख":"kh","ग":"g","घ":"gh","च":"ch","छ":"chh","ज":"j","झ":"jh",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"f","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v",
  "श":"sh","ष":"sh","स":"s","ह":"h","ड़":"d","ढ़":"dh","ज़":"z","फ़":"f",
  "ङ":"ng","ञ":"ny","ऋ":"ri","ृ":"ri",
  "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9",
  "।":"."
};

function transliterateHindi(text) {
  if (!text) return text;
  let r = text;
  for (const [h,e] of Object.entries(HINDI_WORDS)) r = r.replace(new RegExp(h,"g"), e);
  let out = "";
  for (const ch of r) out += (HINDI_MAP[ch] !== undefined) ? HINDI_MAP[ch] : ch;
  return out;
}

function sanitizeSlug(raw) {
  let s = raw.toLowerCase()
    .replace(/&/g,"and")
    .replace(/[^\w\s-]/g,"")
    .replace(/[\s_]+/g,"-")
    .replace(/-{2,}/g,"-")
    .replace(/^-+|-+$/g,"");
  if (s.length > 70) s = s.substring(0,70).replace(/-[^-]*$/,"");
  return s || "untitled-post";
}

function generateSlug(title) {
  let s = transliterateHindi(title);
  return sanitizeSlug(s);
}

function generateDescription(text) {
  let plain = text.replace(/[#*_`>~\-]+/g," ").replace(/\s+/g," ").trim();
  const paras = plain.split(/\n+/).map(p => p.trim()).filter(p => p.length > 40);
  const source = (paras[0] || plain).replace(/\s+/g," ");
  let desc = source.substring(0,190);
  const lp = Math.max(
    desc.lastIndexOf("."), desc.lastIndexOf("!"),
    desc.lastIndexOf("?"), desc.lastIndexOf("।")
  );
  if (lp > 100) desc = desc.substring(0, lp + 1);
  else if (desc.length > 160) desc = desc.substring(0,160).replace(/\s+\S*$/,"") + "...";
  desc = transliterateHindi(desc).trim();
  // Strip all quotes from auto-generated description
  desc = stripQuotes(desc);
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

function detectCategory(text) {
  const t = text.toLowerCase();
  const signals = {
    "ऑफिस में चुदाई"          : ["office","boss","colleague","secretary","meeting","cabin","staff","naukri","company"],
    "रंडी की चुदाई"            : ["randi","tawaif","paisa","rate","customer","call girl","price","bazaar"],
    "पड़ोस में चुदाई"          : ["padosi","neighbour","neighbor","pados","colony","door","flat","building","gali"],
    "सील तोड़ चुदाई"           : ["pahli","first time","virgin","seal","pehli baar","new","shuru","innocent"],
    "लड़कियों की गांड़ चुदाई"  : ["gaand","anal","peeche","behind","gand"],
    "गे चुदाई"                 : ["gay","homosexual","ladka ladka","mard","man","he","him","dono ladke"],
    "बुआ की चुदाई"             : ["bua","buaji","father sister","papa ki behen"],
    "ग्रुप में चुदाई"          : ["group","gang","sab ne","teen","char","multiple","party","milke"],
    "नजदीकी रिश्तों में चुदाई": ["rishtedar","relative","family","incest","ghar ke","khoon"],
    "अदला बदली"                : ["exchange","swap","adla badli","wife swap","partner exchange","badal"],
    "लेस्बियन चुदाई"           : ["lesbian","ladki ladki","dono ladkiyan","girl girl","saheli","friend girl"],
    "नौकर नौकरानी चुदाई"       : ["naukar","naukrani","servant","maid","kaam wali","bai","driver","cook"],
    "अजनबी की चुदाई"           : ["ajnabi","stranger","unknown","pehli mulakat","train","bus","travel"],
    "भाभी की चुदाई"            : ["bhabhi","bhai ki biwi","bhaiya ki wife","bhabhiji"],
    "चाची की चुदाई"            : ["chachi","chacha ki biwi","uncle wife","chachiji"],
    "मामी की चुदाई"            : ["mami","mama ki biwi","mamiji","mama ki wife"],
    "मौसी की चुदाई"            : ["mausi","mausiji","mom sister","mausa ki wife"],
    "आंटी की चुदाई"            : ["aunty","auntie","aanti","anti","older woman","mature woman"],
    "भाई बहन की चुदाई"         : ["bhai bahan","brother sister","sibling"],
    "ससुर बहू की चुदाई"        : ["sasur","father-in-law","bahu","daughter-in-law","sasurji"],
    "बाप बेटी की चुदाई"        : ["baap beti","father daughter","papa beti","pitaji"],
    "माँ की चुदाई"             : ["maa","mummy","mom","mother","mata"],
    "बीवी की चुदाई"            : ["biwi","wife","ghar wali","patni","married"],
    "जीजा साली की चुदाई"       : ["jija","sali","jijaji","wife sister","sala"],
    "गर्लफ्रेंड की चुदाई"      : ["girlfriend","gf","lover","pyar","dating","couple","relationship"],
    "हॉट सेक्स स्टोरी"         : ["hot","sexy","romance","passionate","wild","intense","hard"],
    "चुदाई की कहानी"           : ["kahani","story","kissa","tale","anubhav","experience"],
  };
  const scores = {};
  for (const [cat,words] of Object.entries(signals))
    scores[cat] = words.reduce((s,w) => s + (t.includes(w) ? 1 : 0), 0);
  const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
  return (best && best[1] > 0) ? best[0] : "चुदाई की कहानी";
}

function calculateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)) + " min read";
}

function generateRandomViews() {
  const rand = Math.random();
  let v;
  if (rand < 0.5)      v = Math.floor(Math.random()*(300000-150000+1))+150000;
  else if (rand < 0.8) v = Math.floor(Math.random()*(550000-300001+1))+300001;
  else                 v = Math.floor(Math.random()*(900000-550001+1))+550001;
  return v + Math.floor(Math.random()*999);
}

// ── FORMAT MARKDOWN — NO DOUBLE QUOTES ANYWHERE IN VALUES ────
function formatMarkdown(data) {
  const { title, slug, description, author, category,
          tags, publishDate, readTime, featured, views, content } = data;

  // Strip all double quotes from every string value
  const safeTitle   = stripQuotes(title);
  const safeSlug    = stripQuotes(slug);
  const safeDesc    = stripQuotes(description);
  const safeAuthor  = stripQuotes(author);
  const safeCategory= stripQuotes(category);
  const safeRead    = stripQuotes(readTime);
  const safeDate    = stripQuotes(publishDate);

  // Tags: strip quotes, wrap in single quotes for YAML
  const tagsYaml = tags.map(t => "  - " + stripQuotes(t)).join("\n");

  const body = formatContent(content, title);

  return "---\n" +
    "title: " + safeTitle + "\n" +
    "slug: " + safeSlug + "\n" +
    "description: " + safeDesc + "\n" +
    "author: " + safeAuthor + "\n" +
    "category: " + safeCategory + "\n" +
    "tags:\n" + tagsYaml + "\n" +
    "publishDate: " + safeDate + "\n" +
    "readTime: " + safeRead + "\n" +
    "featured: " + (featured ? "true" : "false") + "\n" +
    "views: " + views + "\n" +
    "---\n\n" +
    body;
}

// ── SMART PARAGRAPH FORMATTER ────────────────────────────────
// Handles all messy input cases:
// 1. Wall of text (no newlines) → split every ~4-6 sentences
// 2. Every sentence on its own line → group into paragraphs
// 3. Already has paragraph breaks → preserve and clean
// 4. Mixed Hindi/English sentence endings (। . ! ?)
// 5. Auto-detects short heading-like lines → ## heading
function formatContent(text, title) {

  // ── STEP 1: Remove title line if duplicated at top ──────────
  let body = text.trim();
  const firstLine = body.split("\n")[0].trim().replace(/^[#\s]+/, "");
  if (firstLine && title.toLowerCase().startsWith(firstLine.toLowerCase().substring(0, 15))) {
    body = body.split("\n").slice(1).join("\n").trim();
  }

  // ── STEP 2: Normalise line endings ──────────────────────────
  body = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // ── STEP 3: Detect input structure ──────────────────────────
  const rawLines   = body.split("\n");
  const nonEmpty   = rawLines.filter(l => l.trim().length > 0);
  const totalLines = nonEmpty.length;

  // How many lines end with a sentence terminator?
  const sentenceEnders = /[.!?।…]$/;
  const enderCount = nonEmpty.filter(l => sentenceEnders.test(l.trim())).length;
  const enderRatio = totalLines > 0 ? enderCount / totalLines : 0;

  // Average line word count
  const avgWords = nonEmpty.reduce((s,l) => s + l.trim().split(/\s+/).length, 0) / Math.max(totalLines,1);

  // Decide strategy:
  // "wall"   → entire text is one or few long lines (no para breaks)
  // "dense"  → every sentence is its own line (needs grouping)
  // "normal" → already has paragraph structure
  let strategy;
  if (totalLines <= 3 && avgWords > 30) {
    strategy = "wall";
  } else if (enderRatio > 0.55 && avgWords < 22) {
    strategy = "dense";
  } else {
    strategy = "normal";
  }

  // ── STEP 4: Apply strategy ───────────────────────────────────
  let paragraphs = [];

  if (strategy === "wall") {
    // Split wall of text into sentences, then group every 4-5 sentences
    paragraphs = splitWallIntoParagraphs(body);

  } else if (strategy === "dense") {
    // Group individual sentence-lines into paragraph blocks of 3-5 sentences
    paragraphs = groupDenseLines(rawLines);

  } else {
    // Normal: respect existing blank-line paragraph breaks, clean each block
    paragraphs = parseNormalParagraphs(rawLines);
  }

  // ── STEP 5: Post-process each paragraph ─────────────────────
  const output = [];
  paragraphs.forEach((para, idx) => {
    para = para.trim();
    if (!para) return;

    // Detect heading-like lines: short, no period, few words, not first para
    if (
      idx > 0 &&
      para.split("\n").length === 1 &&
      para.length < 60 &&
      para.split(/\s+/).length <= 9 &&
      !sentenceEnders.test(para) &&
      !/^#{1,6}\s/.test(para)
    ) {
      output.push("## " + para.replace(/:$/, ""));
    } else if (/^#{1,6}\s/.test(para)) {
      output.push(para);
    } else {
      // Wrap paragraph text — join its internal lines smoothly
      const joined = para.split("\n").map(l => l.trim()).filter(Boolean).join(" ");
      output.push(joined);
    }
  });

  return output.join("\n\n").trim();
}

// ── Wall splitter: one big blob → sentence groups ─────────────
function splitWallIntoParagraphs(text) {
  // Split on sentence boundaries (supports Hindi । and English . ! ?)
  const sentenceRegex = /(?<=[.!?।…]\s+)(?=[A-Z\u0900-\u097F])/g;
  let sentences = text
    .replace(/([.!?।])([^\s"\n])/g, "$1 $2") // ensure space after terminator
    .split(sentenceRegex)
    .map(s => s.trim())
    .filter(Boolean);

  // If regex split didn't work well, fallback to splitting on ". " patterns
  if (sentences.length < 3) {
    sentences = text
      .replace(/([.!?।])\s+/g, "$1\n")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Group every PARA_SIZE sentences into one paragraph
  const PARA_SIZE = 4;
  const groups = [];
  for (let i = 0; i < sentences.length; i += PARA_SIZE) {
    groups.push(sentences.slice(i, i + PARA_SIZE).join(" "));
  }
  return groups;
}

// ── Dense grouper: one sentence per line → paragraphs ─────────
function groupDenseLines(lines) {
  const PARA_SIZE = 4; // sentences per paragraph
  const sentences = [];
  let buffer = "";

  lines.forEach(line => {
    const t = line.trim();
    if (!t) {
      // blank line = forced paragraph break — flush buffer first
      if (buffer) { sentences.push({ text: buffer.trim(), forceBreak: true }); buffer = ""; }
      return;
    }
    if (/^#{1,6}\s/.test(t)) {
      if (buffer) { sentences.push({ text: buffer.trim(), forceBreak: false }); buffer = ""; }
      sentences.push({ text: t, heading: true });
      return;
    }
    buffer += (buffer ? " " : "") + t;
    // If line ends sentence, flush
    if (/[.!?।…]$/.test(t)) {
      sentences.push({ text: buffer.trim(), forceBreak: false });
      buffer = "";
    }
  });
  if (buffer) sentences.push({ text: buffer.trim(), forceBreak: false });

  // Now group non-heading sentences into paragraphs of PARA_SIZE
  const paragraphs = [];
  let group = [];

  sentences.forEach(item => {
    if (item.heading) {
      if (group.length) { paragraphs.push(group.join(" ")); group = []; }
      paragraphs.push(item.text);
      return;
    }
    if (item.forceBreak) {
      if (group.length) { paragraphs.push(group.join(" ")); group = []; }
      if (item.text) group.push(item.text);
      return;
    }
    group.push(item.text);
    if (group.length >= PARA_SIZE) {
      paragraphs.push(group.join(" "));
      group = [];
    }
  });
  if (group.length) paragraphs.push(group.join(" "));
  return paragraphs;
}

// ── Normal parser: respect blank-line breaks ──────────────────
function parseNormalParagraphs(lines) {
  const paragraphs = [];
  let current = [];

  lines.forEach(line => {
    if (!line.trim()) {
      if (current.length) {
        paragraphs.push(current.join("\n"));
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  });
  if (current.length) paragraphs.push(current.join("\n"));

  // If we got very few paragraphs but lots of lines, re-split by sentence count
  const totalSentences = paragraphs.join(" ").split(/[.!?।]/).length;
  if (paragraphs.length < 3 && totalSentences > 10) {
    // Flatten and re-split
    return splitWallIntoParagraphs(paragraphs.join(" "));
  }

  return paragraphs;
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey||e.metaKey) && e.key === "Enter") { e.preventDefault(); generateBtn.click(); }
  if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key === "C") { e.preventDefault(); if (!copyBtn.disabled) copyBtn.click(); }
});

// ── INIT ──────────────────────────────────────────────────────
(function init() {
  inputText.dispatchEvent(new Event("input"));
  inputText.addEventListener("focus", () => {
    setTimeout(() => showToast("Tip: Ctrl+Enter to generate", "info"), 800);
  }, { once: true });
})();
