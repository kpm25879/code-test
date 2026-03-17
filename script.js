/* ============================================================
   MARKFORGE — script.js  (v2 — fixed tags + category selector)
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
const loadingText    = document.getElementById("loadingText");
const statsBar       = document.getElementById("statsBar");
const statCategoryVal= document.getElementById("statCategoryVal");
const statReadTimeVal= document.getElementById("statReadTimeVal");
const statTagsVal    = document.getElementById("statTagsVal");
const statViewsVal   = document.getElementById("statViewsVal");
const statSlugVal    = document.getElementById("statSlugVal");
const outputStats    = document.getElementById("outputStats");
const optFeatured    = document.getElementById("optFeatured");
const authorInput    = document.getElementById("authorInput");
const autoBadge      = document.getElementById("autoBadge");
const categoryGrid   = document.getElementById("categoryGrid");

// ── STATE ─────────────────────────────────────────────────────
let lastProcessedData = null;
let selectedCategory  = "auto";

// ── FIXED TAGS (applied to every post) ───────────────────────
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
  "लड़कियों की गांड़ चुदाई"   : "ladkiyon-ki-gaand-chudai",
  "गे चुदाई"                 : "gay-chudai",
  "बुआ की चुदाई"             : "bua-ki-chudai",
  "ग्रुप में चुदाई"          : "group-mein-chudai",
  "नजदीकी रिश्तों में चुदाई" : "najdeeki-rishton-mein-chudai",
  "अदला बदली"                : "adla-badli",
  "लेस्बियन चुदाई"           : "lesbian-chudai",
  "नौकर नौकरानी चुदाई"       : "naukar-naukrani-chudai",
  "अजनबी की चुदाई"           : "ajnabi-ki-chudai",
  "भाभी की चुदाई"            : "bhabhi-ki-chudai",
  "चाची की चुदाई"            : "chachi-ki-chudai",
  "मामी की चुदाई"            : "mami-ki-chudai",
  "मौसी की चुदाई"            : "mausi-ki-chudai",
  "आंटी की चुदाई"            : "aunty-ki-chudai",
  "भाई बहन की चुदाई"         : "bhai-behen-ki-chudai",
  "ससुर बहू की चुदाई"        : "sasur-bahu-ki-chudai",
  "बाप बेटी की चुदाई"         : "baap-beti-ki-chudai",
  "माँ की चुदाई"             : "maa-ki-chudai",
  "बीवी की चुदाई"            : "biwi-ki-chudai",
  "चुदाई की कहानी"          : "chudai-ki-kahani",
  "जीजा साली की चुदाई"       : "jija-sali-ki-chudai",
  "गर्लफ्रेंड की चुदाई"      : "girlfriend-ki-chudai",
  "हॉट सेक्स स्टोरी"         : "hot-sex-story"
};

// ── CATEGORY BUTTONS ─────────────────────────────────────────
categoryGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".cat-btn");
  if (!btn) return;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedCategory = btn.dataset.cat;
  if (selectedCategory === "auto") {
    autoBadge.textContent = "AUTO";
    autoBadge.style.display = "";
  } else {
    autoBadge.textContent = "MANUAL";
    autoBadge.style.background = "rgba(0,229,160,0.1)";
    autoBadge.style.color = "var(--accent3)";
    autoBadge.style.borderColor = "rgba(0,229,160,0.3)";
  }
});

// ── WORD / CHAR COUNTER ───────────────────────────────────────
inputText.addEventListener("input", () => {
  const text = inputText.value;
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
  if (!raw) { showToast("Please paste some text first!", "error"); inputText.focus(); return; }
  if (raw.split(/\s+/).length < 5) { showToast("Text is too short — paste more content!", "error"); return; }
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
    showToast("✓ Copied to clipboard!", "success");
    copyBtn.querySelector("span").textContent = "✓ Copied!";
    setTimeout(() => { copyBtn.querySelector("span").textContent = "⎘ Copy"; }, 2000);
  } catch {
    outputText.select(); document.execCommand("copy");
    showToast("✓ Copied!", "success");
  }
});

// ── DOWNLOAD ──────────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!outputText.value || !lastProcessedData) return;
  const slug = lastProcessedData.slug || "output";
  const blob = new Blob([outputText.value], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${slug}.md`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast(`↓ Downloaded: ${slug}.md`, "success");
});

// ── MAIN GENERATION FLOW ──────────────────────────────────────
async function runGeneration(raw) {
  setLoading(true, "Analyzing content…");
  await delay(150);
  const cleaned = cleanText(raw);

  setLoading(true, "Extracting title & structure…");
  await delay(200);
  const title = generateTitle(cleaned);

  setLoading(true, "Generating SEO slug…");
  await delay(150);
  const slug = generateSlug(title);

  setLoading(true, "Detecting category…");
  await delay(150);
  const category = (selectedCategory !== "auto")
    ? selectedCategory
    : detectCategory(cleaned);

  const description = generateDescription(cleaned);
  const readTime    = calculateReadTime(cleaned);
  const views       = generateRandomViews();
  const author      = authorInput.value.trim() || "Admin";
  const featured    = optFeatured.checked;
  const publishDate = getTodayDate();

  setLoading(true, "Formatting markdown…");
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

  // Stats
  statCategoryVal.textContent = category;
  statReadTimeVal.textContent = readTime;
  statTagsVal.textContent     = "10 fixed tags";
  statViewsVal.textContent    = views.toLocaleString();
  statSlugVal.textContent     = slug;
  statsBar.classList.add("visible");

  const wc = cleaned.trim().split(/\s+/).length;
  outputStats.textContent = `${wc.toLocaleString()} words`;

  outputText.scrollTop = 0;
  outputText.scrollIntoView({ behavior: "smooth", block: "nearest" });
  showToast("✓ Markdown generated successfully!", "success");
}

// ── UTILS ─────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

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
  return new Date().toISOString().split("T")[0];
}

let toastTimer = null;
const toastEl  = document.getElementById("toast");
function showToast(msg, type = "info") {
  toastEl.textContent = msg;
  toastEl.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ============================================================
// CORE PROCESSING
// ============================================================

function cleanText(text) {
  let t = text
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ");
  t = t.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  t = t.replace(/[\u200B-\u200D\uFEFF]/g,"");
  t = t.replace(/[^\S\n]+/g," ");
  t = t.replace(/\n{3,}/g,"\n\n");
  t = t.split("\n").map(l=>l.trim()).join("\n");
  return t.trim();
}

function generateTitle(text) {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  for (const line of lines.slice(0,5)) {
    const clean = line.replace(/^[#\-*>\s]+/,"").trim();
    if (clean.length>3 && clean.length<90 && !clean.endsWith("."))
      return capitaliseTitle(clean);
  }
  const first = lines[0]||"";
  const s = (first.match(/[^.!?]+[.!?]*/)||[])[0];
  if (s && s.length>5 && s.length<90) return capitaliseTitle(s.replace(/[.!?]+$/,""));
  return capitaliseTitle(lines[0].substring(0,60));
}

