# Atherpulse Exporter — Markdown-to-PDF Pipeline

> A detailed breakdown of how Markdown is parsed, styled, and exported to PDF in this single-page application.

---

## Architecture Overview

The entire pipeline runs **client-side in the browser** with zero server dependency. It follows a linear 4-stage flow:

```
Raw Markdown Input
    │
    ▼
┌────────────────────────────┐
│ Stage 1: Pre-processing    │  ← Math recovery & delimiter normalization
│ (3 transform functions)    │
└────────────────────────────┘
    │
    ▼
┌────────────────────────────┐
│ Stage 2: Markdown Parsing  │  ← markdown-it + KaTeX → HTML
│ (md.render)                │
└────────────────────────────┘
    │
    ▼
┌────────────────────────────┐
│ Stage 3: CSS Styling       │  ← Tailwind Typography + CSS custom props
│ (17 themes + 3 sliders)    │
└────────────────────────────┘
    │
    ▼
┌────────────────────────────┐
│ Stage 4: PDF Export        │  ← window.print() → browser PDF
│ (@page A4 + break rules)   │
└────────────────────────────┘
```

---

## Stage 1: Pre-processing (`script.js`)

Before the Markdown reaches the parser, three functions clean and normalize it. This stage exists primarily to handle **real-world copy-paste artifacts** — especially broken LaTeX math notation from ChatGPT, web pages, and other sources.

### 1a. `fixKatexEnvironments()`

**Purpose:** Replace `\begin{align}` / `\end{align}` with KaTeX-compatible `\begin{aligned}` / `\end{aligned}`.

**Why:** KaTeX only supports the `aligned` environment inside `$$...$$` display math blocks. The standalone `align` environment used by full LaTeX distributions is not supported. This substitution preserves the visual alignment behavior while staying within KaTeX's capabilities.

**Safety:** The function splits the source on code-fence regexes and only transforms text outside backtick-delimited blocks, preventing corruption of code snippets.

### 1b. `normalizeMathDelimiters()`

**Purpose:** Convert all LaTeX math delimiters to the dollar-sign format that KaTeX expects, with heuristic recovery for broken notation.

**Normalizations performed (in order):**

| Source Pattern | Target Pattern | Reason |
|---|---|---|
| `\(...\)` | `$...$` | Inline math — convert to standard |
| `\[...\]` | `$$...$$` | Display math — convert to standard |
| Bare `[...]` (multiline) | `$$...$$` | Recovery: ChatGPT drops the backslash |
| Bare `[...]` (single-line) | `$$...$$` | Same recovery for single-line blocks |
| Bare `[...]` (inline) | `$...$` | Same recovery for inline fragments |
| Standalone math line | `$$ ... $$` | Heuristic detection (see below) |

**Standalone Math Line Detection (`isStandaloneMathLine()`):**

A line is considered "standalone math" if ALL of these are true:

1. Not empty, not starting with `# ` / `> ` / `- ` / `* ` / `1. ` (Markdown block constructors)
2. Length ≤ 160 characters (filters out prose paragraphs)
3. Does NOT contain `$` or `` ` `` (already delimited)
4. Does NOT end with `.` `:` `!` `?` (sentence-ending punctuation suggests prose)
5. Contains at least one math operator (`=`, `<`, `>`, `\command`)
6. Contains at least one math variable indicator (subscript `_`, parenthesized variable, Greek/Unicode math char)
7. Contains ONLY math-permissible characters (alphanumeric, `\{}()[].,_+\-*/^=<>|;:!Δ∫∑√π∞≤≥`)
8. Does NOT contain a plain English word of 3+ letters outside LaTeX commands

This aggressive heuristic catches cases like:
```
E = mc^2
x_n = 2n + 1
\sum_{i=1}^n i = n(n+1)/2
```
...without wrapping prose paragraphs in display-math blocks.

### 1c. `applyLazyMathFallbacks()`

**Purpose:** A last-resort safety net for math expressions that may not be captured by KaTeX. On non-math, non-code segments, common plain-text notations are replaced with HTML equivalents.

| Pattern | HTML Replacement | Example |
|---|---|---|
| `word^exponent` | `<sup>` | `x^2` → x² |
| `Letter_number` | `<sub>` | `H_2O` → H₂O |
| `a_{subscript}` | `<sub>` | `x_{i+1}` |
| `<->` | `&harr;` | bidirectional arrow |
| `->` | `&rarr;` | right arrow |
| `<-` | `&larr;` | left arrow |
| `+/-` | `&plusmn;` | plus-minus symbol |
| `<=` | `&le;` | less-than-or-equal |
| `>=` | `&ge;` | greater-than-or-equal |
| `!=` | `&ne;` | not-equal |

This ensures readability even when math rendering fails entirely.

---

## Stage 2: Markdown Parsing (`script.js`)

### Core Library: `markdown-it` v13.0.1

The parser is initialized with three options:

```js
const md = window.markdownit({
    html: true,        // Preserve raw HTML tags in output
    linkify: true,     // Auto-detect URLs → <a> tags
    typographer: true  // Smart typographic replacements
});
```

**`html: true`** — Inline HTML such as `<div>`, `<span>`, or `<img>` is passed through to the output unchanged. This allows embedding arbitrary rich content within Markdown.

**`linkify: true`** — Bare URLs like `https://example.com` are automatically wrapped in `<a href="...">` tags without needing `[...](...)` syntax.

