# 🗺️ NexPDF — Implementation Roadmap & Technical Plans

> This file is the **engineering playbook** for NexPDF. For each planned feature, you'll find:
> - What to build
> - Where to put the code
> - Which libraries to use
> - Key implementation notes
> - Gotchas to watch out for

> **Priority Order:** Rotate PDF → Remove/Extract Pages → Digital Signature → Grayscale → Image Watermark → Form Filler → Search Bar → Tool Favourites → PWA (last, once everything is stable)

---

## 🔄 Priority 1 — Rotate PDF (Standalone Tool)

### What it is
Users upload a PDF, choose which pages to rotate (or rotate all), and download the result.

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

## 🔄 Priority 2 — Rotate PDF (Standalone Tool)

### What it is
Users upload a PDF, choose which pages to rotate (or rotate all), and download the result.

### How to build it

**Route:** `/rotate` | **File:** `frontend/src/app/rotate/page.tsx`

**Libraries:** `pdf-lib` (rotate), `pdfjs-dist` (thumbnail previews)

**Core logic:**
```ts
import { PDFDocument, degrees } from 'pdf-lib';

const pdfDoc = await PDFDocument.load(arrayBuffer);
pdfDoc.getPages().forEach(page => {
  const current = page.getRotation().angle;
  page.setRotation(degrees(current + 90));
});
```

**UI pattern:** Thumbnail grid similar to PDF Editor Studio. Click each page to toggle rotation (+90° per click, cycles 0→90→180→270→0). Add a "Rotate All" button.

> **Note:** Don't confuse CSS `transform: rotate` (used for visual preview) with `page.setRotation()` (actual PDF rotation). Use CSS for preview, pdf-lib for export.

---

## ✂️ Priority 3 — Remove / Extract PDF Pages

### What it is
- **Remove Pages** — uncheck pages you want gone, download the rest
- **Extract Pages** — select a range (e.g. pages 3–7) and download just those

These can be one unified tool with a mode toggle.

### How to build it

**Route:** `/select-pages` | **File:** `frontend/src/app/select-pages/page.tsx`

**Core logic:**
```ts
// Copy only the pages we want to keep
const newPdf = await PDFDocument.create();
for (const idx of keepIndexes) {
  const [copiedPage] = await newPdf.copyPages(sourcePdf, [idx]);
  newPdf.addPage(copiedPage);
}
```

**UI:** Thumbnail grid with checkboxes. A mode toggle at the top switches between "Keep selected" (extract) and "Remove selected" (delete).

> **Note:** Always use `copyPages()` — it copies content, fonts, and images correctly. Never create blank pages and try to redraw.

---

## ✍️ Priority 4 — Digital Signature Tool

### What it is
Users draw or type a signature on a canvas, then click to position it on a PDF page and download.

### How to build it

**Route:** `/sign` | **File:** `frontend/src/app/sign/page.tsx`

**Libraries:** `pdf-lib`, `pdfjs-dist`, native Canvas API

**UI Flow:**
1. Upload PDF
2. Draw or type a signature on a `<canvas>`
3. Select which page to place it on
4. Click to position the signature on the page preview
5. Download the signed PDF

**Core logic — embed canvas signature into PDF:**
```ts
const signatureDataUrl = signatureCanvas.toDataURL('image/png');
const pngBytes = await fetch(signatureDataUrl).then(r => r.arrayBuffer());
const pngImage = await pdfDoc.embedPng(pngBytes);

page.drawImage(pngImage, {
  x: placedX,
  y: pageHeight - placedY - signatureHeight, // flip Y axis!
  width: signatureWidth,
  height: signatureHeight,
});
```

> **⚠️ Important:** pdf-lib uses **bottom-left (0,0)** origin. Screen coordinates use **top-left (0,0)**. Always convert: `pdfY = pageHeight - screenY - elementHeight`.

---

## 🎨 Priority 5 — Studio Sidebar: Grayscale

### What it is
A toggle in PDF Editor Studio that converts all pages to grayscale in the exported PDF.

### How to build it

**File:** `frontend/src/app/organize/page.tsx` — add toggle to the options sidebar.

**Strategy:** Render each page to canvas via pdf.js, desaturate pixel data manually, then embed the grayscale canvas as a PNG in the output PDF.

**Canvas desaturation:**
```ts
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = imageData.data;
for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i+1] + data[i+2]) / 3;
  data[i] = data[i+1] = data[i+2] = avg;
}
ctx.putImageData(imageData, 0, 0);
```

> **⚠️ Trade-off:** This converts pages to rasterized images, which increases file size and removes the text layer (copy-paste won't work). Mention this to users in the UI.

---

## 🖼️ Priority 6 — Studio Sidebar: Image Watermark

### What it is
Instead of text, let users stamp a PNG logo over every page.

### How to build it

**File:** `frontend/src/app/organize/page.tsx` — extend the existing "Add Watermark" toggle with a mode picker (Text vs. Image).

**Core logic:**
```ts
const logoBytes = await logoFile.arrayBuffer();
const logoImage = await pdfDoc.embedPng(logoBytes); // also embedJpg for JPEGs

pdfDoc.getPages().forEach(page => {
  const { width, height } = page.getSize();
  page.drawImage(logoImage, {
    x: width - 120 - 20,
    y: 20,
    width: 120,
    height: 60,
    opacity: 0.4,
  });
});
```

> **Note:** Always use PNG for logos that need transparency. JPEG doesn't support transparency.

---

## 📋 Priority 7 — PDF Form Filler

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

## 🔍 Priority 8 — Search Bar on Homepage

### What it is
Real-time search that filters the tools grid as you type.

### How to build it

**Files:** Extract the grid into `frontend/src/components/ToolsGrid.tsx` (Client Component).

```tsx
'use client';
import { useState } from 'react';
import { TOOLS } from '@/config/tools';

export function ToolsGrid() {
  const [query, setQuery] = useState('');
  const filtered = TOOLS.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search tools..."
      />
      <div className="grid ...">
        {filtered.map(tool => <ToolCard key={tool.href} tool={tool} />)}
      </div>
    </>
  );
}
```

> **Note:** Keep `page.tsx` as a Server Component for SEO. Only the `ToolsGrid` client component needs state.

---

## ⭐ Priority 9 — Tool Favourites

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
