# Markdown to PDF Malayalam

A local-first browser app for converting Markdown into polished, print-ready PDFs with strong Malayalam and English typography support.

## Features

- Live Markdown preview using `markdown-it`
- Browser-native PDF export through the print dialog
- Malayalam-friendly font presets with Noto Sans Malayalam and Noto Serif Malayalam
- Multiple dense document themes powered by Tailwind Typography
- Adjustable font size, line height, alignment, margin, paper size, and orientation
- Markdown file import and Markdown download
- Reset, clear, sample restore, and manual page-break controls
- Optional document metadata for title, author, date, footer text, and print page markers
- Named presets for essays, reports, poems, flyers, and formal letters
- Word count, character count, and estimated page count
- Advanced layout and metadata controls are collapsed by default
- Automatic session restore with `localStorage`
- App manifest and service worker caching for offline reuse after the first served load
- Print rules for cleaner headings, tables, code blocks, links, and images

## Usage

1. Open `index.html` in a modern browser.
2. Paste or write Markdown in the editor.
3. Choose a theme and document settings in the sidebar.
4. Use **Preset** for a ready document format, or keep **Custom**.
5. Open **Advanced Options** for layout, metadata, page breaks, and reset tools.
6. Use **Insert Page Break** to add `<!-- pagebreak -->`.
7. Use **Open** to import a `.md`, `.markdown`, or `.txt` file.
8. Use **Save** to download the current Markdown.
9. Use **Download PDF** to open the browser print dialog.

For a clean PDF, turn off browser print headers and footers in the print dialog.

## PDF Settings

The app supports:

- Paper: A4, Letter
- Orientation: Portrait, Landscape
- Margins: Compact, Standard, Roomy
- Alignment: Left, Justify, Center
- Fonts: Theme default, Malayalam Sans, Malayalam Serif, English Modern, English Serif, Soft Sans
- Metadata: Title, author, date, footer text, page marker

The browser print engine handles Malayalam shaping more reliably than canvas-based PDF libraries, so the export intentionally uses `window.print()`.

## Files

- `index.html`: UI layout and app shell
- `style.css`: preview and print-specific CSS
- `script.js`: rendering, settings, local persistence, import/export, and print trigger
- `tailwind-config.js`: Tailwind Typography theme configuration
- `manifest.json`: installable app metadata
- `sw.js`: service worker cache for app shell and fetched assets
- `plan.md`: historical build plan and technical notes

## Notes

This is a static app. It does not need a build step. Opening `index.html` directly works for normal use, but service-worker offline caching requires serving the folder over `http://localhost` or HTTPS.

CDN access is still required for the first load of Google Fonts, Tailwind, and `markdown-it`. After a served first load, the service worker can reuse cached app files and fetched CDN assets.
