# Markdown Parsing Analysis — `mdtopdfmal`

## Overview

Analysis of the markdown parsing pipeline in [`script.js`](../script.js), compared against techniques used in **VSCode Markdown Preview Enhanced** (MPE) extension (v0.8.30), which serves as a reference for ChatGPT/LLM-generated markdown rendering best practices.

## Current Architecture

### Parser Stack

```
index.html:20-26
markdown-it v13.0.1  ──>  texmath plugin  ──>  KaTeX v0.16.8
```

### Pre-processing Pipeline (3-phase)

1. [`fixKatexEnvironments()`](../script.js:162-173) — converts `\begin{align}` → `\begin{aligned}` for KaTeX
2. [`normalizeMathDelimiters()`](../script.js:83-160) — the main math normalization (delimiters, lost-backslash recovery, standalone line detection)
3. [`applyLazyMathFallbacks()`](../script.js:175-210) — plain-text math → HTML (superscripts, subscripts, arrows)

### Error Handling

Two-tier fallback ([`script.js:213-231`](../script.js:213-231)):
1. Try full pipeline → render
2. On failure, fall back to raw markdown-it render
3. On second failure, show error div in preview

---

## Parsing Mechanisms Found

### 1. `looksLikeLatex()` — [`script.js:43-45`](../script.js:43-45)

```js
/\\[a-zA-Z]+|[_^{}=]|[∫∑√π∞≤≥]/.test(value)
```

**What it does:** Heuristic to determine if text looks like LaTeX.

**Edge cases:**
- Missing many Unicode math symbols: `∈∉∋∩∪⊂⊃∑∏∇∂ℕℝℂℚℤ∀∃∅∧∨⇒⇔⊗⊕`
- `_` alone in text (e.g., `variable_name`) triggers true
- `^` in URLs or caret notation triggers true

### 2. `cleanLatexBlock()` — [`script.js:47-59`](../script.js:47-59)

**What it does:** Cleans up math block content. Handles the `=====` separator pattern (e.g., `x = 5 / === / y = 3`).

**Edge cases:**
- Only handles exactly **3-line** blocks with middle line being all `=`
- `==` pattern could clash with markdown `==highlight==` syntax or `==` comparison operators
- `filter(Boolean)` removes blank lines — this is good but could lose intentional whitespace

### 3. `isStandaloneMathLine()` — [`script.js:61-81`](../script.js:61-81)

**What it does:** Detects if a line is standalone math that should be wrapped in `$$...$$`.

**Filters (returns false if):**
- Empty line
- Line > 160 characters
- Contains `$` or backtick
- Starts with markdown block syntax: `#`, `>`, `-`, `*`, `1.`
- Ends with sentence punctuation: `: . ! ?`

**Positive checks (all must be true):**
- Has math operator: `=`, `<`, `>`, `\command`
- Has math variable: letter_subscript, `\command`, or Unicode math symbol
- Only contains math-allowed characters: `A-Za-z0-9\{}()[].,_\s+\-*/^=<>|;:!` + Unicode set `Δ∫∑√π∞≤≥`
- No plain 3+ letter word after removing `\command` patterns

**Edge cases:**
- `x = 5` works — has `=` operator, variable `x`, all math chars, no 3-letter word
- `sin(x) = 5` — after removing `\sin`, this leaves `(x) = 5` which has no 3-letter word. **CORRECT.**
- But `sin(x) + cos(x) = 5` — after removing `\sin` and `\cos`, leaves `(x) + (x) = 5`. **CORRECT.**
- `x^2 + C` — "C" is a single letter, no 3-letter word. `C` is not caught by `[A-Za-z]{3,}`. **CORRECT.**
- `add x + 5` — after removing `\add` (nothing removed), "add" is 3 letters. `hasPlainWord = true`. **CORRECTLY** returns false.
- `variable_name + 5` — underscore is in the regex, all chars are math-allowed. `looksLikeLatex` returns true because of `_`. But `variable` is a 12-letter word. After removing `\variable` (nothing removed), "variable" is 12 letters. `hasPlainWord = true`. **CORRECTLY** returns false.
- `H₂O` in Unicode (subscript ₂) — `₂` is NOT in the allowed regex set. Returns false. **MAY BE WRONG** — Unicode subscripts should be allowed.

### 4. `normalizeMathDelimiters()` — [`script.js:83-160`](../script.js:83-160)

#### Phase A: HTML/code protection — [`script.js:85`](../script.js:85)
```js
const tagSplit = /(<[^>]*>|```[\s\S]*?```|`[^`]*`)/g;
```
Even indices = content, odd indices = HTML/code. Only processes even indices.

**Edge cases:**
- Fails on nested backticks: `` `code `inner` more`  ``
- Fails on triple backtick with trailing whitespace: `` ``` `` (space after)
- `[^>]*` in HTML tag regex can match across lines if there's no `>` — but this is HTML-tagged content, so acceptable

