# Crossnote Parser Code Analysis — Complete Findings

## Overview

All parser code found in the **crossnote** repository at `/home/starwalker/acodingspace/mdtopdfmal/crossnote/`. This report catalogs every file and module that handles markdown parsing/transformation, organized by topic. The code is production-grade from the **Markdown Preview Enhanced** VS Code extension (crossnote v0.9.31).

---

## 1. Core Parsing Pipeline

### 1.1 Markdown-it Instance & Feature Registration
[`crossnote/src/notebook/index.ts:218-243`](../crossnote/src/notebook/index.ts:218)

All features are registered on a single `MarkdownIt` instance:
```
md.use(MarkdownItFootnote)
md.use(MarkdownItSub)
md.use(MarkdownItSup)
md.use(MarkdownItDeflist)
md.use(MarkdownItAbbr)
md.use(MarkdownItMark)
useMarkdownItCodeFences(md)
useMarkdownItColonFencedCodeBlocks(md)
useMarkdownItCurlyBracketAttributes(md)
useMarkdownItCriticMarkup(md, this)
useMarkdownItEmoji(md, this)
useMarkdownItHTML5Embed(md, this)
useMarkdownItMath(md, this)
useMarkdownItWikilink(md, this)
useMarkdownAdmonition(md)
useMarkdownCallout(md)
useMarkdownItSourceMap(md)
useMarkdownItTag(md, this)
useMarkdownItWidget(md, this)
```

### 1.2 Main Render Pipeline (`parseMD`)
[`crossnote/src/markdown-engine/index.ts:2741-2960`](../crossnote/src/markdown-engine/index.ts:2741)

Execution order:
1. `onWillParseMarkdown` hook (user callback)
2. `transformMarkdown()` — pre-processing (imports, anchors, headings, colon fences, math protection, tags, block-ids)
3. Front-matter processing
4. `notebook.renderMarkdown()` — markdown-it / pandoc / markdown_yo render
5. [TOC] replacement
6. `enhanceWithFencedMath($)` — ` ```math ` fence → KaTeX/MathJax
7. `enhanceWithFencedDiagrams(...)` — diagram rendering (mermaid, plantuml, etc.)
8. `enhanceWithFencedCodeChunks(...)` — code execution
9. `enhanceWithCodeBlockStyling($)` — prism syntax highlighting
10. `enhanceWithResolvedImagePaths(...)` — relative image path resolution
11. `enhanceWithExtendedTableSyntax($)` — merged cells
12. `enhanceWithEmbeddedWikilinks(...)` — `![[...]]` transclusion

---

## 2. Math Parsing (Most Relevant for Formula Filtering)

### 2.1 Block & Inline Math Rules
[`crossnote/src/custom-markdown-it-features/math.ts:1-343`](../crossnote/src/custom-markdown-it-features/math.ts)

**Block rule** (lines 14-76): Registered before `lheading` to prevent Setext heading splitting on `$$` blocks with `=` inside. Scans forward for closing delimiter, handles `\` escapes, produces `math_block` token.

**Inline rule** (lines 78-144): Checks `mathBlockDelimiters` first (block), then `mathInlineDelimiters` (inline). Handles `\` escapes. Produces `math` token with `meta.displayMode`.

**Key features:**
- Configurable delimiters (not just `$$`/`$`)
- Backslash escape handling inside math
- `html_block` recovery (lines 172-286): `renderMathInHtml()` splits HTML by `<code>/<pre>/<script>/<style>` tags, processes unprotected segments for math delimiters, reassembles. Fixes regression where math inside HTML tables wasn't rendered.

### 2.2 Math Renderer
[`crossnote/src/renderers/parse-math.ts:1-59`](../crossnote/src/renderers/parse-math.ts)

```
KaTeX  → renderToString(content, { displayMode, ...katexConfig })
MathJax → <span class="mathjax-exps">escaped(content)</span>
None    → ''
Error   → <span style="color:#ee7f49; font-weight:500;">error message</span>
```

### 2.3 Math in Fenced Code Blocks
[`crossnote/src/render-enhancers/fenced-math.ts:1-97`](../crossnote/src/render-enhancers/fenced-math.ts)

Handles ````math` fence blocks. Supports attributes: `literate`, `hide`, `output_first`. Renders via `parseMath` in display mode.

---

## 3. Code & Diagram Parsing

### 3.1 Code Fence Renderer
[`crossnote/src/custom-markdown-it-features/code-fences.ts:1-50`](../crossnote/src/custom-markdown-it-features/code-fences.ts)

