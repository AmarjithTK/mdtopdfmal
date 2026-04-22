# System Update Plan

## Completed Update Pass

1. Compact the header and sidebar so the editor and preview have more working space.
2. Add document controls for font size, line height, paper size, orientation, print margin, text alignment, and font family.
3. Add Markdown import and Markdown download actions.
4. Persist the current Markdown and all selected settings in `localStorage`.
5. Apply page-size and orientation changes to both the on-screen preview and print stylesheet.
6. Strengthen print CSS for headings, tables, code blocks, images, and links.
7. Refresh the README to match the upgraded system.
8. Add reset, clear, sample restore, and manual page-break controls.
9. Add document metadata for title, author, date, footer text, and page markers.
10. Add named presets for essay, report, poem, flyer, and formal-letter layouts.
11. Add live word count, character count, and estimated page count.
12. Split Tailwind theme configuration into `tailwind-config.js`.
13. Add `manifest.json` and `sw.js` for installability and offline reuse after the first served load.
14. Hide advanced layout, metadata, page-break, and reset tools behind a collapsed dropdown by default.

## Current Architecture

```text
Markdown input
  -> markdown-it
  -> metadata/page-break preprocessing
  -> themed HTML preview
  -> CSS print layout
  -> browser print dialog
  -> Save as PDF
```

## Why Browser Print Stays

The browser print engine is still the best fit for this app because it handles Malayalam shaping, font rendering, and multi-page layout more reliably than canvas-based PDF libraries.

## Future Improvements

- Vendor `markdown-it`, Tailwind, and fonts for first-load offline use.
- Add front matter parsing so metadata can be embedded in Markdown.
- Add stronger print footer/page-number support if browser support improves.
- Add exportable/importable settings profiles.