#### Phase B: Delimiter normalization — [`script.js:92-97`](../script.js:92-97)
```js
.replace(/\\\(/g, '$')
.replace(/\\\)/g, '$')
.replace(/\\\[/g, '$$$$')
.replace(/\\\]/g, '$$$$')
```

**Note:** `'$$$$'` in JavaScript replace = `'$$'` in output (double dollar for display math).

**Edge cases:**
- `\\\(` (double backslash + paren) → first `\\` escapes the backslash, resulting `\(` which becomes `$` — **wrong**, should be literal `\(`
- `\\\[` (double backslash + bracket) → same issue, becomes `$$` instead of literal `\[`
- `\\(` with only one backslash (common ChatGPT paste artifact) → the `\\` is seen as escaped backslash, leaving `(`. Both `\\` patterns aren't covered.

#### Phase C: Lost-backslash recovery — [`script.js:103-134`](../script.js:103-134)

Three regex patterns to catch `[...]` without backslash (common ChatGPT paste):

**Multi-line block:**
```js
/^([ \t]*)\[\s*\n([\s\S]*?)\n[ \t]*\][ \t]*$/gm
```

**Edge cases:**
- `[` with content immediately on same line not matched (by design — goes to next)
- Empty `[]` with newlines still matches
- Nested brackets in content could cause issues

**Single-line block:**
```js
/^([ \t]*)\[([^\]\n]+)\][ \t]*$/gm
```

**Edge cases:**
- One `[` and one `]` are required — good
- `[x]` as markdown task list syntax already filtered by `looksLikeLatex`
- `[1]` reference would be filtered by `looksLikeLatex` (no LaTeX pattern)

**Inline:**
```js
/(^|[^\w\]$])\[([^\]\n]+)\](?!\()(?=$|[^\w\[$])/gm
```

**Edge cases:**
- Negative lookahead `(?!\()` prevents matching markdown links `[text](url)` — **smart**
- `[x^2]` matched, `looksLikeLatex` passes, result: `$x^2$` — **correct**
- `[E=mc^2]` → `$E=mc^2$` — **correct**
- `[see appendix]` — `looksLikeLatex` filters it out — **correct**

#### Phase D: Standalone line wrapping — [`script.js:136-157`](../script.js:136-157)

**Edge cases:**
- `$$` already present on line — skips (handled before `isStandaloneMathLine`)
- Inside `$$...$$` block — tracked via `inDollarMathBlock` flag — **correct**
- `x^2` standalone → wrapped in `$$x^2$$` — **correct**
- Malayalam text line → `isStandaloneMathLine` returns false because `onlyMathCharacters` uses `[A-Za-z]` range — **correct**

### 5. `applyLazyMathFallbacks()` — [`script.js:175-210`](../script.js:175-210)

