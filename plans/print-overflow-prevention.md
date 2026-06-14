# Print Overflow Prevention — Final Comprehensive Plan

## Root Cause
The incremental CSS tweaks aren't enough. The print output has:
1. UI elements (sliders, sidebar, header, footer) not being fully suppressed
2. Horizontal overflow from content/theme styles exceeding page width

## Solution: Single comprehensive `@media print` rewrite in `style.css`

### Part A — Blast-hide all UI elements (belt + suspenders)
Add explicit `display: none` for every UI element by tag and class:

```css
@media print {
  header, footer, aside, textarea, select, button, input,
  optgroup, option, label, .print\:hidden,
  [class*="editor"], [class*="sidebar"],
  [class*="header"], [class*="footer"] {
    display: none !important;
  }
}
```

This ensures no UI chrome leaks into the PDF regardless of `print:hidden` working or not.

### Part B — Overflow safety net
```css
@media print {
  body {
    overflow-x: hidden !important;  /* clips horizontal only, preserves vertical pagination */
  }
}
```

### Part C — Keep existing content-level wrapping rules
All current `#preview-content *` rules stay:
- `word-break: break-word; overflow-wrap: break-word`
- `white-space: pre-wrap` on pre/code
- `max-width: 100%` on images, tables
- `table-layout: fixed` on tables
- `.katex` and inline `code` wrapping

## Files Changed
Only `style.css` — one change, add the hide rules before the existing `@media print` block.

## Files Not Changed
`index.html` — no HTML changes needed. The revert from earlier stays (body has `print:block`, main has no `print:overflow-hidden`).