function capitaliseTitle(str) {
  const minor = new Set(["a","an","the","and","but","or","for","nor","on","at",
    "to","by","in","of","up","as","ka","ki","ke","ne","se","ko","hai","tha","thi",
    "aur","ya","jo","jab","tab","ek"]);
  return str.replace(/[_\-]+/g," ").split(" ").map((w,i)=>{
    const lower=w.toLowerCase();
    return (i===0||!minor.has(lower)) ? w.charAt(0).toUpperCase()+w.slice(1) : lower;
  }).join(" ").trim();
}

// ── HINDI TRANSLITERATION ──────────────────────────────────────
const HINDI_WORDS = {
  "शादी":"shaadi","प्यार":"pyaar","लड़की":"ladki","लड़का":"ladka",
  "मोहब्बत":"mohabbat","दिल":"dil","जिंदगी":"zindagi","यार":"yaar",
  "दोस्त":"dost","घर":"ghar","परिवार":"parivaar","माँ":"maa",
  "बाप":"baap","भाई":"bhai","बहन":"behen","पति":"pati","पत्नी":"patni",
  "कहानी":"kahani","किस्सा":"kissa","बात":"baat","रात":"raat",
  "दिन":"din","सच":"sach","झूठ":"jhooth","सपना":"sapna",
  "ख्वाब":"khwaab","इश्क":"ishq","दर्द":"dard","खुशी":"khushi",
  "गम":"gham","आँखें":"aankhein","हाथ":"haath","याद":"yaad",
  "नई":"nayi","पुरानी":"purani","पहली":"pahli","आखिरी":"aakhiri",
  "एक":"ek","औरत":"aurat","मर्द":"mard","रिश्ता":"rishta",
  "देश":"desh","गाँव":"gaanv","शहर":"sheher","सफर":"safar",
  "मंजिल":"manzil","जासूस":"jasoos","रहस्य":"rahasya",
  "भूत":"bhoot","डर":"dar","हँसी":"hansi","मजेदार":"mazedar",
  "बच्चा":"bachcha","बच्चे":"bachche","स्कूल":"school",
  "प्रेरणा":"prerna","सफलता":"safalta","जीत":"jeet",
};

