# WP → Markdown

> Convert WordPress posts to clean Markdown files — entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue)
![Static](https://img.shields.io/badge/hosting-static-green)
![No Backend](https://img.shields.io/badge/backend-none-lightgrey)

---

## What It Does

Paste a WordPress post URL and get a clean `.md` file with:

- YAML front matter (title, description, author, date, categories, tags, source, featured image)
- Full post content converted from HTML to Markdown
- Batch mode — convert dozens of posts and download them as a `.zip`

Everything runs inside your browser. No server, no API keys, no data leaves your machine.

---

## How the WordPress REST API Is Used

The tool converts any WordPress post URL into a REST API request automatically.

**Example:**

```
Input:   https://example.com/my-great-post/
API:     https://example.com/wp-json/wp/v2/posts?slug=my-great-post
```

Additional calls are made to resolve:

| Endpoint | Purpose |
|---|---|
| `/wp-json/wp/v2/users/{id}` | Author name |
| `/wp-json/wp/v2/categories/{id}` | Category names |
| `/wp-json/wp/v2/tags/{id}` | Tag names |
| `/wp-json/wp/v2/media/{id}` | Featured image URL |

The REST API must be publicly accessible on the WordPress site (enabled by default on all WordPress installations since version 4.7).

---

## Output Format

```markdown
---
title: "My Great Post Title"
description: "A short excerpt from the post."
author: "Jane Doe"
date: 2024-03-15
categories: ["Technology", "Web"]
tags: ["wordpress", "markdown"]
source: https://example.com/my-great-post/
featured_image: https://example.com/wp-content/uploads/image.jpg
---

## Introduction

Post content here in clean Markdown...
```

---

## Features

- ✅ Single URL conversion with live preview
- ✅ Batch mode — multiple URLs, one ZIP download
- ✅ HTML → Markdown via [Turndown.js](https://github.com/mixmark-io/turndown)
- ✅ ZIP packaging via [JSZip](https://stuk.github.io/jszip/)
- ✅ Download `.md` file button
- ✅ Copy to clipboard button
- ✅ Loading indicators & progress tracking
- ✅ Clear error messages
- ✅ Mobile-first responsive design
- ✅ No build step, no server, no framework

---

## File Structure

```
wordpress-post-to-markdown/
├── index.html      # Main app UI
├── style.css       # All styles (pure CSS)
├── script.js       # All app logic
├── turndown.js     # HTML→Markdown library
├── zip.js          # JSZip for batch downloads
├── assets/
│   └── loader.svg  # Animated loading icon
├── README.md
└── LICENSE
```

---

## Deploy on GitHub + Cloudflare Pages

### Step 1 — Upload to GitHub

1. Create a new repository on [github.com](https://github.com)
2. Upload all project files (or use `git push`)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/wordpress-post-to-markdown.git
git push -u origin main
```

### Step 2 — Deploy on Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages** in the sidebar
3. Click **Create application** → **Pages** → **Connect to Git**
4. Select your GitHub repository
5. In the build settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/` *(root)*
6. Click **Save and Deploy**

Your site will be live at `https://your-project.pages.dev` in under a minute.

No build process. No environment variables. It just works.

---

## Local Development

No setup required. Open `index.html` directly in a browser — or use any static server:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

---

## Browser Compatibility

Works in all modern browsers: Chrome, Firefox, Safari, Edge.

Requires:
- `fetch` API
- `navigator.clipboard` (for copy button — HTTPS required)
- `Blob` + `URL.createObjectURL` (for downloads)

---

## License

MIT — see [LICENSE](LICENSE)
