document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'mdtopdfmal.state.v2';
    const DEFAULT_MARKDOWN = `# മലയാളം Title 

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

---

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

    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    const markdownInput = document.getElementById('markdown-input');
    const previewContent = document.getElementById('preview-content');
    const pagePreview = document.getElementById('page-preview');
    const previewLabel = document.getElementById('preview-label');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input');
    const downloadMdBtn = document.getElementById('download-md-btn');
    const themeSelector = document.getElementById('theme-selector');
    const fontFactorSlider = document.getElementById('font-factor');
    const fontFactorDisplay = document.getElementById('font-factor-display');
    const lineHeightSlider = document.getElementById('line-height');
    const lineHeightDisplay = document.getElementById('line-height-display');
    const paperSizeSelector = document.getElementById('paper-size');
    const orientationSelector = document.getElementById('orientation');
    const printMarginSelector = document.getElementById('print-margin');
    const textAlignSelector = document.getElementById('text-align');
    const fontFamilySelector = document.getElementById('font-family');
    const printPageStyle = document.createElement('style');

    printPageStyle.id = 'print-page-style';
    document.head.appendChild(printPageStyle);

    const controls = [
        themeSelector,
        fontFactorSlider,
        lineHeightSlider,
        paperSizeSelector,
        orientationSelector,
        printMarginSelector,
        textAlignSelector,
        fontFamilySelector
    ].filter(Boolean);

    const loadState = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (error) {
            return {};
        }
    };

    const getState = () => ({
        markdown: markdownInput.value,
        theme: themeSelector.value,
        fontFactor: fontFactorSlider.value,
        lineHeight: lineHeightSlider.value,
        paperSize: paperSizeSelector.value,
        orientation: orientationSelector.value,
        printMargin: printMarginSelector.value,
        textAlign: textAlignSelector.value,
        fontFamily: fontFamilySelector.value
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
        previewContent.classList.add(themeClass);
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

    const renderMarkdown = () => {
        const markdownSource = markdownInput.value;
        const htmlContext = md.render(markdownSource);
        previewContent.innerHTML = htmlContext;
    };

    const restoreState = () => {
        const savedState = loadState();

        markdownInput.value = typeof savedState.markdown === 'string' ? savedState.markdown : DEFAULT_MARKDOWN;
        themeSelector.value = savedState.theme || themeSelector.value;
        fontFactorSlider.value = savedState.fontFactor || fontFactorSlider.value;
        lineHeightSlider.value = savedState.lineHeight || lineHeightSlider.value;
        paperSizeSelector.value = savedState.paperSize || paperSizeSelector.value;
        orientationSelector.value = savedState.orientation || orientationSelector.value;
        printMarginSelector.value = savedState.printMargin || printMarginSelector.value;
        textAlignSelector.value = savedState.textAlign || textAlignSelector.value;
        fontFamilySelector.value = savedState.fontFamily || fontFamilySelector.value;

        applyDocumentControls();
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

    markdownInput.addEventListener('input', () => {
        renderMarkdown();
        saveState();
    });

    controls.forEach((control) => {
        control.addEventListener('input', () => {
            applyDocumentControls();
            saveState();
        });
        control.addEventListener('change', () => {
            applyDocumentControls();
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
            renderMarkdown();
            saveState();
            fileInput.value = '';
        };
        reader.readAsText(file);
    });

    downloadMdBtn.addEventListener('click', downloadMarkdown);

    exportBtn.addEventListener('click', () => {
        applyDocumentControls();
        saveState();
        window.print();
    });

    restoreState();
});
