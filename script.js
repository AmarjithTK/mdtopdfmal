document.addEventListener('DOMContentLoaded', () => {
    // Initialize MD Parser and attach the KaTeX plugin.
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    }).use(window.texmath, {
        engine: window.katex,
        delimiters: 'dollars',
        katexOptions: {
            throwOnError: false
        }
    });

    const markdownInput = document.getElementById('markdown-input');
    const previewContent = document.getElementById('preview-content');
    const exportBtn = document.getElementById('export-btn');
    const themeSelector = document.getElementById('theme-selector');
    const fontSelector = document.getElementById('font-selector');
    const fontFactorSlider = document.getElementById('font-factor');
    const fontFactorDisplay = document.getElementById('font-factor-display');
    const lineFactorSlider = document.getElementById('line-factor');
    const lineFactorDisplay = document.getElementById('line-factor-display');
    const spaceFactorSlider = document.getElementById('space-factor');
    const spaceFactorDisplay = document.getElementById('space-factor-display');

    // Sample Content Load
    markdownInput.value = `# മലയാളം Title 

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

---

> "ഇതൊരു ഉദ്ധരണിയാണ്." (This is a quote.)

## സബ് ഹെഡിംഗ്

ഈ ഭാഗം **ബോൾഡ്** ആണ്, ഇത് *ഇറ്റാലിക്സ്* ആണ്.`;

    const looksLikeLatex = (value) => {
        return /\\[a-zA-Z]+|[_^{}=]|[∫∑√π∞≤≥]/.test(value);
    };

    const cleanLatexBlock = (value) => {
        const lines = value
            .trim()
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        if (lines.length === 3 && /^=+$/.test(lines[1])) {
            return `${lines[0]} = ${lines[2]}`;
        }

        return value.trim();
    };

    const isStandaloneMathLine = (line) => {
        const trimmed = line.trim();

        if (
            !trimmed ||
            trimmed.length > 160 ||
            trimmed.includes('$') ||
            trimmed.includes('`') ||
            /^(#{1,6}|>|[-*+]|\d+\.)\s/.test(trimmed) ||
            /[:.!?]$/.test(trimmed)
        ) {
            return false;
        }

        const hasMathOperator = /[=<>]|\\[a-zA-Z]+/.test(trimmed);
        const hasMathVariable = /[A-Za-z]_[A-Za-z0-9]|\([A-Za-z]\)|\\[a-zA-Z]+|[Δ∫∑√π∞≤≥]/.test(trimmed);
        const onlyMathCharacters = /^[A-Za-z0-9\\{}()[\].,_\s+\-*/^=<>|;:!Δ∫∑√π∞≤≥]+$/.test(trimmed);
        const hasPlainWord = /[A-Za-z]{3,}/.test(trimmed.replace(/\\[a-zA-Z]+/g, ''));

        return hasMathOperator && hasMathVariable && onlyMathCharacters && !hasPlainWord;
    };

    const normalizeMathDelimiters = (source) => {
        // Split by HTML tags and code blocks so we don't process content inside them
        const tagSplit = /(<[^>]*>|```[\s\S]*?```|`[^`]*`)/g;
        const tagParts = source.split(tagSplit);

        for (let i = 0; i < tagParts.length; i++) {
            // Even indices = non-tag content, odd indices = HTML tags/code
            if (i % 2 !== 0) continue;

            tagParts[i] = tagParts[i]
                .replace(/\\\(/g, '$')
                .replace(/\\\)/g, '$')
                .replace(/\\\[/g, '$$$$')
                .replace(/\\\]/g, '$$$$');
        }

        let normalized = tagParts.join('');

        // Some pasted ChatGPT/browser text loses the backslash from \[...\],
        // leaving standalone [ ... ] math blocks. Recover only LaTeX-looking ones.
        normalized = normalized.replace(
            /^([ \t]*)\[\s*\n([\s\S]*?)\n[ \t]*\][ \t]*$/gm,
            (match, indent, content) => {
                if (!looksLikeLatex(content)) {
                    return match;
                }

                return `${indent}$$\n${cleanLatexBlock(content)}\n${indent}$$`;
            }
        );

        normalized = normalized.replace(
            /^([ \t]*)\[([^\]\n]+)\][ \t]*$/gm,
            (match, indent, content) => {
                if (!looksLikeLatex(content)) {
                    return match;
                }

                return `${indent}$$\n${content.trim()}\n${indent}$$`;
            }
        );

        normalized = normalized.replace(
            /(^|[^\w\]$])\[([^\]\n]+)\](?!\()(?=$|[^\w\[$])/gm,
            (match, prefix, content) => {
                if (!looksLikeLatex(content)) {
                    return match;
                }

                return `${prefix}$${content.trim()}$`;
            }
        );

        let inDollarMathBlock = false;
        normalized = normalized
            .split('\n')
            .map((line) => {
                const trimmed = line.trim();

                if (trimmed.startsWith('$$')) {
                    const isOneLineMathBlock = trimmed.length > 2 && trimmed.endsWith('$$');
                    if (!isOneLineMathBlock) {
                        inDollarMathBlock = !inDollarMathBlock;
                    }
                    return line;
                }

                if (inDollarMathBlock || !isStandaloneMathLine(line)) {
                    return line;
                }

                const indent = line.match(/^\s*/)[0];
                return `${indent}$$\n${trimmed}\n${indent}$$`;
            })
            .join('\n');

        return normalized;
    };

    const fixKatexEnvironments = (source) => {
        const codeRegex = /(```[\s\S]*?```|`[^`]*`)/g;
        const parts = source.split(codeRegex);

        for (let i = 0; i < parts.length; i += 2) {
            parts[i] = parts[i]
                .replace(/\\begin\{align\*?\}/g, '\\begin{aligned}')
                .replace(/\\end\{align\*?\}/g, '\\end{aligned}');
        }

        return parts.join('');
    };

    const applyLazyMathFallbacks = (source) => {
        const splitRegex = /(```[\s\S]*?```|`[^`]*`|<[^>]*>|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
        const parts = source.split(splitRegex);

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 !== 0) {
                continue;
            }

            parts[i] = parts[i]
                .replace(/([a-zA-Z0-9]+)\^(-?[0-9.]+|\([^)]+\))/g, (match, base, sup) => {
                    if (sup.startsWith('(') && sup.endsWith(')')) {
                        sup = sup.slice(1, -1);
                    }

                    return `${base}<sup>${sup}</sup>`;
                })
                .replace(/([A-Z][a-z]?)_([0-9]+)/g, '$1<sub>$2</sub>')
                .replace(/([a-zA-Z])_(-?[0-9.]+|[ijkmnxyz]|\{[^}]+\})(?![a-zA-Z])/g, (match, base, sub) => {
                    if (sub.startsWith('{') && sub.endsWith('}')) {
                        sub = sub.slice(1, -1);
                    }

                    return `${base}<sub>${sub}</sub>`;
                })
                .replace(/<->/g, '&harr;')
                .replace(/->/g, '&rarr;')
                .replace(/<-/g, '&larr;')
                .replace(/\+\/-/g, '&plusmn;')
                .replace(/<=(?=[ \d\w])/g, '&le;')
                .replace(/>=(?=[ \d\w])/g, '&ge;')
                .replace(/!=/g, '&ne;');
        }

        return parts.join('');
    };

    // Render logic
    const renderMarkdown = () => {
        try {
            let markdownSource = fixKatexEnvironments(markdownInput.value);
            markdownSource = normalizeMathDelimiters(markdownSource);
            markdownSource = applyLazyMathFallbacks(markdownSource);

            previewContent.innerHTML = md.render(markdownSource);
        } catch (e) {
            console.error('Render error:', e);
            // Fallback: render without math pre-processing
            try {
                previewContent.innerHTML = md.render(markdownInput.value);
            } catch (e2) {
                console.error('Fallback render error:', e2);
                previewContent.innerHTML = `<div style="color: #dc2626; padding: 1em; border: 1px solid #fca5a5; border-radius: 4px; background: #fef2f2;">
                    <strong>⚠️ Render Error:</strong> ${e2.message}
                </div>`;
            }
        }
    };

    // Live Event Listeners
    markdownInput.addEventListener('input', renderMarkdown);

    // Initial render
    renderMarkdown();

    // Theme selector change listener
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            // Remove all themes starting with prose-dense_
            const classes = Array.from(previewContent.classList);
            classes.forEach(c => {
                if (c.startsWith('prose-dense_')) {
                    previewContent.classList.remove(c);
                }
            });
            // Add new theme
            previewContent.classList.add(e.target.value);

            // Handle dark background for midnight theme
            const a4Container = previewContent.closest('.bg-white') || previewContent.parentElement;
            if (e.target.value === 'prose-dense_midnight') {
                a4Container.style.backgroundColor = '#0f172a';
            } else {
                a4Container.style.backgroundColor = '';
            }
        });
    }

    // Font selector change listener
    if (fontSelector) {
        fontSelector.addEventListener('change', (e) => {
            previewContent.style.setProperty('--preview-font', e.target.value);
        });
    }

    // Font factor change listener
    if (fontFactorSlider) {
        fontFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            fontFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--font-factor', factor);
        });
    }

    // Line height factor change listener
    if (lineFactorSlider) {
        lineFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            lineFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--line-factor', factor);
        });
    }

    // Block spacing factor change listener
    if (spaceFactorSlider) {
        spaceFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            spaceFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--space-factor', factor);
        });
    }

    // Page numbers toggle
    const pageNumbersToggle = document.getElementById('page-numbers-toggle');
    const pageNumbersStyle = document.getElementById('page-numbers-css');
    if (pageNumbersToggle && pageNumbersStyle) {
        pageNumbersToggle.addEventListener('click', () => {
            const isOn = pageNumbersToggle.getAttribute('data-toggled') === 'true';
            const newState = !isOn;
            pageNumbersToggle.setAttribute('data-toggled', String(newState));
            pageNumbersToggle.setAttribute('aria-checked', String(newState));
            pageNumbersStyle.disabled = !newState;
            const knob = pageNumbersToggle.querySelector('span');
            if (newState) {
                knob.classList.add('translate-x-4');
                knob.classList.remove('translate-x-0');
                pageNumbersToggle.classList.add('bg-emerald-600');
                pageNumbersToggle.classList.remove('bg-gray-300');
            } else {
                knob.classList.remove('translate-x-4');
                knob.classList.add('translate-x-0');
                pageNumbersToggle.classList.remove('bg-emerald-600');
                pageNumbersToggle.classList.add('bg-gray-300');
            }
        });
    }

    // ---- Print handler: beforeprint/afterprint for reliable print control ----
    // CSS @media print alone is unreliable because Tailwind CDN injects generated
    // CSS at runtime after style.css loads, creating cascade conflicts.
    // Inline styles (element.style.xxx) have the highest specificity.

    window.addEventListener('beforeprint', () => {
        // 1. Blast-hide all UI chrome — inline style beats any CSS
        document.querySelectorAll(
            'header, footer, aside, textarea, select, button, input, label, optgroup, option'
        ).forEach(el => {
            el.dataset.printOrigDisplay = el.style.display;
            el.style.display = 'none';
        });

        // 2. Clip horizontal overflow at root level
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
        document.body.style.maxWidth = '100%';

        // 3. Force wrapping inside preview content
        const preview = document.getElementById('preview-content');
        if (!preview) return;
        
        preview.style.maxWidth = '100%';
        preview.style.width = '100%';
        preview.style.overflowWrap = 'break-word';
        preview.style.wordBreak = 'break-word';

        preview.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.overflowWrap = 'break-word';
            el.style.wordBreak = 'break-word';
        });

        // 4. Force pre/code to wrap
        preview.querySelectorAll('pre, code').forEach(el => {
            el.style.whiteSpace = 'pre-wrap';
        });

        // 5. Fixed table layout prevents column overflow
        preview.querySelectorAll('table').forEach(el => {
            el.style.tableLayout = 'fixed';
            el.style.maxWidth = '100%';
        });

        // 6. Scale images/embeds to fit
        preview.querySelectorAll('img, svg, video, iframe, .katex-display').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
        });
    });

    window.addEventListener('afterprint', () => {
        // Restore hidden elements
        document.querySelectorAll('[data-print-orig-display]').forEach(el => {
            el.style.display = el.dataset.printOrigDisplay || '';
            delete el.dataset.printOrigDisplay;
        });

        // Restore root
        document.documentElement.style.overflowX = '';
        document.body.style.overflowX = '';
        document.body.style.maxWidth = '';

        // Restore preview content inline styles
        const preview = document.getElementById('preview-content');
        if (!preview) return;

        preview.style.maxWidth = '';
        preview.style.width = '';
        preview.style.overflowWrap = '';
        preview.style.wordBreak = '';

        preview.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = '';
            el.style.overflowWrap = '';
            el.style.wordBreak = '';
        });

        preview.querySelectorAll('pre, code').forEach(el => {
            el.style.whiteSpace = '';
        });

        preview.querySelectorAll('table').forEach(el => {
            el.style.tableLayout = '';
        });

        preview.querySelectorAll('img, svg, video, iframe, .katex-display').forEach(el => {
            el.style.maxWidth = '';
            el.style.height = '';
        });
    });

    // Export PDF listener
    exportBtn.addEventListener('click', () => {
        window.print();
    });
});
