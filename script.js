/* ============================================================
   MARKFORGE — script.js
   Full client-side Markdown generator
   ============================================================ */

"use strict";

// ── DOM REFS ──────────────────────────────────────────────────
const inputText     = document.getElementById("inputText");
const outputText    = document.getElementById("outputText");
const generateBtn   = document.getElementById("generateBtn");
const copyBtn       = document.getElementById("copyBtn");
const downloadBtn   = document.getElementById("downloadBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const clearBtn      = document.getElementById("clearBtn");
const wordCountEl   = document.getElementById("wordCount");
const charCountEl   = document.getElementById("charCount");
const outputOverlay = document.getElementById("outputOverlay");
const loadingOverlay= document.getElementById("loadingOverlay");
const loadingText   = document.getElementById("loadingText");
const statsBar      = document.getElementById("statsBar");
const statCategoryVal = document.getElementById("statCategoryVal");
const statReadTimeVal = document.getElementById("statReadTimeVal");
const statTagsVal     = document.getElementById("statTagsVal");
const statViewsVal    = document.getElementById("statViewsVal");
const statSlugVal     = document.getElementById("statSlugVal");
const outputStats     = document.getElementById("outputStats");
const optFeatured     = document.getElementById("optFeatured");
const authorInput     = document.getElementById("authorInput");

// ── STATE ─────────────────────────────────────────────────────
let lastProcessedData = null;

// ── WORD / CHAR COUNTER ──────────────────────────────────────
inputText.addEventListener("input", () => {
  const text = inputText.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCountEl.textContent = words.toLocaleString();
  charCountEl.textContent = text.length.toLocaleString();
});

// ── CLEAR BTN ────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  wordCountEl.textContent = "0";
  charCountEl.textContent = "0";
  inputText.focus();
  showToast("Input cleared", "info");
});

// ── GENERATE ─────────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const raw = inputText.value.trim();
  if (!raw) {
    showToast("Please paste some text first!", "error");
    inputText.focus();
    return;
  }
  if (raw.split(/\s+/).length < 10) {
    showToast("Text is too short — paste more content!", "error");
    return;
  }
  await runGeneration(raw);
});

regenerateBtn.addEventListener("click", () => {
  if (!lastProcessedData) return;
  lastProcessedData.views = generateRandomViews();
  const md = formatMarkdown(lastProcessedData);
  outputText.value = md;
  statViewsVal.textContent = lastProcessedData.views.toLocaleString();
  showToast("New views count generated!", "info");
});

// ── COPY ─────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showToast("✓ Copied to clipboard!", "success");
    copyBtn.querySelector("span").textContent = "✓ Copied!";
    setTimeout(() => {
      copyBtn.querySelector("span").textContent = "⎘ Copy";
    }, 2000);
  } catch {
    // Fallback
    outputText.select();
    document.execCommand("copy");
    showToast("✓ Copied!", "success");
  }
});

// ── DOWNLOAD ─────────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!outputText.value || !lastProcessedData) return;
  const slug = lastProcessedData.slug || "output";
  const blob = new Blob([outputText.value], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${slug}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`↓ Downloaded: ${slug}.md`, "success");
});

// ── MAIN GENERATION FLOW ─────────────────────────────────────
async function runGeneration(raw) {
  setLoading(true, "Analyzing content…");

  await delay(150);
  const cleaned    = cleanText(raw);

  setLoading(true, "Extracting title & structure…");
  await delay(200);
  const title      = generateTitle(cleaned);

  setLoading(true, "Generating SEO slug…");
  await delay(150);
  const slug       = generateSlug(title);

  setLoading(true, "Detecting category & tags…");
  await delay(200);
  const category   = detectCategory(cleaned);
  const tags       = extractTags(cleaned, category);
  const description= generateDescription(cleaned);
  const readTime   = calculateReadTime(cleaned);
  const views      = generateRandomViews();
  const author     = authorInput.value.trim() || "Admin";
  const featured   = optFeatured.checked;
  const publishDate= getTodayDate();

  setLoading(true, "Formatting markdown…");
  await delay(150);

  const data = {
    title, slug, description, author, category,
    tags, publishDate, readTime, featured, views, content: cleaned
  };

  lastProcessedData = data;

  const md = formatMarkdown(data);

  setLoading(false);

  // Output
  outputOverlay.classList.add("hidden");
  outputText.value = md;

  // Enable buttons
  copyBtn.disabled       = false;
  downloadBtn.disabled   = false;
  regenerateBtn.disabled = false;

  // Stats bar
  statCategoryVal.textContent = category;
  statReadTimeVal.textContent = readTime;
  statTagsVal.textContent     = tags.slice(0, 3).join(", ") + (tags.length > 3 ? `…+${tags.length - 3}` : "");
  statViewsVal.textContent    = views.toLocaleString();
  statSlugVal.textContent     = slug;
  statsBar.classList.add("visible");

  const wordCount = cleaned.trim().split(/\s+/).length;
  outputStats.textContent = `${wordCount.toLocaleString()} words`;

  // Scroll output into view
  outputText.scrollTop = 0;
  outputText.scrollIntoView({ behavior: "smooth", block: "nearest" });

  showToast("✓ Markdown generated successfully!", "success");
}

