document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'mdtopdfmal.state.v3';
    const DEFAULT_MARKDOWN = `# മലയാളം Title

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

<!-- pagebreak -->

> "ഇതൊരു ഉദ്ധരണിയാണ്." (This is a quote.)

## സബ് ഹെഡിംഗ്

ഈ ഭാഗം **ബോൾഡ്** ആണ്, ഇത് *ഇറ്റാലിക്സ്* ആണ്.`;

    const PAGE_DIMENSIONS = {
        A4: {
            portrait: { width: '210mm', minHeight: '297mm', label: 'A4 Preview' },
            landscape: { width: '297mm', minHeight: '210mm', label: 'A4 Landscape Preview' }
        },
        Letter: {
            portrait: { width: '8.5in', minHeight: '11in', label: 'Letter Preview' },
            landscape: { width: '11in', minHeight: '8.5in', label: 'Letter Landscape Preview' }
        }
    };

    const DEFAULT_SETTINGS = {
        theme: 'prose-dense_minimal',
        fontFactor: '1.0',
        lineHeight: '1.45',
        paperSize: 'A4',
        orientation: 'portrait',
        printMargin: '8mm',
        textAlign: 'left',
        fontFamily: '',
        metaTitle: '',
        metaAuthor: '',
        metaDate: '',
        metaFooter: '',
        showPageNumbers: false,
        preset: ''
    };

    const PRESETS = {
        essay: {
            theme: 'prose-dense_classic',
            fontFactor: '1.05',
            lineHeight: '1.65',
            printMargin: '20mm',
            textAlign: 'justify',
            fontFamily: "'Noto Serif Malayalam', serif",
            metaTitle: 'മലയാളം പ്രബന്ധം',
            markdown: `# മലയാളം പ്രബന്ധം

## അവതാരിക

വിഷയത്തെ ശാന്തമായി പരിചയപ്പെടുത്തുന്ന ഒരു ചെറിയ ഭാഗം ഇവിടെ എഴുതുക. വായനക്കാരന് പശ്ചാത്തലം ലഭിക്കുന്ന രീതിയിൽ ആശയം ക്രമീകരിക്കുക.

## പ്രധാന ആശയങ്ങൾ

* ആദ്യ ആശയം വ്യക്തമായി അവതരിപ്പിക്കുക.
* രണ്ടാമത്തെ ആശയം ഉദാഹരണത്തോടൊപ്പം വിശദീകരിക്കുക.
* അവസാന ഭാഗത്തേക്ക് കൊണ്ടുപോകുന്ന ബന്ധം ചേർക്കുക.

<!-- pagebreak -->

## സമാപനം

പ്രധാന ചിന്തകൾ ചുരുക്കി, വ്യക്തമായൊരു അവസാന വാചകത്തോടെ പ്രബന്ധം പൂർത്തിയാക്കുക.`
        },
        report: {
            theme: 'prose-dense_blue',
            fontFactor: '0.95',
            lineHeight: '1.45',
            printMargin: '12mm',
            textAlign: 'left',
            fontFamily: "'Inter', sans-serif",
            metaTitle: 'Project Report',
            markdown: `# Project Report

## Summary

Write the core result, current status, and decision needed.

## Findings

| Area | Status | Notes |
| --- | --- | --- |
| Scope | On track | Add details |
| Risk | Medium | Add mitigation |

## Next Actions

1. Confirm owner.
2. Set timeline.
3. Review progress.`
        },
        poem: {
            theme: 'prose-dense_lora',
            fontFactor: '1.15',
            lineHeight: '1.8',
            printMargin: '20mm',
            textAlign: 'center',
            fontFamily: "'Noto Serif Malayalam', serif",
            metaTitle: 'കവിത',
            markdown: `# കവിത

മഴയുടെ സ്വരം കേട്ട്

വാക്കുകൾ പതുക്കെ തുറക്കുന്നു

നിശബ്ദതയുടെ ഇടയിൽ

ഒരു ചെറിയ വെളിച്ചം നിൽക്കുന്നു`
        },
        flyer: {
            theme: 'prose-dense_sunset',
            fontFactor: '1.1',
            lineHeight: '1.45',
            printMargin: '12mm',
            textAlign: 'left',
            fontFamily: "'Noto Sans Malayalam', sans-serif",
            metaTitle: 'Product Flyer',
            markdown: `# Product Name

## Fresh. Simple. Ready.

Short product promise goes here.

### Highlights

* Key benefit one
* Key benefit two
* Key benefit three

> Add a short customer-facing quote or offer.

## Contact

Phone: 00000 00000`
        },
        letter: {
            theme: 'prose-dense_minimal',
            fontFactor: '1.0',
            lineHeight: '1.6',
            printMargin: '20mm',
            textAlign: 'left',
            fontFamily: "'Noto Sans Malayalam', sans-serif",
            metaTitle: 'Formal Letter',
            markdown: `# Formal Letter

Date: YYYY-MM-DD

To,

Recipient Name

## Subject

Write the subject clearly.

Dear Sir/Madam,

Write the body of the letter here with clear paragraphs.

Sincerely,

Your Name`
        }
    };

    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    const markdownInput = document.getElementById('markdown-input');
    const previewContent = document.getElementById('preview-content');
    const pagePreview = document.getElementById('page-preview');
    const previewLabel = document.getElementById('preview-label');
    const documentStats = document.getElementById('document-stats');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');
    const downloadMdBtn = document.getElementById('download-md-btn');
    const themeSelector = document.getElementById('theme-selector');
    const presetSelector = document.getElementById('doc-preset');
    const fontFactorSlider = document.getElementById('font-factor');
    const fontFactorDisplay = document.getElementById('font-factor-display');
    const lineHeightSlider = document.getElementById('line-height');
    const lineHeightDisplay = document.getElementById('line-height-display');
    const paperSizeSelector = document.getElementById('paper-size');
    const orientationSelector = document.getElementById('orientation');
    const printMarginSelector = document.getElementById('print-margin');
    const textAlignSelector = document.getElementById('text-align');
    const fontFamilySelector = document.getElementById('font-family');
    const metaTitleInput = document.getElementById('meta-title');
    const metaAuthorInput = document.getElementById('meta-author');
    const metaDateInput = document.getElementById('meta-date');
    const metaFooterInput = document.getElementById('meta-footer');
    const showPageNumbersInput = document.getElementById('show-page-numbers');
    const insertPageBreakBtn = document.getElementById('insert-page-break-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const offlineStatus = document.getElementById('offline-status');
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedControls = document.getElementById('advanced-controls');
    const advancedToggleIcon = document.getElementById('advanced-toggle-icon');
    const printPageStyle = document.createElement('style');

    printPageStyle.id = 'print-page-style';
    document.head.appendChild(printPageStyle);

    const settingsControls = [
        themeSelector,
        presetSelector,
        fontFactorSlider,
        lineHeightSlider,
        paperSizeSelector,
        orientationSelector,
        printMarginSelector,
        textAlignSelector,
        fontFamilySelector,
        metaTitleInput,
        metaAuthorInput,
        metaDateInput,
        metaFooterInput,
        showPageNumbersInput
    ].filter(Boolean);

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const loadState = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (error) {
            return {};
        }
    };

    const getMetadata = () => ({
        title: metaTitleInput.value.trim(),
        author: metaAuthorInput.value.trim(),
        date: metaDateInput.value,
        footer: metaFooterInput.value.trim(),
        showPageNumbers: showPageNumbersInput.checked
    });

    const getState = () => ({
        markdown: markdownInput.value,
        theme: themeSelector.value,
        preset: presetSelector.value,
        fontFactor: fontFactorSlider.value,
        lineHeight: lineHeightSlider.value,
        paperSize: paperSizeSelector.value,
        orientation: orientationSelector.value,
        printMargin: printMarginSelector.value,
        textAlign: textAlignSelector.value,
        fontFamily: fontFamilySelector.value,
        metaTitle: metaTitleInput.value,
        metaAuthor: metaAuthorInput.value,
        metaDate: metaDateInput.value,
        metaFooter: metaFooterInput.value,
        showPageNumbers: showPageNumbersInput.checked
    });

    const saveState = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
        } catch (error) {
            // Private browsing or strict local-file settings can block storage.
        }
    };

    const applyTheme = (themeClass) => {
        Array.from(previewContent.classList).forEach((className) => {
            if (className.startsWith('prose-dense_')) {
                previewContent.classList.remove(className);
            }
        });
        previewContent.classList.add(themeClass || DEFAULT_SETTINGS.theme);
    };

    const updatePagePreview = () => {
        const paperSize = paperSizeSelector.value;
        const orientation = orientationSelector.value;
        const dimensions = PAGE_DIMENSIONS[paperSize][orientation];

        pagePreview.style.maxWidth = dimensions.width;
        pagePreview.style.minHeight = dimensions.minHeight;
        previewLabel.textContent = dimensions.label;
        document.documentElement.style.setProperty('--print-page-size', `${paperSize} ${orientation}`);
        document.documentElement.style.setProperty('--print-margin', printMarginSelector.value);
        printPageStyle.textContent = `@media print { @page { size: ${paperSize} ${orientation}; margin: ${printMarginSelector.value}; } }`;
    };

    const applyDocumentControls = () => {
        applyTheme(themeSelector.value);

        const fontFactor = fontFactorSlider.value;
        fontFactorDisplay.textContent = `${Number(fontFactor).toFixed(2)}x`;
        previewContent.style.setProperty('--font-factor', fontFactor);

        const lineHeight = lineHeightSlider.value;
        lineHeightDisplay.textContent = Number(lineHeight).toFixed(2);
        previewContent.style.setProperty('--line-height-override', lineHeight);
        previewContent.classList.add('has-line-height-override');

        previewContent.style.textAlign = textAlignSelector.value;

        if (fontFamilySelector.value) {
            previewContent.style.fontFamily = fontFamilySelector.value;
        } else {
            previewContent.style.removeProperty('font-family');
        }

        updatePagePreview();
    };

    const buildMetadataHtml = () => {
        const metadata = getMetadata();
        const details = [
            metadata.author ? `<span>${escapeHtml(metadata.author)}</span>` : '',
            metadata.date ? `<span>${escapeHtml(metadata.date)}</span>` : ''
        ].filter(Boolean).join('<span class="meta-separator">/</span>');

        if (!metadata.title && !details) return '';

        return `<section class="document-meta">
            ${metadata.title ? `<h1>${escapeHtml(metadata.title)}</h1>` : ''}
            ${details ? `<div class="document-meta-details">${details}</div>` : ''}
        </section>`;
    };

    const buildFooterHtml = () => {
        const metadata = getMetadata();
        if (!metadata.footer && !metadata.showPageNumbers) return '';

        return `<div class="print-footer ${metadata.showPageNumbers ? 'show-page-counter' : ''}">
            <span>${escapeHtml(metadata.footer)}</span>
            ${metadata.showPageNumbers ? '<span class="page-counter">Page</span>' : ''}
        </div>`;
    };

    const preprocessMarkdown = (source) => source.replace(
        /^[ \t]*<!--\s*pagebreak\s*-->[ \t]*$/gim,
        '<div class="page-break"></div>'
    );

    const updateStats = () => {
        const plainText = markdownInput.value
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[#*_>\-[\]()|]/g, ' ');
        const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
        const chars = markdownInput.value.length;
        const pageHeight = Math.max(pagePreview.clientHeight, 1);
        const pages = Math.max(1, Math.ceil(pagePreview.scrollHeight / pageHeight));

        documentStats.textContent = `${words} words / ${chars} chars / ${pages} page${pages === 1 ? '' : 's'}`;
    };

    const renderMarkdown = () => {
        const htmlContext = md.render(preprocessMarkdown(markdownInput.value));
        previewContent.innerHTML = `${buildMetadataHtml()}${htmlContext}${buildFooterHtml()}`;
        requestAnimationFrame(updateStats);
    };

    const applySettings = (settings = {}) => {
        const next = { ...DEFAULT_SETTINGS, ...settings };

        themeSelector.value = next.theme;
        presetSelector.value = next.preset;
        fontFactorSlider.value = next.fontFactor;
        lineHeightSlider.value = next.lineHeight;
        paperSizeSelector.value = next.paperSize;
        orientationSelector.value = next.orientation;
        printMarginSelector.value = next.printMargin;
        textAlignSelector.value = next.textAlign;
        fontFamilySelector.value = next.fontFamily;
        metaTitleInput.value = next.metaTitle;
        metaAuthorInput.value = next.metaAuthor;
        metaDateInput.value = next.metaDate;
        metaFooterInput.value = next.metaFooter;
        showPageNumbersInput.checked = Boolean(next.showPageNumbers);

        applyDocumentControls();
    };

    const restoreState = () => {
        const savedState = loadState();

        markdownInput.value = typeof savedState.markdown === 'string' ? savedState.markdown : DEFAULT_MARKDOWN;
        applySettings(savedState);
        renderMarkdown();
    };

    const downloadMarkdown = () => {
        const blob = new Blob([markdownInput.value], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        const now = new Date();
        const stamp = now.toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);

        link.href = url;
        link.download = `document-${stamp}.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const insertAtCursor = (text) => {
        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;
        const before = markdownInput.value.slice(0, start);
        const after = markdownInput.value.slice(end);

        markdownInput.value = `${before}${text}${after}`;
        markdownInput.focus();
        markdownInput.selectionStart = start + text.length;
        markdownInput.selectionEnd = start + text.length;
    };

    const applyPreset = (presetName) => {
        if (!presetName || !PRESETS[presetName]) return;

        const preset = PRESETS[presetName];
        markdownInput.value = preset.markdown;
        applySettings({ ...preset, preset: presetName });
        renderMarkdown();
        saveState();
    };

    const resetSettings = () => {
        applySettings(DEFAULT_SETTINGS);
        renderMarkdown();
        saveState();
    };

    const updateOfflineStatus = (message) => {
        if (offlineStatus) {
            offlineStatus.textContent = message;
        }
    };

    const registerServiceWorker = async () => {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
            updateOfflineStatus('Offline cache: use a local server');
            return;
        }

        try {
            await navigator.serviceWorker.register('sw.js');
            updateOfflineStatus(navigator.onLine ? 'Offline cache: ready after first load' : 'Offline cache: active');
        } catch (error) {
            updateOfflineStatus('Offline cache: unavailable');
        }
    };

    const setAdvancedOpen = (isOpen) => {
        advancedToggle.setAttribute('aria-expanded', String(isOpen));
        advancedControls.classList.toggle('hidden', !isOpen);
        advancedToggleIcon.classList.toggle('rotate-180', isOpen);
    };

    markdownInput.addEventListener('input', () => {
        presetSelector.value = '';
        renderMarkdown();
        saveState();
    });

    settingsControls.forEach((control) => {
        control.addEventListener('input', () => {
            if (control !== presetSelector) {
                presetSelector.value = '';
            }
            applyDocumentControls();
            renderMarkdown();
            saveState();
        });
        control.addEventListener('change', () => {
            if (control === presetSelector) {
                applyPreset(presetSelector.value);
                return;
            }
            presetSelector.value = '';
            applyDocumentControls();
            renderMarkdown();
            saveState();
        });
    });

    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const [file] = fileInput.files;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            markdownInput.value = reader.result;
            presetSelector.value = '';
            renderMarkdown();
            saveState();
            fileInput.value = '';
        };
        reader.readAsText(file);
    });

    insertPageBreakBtn.addEventListener('click', () => {
        insertAtCursor('\n\n<!-- pagebreak -->\n\n');
        presetSelector.value = '';
        renderMarkdown();
        saveState();
    });

    resetSettingsBtn.addEventListener('click', resetSettings);

    sampleBtn.addEventListener('click', () => {
        markdownInput.value = DEFAULT_MARKDOWN;
        applySettings(DEFAULT_SETTINGS);
        renderMarkdown();
        saveState();
    });

    clearBtn.addEventListener('click', () => {
        markdownInput.value = '';
        presetSelector.value = '';
        renderMarkdown();
        saveState();
    });

    downloadMdBtn.addEventListener('click', downloadMarkdown);

    exportBtn.addEventListener('click', () => {
        applyDocumentControls();
        saveState();
        window.print();
    });

    advancedToggle.addEventListener('click', () => {
        const isOpen = advancedToggle.getAttribute('aria-expanded') === 'true';
        setAdvancedOpen(!isOpen);
    });

    window.addEventListener('online', () => updateOfflineStatus('Offline cache: ready after first load'));
    window.addEventListener('offline', () => updateOfflineStatus('Offline cache: active'));
    window.addEventListener('resize', () => requestAnimationFrame(updateStats));

    restoreState();
    setAdvancedOpen(false);
    registerServiceWorker();
});