**`typographer: true`** — Enables smart replacements:

| Source | Rendered As |
|---|---|
| `--` | `&mdash;` (em dash) |
| `---` | `&mdash;` (em dash) |
| `...` | `&hellip;` (ellipsis) |
| `"text"` | `&ldquo;text&rdquo;` (smart quotes) |
| `'text'` | `&lsquo;text&rsquo;` (smart single quotes) |
| `(c)` `(r)` `(tm)` | `&copy;` `&reg;` `&trade;` |

### Math Plugin: `texmath` + `KaTeX`

```js
.use(window.texmath, {
    engine: window.katex,
    delimiters: 'dollars',  // $...$ and $$...$$
    katexOptions: { throwOnError: false }
});
```

**`delimiters: 'dollars'`** — Configures the plugin to recognize `$inline$` and `$$display$$` syntax. When encountered, the content is passed to KaTeX for rendering into beautifully typeset math.

**`throwOnError: false`** — If KaTeX encounters an unparseable expression, it renders the raw text with a red error highlight instead of breaking the entire page.

### How `md.render()` Works (Conceptual)

The `markdown-it` library implements a **modular parsing architecture**:

1. **Tokenization** — The raw text is split into tokens by block-level rules (fenced code, headings, lists, HR, blockquote, paragraph) and inline-level rules (bold, italic, code, links, images, etc.).
2. **Rendering** — Each token type has a corresponding renderer rule that converts it to HTML.

Markdown constructs and their HTML output:

| Markdown | HTML Output |
|---|---|
| `# Heading` | `<h1>Heading</h1>` |
| `## Heading` | `<h2>Heading</h2>` |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |
| `` `code` `` | `<code>code</code>` |
| `[text](url)` | `<a href="url">text</a>` |
| `![alt](src)` | `<img src="src" alt="alt">` |
| `- item` | `<ul><li>item</li></ul>` |
| `1. item` | `<ol><li>item</li></ol>` |
| `> quote` | `<blockquote><p>quote</p></blockquote>` |
| `` ``` `` block | `<pre><code>...</code></pre>` |
| `---` | `<hr>` |
| `\| table \|` | `<table><tr><td>...</td></tr></table>` |

---

## Stage 3: Styling (`index.html` + `style.css`)

### Tailwind Typography System

The styling is built on **Tailwind CSS** via CDN (`tailwindcss?plugins=typography`). The `@tailwindcss/typography` plugin provides the `prose` class, which applies a carefully designed set of typographic defaults.

17 custom themes are defined as named prose variants within `tailwind.config`. Each theme is structured as:

```js
dense_minimal: {
    css: {
        '--tw-prose-body': '#111827',
        '--tw-prose-headings': '#000000',
        // ... per-element styles
        fontFamily: '"Noto Sans Malayalam", sans-serif',
        h1: { fontSize: '1.5em', borderBottom: '1px solid #e5e7eb', ... },
        p: { marginTop: '0.4em', marginBottom: '0.4em' },
        // ... etc
    }
}
```

**All 17 themes:**

| Theme Key | Class Name | Style |
|---|---|---|
| `dense_minimal` | `prose-dense_minimal` | Clean gray/black, left-aligned |
| `dense_blue` | `prose-dense_blue` | Blue accents, corporate feel |
| `dense_classic` | `prose-dense_classic` | Red serif, classic print |
| `dense_emerald` | `prose-dense_emerald` | Green, vibrant accents |
| `dense_sunset` | `prose-dense_sunset` | Orange/pink gradient |
| `dense_violet` | `prose-dense_violet` | Purple accents |
| `dense_ocean` | `prose-dense_ocean` | Teal/cyan wave |
| `dense_rosegold` | `prose-dense_rosegold` | Rose/amber |
| `dense_cyber` | `prose-dense_cyber` | Pink/cyan, neon feel |
| `dense_midnight` | `prose-dense_midnight` | Dark background, light text |
| `dense_earth` | `prose-dense_earth` | Warm brown tones |
| `dense_lavender` | `prose-dense_lavender` | Soft purple |
| `dense_slate` | `prose-dense_slate` | Neutral gray |
| `dense_inter` | `prose-dense_inter` | Inter font, modern |
| `dense_lora` | `prose-dense_lora` | Lora serif, elegant |
| `dense_raleway` | `prose-dense_raleway` | Raleway, minimalist |
| `dense_rubik` | `prose-dense_rubik` | Rubik, soft friendly |

Each paragraph, heading, list, blockquote, table, code block, and horizontal rule gets meticulously defined margins, colors, borders, and typography.

### Dynamic CSS Custom Properties

Three sliders control layout by setting CSS custom properties on `#preview-content`:

