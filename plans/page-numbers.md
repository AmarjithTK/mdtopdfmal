# Plan: Add Page Numbers to Print-to-PDF

## Problem

The app currently prints clean A4 PDFs via `window.print()` but has **no page numbers**. Users producing multi-page documents need page numbering at the bottom of each page.

## Approach: CSS `@page` Margin Boxes

Use the **CSS Paged Media** specification's `@bottom-center` margin box inside `@page` to inject a `counter(page)` — a pure-CSS solution that requires zero JavaScript complexity.

### Why This Approach

| Factor | Verdict |
|---|---|
| **Live preview unaffected** | The rule lives inside `@media print` — invisible on screen |
| **Multi-page handling** | The browser engine automatically increments `counter(page)` per sheet |
| **No layout interference** | The number renders in the page margin, outside content flow |
| **Browser support** | Works in **Chrome, Edge, Safari** (the standard for "Save as PDF"). Firefox does NOT support `@page` margin boxes — acceptable trade-off |

### How It Works

```css
@page {
  size: A4;
  margin: 8mm 8mm 14mm 8mm;  /* bottom increased from 8mm → 14mm for number room */

  @bottom-center {
    content: counter(page);
    font-family: 'Poppins', sans-serif;
    font-size: 9pt;
    color: #6b7280;
  }
}
```

The bottom margin is increased from `8mm` to `14mm` to give the page number breathing room below the content. The `counter(page)` automatically shows `1`, `2`, `3`, etc. on each printed page.

---

## Implementation Steps

### Step 1 — Modify `style.css` @page rule

**File:** [`style.css`](style.css:54)

Replace the existing `@page` block:

```css
@media print {
  @page {
    size: A4;
    margin: 8mm;
  }
  ...
}
```

With:

```css
@media print {
  @page {
    size: A4;
    margin: 8mm 8mm 14mm 8mm;

    @bottom-center {
      content: counter(page);
      font-family: 'Poppins', sans-serif;
      font-size: 9pt;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
    }
  }
  ...
}
```

**Key details:**
- `margin: 8mm 8mm 14mm 8mm` — top, right, bottom, left. Bottom gets 14mm (6mm extra for the number)
- `font-variant-numeric: tabular-nums` — ensures digit widths stay consistent so the number doesn't "jump" across pages
- `color: #6b7280` — subtle gray so it doesn't distract from content
- `font-size: 9pt` — small enough to be unobtrusive

### Step 2 — Update A4 preview container padding (optional but recommended)

**File:** [`index.html`](index.html:828)

The on-screen A4 preview container currently has `p-4 md:p-8` padding. To visually hint at the page number placement on screen, consider no change needed — the preview is just a rough approximation anyway and the page number only appears in print.

### Step 3 — No JavaScript changes needed

The `script.js` file does **not** need modification. The CSS `@page` margin boxes are handled entirely by the browser's print engine when `window.print()` is called.

---

## Browser Compatibility

| Browser | `@page` margin boxes | Page numbers visible? |
|---|---|---|
| Chrome / Edge | ✅ Full support | ✅ Yes |
| Safari | ⚠️ Partial support | ✅ Yes (basic counter) |
| Firefox | ❌ Not supported | ❌ No (but Firefox print dialog has its own header/footer options) |

This is acceptable because:
1. The app's print-to-PDF workflow targets **Chrome/Edge** (the most common "Save as PDF" path)
2. The existing "Pro-Tip" in the sidebar already tells users to uncheck "Headers and footers" — a Chrome-specific instruction
3. Firefox users can still use the browser's built-in page numbering via print settings

---

## Visual Result

```
┌──────────────────────────────────┐
│                                  │
│  ... content ...                 │
│                                  │
│                                  │
│                                  │
│                                  │
│──────────────────────────────────│
│              1                   │  ← page number (bottom-center)
└──────────────────────────────────┘
```

---

## Summary

- **1 file changed:** [`style.css`](style.css:54) — modified `@page` block
- **0 JS changes:** Pure CSS solution
- **0 HTML changes:** Page numbers injected by browser print engine
- **Bottom margin:** Increased from `8mm` → `14mm` to accommodate the number
- **Font:** Poppins 9pt, gray `#6b7280`, tabular-nums for alignment