// ── HELPERS ──────────────────────────────────────────────────

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function setLoading(show, message = "") {
  if (show) {
    loadingText.textContent = message;
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
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// ── TOAST ────────────────────────────────────────────────────
let toastTimer = null;
const toastEl  = document.getElementById("toast");

function showToast(msg, type = "info") {
  toastEl.textContent = msg;
  toastEl.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
}

// ============================================================
// CORE PROCESSING FUNCTIONS
// ============================================================

/**
 * cleanText(text)
 * Normalises raw input: fixes spacing, paragraphs, encoding artifacts
 */
function cleanText(text) {
  let t = text;

  // Decode common HTML entities
  t = t.replace(/&amp;/g,  "&")
       .replace(/&lt;/g,   "<")
       .replace(/&gt;/g,   ">")
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g,  "'")
       .replace(/&nbsp;/g, " ");

  // Normalize line endings
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove zero-width chars
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Fix multiple spaces within a line
  t = t.replace(/[^\S\n]+/g, " ");

  // Collapse more than 2 consecutive newlines → 2 (paragraph break)
  t = t.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace on each line
  t = t.split("\n").map(line => line.trim()).join("\n");

  // Remove leading/trailing blank lines
  t = t.trim();

  return t;
}

/**
 * generateTitle(text)
 * Extracts or synthesises a meaningful title from the text.
 */
function generateTitle(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // 1. First line that looks like a title (< 80 chars, no period at end)
  for (const line of lines.slice(0, 5)) {
    const clean = line.replace(/^[#\-*>\s]+/, "").trim();
    if (clean.length > 3 && clean.length < 90 && !clean.endsWith(".")) {
      return capitaliseTitle(clean);
    }
  }

  // 2. First sentence from first paragraph
  const firstPara = lines[0] || "";
  const sentences = firstPara.match(/[^.!?]+[.!?]*/g);
  if (sentences && sentences[0]) {
    const s = sentences[0].trim();
    if (s.length > 5 && s.length < 90) return capitaliseTitle(s.replace(/[.!?]+$/, ""));
  }

  // 3. Fallback: First 60 chars of first line
  return capitaliseTitle(lines[0].substring(0, 60));
}

function capitaliseTitle(str) {
  // Smart title case: cap first letter of each major word
  const minor = new Set(["a","an","the","and","but","or","for","nor",
    "on","at","to","by","in","of","up","as","ka","ki","ke","ne","se","ko",
    "hai","tha","thi","the","aur","ya","jo","jab","tab","ek"]);
  return str
    .replace(/[_\-]+/g, " ")
    .split(" ")
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i === 0 || !minor.has(lower)) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return lower;
    })
    .join(" ")
    .trim();
}

// ============================================================
// HINDI TRANSLITERATION MAP
// ============================================================
const HINDI_MAP = {
  // Vowels (independent)
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ऋ":"ri",
  "ए":"e","ऐ":"ai","ओ":"o","औ":"au","अं":"an","अः":"ah",
  // Vowel signs (matras)
  "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","ृ":"ri",
  "े":"e","ै":"ai","ो":"o","ौ":"au","ं":"n","ः":"h","्":"",
  // Consonants
  "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng",
  "च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n",
  "त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"f","ब":"b","भ":"bh","म":"m",
  "य":"y","र":"r","ल":"l","व":"v","श":"sh",
  "ष":"sh","स":"s","ह":"h",
  "ड़":"d","ढ़":"dh","ज़":"z","फ़":"f",
  // Numerals
  "०":"0","१":"1","२":"2","३":"3","४":"4",
  "५":"5","६":"6","७":"7","८":"8","९":"9",
  // Misc
  "।":".","\u0902":"n","\u093c":""
};

