# Markdown to PDF (Malayalam) 📄✨

A sleek, local-first web application designed to elegantly convert Markdown into beautifully formatted, print-ready A4 PDFs, complete with robust support for Malayalam typography.

## 🚀 Features

- **Pristine Malayalam Support:** Loaded with *Noto Sans Malayalam* and *Noto Serif Malayalam* ensuring perfect rendering without the font shaping issues typical in CLI tools.
- **Vibrant Tailwind Themes:** Multiple highly tailored, dense typography themes to pick from:
  - Minimalist (Clean/Standard)
  - Blue Accent (Corporate)
  - Classic Red (Serif)
  - Vibrant Emerald (Green)
  - Sunset Gradient (Orange/Pink)
  - Deep Violet (Purple)
  - Ocean Wave (Teal/Cyan)
  - Rose Gold (Rose/Amber)
  - Cyberpunk (Pink/Cyan)
- **Live Preview:** Immediate, A4-scaled live preview directly in the browser.
- **Native Print Engine Integration:** Bypasses complex PDF tooling by smartly utilizing the browser's native print engine with aggressive CSS overrides (`@media print`) so that exactly what you see is what prints.
- **Zero Configuration:** Entirely self-contained in HTML, CSS, and vanilla JS. Just open the `index.html` file in any modern browser!

## ⚙️ How it Works

The tool relies on `markdown-it` to parse the markdown locally in the browser, piping the HTML into a `prose` container styled by the `@tailwindcss/typography` plugin via CDN. 
Customized themes inject colorful blockquotes, markers, list items, and horizontal separators onto a strictly constrained layout. 

When exporting, Tailwind's `print:hidden` classes perfectly hide the UI, while custom `@page` overrides enforce a tight `8mm` margin.

## 🛠 Usage

1. Open `index.html` in your web browser.
2. Paste or write your Markdown (English or Malayalam) into the left editor pane.
3. Select your favorite design theme from the sidebar.
4. Click **Download PDF** (or press Ctrl+P). 
   *Note: In your browser's print dialog, ensure "Headers and Footers" is unchecked to get a perfectly clean document.*

## 🐛 Bug Fixes & Layout
- Handled massive blank spacing issues before tables and elements by dynamically replacing default print breaks with `page-break-inside: auto !important` logic.

## 🤝 Open Source
Created with a focus on simplicity, utility, and design density. Feel free to tweak the CSS payload in `index.html` to add your own custom Tailwind typography configurations.