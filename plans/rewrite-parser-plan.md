# Plan: Rewrite Parser as `script2.js` Using Crossnote Patterns

## Current Architecture (script.js)

```
Markdown input
  │
  ▼
fixKatexEnvironments()    ← \begin{align} → \begin{aligned}
  │
  ▼
normalizeMathDelimiters() ← 4-phase normalization:
  Phase A: Split by HTML/code tags
  Phase B: \( \) → $ $, \[ \] → $$ $$$
  Phase C: [latex] recovery (lost backslash)
  Phase D: Standalone line wrapping → $$...$$
  │
  ▼
applyLazyMathFallbacks()  ← a^n → <sup>, A_0 → <sub>, -> → &rarr;
  │
  ▼
md.render()               ← markdown-it + texmath + KaTeX
  │
  ▼
previewContent.innerHTML
```

## Proposed Architecture (script2.js)

```
Markdown input
  │
  ▼
transformMarkdown()       ← NEW: line-by-line pre-processor (port from crossnote)
  │  ├── Front-matter extraction (---...---)
  │  ├── Colon fence handling (:::name ... :::)
  │  ├── Code block protection (backtick fences)
  │  ├── Math display block protection (skip transforms inside $$...$$)
  │  ├── Heading attributes ({#id .class key=val})
  │  ├── [TOC] marker support
  │  ├── Task list checkboxes ([x] → <input checked>)
  │  ├── @import file inclusion
  │  ├── WikiLink embed (![[...]])
  │  ├── ^block-id markers
  │  └── #tag syntax (for non-markdown-it content)
  │
  ▼
normalizeMathDelimiters() ← IMPROVED: borrow from crossnote's math.ts
  │  ├── HTML/code tag protection (keep existing)
  │  ├── \( \) → $ recovery (keep existing, add \\\( handling)
  │  ├── \[ \] → $$ recovery (keep existing, add \\\[ handling)
  │  ├── [latex] recovery (keep existing, more Unicode symbols)
  │  └── Standalone line wrapping (keep existing, more Unicode symbols)
  │
  ▼
fixKatexEnvironments()    ← IMPROVED: add gather, multline, split
  │
  ▼
applyLazyMathFallbacks()  ← IMPROVED: scope replacements better
  │
  ▼
md.render()               ← markdown-it + texmath + KaTeX
  │
  ▼
enhanceRenderedHTML()     ← NEW: post-render HTML enhancement (port from crossnote)
  │  ├── Fenced math (```math blocks)
  │  ├── Fenced diagrams (mermaid, etc.)
  │  ├── Extended table syntax (^^ and \\ for merged cells)
  │  ├── Embedded wikilinks (![[page]] transclusion)
  │  └── Code block styling (prism if available)
  │
  ▼
previewContent.innerHTML
```

## Files to Create

### `script2.js` — The new parser module

Structured into clearly named functional sections:

```javascript
// =============================================
// script2.js — Crossnote-inspired Markdown Parser
// =============================================

// ── 1. Block Info / Attribute Parsing ──
// Port from crossnote/src/lib/block-attributes/parseBlockAttributes.ts
// Port from crossnote/src/lib/block-info/parse-block-info.ts
function parseBlockAttributes(text) { ... }
function parseBlockInfo(raw) { ... }
function normalizeBlockInfo(blockInfo) { ... }

// ── 2. Math Delimiter Utilities ──
// Port from crossnote/src/custom-markdown-it-features/math.ts
const MATH_BLOCK_DELIMITERS = [['$$', '$$'], ['\\[', '\\]']];
const MATH_INLINE_DELIMITERS = [['$', '$'], ['\\(', '\\)']];
function findMathDelimiter(source, pos, delimiters) { ... }
function protectCodeBlocks(source) { ... }  // <code>, <pre>, <script>, <style>

// ── 3. Pre-processing Transformer ──
// Simplified port from crossnote/src/markdown-engine/transformer.ts
function transformMarkdown(inputString) { ... }
function processFrontMatter(input) { ... }
function processColonFences(line, state) { ... }
function processCodeBlocks(line, state) { ... }
function processMathDisplayBlocks(line, state) { ... }
function processHeadings(line, state) { ... }
function processTaskList(line, state) { ... }
function processImports(line, state) { ... }
function processWikilinkEmbeds(line, state) { ... }
function processBlockIds(line, state) { ... }
function processTags(line, state) { ... }

// ── 4. Math Normalization (existing, improved) ──
function looksLikeLatex(value) { ... }  // ← More Unicode symbols
function cleanLatexBlock(value) { ... }
function isStandaloneMathLine(line) { ... }  // ← More Unicode symbols
function normalizeMathDelimiters(source) { ... }  // ← Handle \\\(, \\\[
function fixKatexEnvironments(source) { ... }  // ← Add gather, multline, split
function applyLazyMathFallbacks(source) { ... }  // ← Scoped arrows/relations

// ── 5. Post-Render Enhancement ──
// Simplified port from crossnote/src/markdown-engine/index.ts:parseMD()
function enhanceRenderedHTML(html, container) { ... }
function enhanceFencedMath($) { ... }
function enhanceFencedDiagrams($) { ... }
function enhanceExtendedTables($) { ... }
function enhanceEmbeddedWikilinks($, notebook) { ... }