// Common Hindi word → Hinglish lookup
const HINDI_WORDS = {
  "शादी":"shaadi","प्यार":"pyaar","लड़की":"ladki","लड़का":"ladka",
  "मोहब्बत":"mohabbat","दिल":"dil","जिंदगी":"zindagi","यार":"yaar",
  "दोस्त":"dost","घर":"ghar","परिवार":"parivaar","माँ":"maa",
  "बाप":"baap","भाई":"bhai","बहन":"behen","पति":"pati","पत्नी":"patni",
  "कहानी":"kahani","किस्सा":"kissa","बात":"baat","रात":"raat",
  "दिन":"din","सच":"sach","झूठ":"jhooth","सपना":"sapna",
  "ख्वाब":"khwaab","इश्क":"ishq","दर्द":"dard","खुशी":"khushi",
  "गम":"gham","आँखें":"aankhein","होंठ":"hont","हाथ":"haath",
  "मिलना":"milna","बिछड़ना":"bichadna","याद":"yaad","भूलना":"bhoolna",
  "जवान":"jawan","हसीन":"haseen","सुंदर":"sundar","खूबसूरत":"khubsoorat",
  "नई":"nayi","पुरानी":"purani","पहली":"pahli","आखिरी":"aakhiri",
  "एक":"ek","दो":"do","तीन":"teen","चार":"chaar","पाँच":"paanch",
  "औरत":"aurat","मर्द":"mard","आशिक":"aashiq","माशूक":"maashuq",
  "इंतजार":"intezaar","मिलाप":"milaap","जुदाई":"judai","वादा":"vaada",
  "रिश्ता":"rishta","नाता":"naata","नसीब":"naseeb","किस्मत":"kismat",
  "देश":"desh","गाँव":"gaanv","शहर":"sheher","रस्ता":"raasta",
  "सफर":"safar","मुसाफिर":"musaafir","मंजिल":"manzil","राह":"raah",
  "लव":"love","स्टोरी":"story","रोमांस":"romance","डेटिंग":"dating",
};

/**
 * transliterateHindi(text)
 * Converts Hindi/Devanagari text to Hinglish using word lookup first,
 * then character-by-character mapping.
 */
function transliterateHindi(text) {
  if (!text) return text;

  // First pass: known word lookup
  let result = text;
  for (const [hindi, roman] of Object.entries(HINDI_WORDS)) {
    result = result.replace(new RegExp(hindi, "g"), roman);
  }

  // Second pass: character map
  let out = "";
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (HINDI_MAP[ch] !== undefined) {
      out += HINDI_MAP[ch];
    } else {
      out += ch;
    }
  }

  return out;
}

/**
 * generateSlug(title)
 * Always returns an English, hyphenated, lowercase slug.
 * Handles Hindi, mixed, and English titles.
 */
function generateSlug(title) {
  // 1. Transliterate any Hindi chars
  let slug = transliterateHindi(title);

  // 2. Lowercase
  slug = slug.toLowerCase();

  // 3. Replace & with 'and'
  slug = slug.replace(/&/g, "and");

  // 4. Remove everything except letters, digits, spaces, hyphens
  slug = slug.replace(/[^\w\s-]/g, "");

  // 5. Replace whitespace/underscores with hyphens
  slug = slug.replace(/[\s_]+/g, "-");

  // 6. Collapse multiple hyphens
  slug = slug.replace(/-{2,}/g, "-");

  // 7. Trim hyphens from ends
  slug = slug.replace(/^-+|-+$/g, "");

  // 8. Limit length to 70 chars, cut at word boundary
  if (slug.length > 70) {
    slug = slug.substring(0, 70).replace(/-[^-]*$/, "");
  }

  return slug || "untitled-post";
}

/**
 * generateDescription(text)
 * Returns a 150-200 char SEO-friendly description.
 */
