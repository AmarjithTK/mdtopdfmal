# System Update Plan

## Completed Update Pass

1. Compact the header and sidebar so the editor and preview have more working space.
2. Add document controls for font size, line height, paper size, orientation, print margin, text alignment, and font family.
3. Add Markdown import and Markdown download actions.
4. Persist the current Markdown and all selected settings in `localStorage`.
5. Apply page-size and orientation changes to both the on-screen preview and print stylesheet.
6. Strengthen print CSS for headings, tables, code blocks, images, and links.
7. Refresh the README to match the upgraded system.

## Current Architecture

```text
Markdown input
  -> markdown-it
  -> themed HTML preview
  -> CSS print layout
  -> browser print dialog
  -> Save as PDF
```

## Why Browser Print Stays

The browser print engine is still the best fit for this app because it handles Malayalam shaping, font rendering, and multi-page layout more reliably than canvas-based PDF libraries.

## Future Improvements

- Vendor `markdown-it`, Tailwind, and fonts for fully offline use.
- Split the large Tailwind typography config out of `index.html`.
- Add a reset-settings button.
- Add optional front matter for document title, author, and date.
- Add named style presets for poems, essays, reports, and product sheets.