// ── 6. Main Pipeline ──
function renderMarkdown(source) {
  try {
    let md = transformMarkdown(source);
    md = normalizeMathDelimiters(md);
    md = fixKatexEnvironments(md);
    md = applyLazyMathFallbacks(md);
    let html = mdEngine.render(md);
    html = enhanceRenderedHTML(html);
    return html;
  } catch (e) {
    return fallbackRender(source);
  }
}
```

## Key Improvements from Crossnote

### 1. Configurable Math Delimiters
Crossnote uses `mathBlockDelimiters` and `mathInlineDelimiters` arrays (pairs of strings). This allows supporting `$$`/`$` AND `\[`/`\(` simultaneously without hardcoding.

### 2. Block-Level Math Protection
Crossnote's `math.ts` block rule runs BEFORE `lheading`, preventing `$$` blocks with `=` inside from being split into Setext headings. The `transformer.ts:490-521` also skips ALL line transformations inside math display blocks.

### 3. renderMathInHtml (HTML block recovery)
Crossnote's `math.ts:214-286` scans HTML for math delimiters inside `<div>`/`<td>` etc. and renders them even when markdown-it's inline parser never sees the content. Critical for LLM output that wraps math in HTML tables.

### 4. Backslash Escape Handling
Crossnote's replaceDelimited (`math.ts:295-342`) honors `\` escapes inside math content so `\$` doesn't terminate a `$...$` pair. The current `script.js` doesn't handle this.

### 5. Unicode Math Symbols
Current `looksLikeLatex` has basic Greek/calc symbols. Crossnote's approach uses KaTeX config for symbol set. Need to expand the regex:
```
Δ∫∑√π∞≤≥∀∃∈∋∩∪⊂⊃∇∂ℝℕℂℚℤ∧∨⇒⇔⊗⊕
```

### 6. Post-Render Enhancement Pipeline
Crossnote applies `fencedMath`, `fencedDiagrams`, `extendedTableSyntax`, `embeddedWikilinks` AFTER markdown-it rendering. This allows handling fenced code blocks with ````math` or ````mermaid` that standard markdown-it can't process.

### 7. ParseBlockAttributes
Crossnote's attribute parser handles:
- `.class1.class2` → class
- `#id` → id
- `key=value` → attribute
- `key="quoted"` → attribute with spaces
- `key=['a','b']` → array values
- Bare flags → true

This is useful for processing `{...}` attribute blocks from LLM output.

## What to Keep from Current script.js

The existing code already handles several critical GPT-X quirks well:

| Function | Keep | Reason |
|----------|------|--------|
| `looksLikeLatex` | ✓ Improved | Just add more Unicode symbols |
| `cleanLatexBlock` | ✓ Keep | `=====` separator handling is unique |
| `isStandaloneMathLine` | ✓ Improved | Just add more Unicode symbols |
| `normalizeMathDelimiters` Phase A/B | ✓ Keep | Tag/code split + delimiter conversion works |
| `normalizeMathDelimiters` Phase C | ✓ Keep | Lost-backslash recovery for `[...]` is clever |
| `normalizeMathDelimiters` Phase D | ✓ Keep | Standalone line wrapping is essential |
| `fixKatexEnvironments` | ✓ Keep | Just add more env types |
| `applyLazyMathFallbacks` | ✓ Keep | Script-based workaround useful without full KaTeX |

## What to Port from Crossnote

| Crossnote Module | Priority | Reason |
|-----------------|----------|--------|
| `math.ts` block rule | HIGH | Prevent Setext heading split on `$$` with `=` |
| `math.ts` renderMathInHtml | HIGH | Recover math inside HTML blocks (common in LLM output) |
| `transformer.ts` front-matter parse | MEDIUM | YAML front matter support |
| `transformer.ts` math block protection | HIGH | Skip transforms inside `$$...$$` |
| `transformer.ts` colon fences | LOW | `:::` syntax for divs/diagrams |
| `parseBlockAttributes` | MEDIUM | Parse `{...}` from LLM output |
| `fenced-math.ts` | MEDIUM | ` ```math ` fence rendering |
| `fenced-diagrams.ts` | LOW | Mermaid/PlantUML support |
| `extended-table-syntax` | LOW | Merged cells via `^^`/`\\` |
| `embedded-wikilinks` | LOW | `![[page]]` transclusion |
| `curly-bracket-attributes` | MEDIUM | Heading/link `{...}` attributes |

## Implementation Order

1. **Phase 1** (Core math improvements): `renderMathInHtml`, block-level math protection, backslash escape handling, more Unicode symbols
2. **Phase 2** (Pre-processor): `transformMarkdown` with front-matter, headings, task lists, math block protection
3. **Phase 3** (Attribute parsing): `parseBlockAttributes`, `parseBlockInfo` for `{...}` blocks
4. **Phase 4** (Post-render): `enhanceRenderedHTML` with fenced math, diagrams, extended tables
5. **Phase 5** (Extended syntax): WikiLinks, tags, CriticMarkup, emoji
