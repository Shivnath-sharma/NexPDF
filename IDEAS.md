# 💡 NexPDF — Feature Brainstorm

> Track new tool ideas and feature enhancements here.
> Status: 🟡 Planned | 🔵 In Progress | ✅ Done | ❌ Rejected

---

## ✅ Already Built (15 tools + UX features)

### 🛠️ Core PDF Tools
| # | Tool | Route | Description | How |
|---|------|-------|-------------|-----|
| 1 | Merge PDF | `/merge` | Combine multiple PDFs into one | Backend (multer + pdf-lib) |
| 2 | Split PDF | `/split` | Break a PDF into separate pages | Backend |
| 3 | Compress PDF | `/compress` | Reduce PDF file size | Backend |
| 4 | JPG → PDF | `/jpg-to-pdf` | Convert images to PDF | Backend |
| 5 | Watermark PDF | `/watermark` | Stamp custom text diagonally across every page | Client-side (pdf-lib) |
| 6 | **⭐ PDF Editor Studio** | `/organize` | Reorder/rotate/delete pages + page numbers & watermark | Client-side (pdf.js + pdf-lib) |
| 7 | **PDF → Text Extractor** | `/extract-text` | Extract readable text, copy or download as .txt | Client-side (pdf.js) |
| 8 | **🎨 PDF → Image** | `/pdf-to-image` | Convert pages to JPG, PNG, or WebP — unified format picker | Client-side (pdf.js + canvas) |
| 9 | **Redact PDF** | `/redact` | Draw black boxes over sensitive info, paginated UI + keyboard nav | Client-side (pdf.js + pdf-lib) |
| 10 | **PDF Metadata Viewer** | `/metadata` | View author, title, creation date, page count, file size | Client-side (pdf-lib) |
| 11 | **Rotate PDF** | `/rotate` | Per-page or bulk rotation, CW & CCW, interactive thumbnail grid | Client-side (pdf-lib) |
| 12 | **Remove / Extract Pages** | `/select-pages` | Remove or extract specific pages with a mode toggle | Client-side (pdf-lib) |
| 13 | **Sign PDF** | `/sign` | Draw a digital signature and place it anywhere on a page | Client-side (pdf-lib) |

> **Note:** `/pdf-to-jpg` and `/pdf-to-png` were legacy pages and have been consolidated into `/pdf-to-image`.

### 🚀 UX & Product Features Built
| Feature | Description | Notes |
|---------|-------------|-------|
| ✅ **Recent Tools** | Last 3 used tools shown at top of homepage, removable | `localStorage` + `RecentToolsTracker` + `RecentToolsList` components |
| ✅ **Dark / Light Mode** | System-aware theme toggle in navbar | `next-themes` |
| ✅ **Global Toast Notifications** | Rich feedback on every action | `sonner` |
| ✅ **Centralized Tools Config** | All tools defined in `/src/config/tools.ts` | Makes adding new cards trivial |

---

## 🛠️ Remaining Tool Ideas

### 🔐 Security & Privacy
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| 🟡 | **Protect PDF** | Add a password to lock a PDF | ❌ Needs `qpdf` on backend | Defer — needs backend setup |
| 🟡 | **Unlock PDF** | Remove password from a PDF | ❌ Needs `qpdf` on backend | Defer — needs backend setup |
| 🟡 | **Flatten PDF** | Flatten form fields so they cannot be edited | ✅ Yes (pdf-lib) | Useful for legal/forms |

### 📄 Conversion Tools
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| ✅ | **PDF → Image (JPG/PNG/WebP)** | Unified format picker | ✅ Yes (pdf.js) | Done! |
| 🟡 | **Word → PDF** | Convert .docx files to PDF | ❌ Needs LibreOffice | Defer |
| 🟡 | **HTML → PDF** | Convert a webpage/URL to PDF | ❌ Needs Puppeteer | Defer |
| 🟡 | **Excel → PDF** | Convert .xlsx files to PDF | ❌ Needs backend | Defer |
| 🟡 | **PDF → PPTX** | Export PDF slides to PowerPoint | ❌ Complex | Hard — skip for now |
| 🟡 | **Markdown → PDF** | Render a .md file as a beautiful PDF | ✅ Yes (marked + html2canvas or pdf-lib) | Niche but cool |