function generateDescription(text) {
  // Remove markdown-like characters
  let plain = text.replace(/[#*_`>~\-]+/g, " ").replace(/\s+/g, " ").trim();

  // Skip very short lines (titles) — grab from first meaty paragraph
  const paragraphs = plain.split(/\n+/).map(p => p.trim()).filter(p => p.length > 40);
  const source = (paragraphs[0] || plain).replace(/\s+/g, " ");

  // Target ~160 chars
  let desc = source.substring(0, 190);

  // Cut at last full sentence if possible
  const lastPeriod = Math.max(
    desc.lastIndexOf("."),
    desc.lastIndexOf("!"),
    desc.lastIndexOf("?"),
    desc.lastIndexOf("।")
  );

  if (lastPeriod > 100) {
    desc = desc.substring(0, lastPeriod + 1);
  } else if (desc.length > 160) {
    // Cut at last word boundary
    desc = desc.substring(0, 160).replace(/\s+\S*$/, "") + "…";
  }

  // Transliterate any Hindi in description
  desc = transliterateHindi(desc).trim();

  // Ensure first letter is capitalised
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

/**
 * detectCategory(text)
 * Returns one of: romantic | relationship | real-story | desi-story | fantasy
 */
function detectCategory(text) {
  const t = text.toLowerCase();

  const signals = {
    "fantasy": [
      "dragon","magic","wizard","witch","potion","spell","kingdom","realm",
      "fairy","enchant","sorcerer","elves","dwarf","mystical","supernatural",
      "portal","teleport","prophecy","ancient power","dark lord"
    ],
    "romantic": [
      "love","pyaar","ishq","mohabbat","romance","kiss","hug","beloved",
      "darling","sweetheart","dil","heart","fell in love","loving",
      "romantic","affection","passion","adore","my love","I love you",
      "teri aankhein","tera chehra","first love","true love"
    ],
    "relationship": [
      "breakup","divorce","marriage","husband","wife","partner","relationship",
      "cheating","affair","trust","betrayal","commitment","girlfriend",
      "boyfriend","dating","shaadi","pati","patni","couple","family issues",
      "separation","toxic","abuse","manipulation"
    ],
    "desi-story": [
      "ghar","gaon","village","desi","indian","hindi","punjabi","bihari",
      "rajasthani","babu","bhaiya","behen","maa","baap","nani","nana",
      "sasural","devar","jethani","rishta","arranged","dulhan","dulha",
      "mehendi","haldi","baraat","ladki","ladka","beta","beti","chacha"
    ],
    "real-story": [
      "true story","real life","happened to me","i remember","my experience",
      "incident","actually","in reality","based on true","this is a true",
      "let me tell you","confession","witness","first hand","real events",
      "i was","i saw","i felt","when i was","my story","happened when"
    ]
  };

  const scores = {};
  for (const [cat, words] of Object.entries(signals)) {
    scores[cat] = words.reduce((sum, w) => sum + (t.includes(w) ? 1 : 0), 0);
  }

  // Boost desi-story if Hindi script present
  if (/[\u0900-\u097F]/.test(text)) scores["desi-story"] += 3;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (best && best[1] > 0) ? best[0] : "real-story";
}

/**
 * extractTags(text, category)
 * Generates 5–10 SEO-friendly tags from content.
 */
function extractTags(text, category) {
  const t = text.toLowerCase();
  const plain = transliterateHindi(t).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");

  // Category-specific seed tags
  const seedsByCategory = {
    "romantic"    : ["love story","romance","pyaar","dil ki baat","ishq","emotional story","hindi love story","romantic tale","love feelings","heart touching"],
    "relationship": ["relationship","breakup story","marriage","couple goals","real relationship","toxic relationship","true love","desi couple","love and life","family drama"],
    "real-story"  : ["true story","real incident","personal experience","confession","life story","real life story","hindi story","emotional","real events","true confession"],
    "desi-story"  : ["desi story","hindi kahani","gaon ki kahani","indian story","desi culture","arranged marriage","family story","hindi literature","indian values","desi life"],
    "fantasy"     : ["fantasy story","magic","supernatural","adventure","fiction","imaginary world","hindi fantasy","mythical","sci-fi","dark fantasy"]
  };

  const seeds = seedsByCategory[category] || seedsByCategory["real-story"];

  // Extract frequent meaningful words
  const stopWords = new Set([
    "the","a","an","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","could","should",
    "may","might","shall","can","need","dare","used","ought",
    "i","me","my","myself","we","our","us","you","your","he","she","it","they",
    "this","that","these","those","what","which","who","whom","whose",
    "and","but","or","nor","for","yet","so","because","since","while",
    "in","on","at","by","from","to","with","about","of","up","down","out",
    "then","than","when","where","how","if","not","no","yes","very",
    "just","also","only","even","still","again","back","first","last",
    "ka","ki","ke","ne","se","ko","hai","tha","thi","the","aur","ya","jo",
    "jab","tab","ek","hi","bhi","to","na","kya","koi","sab","apna","uska",
    "mera","tera","hum","woh","yeh","kuch","ab","phir","nahi","hoga"
  ]);

  const wordFreq = {};
  plain.split(/\s+/).forEach(word => {
    if (word.length > 3 && !stopWords.has(word) && /^[a-z]+$/.test(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Top frequent words
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);

  // Merge seeds + top words, remove duplicates, cap at 10
  const combined = [...new Set([...seeds.slice(0, 5), ...topWords.slice(0, 5)])];
  return combined.slice(0, 10);
}

/**
 * calculateReadTime(text)
 * Returns "X min read" based on 200 WPM average.
 */
function calculateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

/**
 * generateRandomViews()
 * Returns a realistic view count between 150,000 and 900,000.
 */
function generateRandomViews() {
  // Use weighted random for more realistic distribution
  const rand = Math.random();
  let views;

  if (rand < 0.5) {
    // 50% chance: 150k – 300k
    views = Math.floor(Math.random() * (300000 - 150000 + 1)) + 150000;
  } else if (rand < 0.8) {
    // 30% chance: 300k – 550k
    views = Math.floor(Math.random() * (550000 - 300001 + 1)) + 300001;
  } else {
    // 20% chance: 550k – 900k (viral)
    views = Math.floor(Math.random() * (900000 - 550001 + 1)) + 550001;
  }

  // Add small random jitter to avoid "round" numbers
  const jitter = Math.floor(Math.random() * 999);
  return views + jitter;
}

/**
 * formatMarkdown(data)
 * Assembles the final YAML frontmatter + content markdown string.
 */
function formatMarkdown(data) {
  const { title, slug, description, author, category, tags,
          publishDate, readTime, featured, views, content } = data;

  // Format tags as YAML list
  const tagsYaml = tags.map(t => `  - "${t}"`).join("\n");

  // Format content — wrap into nice paragraphs
  const formattedContent = formatContent(content, title);

  const frontmatter = `---
title: "${escapeYaml(title)}"
slug: "${slug}"
description: "${escapeYaml(description)}"
author: "${escapeYaml(author)}"
category: "${category}"
tags:
${tagsYaml}
publishDate: "${publishDate}"
readTime: "${readTime}"
featured: ${featured ? "true" : "false"}
views: ${views}
---

${formattedContent}`;

  return frontmatter;
}

/**
 * formatContent(text, title)
 * Formats the body content as clean Markdown.
 */
function formatContent(text, title) {
  const lines = text.split("\n");
  const output = [];
  let inParagraph = false;
  let firstHeadingAdded = false;

  // Remove the title line if it appears as first line
  let startIdx = 0;
  const firstLine = lines[0]?.trim().replace(/^[#\s]+/, "");
  if (firstLine && title.toLowerCase().includes(firstLine.toLowerCase().substring(0, 20))) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      if (inParagraph) output.push("");
      inParagraph = false;
      continue;
    }

    // Detect already-marked headings
    if (/^#{1,6}\s/.test(line)) {
      if (inParagraph) output.push("");
      output.push(line);
      output.push("");
      inParagraph = false;
      firstHeadingAdded = true;
      continue;
    }

    // Auto-detect short lines that look like section headers
    const trimmed = line.trim();
    if (
      trimmed.length < 55 &&
      trimmed.length > 4 &&
      !trimmed.endsWith(",") &&
      (trimmed.endsWith(":") || /^[A-Z\u0900-\u097F]/.test(trimmed) && !inParagraph && i > startIdx + 2)
    ) {
      // Could be a heading — make it h2 if it reads like one
      if (!trimmed.endsWith(".") && !trimmed.endsWith("।") && words(trimmed) <= 8) {
        if (!firstHeadingAdded) firstHeadingAdded = true;
        if (inParagraph) output.push("");
        output.push(`## ${trimmed.replace(/:$/, "")}`);
        output.push("");
        inParagraph = false;
        continue;
      }
    }

    // Regular paragraph line
    output.push(trimmed);
    inParagraph = true;
  }

  // Ensure double newlines between blocks
  let result = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

function words(str) {
  return str.trim().split(/\s+/).length;
}

function escapeYaml(str) {
  return String(str).replace(/"/g, '\\"').replace(/\n/g, " ");
}

// ── KEYBOARD SHORTCUT ────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Enter → Generate
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    generateBtn.click();
  }
  // Ctrl/Cmd + Shift + C → Copy
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
    e.preventDefault();
    if (!copyBtn.disabled) copyBtn.click();
  }
});

// ── INIT ─────────────────────────────────────────────────────
(function init() {
  // Trigger word count on load (in case of browser autofill)
  inputText.dispatchEvent(new Event("input"));

  // Hint toast on first focus
  let hinted = false;
  inputText.addEventListener("focus", () => {
    if (!hinted) {
      hinted = true;
      setTimeout(() => showToast("Tip: Ctrl+Enter to generate quickly", "info"), 800);
    }
  }, { once: true });
})();
