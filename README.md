# Markdown to PDF Malayalam

A local-first browser app for converting Markdown into polished, print-ready PDFs with strong Malayalam and English typography support.

## Features

- Live Markdown preview using `markdown-it`
- Browser-native PDF export through the print dialog
- Malayalam-friendly font presets with Noto Sans Malayalam and Noto Serif Malayalam
- Multiple dense document themes powered by Tailwind Typography
- Adjustable font size, line height, alignment, margin, paper size, and orientation
- Markdown file import and Markdown download
- Automatic session restore with `localStorage`
- Print rules for cleaner headings, tables, code blocks, links, and images

## Usage

1. Open `index.html` in a modern browser.
2. Paste or write Markdown in the editor.
3. Choose a theme and document settings in the sidebar.
4. Use **Open** to import a `.md`, `.markdown`, or `.txt` file.
5. Use **Save** to download the current Markdown.
6. Use **Download PDF** to open the browser print dialog.

For a clean PDF, turn off browser print headers and footers in the print dialog.

## PDF Settings

The app supports:

- Paper: A4, Letter
- Orientation: Portrait, Landscape
- Margins: Compact, Standard, Roomy
- Alignment: Left, Justify, Center
- Fonts: Theme default, Malayalam Sans, Malayalam Serif, English Modern, English Serif, Soft Sans

The browser print engine handles Malayalam shaping more reliably than canvas-based PDF libraries, so the export intentionally uses `window.print()`.

## Files

- `index.html`: UI layout and Tailwind Typography theme configuration
- `style.css`: preview and print-specific CSS
- `script.js`: rendering, settings, local persistence, import/export, and print trigger
- `plan.md`: historical build plan and technical notes

## Notes

This is a static app. It does not need a build step or server, though serving the folder locally also works. CDN access is required for Google Fonts, Tailwind, and `markdown-it` unless those dependencies are vendored locally later.
