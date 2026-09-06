/**
 * script2.js — First-Principles Markdown & Math Rendering Engine
 *
 * Ground-up redesigned rendering engine for mdtopdfmal:
 * - Robust protection of code blocks & fenced math (```math / ```latex)
 * - Safe delimiter recovery: \[ \], \( \), bare [latex] brackets, and standalone math lines
 * - Complete LaTeX environment support: align, align*, equation, equation*, gather, gather*,
 *   multline, split, cases, dcases, rcases, matrix, pmatrix, bmatrix, Bmatrix, vmatrix, Vmatrix, array
 * - Full mhchem chemistry support (\ce{...}) for Plus Two & Engineering chemistry
 * - Currency protection: never mistake $100 or $50 for math
 * - Math safety: never corrupt LaTeX math with plain-text subscripts or HTML tags
 * - Automatic line wrapping for multi-term equations (flex/base wrapping)
 * - Automatic proportional auto-scaling for ultra-wide unbreakable formulas
 * - Zero page overflow in preview and print/PDF export
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // 1. Detection & Sanitization Utilities
  // ─────────────────────────────────────────────────────────────

  /**
   * Determine if a string contains LaTeX or mathematical syntax.
   */
  function looksLikeLatex(str) {
    if (!str || typeof str !== 'string') return false;
    // LaTeX command: \frac, \sqrt, \alpha, \checkmark, etc.
    if (/\\[a-zA-Z]+/.test(str)) return true;
    // Standard Unicode math symbols
    if (/[∫∑√π∞≤≥Δ∀∃∈∋∩∪⊂⊃∇∂ℝℕℂℚℤ∧∨⇒⇔⊗⊕±×÷≠≈≡∝λμβθαγδεζηθικστυφχψωΩ∓°✓✔]/.test(str)) return true;
    // Variables with subscripts/superscripts and operators: x_1 = y_2, a^2 + b^2 = c^2
    if (/[a-zA-Z]_[0-9a-zA-Z]/.test(str) && /[=+\-*/<>]/.test(str)) return true;
    if (/[a-zA-Z]\^[0-9a-zA-Z]/.test(str) && /[=+\-*/<>]/.test(str)) return true;
    // Math function names combined with math operators/subscripts
    if (/\b(?:lim|sin|cos|tan|cot|sec|csc|log|ln|det|exp|max|min)\b/i.test(str) && /[=+\-*/_^{}]/.test(str)) return true;
    // Plain equation expressions like x + y = 10
    if (/^[a-zA-Z0-9\s()+\-*/.,]+=[a-zA-Z0-9\s()+\-*/.,]+$/.test(str.trim())) return true;
    return false;
  }

  /**
   * Determine if a line is a standalone formula that lacks $ delimiters.
   */
  function isStandaloneMathLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 350) return false;
    if (trimmed.startsWith('$') || trimmed.startsWith('`')) return false;
    // Skip markdown headings, blockquotes, lists
    if (/^(#{1,6}|>|[-*+]|\d+\.)\s/.test(trimmed)) return false;
    // Skip lines ending with sentence punctuation
    if (/[:.!?]$/.test(trimmed)) return false;

    // Strip \text{...}, \mathrm{...} before inspecting words
    const stripped = trimmed.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{[^}]*\}/g, '');
    
    const hasMathOperator = /[=<>≈≤≥≡]|\\(?:frac|sqrt|int|sum|prod|partial|alpha|beta|gamma|delta|theta|lambda|mu|omega)/.test(stripped);
    const hasMathSymbol = /[A-Za-z]_[A-Za-z0-9]|\([A-Za-z]\)|\\[a-zA-Z]+|[∫∑√π∞≤≥∀∃∈∋∩∪⊂⊃∇∂±×]/.test(stripped);

    // Filter out common math identifiers and functions before word check
    const withoutMath = stripped
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/\b(?:sin|cos|tan|cot|sec|csc|log|ln|exp|lim|max|min|det|dim|ker|deg|gcd|hom|inf|sup|arg|mod|rms|net|eff|tot|avg|in|out|cell)\b/gi, '')
      .replace(/[^A-Za-z]/g, ' ')
      .trim();

    const words = withoutMath.split(/\s+/).filter(w => w.length > 2);
    // If ordinary prose words are absent, and math structure is present:
    return hasMathOperator && (hasMathSymbol || /[\^_{}]/.test(stripped)) && words.length === 0;
  }

  // ─────────────────────────────────────────────────────────────
  // 1b. LLM LaTeX Sanitization & Recovery Helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Mask text and chemistry blocks (\text{...}, \mathrm{...}, \ce{...}) so their contents
   * are never modified by math operator substitutions or function backslashers.
   */
  function maskProtectedBlocks(str) {
    const tokens = [];
    const textCommands = ['text', 'mathrm', 'operatorname', 'mbox', 'ce', 'tag', 'label'];
    const pattern = new RegExp('\\\\(' + textCommands.join('|') + ')\\s*\\{', 'g');
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(str)) !== null) {
      const start = match.index;
      const braceStart = match.index + match[0].length - 1;
      let depth = 1;
      let i = braceStart + 1;
      while (i < str.length && depth > 0) {
        if (str[i] === '{' && str[i - 1] !== '\\') depth++;
        else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
        i++;
      }
      if (depth === 0) {
        result += str.slice(lastIndex, start);
        const token = `\uE002TEXT${tokens.length}\uE003`;
        tokens.push(str.slice(start, i));
        result += token;
        lastIndex = i;
        pattern.lastIndex = i;
      }
    }
    result += str.slice(lastIndex);
    return { masked: result, tokens };
  }

  function unmaskProtectedBlocks(str, tokens) {
    return str.replace(/\uE002TEXT(\d+)\uE003/g, (m, idx) => tokens[Number(idx)] || m);
  }

  /**
   * Clean common LLM equation divider lines (===== or -----).
   */
  function cleanDividers(str) {
    // Dividers preceded or followed by \\: remove redundant divider line
    str = str.replace(/(\\\\\s*)\n[ \t]*[=\-_~*]{3,}[ \t]*(\n|$)/g, '$1\n');
    str = str.replace(/(^|\n)[ \t]*[=\-_~*]{3,}[ \t]*\n(\s*\\\\)/g, '$1$2');
    // Standalone divider lines between content: convert to \\
    str = str.replace(/(^|\n)[ \t]*[=\-_~*]{3,}[ \t]*(?=\n|$)/g, '$1\\\\');
    // Clean duplicate \\\\
    str = str.replace(/\\\\\s*\\\\/g, '\\\\');
    return str;
  }

  /**
   * Auto-inject missing column specifier on \begin{array} (e.g. \begin{array} -> \begin{array}{cc}).
   */
  function fixArrayColSpec(str) {
    // Strip invalid optional [t], [b], [c] from \begin{array} which break KaTeX
    str = str.replace(/\\begin\{array\}\s*\[[tblc]\]/g, '\\begin{array}');
    return str.replace(/\\begin\{array\}(\s*)(?!\{)/g, (match, opt, offset, full) => {
      const rest = full.slice(offset + match.length);
      const endIdx = rest.indexOf('\\end{array}');
      const body = endIdx !== -1 ? rest.slice(0, endIdx) : rest;
      const rows = body.split(/(?:\\\\|\n)/);
      let maxAmp = 0;
      for (const r of rows) {
        const amps = (r.match(/&/g) || []).length;
        if (amps > maxAmp) maxAmp = amps;
      }
      const cols = 'c'.repeat(Math.max(1, maxAmp + 1));
      return '\\begin{array} {' + cols + '}';
    });
  }

  /**
   * Convert legacy LaTeX font & style commands: {\bf ...}, {\rm ...}, \bold{...}, \boldsymbol{...}
   */
  function replaceLegacyFonts(str) {
    const fontMap = {
      bf: 'mathbf',
      rm: 'mathrm',
      it: 'mathit',
      cal: 'mathcal'
    };

    // Convert {\bf ...}, {\rm ...}, etc. with balanced braces
    for (const [cmd, target] of Object.entries(fontMap)) {
      let idx = 0;
      const prefix = '{\\' + cmd;
      while (true) {
        const pos = str.indexOf(prefix, idx);
        if (pos === -1) break;
        const afterCmdChar = str[pos + prefix.length];
        if (afterCmdChar && /[a-zA-Z]/.test(afterCmdChar)) {
          idx = pos + 1;
          continue;
        }
        let depth = 1;
        let i = pos + prefix.length;
        while (i < str.length && depth > 0) {
          if (str[i] === '{' && str[i - 1] !== '\\') depth++;
          else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
          i++;
        }
        if (depth === 0) {
          const content = str.slice(pos + prefix.length, i - 1).trim();
          str = str.slice(0, pos) + '\\' + target + '{' + content + '}' + str.slice(i);
          idx = pos + target.length + 2 + content.length;
        } else {
          idx = pos + 1;
        }
      }
    }

    // Convert \bold{...} and \boldsymbol{...} -> \mathbf{...}
    str = str
      .replace(/\\bold(?=[^a-zA-Z]|$)/g, '\\mathbf')
      .replace(/\\boldsymbol(?=[^a-zA-Z]|$)/g, '\\mathbf')
      .replace(/\\bf\s*\{/g, '\\mathbf{')
      .replace(/\\rm\s*\{/g, '\\mathrm{')
      .replace(/\\it\s*\{/g, '\\mathit{')
      .replace(/\\cal\s*\{/g, '\\mathcal{');

    return str;
  }

  /**
   * Safely add backslash to lazy math functions (sin, cos, tan, log, ln, exp, lim, etc.)
   */
  function addFunctionBackslashes(str) {
    const fns = [
      'arcsin', 'arccos', 'arctan',
      'sinh', 'cosh', 'tanh',
      'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'log', 'ln', 'exp', 'lim',
      'det', 'gcd', 'deg', 'min', 'max'
    ];
    const pattern = new RegExp('(^|[^a-zA-Z\\\\])(' + fns.join('|') + ')(?=[\\(\\[\\{_ \\t\\n\\^]|\\\\)', 'g');
    return str.replace(pattern, '$1\\$2');
  }

  /**
   * Map Unicode operators, Greek symbols, dashes, and checkmarks into valid LaTeX syntax.
   */
  const GREEK_MATH_MAP = {
    'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ',
    'ε': '\\epsilon ', 'ζ': '\\zeta ', 'η': '\\eta ', 'θ': '\\theta ',
    'ι': '\\iota ', 'κ': '\\kappa ', 'λ': '\\lambda ', 'μ': '\\mu ',
    'ν': '\\nu ', 'ξ': '\\xi ', 'π': '\\pi ', 'ρ': '\\rho ',
    'σ': '\\sigma ', 'τ': '\\tau ', 'υ': '\\upsilon ', 'φ': '\\phi ',
    'χ': '\\chi ', 'ψ': '\\psi ', 'ω': '\\omega ',
    'Γ': '\\Gamma ', 'Δ': '\\Delta ', 'Θ': '\\Theta ', 'Λ': '\\Lambda ',
    'Ξ': '\\Xi ', 'Π': '\\Pi ', 'Σ': '\\Sigma ', 'Υ': '\\Upsilon ',
    'Φ': '\\Phi ', 'Ψ': '\\Psi ', 'Ω': '\\Omega '
  };

  function mapUnicodeMath(str) {
    str = str
      .replace(/×/g, '\\times ')
      .replace(/÷/g, '\\div ')
      .replace(/±/g, '\\pm ')
      .replace(/∓/g, '\\mp ')
      .replace(/≤/g, '\\le ')
      .replace(/≥/g, '\\ge ')
      .replace(/≠/g, '\\neq ')
      .replace(/≈/g, '\\approx ')
      .replace(/≡/g, '\\equiv ')
      .replace(/∞/g, '\\infty ')
      .replace(/\^?\{?°\}?/g, '^{\\circ}')
      .replace(/[–—]/g, '-')
      .replace(/[✓✔]/g, '\\checkmark ')
      .replace(/\\tick\b/g, '\\checkmark');

    str = str.replace(/[α-ωΑ-Ω]/g, (ch) => GREEK_MATH_MAP[ch] || ch);
    str = str.replace(/(\\[a-zA-Z]+)\s+([_^])/g, '$1$2');
    return str;
  }

  /**
   * Parse the argument following ^ or _ (either a balanced {...} group or single token/macro).
   */
  function parseScriptArg(str, pos) {
    if (pos >= str.length) return null;
    if (str[pos] === '{') {
      let depth = 1;
      let i = pos + 1;
      while (i < str.length && depth > 0) {
        if (str[i] === '{' && str[i - 1] !== '\\') depth++;
        else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
        i++;
      }
      return { raw: str.slice(pos, i), inner: str.slice(pos + 1, i - 1), end: i };
    } else if (str[pos] === '\\') {
      const m = str.slice(pos).match(/^(\\[a-zA-Z]+)/);
      if (m) return { raw: m[1], inner: m[1], end: pos + m[1].length };
      return { raw: str.slice(pos, pos + 2), inner: str.slice(pos, pos + 2), end: pos + 2 };
    } else {
      return { raw: str[pos], inner: str[pos], end: pos + 1 };
    }
  }

  /**
   * Prevent KaTeX Double Subscript / Superscript errors by merging chained scripts (e.g. x_a_b -> x_{a_b}).
   */
  function healDoubleSubSuper(str) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '_' || ch === '^') {
          const arg1 = parseScriptArg(str, i + 1);
          if (!arg1) continue;
          const nextPos = arg1.end;
          if (nextPos < str.length && str[nextPos] === ch) {
            const arg2 = parseScriptArg(str, nextPos + 1);
            if (!arg2) continue;
            let combined;
            if (ch === '_') {
              combined = '_{' + arg1.inner + '_' + arg2.inner + '}';
            } else {
              combined = '^{' + arg1.inner + '^{' + arg2.inner + '}}';
            }
            str = str.slice(0, i) + combined + str.slice(arg2.end);
            changed = true;
            break;
          }
        }
      }
    }
    return str;
  }

  /**
   * Balance \left and \right delimiters within an individual row or cell segment.
   */
  function balanceSegment(segment) {
    segment = segment
      .replace(/(?<!\\)\\left\s*\{/g, '\\left\\{')
      .replace(/(?<!\\)\\right\s*\}/g, '\\right\\}');

    const leftMatches = segment.match(/(?:^|[^\\])(?:\\\\)*\\left(?![a-zA-Z])/g) || [];
    const rightMatches = segment.match(/(?:^|[^\\])(?:\\\\)*\\right(?![a-zA-Z])/g) || [];
    const diff = leftMatches.length - rightMatches.length;

    if (diff > 0) {
      segment = segment + ' \\right.'.repeat(diff);
    } else if (diff < 0) {
      segment = '\\left. '.repeat(-diff) + segment;
    }
    return segment;
  }

  /**
   * Ensure every \left has a matching \right delimiter so KaTeX never throws unbalanced errors.
   */
  function balanceLeftRight(str) {
    // Normalize unescaped braces after \left and \right first
    str = str
      .replace(/(?<!\\)\\left\s*\{/g, '\\left\\{')
      .replace(/(?<!\\)\\right\s*\}/g, '\\right\\}');

    // Tabular environments where delimiters cannot cross \\ or &
    const tabularEnvs = /\\begin\{(aligned|align\*?|gather\*?|gathered|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|cases|dcases|rcases|array)\}([\s\S]*?)\\end\{\1\}/g;

    str = str.replace(tabularEnvs, (match, env, body) => {
      const rows = body.split(/\\\\/g);
      const balancedRows = rows.map(row => {
        const cells = row.split(/(?<!\\)&/g);
        return cells.map(balanceSegment).join('&');
      });
      return '\\begin{' + env + '}' + balancedRows.join(' \\\\ ') + '\\end{' + env + '}';
    });

    // Balance remaining outer expression
    const leftMatches = str.match(/(?:^|[^\\])(?:\\\\)*\\left(?![a-zA-Z])/g) || [];
    const rightMatches = str.match(/(?:^|[^\\])(?:\\\\)*\\right(?![a-zA-Z])/g) || [];
    const diff = leftMatches.length - rightMatches.length;

    if (diff > 0) {
      const endMatch = str.match(/(\\end\{[a-zA-Z*]+\}\s*)$/);
      const rights = ' \\right.'.repeat(diff);
      if (endMatch) {
        str = str.slice(0, endMatch.index) + rights + ' ' + endMatch[0];
      } else {
        str = str + rights;
      }
    } else if (diff < 0) {
      const beginMatch = str.match(/^(\s*\\begin\{[a-zA-Z*]+\}(?:\{[^{}]*\})?\s*)/);
      const lefts = '\\left. '.repeat(-diff);
      if (beginMatch) {
        str = beginMatch[0] + lefts + str.slice(beginMatch[0].length);
      } else {
        str = lefts + str;
      }
    }
    return str;
  }

  /**
   * Sanitize LaTeX content inside math expressions before KaTeX processing.
   * Automatically heals common ChatGPT, Claude, and LLM lazy LaTeX formatting errors.
   */
  function sanitizeMathContent(content) {
    if (!content || typeof content !== 'string') return '';

    let str = content
      // Normalize smart/curly quotes which break KaTeX
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      // Decode HTML entities that may have entered the LaTeX string
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&plusmn;/g, '\\pm')
      .replace(/&le;/g, '\\le')
      .replace(/&ge;/g, '\\ge')
      .replace(/&ne;/g, '\\ne')
      // Shorthand macro replacements
      .replace(/\\pmatrix\s*\{/g, '\\begin{pmatrix}')
      .replace(/\\matrix\s*\{/g, '\\begin{matrix}')
      .replace(/\\bmatrix\s*\{/g, '\\begin{bmatrix}')
      .replace(/\\vmatrix\s*\{/g, '\\begin{vmatrix}')
      .replace(/\\degree\b/g, '^{\\circ}')
      .replace(/\\angstrom\b/g, '\\text{Å}')
      .replace(/\\textregistered\b/g, '^{\\circledR}');

    // 1. Remove / convert LLM divider lines (===== or -----)
    str = cleanDividers(str);

    // 2. Fix missing column specifier on \begin{array}
    str = fixArrayColSpec(str);

    // 3. Mask protected text, chemistry, and tags
    const { masked, tokens } = maskProtectedBlocks(str);
    str = masked;

    // 4. Legacy LaTeX font & style commands
    str = replaceLegacyFonts(str);

    // 5. Missing backslashes on common math functions
    str = addFunctionBackslashes(str);

    // 6. Unicode operators & symbols
    str = mapUnicodeMath(str);

    // 7. Double sub/superscripts
    str = healDoubleSubSuper(str);

    // 8. Unmatched \left and \right
    str = balanceLeftRight(str);

    // 9. Restore protected text & chemistry blocks
    str = unmaskProtectedBlocks(str, tokens);

    return str;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Tokenized Pre-processing Pipeline
  // ─────────────────────────────────────────────────────────────

  /**
   * Pre-process raw markdown to discover, normalize, and protect math equations.
   */
  function preProcessMarkdown(source) {
    if (!source || typeof source !== 'string') return '';

    const codeBlocks = [];
    const mathBlocks = [];

    // 1. Convert ```math or ```latex code blocks directly to display math
    let text = source.replace(/(?:^|\n)[ \t]*```(?:math|latex)\s*\n([\s\S]*?)\n[ \t]*```/gi, (match, content) => {
      return '\n$$\n' + content.trim() + '\n$$\n';
    });

    // 2. Protect all other code blocks and inline code
    text = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      const id = `\uE000CODE${codeBlocks.length}\uE001`;
      codeBlocks.push(match);
      return id;
    });

    // 3. Extract existing $$ ... $$ blocks FIRST to protect them from regex overlap
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$$\n${sanitizeMathContent(content.trim())}\n$$`);
      return `\n\n${id}\n\n`;
    });

    // 4. Extract \[ ... \] and \\[ ... \\] display math
    text = text.replace(/(?<!\\)(?:\\\\|\\)\[([\s\S]*?)(?<!\\)(?:\\\\|\\)\]/g, (match, content) => {
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$$\n${sanitizeMathContent(content.trim())}\n$$`);
      return `\n\n${id}\n\n`;
    });

    // 5. Extract \( ... \) and \\( ... \\) inline math
    text = text.replace(/(?<!\\)(?:\\\\|\\)\(([\s\S]*?)(?<!\\)(?:\\\\|\\)\)/g, (match, content) => {
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$${sanitizeMathContent(content.trim())}$`);
      return id;
    });

    // 6. Extract and wrap unadorned LaTeX environments (now guaranteed not inside $$)
    const SUPPORTED_ENVS = new Set([
      'equation', 'equation*', 'align', 'align*', 'aligned',
      'gather', 'gather*', 'gathered', 'multline', 'multline*',
      'split', 'cases', 'dcases', 'rcases', 'matrix', 'pmatrix',
      'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'array'
    ]);
    const envRe = /((?:^[ \t]*[^\n$`]*?[=:]\s*)?)\\begin\{([a-zA-Z]+(?:\*)?)\}([\s\S]*?)\\end\{\2\}/gm;

    text = text.replace(envRe, (match, prefix, envName, body) => {
      if (!SUPPORTED_ENVS.has(envName)) return match;

      let normEnv = envName;
      if (/^align\*?$/.test(envName)) normEnv = 'aligned';
      if (/^gather\*?$/.test(envName)) normEnv = 'gathered';
      if (/^multline\*?$/.test(envName)) normEnv = 'aligned';
      if (envName === 'split') normEnv = 'aligned';

      const trimmedPrefix = (prefix || '').trim();
      const prefixStr = trimmedPrefix ? trimmedPrefix + ' ' : '';
      let mathContent = '';

      if (/^equation\*?$/.test(envName)) {
        mathContent = `${prefixStr}${body.trim()}`;
      } else {
        mathContent = `${prefixStr}\\begin{${normEnv}}${body}\\end{${normEnv}}`;
      }

      mathContent = sanitizeMathContent(mathContent);
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$$\n${mathContent}\n$$`);
      return `\n\n${id}\n\n`;
    });

    // 6b. Recover multi-line math formulas separated by LLM dividers (===== or -----)
    text = text.replace(/(^|\n)([^\n$`]+[=<>≈≤≥≡][^\n$`]+)\n[ \t]*[=\-_~*]{3,}[ \t]*\n([^\n$`]+[=<>≈≤≥≡][^\n$`]+)(?=\n|$)/g, (match, prefix, line1, line2) => {
      if (looksLikeLatex(line1) || looksLikeLatex(line2) || isStandaloneMathLine(line1) || isStandaloneMathLine(line2)) {
        const id = `\uE000MATH${mathBlocks.length}\uE001`;
        const content = `\\begin{aligned}\n${sanitizeMathContent(line1.trim())} \\\\\n${sanitizeMathContent(line2.trim())}\n\\end{aligned}`;
        mathBlocks.push(`$$\n${content}\n$$`);
        return `${prefix}\n\n${id}\n\n`;
      }
      return match;
    });

    // 7. Recover bare [latex] bracket blocks (common copy-paste artifact)
    // Multi-line [ ... ]
    text = text.replace(/^([ \t]*)\[\s*\n([\s\S]*?)\n[ \t]*\][ \t]*$/gm, (match, indent, content) => {
      if (!looksLikeLatex(content)) return match;
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$$\n${sanitizeMathContent(content.trim())}\n$$`);
      return `\n\n${id}\n\n`;
    });

    // Single-line [ ... ] on its own line
    text = text.replace(/^([ \t]*)\[([^\n]+)\][ \t]*$/gm, (match, indent, content) => {
      if (/^[ xX]$/.test(content) || !looksLikeLatex(content)) return match;
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$$\n${sanitizeMathContent(content.trim())}\n$$`);
      return `\n\n${id}\n\n`;
    });

    // Inline [ ... ] not part of a markdown link [text](url) or footnote [^1]
    text = text.replace(/(^|[^!\[\w$])\[([^\]\n]{2,})\](?!\s*[\(:\[])(?=$|[^\w$])/g, (match, prefix, content) => {
      if (/^[ xX]$/.test(content) || !looksLikeLatex(content)) return match;
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$${sanitizeMathContent(content.trim())}$`);
      return prefix + id;
    });

    // 8. Recover standalone math lines
    text = text.split('\n').map(line => {
      if (isStandaloneMathLine(line)) {
        const id = `\uE000MATH${mathBlocks.length}\uE001`;
        mathBlocks.push(`$$\n${sanitizeMathContent(line.trim())}\n$$`);
        return id;
      }
      return line;
    }).join('\n');

    // 9. Protect Currency amounts ($100, $50.00, etc.) from being parsed as math
    text = text.replace(/\$((?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?(?:\s*(?:million|billion|trillion|k|USD|EUR|INR|Rs\.?))?)(?=[\s.,;:!?)]|$)/gi, '&#36;$1');

    // 10. Extract remaining inline $...$
    text = text.replace(/(^|[^\w\\$])\$([^\s$](?:[^$]*[^\s$])?)\$(?!\d)/g, (match, prefix, content) => {
      const id = `\uE000MATH${mathBlocks.length}\uE001`;
      mathBlocks.push(`$${sanitizeMathContent(content.trim())}$`);
      return prefix + id;
    });

    // 11. Plain-text fallbacks (ONLY on prose, safe from math blocks)
    text = text
      .replace(/([a-zA-Z0-9]+)\^(-?[0-9.]+|\([^)]+\))/g, (match, base, sup) => {
        if (sup.startsWith('(') && sup.endsWith(')')) sup = sup.slice(1, -1);
        return `${base}<sup>${sup}</sup>`;
      })
      .replace(/([A-Z][a-z]?)_([0-9]+)/g, '$1<sub>$2</sub>')
      .replace(/<->/g, '&harr;')
      .replace(/->/g, '&rarr;')
      .replace(/<-/g, '&larr;')
      .replace(/\+\/-/g, '&plusmn;');

    // 12. Restore math blocks
    let loops = 0;
    while (/\uE000MATH\d+\uE001/.test(text) && loops < 5) {
      text = text.replace(/\uE000MATH(\d+)\uE001/g, (match, idx) => {
        return mathBlocks[Number(idx)] || match;
      });
      loops++;
    }

    // 13. Restore code blocks
    text = text.replace(/\uE000CODE(\d+)\uE001/g, (match, idx) => {
      return codeBlocks[Number(idx)] || match;
    });

    return text;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Post-Render HTML Math Recovery
  // ─────────────────────────────────────────────────────────────

  /**
   * Safely render any math expressions that remained inside raw HTML blocks
   * (e.g. inside <table><tr><td>$x=1$</td></tr></table>) without corrupting prose or currency.
   */
  function renderMathInHtml(html) {
    if (!html || !window.katex) return html;

    // Protect elements that should not have math parsed
    const protectRe = /<(?:script|style|pre|code|span\b[^>]*\bkatex\b|section\b[^>]*\beqn\b)[^>]*>[\s\S]*?<\/(?:script|style|pre|code|span|section)>/gi;
    const tokens = [];
    let safeHtml = html.replace(protectRe, (m) => {
      const id = `\uE000RAW${tokens.length}\uE001`;
      tokens.push(m);
      return id;
    });

    // Display math $$...$$
    safeHtml = safeHtml.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
      try {
        return window.katex.renderToString(sanitizeMathContent(content.trim()), { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    // Inline math $...$ (strict check against currency)
    safeHtml = safeHtml.replace(/(^|[^\w\\$])\$([^\s$](?:[^$]*[^\s$])?)\$(?!\d)/g, (match, prefix, content) => {
      if (/^\d+(?:,\d{3})*(?:\.\d+)?$/.test(content)) return match;
      try {
        const rendered = window.katex.renderToString(sanitizeMathContent(content.trim()), { displayMode: false, throwOnError: false });
        return prefix + rendered;
      } catch (e) {
        return match;
      }
    });

    // Restore protected elements
    safeHtml = safeHtml.replace(/\uE000RAW(\d+)\uE001/g, (match, idx) => {
      return tokens[Number(idx)] || match;
    });

    return safeHtml;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Auto-Wrapping & Auto-Scaling Math Layout Engine
  // ─────────────────────────────────────────────────────────────

  /**
   * Measure all display equations in the container and automatically scale down
   * any unbreakable wide formulas so they fit perfectly within the page width.
   *
   * @param {HTMLElement} container - The preview content DOM element
   */
  function fitMathToContainer(container) {
    if (!container) return;
    const displays = container.querySelectorAll('.katex-display');
    const containerWidth = container.clientWidth || 600;

    for (const kd of displays) {
      // Reset transform styles to measure natural dimensions
      kd.style.transform = '';
      kd.style.transformOrigin = '';
      kd.style.width = '';
      kd.style.marginLeft = '';
      kd.style.marginBottom = '';

      const htmlEl = kd.querySelector('.katex-html');
      if (!htmlEl) continue;

      // scrollWidth captures the full width of unbreakable tables/matrices
      const contentWidth = htmlEl.scrollWidth;
      if (contentWidth > containerWidth && containerWidth > 50) {
        // Calculate proportional scale factor to fit within page margins
        const scale = Math.max(0.4, (containerWidth - 8) / contentWidth);
        if (scale < 0.98) {
          kd.style.transform = `scale(${scale.toFixed(4)})`;
          kd.style.transformOrigin = 'center top';
          kd.style.width = `${(100 / scale).toFixed(2)}%`;
          kd.style.marginLeft = `${((100 - (100 / scale)) / 2).toFixed(2)}%`;
          // Compensate for vertical blank space left by transform scale
          const heightDiff = kd.offsetHeight * (1 - scale);
          kd.style.marginBottom = `-${heightDiff.toFixed(1)}px`;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Main Render Pipeline
  // ─────────────────────────────────────────────────────────────

  /**
   * Render markdown source into high-fidelity HTML with complete formula support.
   *
   * @param {string} markdownSource - Raw markdown input
   * @param {object} md - markdown-it instance configured with texmath
   * @returns {string} Rendered HTML string
   */
  function renderMarkdownEnhanced(markdownSource, md) {
    if (!markdownSource) return '';

    try {
      // Step 1: Pre-process markdown (code protection, math extraction, environment normalization)
      const processed = preProcessMarkdown(markdownSource);

      // Step 2: Render markdown structure and formulas via markdown-it + texmath
      let html = md.render(processed);

      // Step 3: Recover any math left inside raw HTML blocks (tables, divs)
      html = renderMathInHtml(html);

      return html;
    } catch (e) {
      console.error('Render error:', e);
      try {
        return md.render(markdownSource);
      } catch (e2) {
        return `<div style="color: #dc2626; padding: 1em; border: 1px solid #fca5a5; border-radius: 4px; background: #fef2f2;">
          <strong>⚠️ Render Error:</strong> ${e2.message}
        </div>`;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Global Exposure
  // ─────────────────────────────────────────────────────────────

  window.MDParser = {
    looksLikeLatex,
    isStandaloneMathLine,
    sanitizeMathContent,
    preProcessMarkdown,
    renderMathInHtml,
    fitMathToContainer,
    renderMarkdownEnhanced
  };

})();