| Slider | Variable | Range | CSS Usage |
|---|---|---|---|
| Font Size | `--font-factor` | 0.7x–1.5x | `fontSize: calc(13px * var(--font-factor))` |
| Line Height | `--line-factor` | 0.6x–1.35x | `lineHeight: max(1, calc(1.45 * var(--line-factor)))` |
| Block Spacing | `--space-factor` | 0.15x–1.4x | `margin: calc(0.4em * var(--space-factor))` |

The block spacing variable is applied globally via `style.css` using `:where()` pseudo-selectors:

```css
#preview-content :where(p) {
    margin-top: calc(0.4em * var(--space-factor, 1)) !important;
    margin-bottom: calc(0.4em * var(--space-factor, 1)) !important;
}
#preview-content :where(h1) {
    margin-top: calc(1.2em * var(--space-factor, 1)) !important;
    margin-bottom: calc(0.4em * var(--space-factor, 1)) !important;
}
/* ... same pattern for h2, h3, ul, ol, li, blockquote, table, pre, hr */
```

This gives users fine-grained control over spacing density without touching CSS.

### Font Selection

The font selector dropdown sets `--preview-font` on the preview container:

```css
#preview-content {
    --preview-font: 'Noto Sans Malayalam', sans-serif;
    font-family: var(--preview-font) !important;
}
```

21 fonts are available across 4 categories: **Malayalam** (Noto Sans/Serif Malayalam), **Sans-Serif** (12 fonts including Inter, Poppins, Raleway), **Serif** (5 fonts including Lora, Playfair Display), **Monospace** (3 fonts including Fira Code, JetBrains Mono).

---

## Stage 4: PDF Export (`style.css` + `script.js`)

### The Print Trigger

```js
exportBtn.addEventListener('click', () => {
    window.print();
});
```

**`window.print()`** opens the browser's native print dialog. The user selects "Save as PDF" as the destination. No JavaScript PDF library is used — the browser's own PDF rendering engine produces the output.

### Print CSS Rules

```css
@media print {
    @page {
        size: A4;
        margin: 8mm;
    }
    /* ... break rules ... */
}
```

**`@page { size: A4; margin: 8mm; }`** — Sets the virtual paper dimensions. The browser paginates the HTML content to fit within A4 pages with 8mm margins on all sides.

**Break prevention rules:**

| Selector | Rules | Purpose |
|---|---|---|
| `#preview-content *` | `break-inside: auto !important` | Reset browser defaults |
| `h1, h2, h3, h4, h5, h6` | `break-after: avoid; break-inside: avoid` | Prevent orphaned headings at page bottoms |
| `img, tr, pre, code` | `break-inside: avoid` | Keep structural elements intact |

### Page Numbers

An optional `<style id="page-numbers-css">` block contains:

```css
@media print {
    @page {
        @bottom-center {
            content: counter(page);
            font-family: 'Poppins', sans-serif;
            font-size: 9pt;
            color: #6b7280;
        }
    }
}
```

The toggle button in the sidebar simply sets `pageNumbersStyle.disabled = !newState` — enabling or disabling this `<style>` element. When enabled, the CSS `counter(page)` auto-increments and displays the current page number at the bottom center of each printed page.

### Print-Specific Layout Overrides

Several elements are hidden during print via the `print:hidden` Tailwind class:
- The entire sidebar (controls, theme selector, sliders, export button)
- The header and footer
- The editor panel
- The "A4 Preview" label

The preview container loses its shadow, border, and max-width constraints to fill the full page:

```css
@media print {
    #preview-content {
        max-width: 100% !important;
        width: 100% !important;
        color: black !important;
    }
}
```

