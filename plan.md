# 🗺️ NexPDF — Implementation Roadmap & Technical Plans

> This file is the **engineering playbook** for NexPDF. For each planned feature, you'll find:
> - What to build
> - Where to put the code
> - Which libraries to use
> - Key implementation notes
> - Gotchas to watch out for

> **Priority Order:** Form Filler → Tool Favourites → PWA (last, once everything is stable)

---

## 📋 Priority 1 — PDF Form Filler

### What it is
Users upload a PDF with interactive form fields (AcroForms), fill them in the browser, and download.

### How to build it

**Route:** `/form-filler` | **File:** `frontend/src/app/form-filler/page.tsx`

**Core logic:**
```ts
const form = pdfDoc.getForm();
const fields = form.getFields();

// Dynamically detect field type and name
fields.forEach(field => {
  const name = field.getName();
  const type = field.constructor.name; // PDFTextField, PDFCheckBox, etc.
});

// Fill a text field
form.getTextField('full_name').setText('John Doe');

// Check a checkbox
form.getCheckBox('agree_terms').check();
```

**UI:** After PDF load, scan fields and dynamically render a form in React matching the detected field types. On submit, write values back with pdf-lib and download.

> **Note:** Not all PDFs have AcroForms. Check `form.getFields().length === 0` and show a friendly message if no fields found.

> **Note:** Some PDFs are "locked" against editing. Wrap the entire operation in `try/catch`.



---

## ⭐ Priority 2 — Tool Favourites

### What it is
A star button on each tool card. Starred tools appear in a "My Favourites" section above the main grid.

### How to build it

**Files:**
- `frontend/src/components/FavouritesList.tsx` (same pattern as `RecentToolsList`)
- Add star button to `ToolCard` component

**`localStorage` key:** `nexpdf_favourites` — store array of `href` strings.

```ts
const toggleFavourite = (href: string) => {
  const stored = JSON.parse(localStorage.getItem('nexpdf_favourites') || '[]');
  const updated = stored.includes(href)
    ? stored.filter((h: string) => h !== href)  // remove
    : [...stored, href];                          // add
  localStorage.setItem('nexpdf_favourites', JSON.stringify(updated));
};
```

> **Note:** Use `e.preventDefault()` and `e.stopPropagation()` on the star button click to prevent the Link from navigating.

---

## ✅ Priority 3 — PWA Support (Make App Installable)

### What it is
Lets users install NexPDF on their phone or desktop like a native app. Works offline for the UI (tools still need the browser to run).

### How to build it

**Step 1 — Add a `manifest.json`**
Create `frontend/public/manifest.json`:
```json
{
  "name": "NexPDF",
  "short_name": "NexPDF",
  "description": "Free, private, client-side PDF tools",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#7c3aed",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2 — Add manifest link in `layout.tsx`**
In the `metadata` export:
```ts
export const metadata: Metadata = {
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
};
```

**Step 3 — Add a Service Worker**
Use `next-pwa` for easiest Next.js integration:
```bash
npm install next-pwa
```
Wrap `next.config.js`:
```js
const withPWA = require('next-pwa')({ dest: 'public' });
module.exports = withPWA({ /* existing config */ });
```

**Step 4 — Generate icons**
Create PNG icons (192×192 and 512×512) with the NexPDF logo and place in `frontend/public/`.

> **Note:** In dev mode, the service worker is disabled by default by `next-pwa`. Test PWA install only with `npm run build && npm start`.

---

## 🏗️ Backend Productionization Plan

These tools require system-level dependencies on the server.

### Required system deps
```bash
# Ubuntu/Debian
sudo apt-get install qpdf libreoffice
```

### Tools that depend on backend
| Tool | Backend Command |
|------|----------------|
| Protect PDF | `qpdf --encrypt <user-pw> <owner-pw> 256 -- in.pdf out.pdf` |
| Unlock PDF | `qpdf --decrypt --password=<pw> in.pdf out.pdf` |
| Word → PDF | `libreoffice --headless --convert-to pdf input.docx` |
| Excel → PDF | `libreoffice --headless --convert-to pdf input.xlsx` |
| HTML → PDF | `puppeteer` — `page.goto(url); page.pdf({...})` |

> **⚠️ Security:** Never pass raw user input to shell commands. Always use UUID temp filenames. Sanitize paths.

> **⚠️ Performance:** LibreOffice conversions can take 2–5 seconds. Set request timeouts to at least 30 seconds.

---

## 🎯 Quick Reference — Patterns Used Throughout NexPDF

### Adding a new client-side tool
1. Create `frontend/src/app/<route>/page.tsx` with `'use client'` at top
2. Add tool object to `frontend/src/config/tools.ts`
3. Done — homepage grid, recent tools, and future search all pick it up automatically

### Y-axis coordinate conversion (very important!)
pdf-lib uses **bottom-left (0,0)**. Browser/canvas uses **top-left (0,0)**:
```ts
const pdfY = pageHeight - screenY - elementHeight;
```

### Standard file upload pattern
```ts
const { getRootProps, getInputProps } = useDropzone({
  accept: { 'application/pdf': ['.pdf'] },
  maxFiles: 1,
  maxSize: 50 * 1024 * 1024, // 50MB
  onDrop: async (files) => { /* your logic */ }
});
```

### Standard download pattern
```ts
const blob = new Blob([pdfBytes], { type: 'application/pdf' });
setDownloadUrl(URL.createObjectURL(blob));
// In JSX:
// <a href={downloadUrl} download="output.pdf">Download</a>
```

---

*Created: April 18, 2026*