Shared renderer for backtick and colon fences. Produces `<pre data-role="codeBlock" data-info="..." data-parsed-info="..." data-normalized-info="...">`. Parses fence info via `parseBlockInfo()` and normalizes via `normalizeBlockInfo()`.

### 3.2 Colon-Fenced Code Blocks (`:::`)
[`crossnote/src/custom-markdown-it-features/colon-fenced-code-blocks.ts:1-247`](../crossnote/src/custom-markdown-it-features/colon-fenced-code-blocks.ts)

Two behaviors based on info string:
- **Code/diagram fence**: `:::mermaid`, `:::puml`, `:::wavedrom`, `:::bitfield`, `:::graphviz`, `:::vega`, `:::vega-lite`, `:::wsd`, `:::d2`, `:::tikz` → rendered as code fence
- **Fenced div**: Everything else → `<div class="name">...</div>` (Pandoc-compatible)

### 3.3 Diagram Rendering
[`crossnote/src/render-enhancers/fenced-diagrams.ts:1-466`](../crossnote/src/render-enhancers/fenced-diagrams.ts)

Full diagram pipeline. Supports: mermaid, plantuml/puml, wavedrom, bitfield, graphviz/viz/dot, vega/vega-lite, wsd, d2, tikz. Kroki support for unknown diagram types. Caching via checksums.

### 3.4 Code Block Info Parser
[`crossnote/src/lib/block-info/parse-block-info.ts:1-83`](../crossnote/src/lib/block-info/parse-block-info.ts)

Parses fence info string `language {attr1=val1 .class #id}` into `BlockInfo { language, attributes }`.

### 3.5 Block Attributes Parser
[`crossnote/src/lib/block-attributes/parseBlockAttributes.ts:1-199`](../crossnote/src/lib/block-attributes/parseBlockAttributes.ts)

Full attribute parser supporting:
- `.class1.class2` → `class`
- `#id`
- `key=value`
- `key="quoted value"`
- `key=['a','b']` arrays
- `key=(parenthesized value)`
- Bare flags → `true`
- Type normalization (boolean, number, string)

---

## 4. Extended Syntax Features (Beneficial for GPT-X Output)

### 4.1 WikiLinks (`[[...]]`)
[`crossnote/src/custom-markdown-it-features/wikilink.ts:1-152`](../crossnote/src/custom-markdown-it-features/wikilink.ts)

Supports:
- `[[Page]]`
- `[[Page#Heading]]`
- `[[Page^block-id]]`
- `[[Page#Heading^block-id]]`
- `[[Page|Display Text]]`

Also see transformer lines 778-813 for `![[...]]` embed syntax (images, markdown files, block transclusion).

### 4.2 Tag Syntax (`#tag`)
[`crossnote/src/custom-markdown-it-features/tag.ts:1-101`](../crossnote/src/custom-markdown-it-features/tag.ts)

Obsidian-style `#tag-name` and `#parent/child`. Smart context detection:
- Skips if preceded by word char, `/`, `&`, `?`
- Skips inside `{...}` attribute blocks
- Renders as `<a class="tag" data-tag="..." href="tag://...">#tag</a>`

### 4.3 CriticMarkup
[`crossnote/src/custom-markdown-it-features/critic-markup.ts:1-91`](../crossnote/src/custom-markdown-it-features/critic-markup.ts)

| Syntax | HTML |
|--------|------|
| `{--text--}` | `<del>text</del>` |
| `{++text++}` | `<ins>text</ins>` |
| `{~~old~>new~~}` | `<del>old</del><ins>new</ins>` |
| `{==text==}` | `<mark>text</mark>` |
| `{>>text<<}` | `<span style="display:none">text</span>` |

### 4.4 Curly Bracket Attributes (`{...}`)
[`crossnote/src/custom-markdown-it-features/curly-bracket-attributes.ts:1-135`](../crossnote/src/custom-markdown-it-features/curly-bracket-attributes.ts)

Attaches `{...}` attributes to headings, images, and links.

### 4.5 Emoji Shortcodes
[`crossnote/src/custom-markdown-it-features/emoji.ts`](../crossnote/src/custom-markdown-it-features/emoji.ts)

`md.use(MarkdownItEmoji)` with full emoji + fontawesome definitions.

### 4.6 HTML5 Embed
[`crossnote/src/custom-markdown-it-features/html5-embed.ts`](../crossnote/src/custom-markdown-it-features/html5-embed.ts)

