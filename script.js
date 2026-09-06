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

    const STORAGE_KEY = 'atherpulse-exporter.preferences.v1';
    const DEFAULT_MARKDOWN = `# മലയാളം Title 

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

---

> "ഇതൊരു ഉദ്ധരണിയാണ്." (This is a quote.)

## സബ് ഹെഡിംഗ്

ഈ ഭാഗം **ബോൾഡ്** ആണ്, ഇത് *ഇറ്റാലിക്സ്* ആണ്.`;
    const defaultPreferences = {
        colorMode: 'light',
        theme: 'prose-dense_minimal',
        font: "'Inter', sans-serif",
        fontFactor: '1.0',
        lineFactor: '1.0',
        spaceFactor: '1.0',
        alignment: 'left',
        pageNumbers: true,
        pageNumberSize: '9',
        pageNumberPosition: 'bottom-center',
        pageMargin: '8',
        content: null
    };

    const readPreferences = () => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Could not read saved preferences:', error);
            return {};
        }
    };

    const preferences = { ...defaultPreferences, ...readPreferences() };
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
    const colorModeToggle = document.getElementById('color-mode-toggle');
    const pageNumbersToggle = document.getElementById('page-numbers-toggle');
    const pageNumbersStyle = document.getElementById('page-numbers-css');
    const pageMarginSlider = document.getElementById('page-margin');
    const pageMarginDisplay = document.getElementById('page-margin-display');
    const pageNumberSizeSlider = document.getElementById('page-number-size');
    const pageNumberSizeDisplay = document.getElementById('page-number-size-display');
    const pageNumberPosition = document.getElementById('page-number-position');

    const persistPreferences = () => {
        preferences.content = markdownInput.value;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.warn('Could not save preferences:', error);
        }
    };

    const setColorMode = (mode, persist = true) => {
        const normalizedMode = mode === 'dark' ? 'dark' : 'light';
        document.body.dataset.colorMode = normalizedMode;
        document.documentElement.style.colorScheme = normalizedMode;
        preferences.colorMode = normalizedMode;
        if (colorModeToggle) {
            const icon = colorModeToggle.querySelector('i');
            const label = colorModeToggle.querySelector('span');
            const darkMode = normalizedMode === 'dark';
            colorModeToggle.setAttribute('aria-pressed', String(darkMode));
            colorModeToggle.setAttribute('title', darkMode ? 'Switch to light mode' : 'Switch to dark mode');
            if (icon) {
                icon.className = darkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
            if (label) {
                label.textContent = darkMode ? 'Light mode' : 'Dark mode';
            }
        }
        if (persist) persistPreferences();
    };

    const updatePageNumberCSS = () => {
        const margin = Number(pageMarginSlider.value);
        const size = Number(pageNumberSizeSlider.value);
        const position = pageNumberPosition.value;
        const font = fontSelector.value || defaultPreferences.font;
        const textAlign = position.endsWith('left')
            ? 'left'
            : position.endsWith('right')
                ? 'right'
                : 'center';
        const marginBox = `@${position}`;

        // CSS page margin boxes are the browser-supported context where
        // counter(page) increments for every printed sheet. Fixed DOM elements
        // render, but Chromium resolves counter(page) to zero there.
        pageNumbersStyle.textContent = `@media print {
  @page {
    size: A4;
    margin: ${margin}mm;
    ${marginBox} {
      content: counter(page);
      color: #6b7280;
      font-family: ${font};
      font-size: ${size}pt;
      font-weight: 500;
      line-height: 1.2;
      padding: 2pt 0;
      text-align: ${textAlign};
      white-space: nowrap;
      overflow: visible;
    }
  }
  #print-page-number {
    display: none !important;
  }
}`;
        pageNumbersStyle.disabled = pageNumbersToggle.getAttribute('data-toggled') !== 'true';
        document.documentElement.style.setProperty('--paper-margin', `${margin}mm`);
        pageMarginDisplay.textContent = `${margin}mm`;
        pageNumberSizeDisplay.textContent = `${size}pt`;
    };

    // Restore saved controls before the first render.
    markdownInput.value = preferences.content ?? DEFAULT_MARKDOWN;
    themeSelector.value = preferences.theme;
    fontSelector.value = preferences.font;
    fontFactorSlider.value = preferences.fontFactor;
    lineFactorSlider.value = preferences.lineFactor;
    spaceFactorSlider.value = preferences.spaceFactor;
    pageMarginSlider.value = preferences.pageMargin;
    pageNumberSizeSlider.value = preferences.pageNumberSize;
    pageNumberPosition.value = preferences.pageNumberPosition;
    pageNumbersToggle.setAttribute('data-toggled', String(Boolean(preferences.pageNumbers)));
    pageNumbersToggle.setAttribute('aria-checked', String(Boolean(preferences.pageNumbers)));
    setColorMode(preferences.colorMode, false);
    fontFactorDisplay.textContent = Number(fontFactorSlider.value).toFixed(2) + 'x';
    lineFactorDisplay.textContent = Number(lineFactorSlider.value).toFixed(2) + 'x';
    spaceFactorDisplay.textContent = Number(spaceFactorSlider.value).toFixed(2) + 'x';
    previewContent.style.setProperty('--preview-font', fontSelector.value);
    previewContent.style.setProperty('--font-factor', fontFactorSlider.value);
    previewContent.style.setProperty('--line-factor', lineFactorSlider.value);
    previewContent.style.setProperty('--space-factor', spaceFactorSlider.value);
    Array.from(previewContent.classList).forEach((className) => {
        if (className.startsWith('prose-dense_')) previewContent.classList.remove(className);
    });
    previewContent.classList.add(themeSelector.value);
    updatePageNumberCSS();

    // Render logic powered by enhanced first-principles engine
    const renderMarkdown = () => {
        try {
            let renderedHtml = '';
            if (window.MDParser && window.MDParser.renderMarkdownEnhanced) {
                renderedHtml = window.MDParser.renderMarkdownEnhanced(
                    markdownInput.value,
                    md
                );
            } else {
                renderedHtml = md.render(markdownInput.value);
            }

            // Post-process task list checkmarks: - [x] and - [ ]
            renderedHtml = renderedHtml.replace(
                /<li([^>]*)>(\s*(?:<p>)?\s*)\[([ xX])\]\s*/gi,
                (match, attrs, prefix, check) => {
                    const isChecked = check.toLowerCase() === 'x';
                    const checkedClass = isChecked ? 'task-checked' : 'task-unchecked';
                    const icon = isChecked
                        ? '<span class="task-list-checkbox checked" aria-label="Completed">&#x2713;</span>'
                        : '<span class="task-list-checkbox unchecked" aria-label="Not completed"></span>';
                    let newAttrs = attrs;
                    if (/class=["']/i.test(newAttrs)) {
                        newAttrs = newAttrs.replace(/class=["']([^"']*)["']/i, `class="$1 task-list-item ${checkedClass}"`);
                    } else {
                        newAttrs = `${newAttrs} class="task-list-item ${checkedClass}"`;
                    }
                    return `<li${newAttrs}>${prefix}${icon} `;
                }
            );

            previewContent.innerHTML = renderedHtml;

            // Mark parent lists for styling
            previewContent.querySelectorAll('.task-list-item').forEach(li => {
                const parent = li.parentElement;
                if (parent && (parent.tagName === 'UL' || parent.tagName === 'OL')) {
                    parent.classList.add('task-list');
                }
            });

            if (window.MDParser && window.MDParser.fitMathToContainer) {
                window.MDParser.fitMathToContainer(previewContent);
            }
        } catch (e) {
            console.error('Render error:', e);
            previewContent.innerHTML = `<div style="color: #dc2626; padding: 1em; border: 1px solid #fca5a5; border-radius: 4px; background: #fef2f2;">
                <strong>⚠️ Render Error:</strong> ${e.message}
            </div>`;
        }
    };

    // Live Event Listeners
    markdownInput.addEventListener('input', () => {
        renderMarkdown();
        persistPreferences();
    });

    // Initial render
    renderMarkdown();

    // Theme selector change listener
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            const classes = Array.from(previewContent.classList);
            classes.forEach((className) => {
                if (className.startsWith('prose-dense_')) previewContent.classList.remove(className);
            });
            previewContent.classList.add(e.target.value);
            const a4Container = previewContent.parentElement;
            a4Container.style.backgroundColor = e.target.value === 'prose-dense_midnight' ? '#0f172a' : '';
            preferences.theme = e.target.value;
            persistPreferences();
        });
    }

    // Font selector change listener
    if (fontSelector) {
        fontSelector.addEventListener('change', (e) => {
            previewContent.style.setProperty('--preview-font', e.target.value);
            preferences.font = e.target.value;
            updatePageNumberCSS();
            persistPreferences();
        });
    }

    // Font factor change listener
    if (fontFactorSlider) {
        fontFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            fontFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--font-factor', factor);
            preferences.fontFactor = factor;
            persistPreferences();
            if (window.MDParser) window.MDParser.fitMathToContainer(previewContent);
        });
    }

    // Line height factor change listener
    if (lineFactorSlider) {
        lineFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            lineFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--line-factor', factor);
            preferences.lineFactor = factor;
            persistPreferences();
            if (window.MDParser) window.MDParser.fitMathToContainer(previewContent);
        });
    }

    // Block spacing factor change listener
    if (spaceFactorSlider) {
        spaceFactorSlider.addEventListener('input', (e) => {
            const factor = e.target.value;
            spaceFactorDisplay.textContent = Number(factor).toFixed(2) + 'x';
            previewContent.style.setProperty('--space-factor', factor);
            preferences.spaceFactor = factor;
            persistPreferences();
            if (window.MDParser) window.MDParser.fitMathToContainer(previewContent);
        });
    }

    // Alignment control listener
    const alignmentControl = document.getElementById('alignment-control');
    const alignmentSelector = document.getElementById('alignment-selector');
    const alignButtons = alignmentControl ? alignmentControl.querySelectorAll('.align-btn') : [];

    const setAlignment = (align, persist = true) => {
        previewContent.classList.remove('align-center', 'align-justify');
        if (align === 'center') {
            previewContent.classList.add('align-center');
        } else if (align === 'justify') {
            previewContent.classList.add('align-justify');
        }

        alignButtons.forEach(btn => {
            const btnAlign = btn.getAttribute('data-align');
            if (btnAlign === align) {
                btn.classList.add('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
                btn.classList.remove('text-emerald-800', 'hover:bg-emerald-100/70');
            } else {
                btn.classList.remove('active', 'bg-emerald-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-emerald-800', 'hover:bg-emerald-100/70');
            }
        });

        if (alignmentSelector && alignmentSelector.value !== align) {
            alignmentSelector.value = align;
        }
        preferences.alignment = align;
        if (persist) persistPreferences();
        if (window.MDParser && window.MDParser.fitMathToContainer) {
            window.MDParser.fitMathToContainer(previewContent);
        }
    };

    if (alignmentControl) {
        alignButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const align = btn.getAttribute('data-align') || 'left';
                setAlignment(align);
            });
        });
    }

    if (alignmentSelector) {
        alignmentSelector.addEventListener('change', (e) => {
            setAlignment(e.target.value);
        });
    }

    // Persisted appearance and print controls.
    setAlignment(preferences.alignment, false);

    if (colorModeToggle) {
        colorModeToggle.addEventListener('click', () => {
            setColorMode(preferences.colorMode === 'dark' ? 'light' : 'dark');
        });
    }

    pageNumbersToggle.addEventListener('click', () => {
        const newState = pageNumbersToggle.getAttribute('data-toggled') !== 'true';
        pageNumbersToggle.setAttribute('data-toggled', String(newState));
        pageNumbersToggle.setAttribute('aria-checked', String(newState));
        preferences.pageNumbers = newState;
        updatePageNumberCSS();
        persistPreferences();
    });

    pageMarginSlider.addEventListener('input', (e) => {
        preferences.pageMargin = e.target.value;
        updatePageNumberCSS();
        persistPreferences();
    });

    pageNumberSizeSlider.addEventListener('input', (e) => {
        preferences.pageNumberSize = e.target.value;
        updatePageNumberCSS();
        persistPreferences();
    });

    pageNumberPosition.addEventListener('change', (e) => {
        preferences.pageNumberPosition = e.target.value;
        updatePageNumberCSS();
        persistPreferences();
    });

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
        preview.querySelectorAll('img, svg, video, iframe').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
        });

        // 7. Auto-fit all math to the print container
        if (window.MDParser) {
            window.MDParser.fitMathToContainer(preview);
        }
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

        preview.querySelectorAll('img, svg, video, iframe').forEach(el => {
            el.style.maxWidth = '';
            el.style.height = '';
        });

        // Re-fit math for screen preview
        if (window.MDParser) {
            window.MDParser.fitMathToContainer(preview);
        }
    });

    // Resize listener for responsive math fitting
    window.addEventListener('resize', () => {
        if (window.MDParser) {
            window.MDParser.fitMathToContainer(previewContent);
        }
    });

    // Export PDF listener
    exportBtn.addEventListener('click', () => {
        window.print();
    });
});