---

## Data Flow Diagram

```
┌─────────────┐
│ Textarea    │  markdownInput.value (raw string)
│ (#editor)   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Pre-processing Pipeline              │
│                                      │
│  1. fixKatexEnvironments()           │
│     • align → aligned               │
│                                      │
│  2. normalizeMathDelimiters()        │
│     • \( \) → $ $                   │
│     • \[ \] → $$ $$                 │
│     • Bare [ ] recovery             │
│     • Standalone math → $$ $$       │
│                                      │
│  3. applyLazyMathFallbacks()         │
│     • ^ → <sup>                     │
│     • _ → <sub>                     │
│     • → arrows, symbols            │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ markdown-it Parser                   │
│                                      │
│  md.render(processedSource)          │
│                                      │
│  Plugins:                            │
│    • texmath + KaTeX ($...$ → math) │
│                                      │
│  Output: HTML string                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ DOM Injection                        │
│                                      │
│  previewContent.innerHTML = html     │
│                                      │
│  Applied classes:                    │
│    • prose (base typography)         │
│    • prose-dense_* (theme variant)   │
│                                      │
│  CSS Variables active:               │
│    • --font-factor (slider)          │
│    • --line-factor (slider)          │
│    • --space-factor (slider)         │
│    • --preview-font (selector)       │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Browser Rendering Engine             │
│                                      │
│  • Layout: flowing text in A4-sized  │
│    container with 8mm padding        │
│  • Typography: Tailwind prose rules  │
│    scaled by CSS custom properties   │
│  • Images, tables, code blocks       │
│    rendered natively                 │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Print / PDF Export                   │
│                                      │
│  window.print()                      │
│    → Browser print dialog            │
│    → "Save as PDF" destination       │
│                                      │
│  @page rules:                        │
│    • size: A4                        │
│    • margin: 8mm                     │
│    • counter: page number (optional) │
│                                      │
│  Break rules:                        │
│    • avoid splitting headings        │
│    • avoid splitting images/tables   │
│    • avoid splitting code blocks     │
└──────────────────────────────────────┘
```

---

## Key Design Decisions

### Why no PDF library?

Rather than using a PDF-generation library like `jspdf` or `pdf-lib`, the app relies on the **browser's native print engine**. This approach:

- **Zero additional dependencies** for PDF generation
- **Full CSS support** — all Tailwind typography, custom fonts, and dynamic variables work naturally
- **Automatic pagination** — the browser handles page breaks, widows, and orphans
- **Malayalam/Unicode support** — the system font stack renders any script

The trade-off is dependency on the browser's print dialog, which varies slightly across browsers. The `@page` CSS rules are well-standardized and work consistently across Chrome, Firefox, and Edge.

### Why pre-processing instead of parser plugins?

The three pre-processing functions could theoretically be `markdown-it` plugins. They're implemented as string transforms for two reasons:

1. **Order independence** — Transformations must run in a specific order and may interact. String-level operations give full control.
2. **Error recovery** — Some transformations (like detecting bare `[...]` as broken LaTeX) require heuristics that don't map cleanly to the markdown-it plugin API.

### Why Tailwind Typography over custom CSS?

The `@tailwindcss/typography` plugin provides a proven set of typographic defaults that handle complex edge cases:

- Proper spacing for nested lists
- Correct inline code rendering within paragraphs
- Table styling that doesn't overflow
- Responsive typography that scales

Custom themes simply override color, font, and spacing variables while inheriting this robust foundation.

---

## Runtime Dependencies

| Library | Version | Purpose | Load Method |
|---|---|---|---|
| `markdown-it` | 13.0.1 | Markdown → HTML parser | CDN (`dist/markdown-it.min.js`) |
| `markdown-it-texmath` | (latest) | Math delimiter detection for markdown-it | CDN (`texmath.min.js`) |
| `KaTeX` | 0.16.8 | LaTeX math → HTML rendering | CDN (`katex.min.js` + `katex.min.css`) |
| `Tailwind CSS` | (latest) | Utility-first CSS framework | CDN (`tailwindcss?plugins=typography`) |
| `@tailwindcss/typography` | (bundled) | Prose typography plugin | Via Tailwind plugins config |
| `Font Awesome` | 6.5.1 | UI icons | CDN (`font-awesome/6.5.1/css/all.min.css`) |
| Google Fonts | — | 21 web fonts (Poppins, Inter, etc.) | CDN (Google Fonts API) |

All libraries are loaded via CDN, making the application fully self-contained in two files (`index.html` + `script.js` + `style.css`). No build step, bundler, or server is required.