```js
const splitRegex = /(```[\s\S]*?```|`[^`]*`|<[^>]*>|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
```

**Protected segments:** code blocks, inline code, HTML tags, `$$...$$`, `$...$`, `\[...\]`, `\(...\)`

**Transformations:**
| Pattern | Replacement | Context |
|---------|-------------|---------|
| `a^n` | `<sup>n</sup>` | Anywhere in non-protected text |
| `A_0` | `<sub>0</sub>` | Single uppercase + underscore + number |
| `a_ijk` | `<sub>ijk</sub>` | Letter + underscore + `{...}` or letter/number |
| `->` | `&rarr;` | Everywhere in non-protected text |
| `<-` | `&larr;` | Everywhere in non-protected text |
| `<->` | `&harr;` | Everywhere in non-protected text |
| `+/-` | `&plusmn;` | Everywhere in non-protected text |
| `<=` | `&le;` | Everywhere (when followed by space/digit/word) |
| `>=` | `&ge;` | Everywhere (when followed by space/digit/word) |
| `!=` | `&ne;` | Everywhere in non-protected text |

**Critical edge cases:**

1. **`_` over-matching**: `([a-zA-Z])_(-?[0-9.]+|[ijkmnxyz]|\{[^}]+\})` — matches `x_y` if y is `i,j,k,m,n,x,y,z`. In practice, `x_i` (variable with index i) — **this is intentional** for math-like notation.

2. **Arrow replacements too broad**: `"the relationship -> is important"` → `"the relationship &rarr; is important"` — **incorrect** in non-math context. Should only apply where there's math context nearby.

3. **`<=` in comparison**: `if (x <= 5)` → `if (x &le; 5)` — potentially wrong outside math context.

4. **`!=` everywhere**: `a != b` → `a &ne; b` — same issue.

5. **`\$\$` vs `$$`**: The split regex doesn't protect `\$\$` (escaped dollar). Content inside `\$\$` would be processed.

### 6. `fixKatexEnvironments()` — [`script.js:162-173`](../script.js:162-173)

Simple replacement: `\begin{align}` → `\begin{aligned}` etc.

**Edge cases:**
- Only handles `align` and `align*`, not `gather`, `multline`, `split`, `array`
- Only `align*?` pattern — `align` with star or without
- Code-protected via same `(```...```|`...``)` regex

---

## Edge Cases Summary Table

| # | Issue | Severity | File:Line |
|---|-------|----------|-----------|
| 1 | Missing Unicode math symbols in `looksLikeLatex` | Medium | [`script.js:43`](../script.js:43) |
| 2 | `\\\(` / `\\\[` double-escape not handled | Medium | [`script.js:92-96`](../script.js:92:96) |
| 3 | Arrow `->` etc. over-replace in non-math text | Low-Medium | [`script.js:200-206`](../script.js:200-206) |
| 4 | `<=` / `>=` / `!=` replace in code-like text | Low | [`script.js:204-206`](../script.js:204-206) |
| 5 | Unicode subscripts (₂, ₃) not in allowed char set | Low | [`script.js:77`](../script.js:77) |
| 6 | Backtick with trailing space not matched | Low | [`script.js:85,176`](../script.js:85:176) |
| 7 | `$$$` triple dollar not handled | Low | [`script.js:176`](../script.js:176) |
| 8 | Only `align` env converted, not `gather`/`multline` | Low | [`script.js:168`](../script.js:168) |
| 9 | `=====` pattern fragile (only 3-line blocks) | Low | [`script.js:54`](../script.js:54) |
| 10 | No `split` regex for `\\\[` with newlines before `\]` | Low | [`script.js:176`](../script.js:176) |

---

## MPE Techniques That Could Be Adopted

### 1. Customizable Math Delimiters
MPE allows configuring multiple inline/block delimiter pairs ([`config.ts:72-73`](../vscode-markdown-preview-enhanced/src/config.ts:72:73)):
```
mathInlineDelimiters: [["$","$"], ["\\(","\\)"]]
mathBlockDelimiters: [["$$","$$"], ["\\[","\\]"]]
```

### 2. Syntax Plugins (from [`package.nls.json`](../vscode-markdown-preview-enhanced/package.nls.json:57:57))
Referenced in MPE config:
- **CriticMarkup** — `{++inserted++}`, `{--deleted--}`, `{~~ ~>~~}` for track changes
- **Extended tables** — merged cells via `^^` and `\\`
- **Emoji shortcodes** — `:smile:` → 😊
- **WikiLinks** — `[[Page]]` and `[[Page#^block-id]]`
- **Tags** — `#tag-name` rendered as clickable pills
- **Frontmatter** — YAML `---` blocks rendered as metadata
- **Code chunk execution** — ` ```python {cmd=true} ` with output capture

### 3. Diagram Support (from [`diagrams.md`](../vscode-markdown-preview-enhanced/test/markdown/diagrams.md))
Fenced code blocks with specific language names:
- ` ```mermaid ` — Mermaid diagrams
- ` ```puml ` / ` ```plantuml ` — PlantUML
- ` ```viz ` / ` ```dot ` — GraphViz
- ` ```vega ` / ` ```vega-lite ` — Vega charts
- ` ```wavedrom ` — WaveDrom timing diagrams
- ` ```ditaa {kroki=true} ` — ASCII art → diagrams via Kroki

### 4. Code Block Attributes (from [`code-chunks.md`](../vscode-markdown-preview-enhanced/test/markdown/code-chunks.md))
```markdown
```js {cmd=node output=html hide=true}
```
```
Attributes like `{cmd=true}`, `{hide=true}`, `{line-numbers}`, `{id="..." continue="..."}`

### 5. Block References
`^block-id` markers on paragraphs (from [`extension-common.ts:170`](../vscode-markdown-preview-enhanced/src/extension-common.ts:170:170))

### 6. HTML5 Embed
Auto-convert image/video/audio links to embed tags.

---

## Recommendations for Parser Improvements

### Must-Fix (medium severity)
1. **Add missing Unicode math symbols** to `looksLikeLatex` and `onlyMathCharacters` regex in `isStandaloneMathLine`:
   ```
   ∈∉∋∩∪⊂⊃∑∏∇∂ℕℝℂℚℤ∀∃∅∧∨⇒⇔⊗⊕
   ```

2. **Handle `\\\(` / `\\\[` double-escape**: Skip replacement if preceded by another backslash.

### Nice-to-Have
3. **Add `\\(` single-backslash recovery** (common ChatGPT output where one backslash is lost): `\(` → `$`, `\[` → `$$` when not already preceded by backslash.

4. **Add `gather`/`multline`/`split` environment conversion** to `fixKatexEnvironments()`.

5. **Add Mermaid diagram support** via ` ```mermaid ` fenced code block → render with Mermaid JS library.

6. **Add CriticMarkup syntax** as a pre-processing pass.

7. **Add emoji shortcode rendering** via a simple map or markdown-it plugin.

8. **Narrow `applyLazyMathFallbacks` scope**: The `->`, `<-`, `<=`, `>=`, `!=` replacements should only trigger when the surrounding context looks like math (has nearby math operators or variables).

### Performance
9. **Consolidate regex splitting**: Currently three functions each do their own split on code blocks/HTML. A single pass that extracts protected segments, processes content, then re-inserts would be more efficient.
