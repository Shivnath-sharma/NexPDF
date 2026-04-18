# 💡 NexPDF — Feature Brainstorm

> Track new tool ideas and feature enhancements here.
> Status: 🟡 Planned | 🔵 In Progress | ✅ Done | ❌ Rejected

---

## ✅ Already Built (12 tools)

| # | Tool | Route | Description | How |
|---|------|-------|-------------|-----|
| 1 | Merge PDF | `/merge` | Combine multiple PDFs into one | Backend |
| 2 | Split PDF | `/split` | Break a PDF into separate pages | Backend |
| 3 | Compress PDF | `/compress` | Reduce PDF file size | Backend |
| 4 | JPG → PDF | `/jpg-to-pdf` | Convert images to PDF | Backend |
| 5 | PDF → JPG | `/pdf-to-jpg` | Convert PDF pages to JPG images | Client-side (pdf.js) |
| 6 | Watermark PDF | `/watermark` | Stamp custom text diagonally across every page | Client-side (pdf-lib) |
| 7 | **⭐ PDF Editor Studio** | `/organize` | Reorder/rotate/delete pages + add page numbers & watermark in one tool | Client-side (pdf.js + pdf-lib) |
| 8 | **PDF → Text Extractor** | `/extract-text` | Extract all readable text, copy to clipboard or download as .txt | Client-side (pdf.js) |
| 9 | **PDF → PNG** | `/pdf-to-png` | Convert every PDF page to a lossless PNG image | Client-side (pdf.js) |
| 10 | **🎨 PDF → Image** | `/pdf-to-image` | Convert pages to JPG, PNG, or WebP — format picker in one unified tool | Client-side (pdf.js) |
| 11 | **Redact PDF** | `/redact` | Black out sensitive info by drawing boxes | Client-side (pdf.js + pdf-lib) |
| 12 | **PDF Metadata** | `/metadata` | View hidden properties, author details, and creation dates | Client-side (pdf-lib) |

> **Design Decision:** Small edits (page numbers, watermark) live inside the PDF Editor Studio sidebar — one upload, all edits, one download.

---

## 🛠️ Remaining Tool Ideas

### 🔐 Security & Privacy
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| 🟡 | **Protect PDF** | Add a password to lock a PDF | ❌ Needs `qpdf` on backend | Defer — needs backend setup |
| 🟡 | **Unlock PDF** | Remove password from a PDF | ❌ Needs `qpdf` on backend | Defer — needs backend setup |
| ✅ | **Redact PDF** | Black-out/censor sensitive text on pages | ✅ Yes (pdf-lib + pdf.js) | Done! (Paginated UI + Keyboard Nav) |

### 📄 Conversion Tools
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| ✅ | **PDF → PNG** | Merged into PDF → Image tool | ✅ Yes | Done — merged |
| ✅ | **PDF → Image (JPG/PNG/WebP)** | Unified format picker, replaces separate JPG & PNG pages | ✅ Yes (pdf.js) | Done! |
| 🟡 | **Word → PDF** | Convert .docx files to PDF | ❌ Needs LibreOffice | Defer |
| 🟡 | **HTML → PDF** | Convert a webpage/URL to PDF | ❌ Needs Puppeteer | Defer |
| 🟡 | **Excel → PDF** | Convert .xlsx files to PDF | ❌ Needs backend | Defer |

### ✏️ Studio Sidebar Additions *(add as toggles to PDF Editor Studio, not new pages)*
| Status | Feature | Description | Notes |
|--------|---------|-------------|-------|
| 🟡 | **Image Watermark** | Stamp a logo/PNG over every page instead of text | Upload image → draw on each page |
| 🟡 | **Grayscale** | Convert all pages to black & white | Draw gray filter rect over each page |
| 🟡 | **Crop Margins** | Trim page edges (resize mediabox) | Modify page crop box |
| 🟡 | **Add Blank Pages** | Insert empty pages at any position | One-liner with pdf-lib |

### 📊 Info & Analysis
| Status | Tool | Description | Client-Side? | Notes |
|--------|------|-------------|--------------|-------|
| ✅ | **PDF Metadata Viewer** | Show author, title, creation date, keywords | ✅ Yes (pdf-lib) | Done! |
| 🟡 | **Compare PDFs** | Diff two PDFs side-by-side | ✅ Partial (complex) | Complex — skip for now |

---

## 🚀 UX & Product Features

| Status | Feature | Description | Priority |
|--------|---------|-------------|----------|
| 🟡 | **PWA Support** | Install NexPDF on desktop/phone, offline use | 🔥 High |
| ✅ | **Recent Tools** | Show last 3 used tools at top of homepage via localStorage | 🔥 High |
| 🟡 | **Batch Processing** | Process multiple files at once | 🟡 Medium |
| 🟡 | **Drag-to-Reorder Tools** | Let users pin/reorder homepage tool cards | 🟡 Medium |
| 🟡 | **Dark/Light Quick Toggle** | Floating pill theme switcher | 🟢 Low |

---

## 🏗️ Architecture Decisions

| Decision | Reason |
|----------|--------|
| Small edits (page numbers, watermark, grayscale) → **PDF Editor Studio sidebar** | One upload, all edits, one download — much better UX |
| Large tools with distinct workflows (merge, split, extract, convert) → **Separate pages** | Different UI/output format; also better for SEO |
| **Client-side first** for all new tools | Instant, private, zero server cost |
| Backend tools deferred until backend is productionized | Requires system deps (qpdf, LibreOffice, Puppeteer) |

---

## 📝 What's Next — Recommended Build Order

1. **Redact PDF** — highly demanded, 100% client-side, standalone page
2. **PDF → PNG** — tiny change from PDF → JPG, just swap canvas format
3. **PDF Metadata Viewer** — quick standalone info page, no downloads needed
4. **PWA Support** — `manifest.json` + service worker, makes the whole app installable
5. **Image Watermark** in Studio sidebar — upgrade existing watermark toggle

---

*Last updated: April 17, 2026*