Auto-embeds video/audio based on file extension. Uses `markdown-it-html5-embed`.

---

## 5. Pre-Processing Transformer
[`crossnote/src/markdown-engine/transformer.ts:1-1479`](../crossnote/src/markdown-engine/transformer.ts)

Line-by-line markdown transformer handling:

| Feature | Lines | Description |
|---------|-------|-------------|
| Colon fences (`:::`) | 310-430 | Code/diagram fence vs fenced div |
| Backtick code blocks | 432-488 | Data-source-line injection |
| Math display block protection | 490-521 | Skips transformations inside `$$...$$` |
| HTML comments / custom subjects | 535-621 | `<!-- pagebreak -->`, `<!-- slide -->` |
| Headings | 623-725 | ID generation, class, attributes |
| [TOC] | 727-746 | Table of contents marker |
| Task list checkboxes | 749-771 | `[x]` → `<input checked>` |
| `@import` / file import | 773-1229 | Markdown, images, CSS/JS, CSV, PDF, diagrams |
| `![[wikilink]]` embed | 1232-1270 | Inline wikilink embeds |
| `^block-id` | 1276-1281 | Block reference markers |
| `#tag` syntax | 1283-1331 | For non-markdown-it parsers |
| Front-matter | 1460-1478 | YAML `---...---` extraction |

---

## 6. Block Info Types & Normalization

### BlockInfo Type
[`crossnote/src/lib/block-info/types.ts`](../crossnote/src/lib/block-info/types.ts)
```ts
type BlockInfo = {
  language: string;
  attributes: BlockAttributes;
};
```

### BlockAttributes Type
[`crossnote/src/lib/block-attributes/types.ts`](../crossnote/src/lib/block-attributes/types.ts)
```ts
type BlockAttributes = Record<string, boolean | number | string | string[]>;
```

### Normalization
[`crossnote/src/lib/block-info/normalize-block-info.ts`](../crossnote/src/lib/block-info/normalize-block-info.ts) — Lowercases language, normalizes attributes.

[`crossnote/src/lib/block-attributes/normalizeBlockAttributes.ts`](../crossnote/src/lib/block-attributes/normalizeBlockAttributes.ts) — Attribute type normalization.

---

## 7. Summary: What to Adopt for `mdtopdfmal`

### High Priority (formula/math handling from GPT-X)

| Module | File | What It Does |
|--------|------|-------------|
| Math block/inline rules | `crossnote/src/custom-markdown-it-features/math.ts` | Block math detection before lheading, inline math with backslash escape handling |
| renderMathInHtml | `crossnote/src/custom-markdown-it-features/math.ts:214-286` | Recover math inside HTML tables/blocks |
| parse-math renderer | `crossnote/src/renderers/parse-math.ts` | KaTeX/MathJax rendering with error handling |
| Configurable delimiters | `crossnote/src/notebook/types.ts:342-348` | Multiple math delimiter pairs |
| Math display block protection | `crossnote/src/markdown-engine/transformer.ts:490-521` | Skip line transformations inside `$$...$$` |

### Medium Priority (GPT-X markdown cleanup)

| Module | File | What It Does |
|--------|------|-------------|
| `isStandaloneMathLine` equivalent | `script.js:61-81` | Already exists in user app |
| `looksLikeLatex` improvements | `script.js:43-45` | Needs Unicode math symbols added |
| Block attributes parser | `crossnote/src/lib/block-attributes/parseBlockAttributes.ts` | Parse `{...}` attribute blocks |
| Block info parser | `crossnote/src/lib/block-info/parse-block-info.ts` | Parse fence info strings |

### Low Priority (nice-to-have)

| Module | File | What It Does |
|--------|------|-------------|
| CriticMarkup | `crossnote/src/custom-markdown-it-features/critic-markup.ts` | Track changes syntax |
| WikiLinks | `crossnote/src/custom-markdown-it-features/wikilink.ts` | `[[Page]]` links |
| Tags | `crossnote/src/custom-markdown-it-features/tag.ts` | `#tag` syntax |
| Emoji | `crossnote/src/custom-markdown-it-features/emoji.ts` | `:emoji:` shortcodes |
| Fenced diagrams | `crossnote/src/render-enhancers/fenced-diagrams.ts` | Mermaid, PlantUML, etc. |
| Transclusions | `crossnote/src/markdown-engine/transformer.ts:1232-1270` | `![[embed]]` |