const HINDI_MAP = {
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ए":"e","ऐ":"ai","ओ":"o","औ":"au",
  "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","े":"e","ै":"ai","ो":"o","ौ":"au","ं":"n","ः":"h","्":"",
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
  for (const [h,e] of Object.entries(HINDI_WORDS)) r = r.replace(new RegExp(h,"g"),e);
  let out = "";
  for (const ch of r) out += (HINDI_MAP[ch]!==undefined) ? HINDI_MAP[ch] : ch;
  return out;
}

function generateSlug(title) {
  let s = transliterateHindi(title).toLowerCase()
    .replace(/&/g,"and").replace(/[^\w\s-]/g,"")
    .replace(/[\s_]+/g,"-").replace(/-{2,}/g,"-")
    .replace(/^-+|-+$/g,"");
  if (s.length>70) s = s.substring(0,70).replace(/-[^-]*$/,"");
  return s || "untitled-post";
}

function generateDescription(text) {
  let plain = text.replace(/[#*_`>~\-]+/g," ").replace(/\s+/g," ").trim();
  const paras = plain.split(/\n+/).map(p=>p.trim()).filter(p=>p.length>40);
  const source = (paras[0]||plain).replace(/\s+/g," ");
  let desc = source.substring(0,190);
  const lp = Math.max(desc.lastIndexOf("."),desc.lastIndexOf("!"),desc.lastIndexOf("?"),desc.lastIndexOf("।"));
  if (lp>100) desc = desc.substring(0,lp+1);
  else if (desc.length>160) desc = desc.substring(0,160).replace(/\s+\S*$/,"")+"\u2026";
  desc = transliterateHindi(desc).trim();
  return desc.charAt(0).toUpperCase()+desc.slice(1);
}

// ── AUTO CATEGORY DETECTION ───────────────────────────────────
function detectCategory(text) {
  const t = text.toLowerCase();
  const signals = {
    "रोमांटिक कहानी"    : ["love","pyaar","ishq","romance","mohabbat","dil","romantic","teri aankhein","first love"],
    "दिल की बात"        : ["dil","feelings","baat","emotions","heart","feeling","emotional","dard","aansu"],
    "सच्ची कहानी"       : ["true story","sach","real","happened","incident","meri zindagi","mera anubhav","sacchi"],
    "जिंदगी के किस्से"  : ["zindagi","life","safar","manzil","duniya","din","raat","waqt","pal"],
    "रिश्तों की कहानी"  : ["rishta","relation","husband","wife","pati","patni","breakup","marriage","shaadi","parivaar"],
    "दोस्ती की कहानी"   : ["dost","friend","yaar","dosti","friendship","saath","bachpan"],
    "परिवार की कहानी"   : ["parivaar","family","maa","baap","bhai","behen","ghar","gharwale"],
    "गाँव की कहानी"     : ["gaon","village","khet","dehaat","gramin","ghar ka","aam aadmi"],
    "शहर की कहानी"      : ["sheher","city","mumbai","delhi","office","naukri","metro","urban"],
    "भूत की कहानी"      : ["bhoot","ghost","darr","raat","andhere","haunt","supernatural","darawni","aatma"],
    "रहस्य कहानी"       : ["rahasya","mystery","crime","jasoos","shushan","khoon","murder","secret","chhupaana"],
    "मजेदार किस्से"     : ["hansi","mazaak","funny","joke","hasna","comedy","mazedar","haha","lol"],
    "प्रेरणादायक कहानी" : ["prerna","inspire","safalta","success","jeet","motivation","sikh","seekh","parishram"],
    "जासूसी कहानी"      : ["jasoos","detective","clue","case","investigation","police","crime","inquiry"],
    "बच्चों की कहानी"   : ["bachcha","bachche","school","teacher","pariksha","khel","cartoon","moral","seekh"],
  };
  const scores = {};
  for (const [cat,words] of Object.entries(signals))
    scores[cat] = words.reduce((s,w)=>s+(t.includes(w)?1:0),0);
  if (/[\u0900-\u097F]/.test(text)) scores["गाँव की कहानी"] = (scores["गाँव की कहानी"]||0)+1;
  const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return (best&&best[1]>0) ? best[0] : "सच्ची कहानी";
}

function calculateReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1,Math.round(words/200))} min read`;
}

function generateRandomViews() {
  const rand = Math.random();
  let v;
  if (rand<0.5)       v = Math.floor(Math.random()*(300000-150000+1))+150000;
  else if (rand<0.8)  v = Math.floor(Math.random()*(550000-300001+1))+300001;
  else                v = Math.floor(Math.random()*(900000-550001+1))+550001;
  return v + Math.floor(Math.random()*999);
}

// ── FORMAT MARKDOWN ───────────────────────────────────────────
function formatMarkdown(data) {
  const { title, slug, description, author, category,
          tags, publishDate, readTime, featured, views, content } = data;

  const tagsYaml = tags.map(t=>`  - "${t}"`).join("\n");
  const body     = formatContent(content, title);

  return `---
