# LLM Prompt for Markdown Output Compatible with Our Parser

Use this prompt when asking an LLM to generate Markdown content that will pass through our pipeline (markdown-it + KaTeX with pre-processing heuristics).

---

## Prompt Template

```
You are generating Markdown content for a Math–Markdown renderer that uses:

1. **KaTeX** (via `markdown-it-texmath`) for math rendering
2. **Heuristic pre-processing** that auto-detects standalone math lines and recovers broken LaTeX delimiters
3. **Fallback substitutions** for `^` and `_` outside math blocks

### Math Formatting Rules

1. **Use standard delimiters:** Always wrap inline math in `$...$` and display math in `$$...$$`. Do NOT use `\(...\)` or `\[...\]` — while the pipeline recovers these, direct `$` delimiters are more reliable.

2. **Display math on its own line:** Put `$$...$$` on separate lines, one per expression:
   ```
   $$ \int_a^b f(x)\,dx $$
   ```

3. **Avoid bare `[...]` for math:** Do not write math inside unsupported `[...]` brackets. The pipeline attempts recovery heuristically, but plain `[...]` is unreliable.

4. **Use `aligned` not `align`:** KaTeX does not support `\begin{align}`. Use `\begin{aligned}` inside `$$...$$` instead:
   ```
   $$
   \begin{aligned}
   E &= mc^2 \\
   F &= ma
   \end{aligned}
   $$
   ```

5. **Standalone math lines are auto-detected** — lines that look like math (contain operators, variables, no prose words ≥3 letters, ≤160 chars) get wrapped in `$$...$$` automatically. This means you can write:
   ```
   E = mc^2
   x_n = 2n + 1
   \sum_{i=1}^n i = \frac{n(n+1)}{2}
   ```
   ...without any delimiters. But punctuation like `;` `:` `!` in these lines is now supported.

6. **Fallback mechanism for plain text:** Outside math delimiters, `^` becomes `<sup>` and `_` becomes `<sub>`. So `H_2O` renders as H₂O and `x^2` as x². This is a safety net — use `$...$` for proper LaTeX math instead.

7. **Code blocks are safe:** Content inside `` `code` `` and ``` ```code``` ``` is never processed by math heuristics.

### Markdown Rules

- Standard GFM Markdown is supported
- HTML is allowed (`html: true`)
- Linkify and typographer options are enabled

### Formatting Preferences

- For inline formulas, use `$...$` 
- For displayed equations and multi-line expressions, use `$$...$$` on their own lines
- For alignment of multiple equations, use `\begin{aligned}` inside `$$...$$`
- Keep math expressions self-contained when possible
```

---

## Why This Prompt Works

| Rule | Pipeline Component | Why It Matters |
|------|-------------------|----------------|
| `$...$` over `\(...\)` | `normalizeMathDelimiters` | Recovery works but direct `$` is zero-risk |
| Standalone math lines | `isStandaloneMathLine` | Lines matching heuristics auto-wrap — use for clean notation |
| `aligned` not `align` | `fixKatexEnvironments` | KaTeX only supports `aligned` inside `$$...$$` |
| Avoid bare `[...]` | `normalizeMathDelimiters` bare bracket recovery | Heuristic recovery may miss complex cases |
| `^`/`_` fallbacks | `applyLazyMathFallbacks` | Safety net for non-math contexts only; prefer `$...$` |