### ✏️ Studio Sidebar Additions *(add as toggles in PDF Editor Studio, not new pages)*
| Status | Feature | Description | Notes |
|--------|---------|-------------|-------|
| 🟡 | **Image Watermark** | Stamp a logo/PNG over every page | Upload image → embed with pdf-lib |
| 🟡 | **Grayscale** | Convert all pages to black & white | Render each page to canvas, desaturate via CSS filter, redraw |
| 🟡 | **Crop Margins** | Trim page edges (resize mediabox) | Modify page crop/media box via pdf-lib |
| 🟡 | **Add Blank Pages** | Insert empty pages at any position | One-liner with `pdfDoc.addPage()` in pdf-lib |
| 🟡 | **Headers & Footers** | Add custom text header/footer to every page | pdf-lib `drawText` at fixed y-positions |

### 📊 Info & Analysis
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| ✅ | **PDF Metadata Viewer** | Show author, title, creation date, keywords | ✅ Yes (pdf-lib) | Done! |
| 🟡 | **PDF Page Counter** | Show quick count of pages in a file — no download | ✅ Yes (pdf.js) | Micro-tool, great for homepage widget |
| 🟡 | **Compare PDFs** | Diff two PDFs side-by-side | Partial | Very complex — skip for now |
| 🟡 | **PDF Link Extractor** | Pull all hyperlinks from a PDF | ✅ Yes (pdf.js annotation layer) | Niche but interesting |

### 🎨 New Standalone Tools (Fresh Ideas)
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| 🟡 | **PDF Form Filler** | Fill interactive PDF forms in the browser | ✅ Yes (pdf-lib) | High value — many businesses need this |
| 🟡 | **Rotate PDF** | Rotate all or individual pages and download | ✅ Yes (pdf-lib) | Tiny tool, very searchable |
| 🟡 | **Number PDF Pages** | Add page numbers with custom position & style | ✅ Yes (pdf-lib) | Already in Studio — could expose as standalone too |
| 🟡 | **PDF Annotator** | Highlight text, add sticky notes, draw arrows | ✅ Yes (pdf.js + canvas overlay) | Complex but very premium feature |
| 🟡 | **Remove PDF Pages** | Upload PDF, pick pages to delete, download | ✅ Yes (pdf-lib) | Simple and high-demand |
| 🟡 | **Extract PDF Pages** | Pull specific page ranges out of a PDF | ✅ Yes (pdf-lib) | Variant of Split, but range-based |

---

## 🚀 UX & Product Features

| Status | Feature | Description | Priority |
|--------|---------|-------------|----------|
| 🟡 | **PWA Support** | Install NexPDF on desktop/phone, offline use | 🔥 High |
| ✅ | **Recent Tools** | Last 3 used tools on homepage, removable | 🔥 High |
| 🟡 | **Batch Processing** | Process multiple files at once | 🟡 Medium |
| 🟡 | **Drag-to-Reorder Tools** | Let users pin/reorder homepage tool cards | 🟡 Medium |
| 🟡 | **Search Bar** | Search tools by name from the homepage | 🟡 Medium |
| 🟡 | **Tool Favourites** | Star/pin tools to the top of the homepage | 🟡 Medium |
| 🟡 | **Processing History** | Show list of files processed in the session | 🟢 Low |
| 🟡 | **Keyboard Shortcuts** | Global shortcut panel (e.g. `M` for Merge) | 🟢 Low |
| 🟡 | **Share Link** | Generate a shareable link to a specific tool | 🟢 Low |
| 🟡 | **Dark/Light Quick Toggle** | Floating pill theme switcher | 🟢 Low |

---

## 🏗️ Architecture Decisions

| Decision | Reason |
|----------|--------|
| Small edits (page numbers, watermark, grayscale) → **PDF Editor Studio sidebar** | One upload, all edits, one download — best UX |
| Large tools with distinct workflows → **Separate pages** | Distinct UI/output + better for SEO |
| All tools declared in **`/src/config/tools.ts`** | Single source of truth for homepage, recent tools, search, etc. |
| **Client-side first** for all new tools | Instant, private, zero server cost |
| Backend tools deferred until backend is productionized | Requires system deps: `qpdf`, LibreOffice, Puppeteer |

---

## 📝 Recommended Build Order (Next Steps)

1. **Grayscale** in Studio Sidebar — render canvas with CSS filter, redraw
3. **Image Watermark** in Studio Sidebar — embed image with pdf-lib
4. **PDF Form Filler** — pdf-lib form fields, high business value
5. **Search Bar** on Homepage — filter `TOOLS` array by name in real time
6. **Tool Favourites** — `localStorage` list of pinned tool hrefs
7. **PWA Support** — `manifest.json` + `service-worker.js`, do last once all tools are stable

---

*Last updated: April 18, 2026*