title: "${escapeYaml(title)}"
slug: "${slug}"
description: "${escapeYaml(description)}"
author: "${escapeYaml(author)}"
category: "${escapeYaml(category)}"
tags:
${tagsYaml}
publishDate: "${publishDate}"
readTime: "${readTime}"
featured: ${featured?"true":"false"}
views: ${views}
---

${body}`;
}

function formatContent(text, title) {
  const lines = text.split("\n");
  const out   = [];
  let inPara  = false;
  let startIdx = 0;

  const fl = (lines[0]||"").trim().replace(/^[#\s]+/,"");
  if (fl && title.toLowerCase().includes(fl.toLowerCase().substring(0,20))) startIdx=1;

  for (let i=startIdx; i<lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { if(inPara) out.push(""); inPara=false; continue; }
    if (/^#{1,6}\s/.test(line)) { if(inPara) out.push(""); out.push(line,""); inPara=false; continue; }
    const t = line.trim();
    if (t.length<55 && t.length>4 && !t.endsWith(",") && !t.endsWith(".") && !t.endsWith("।")
        && t.split(/\s+/).length<=8 && !inPara && i>startIdx+2) {
      if(inPara) out.push("");
      out.push(`## ${t.replace(/:$/,"")}`,"");
      inPara=false; continue;
    }
    out.push(t); inPara=true;
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

function escapeYaml(s) {
  return String(s).replace(/"/g,'\\"').replace(/\n/g," ");
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.addEventListener("keydown",(e)=>{
  if ((e.ctrlKey||e.metaKey)&&e.key==="Enter") { e.preventDefault(); generateBtn.click(); }
  if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==="C") { e.preventDefault(); if(!copyBtn.disabled) copyBtn.click(); }
});

// ── INIT ──────────────────────────────────────────────────────
(function init(){
  inputText.dispatchEvent(new Event("input"));
  inputText.addEventListener("focus",()=>{
    setTimeout(()=>showToast("Tip: Ctrl+Enter to generate","info"),800);
  },{once:true});
})();
