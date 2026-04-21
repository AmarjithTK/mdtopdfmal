document.addEventListener('DOMContentLoaded', () => {
    // Initialize MD Parser
    const md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true
    });

    const markdownInput = document.getElementById('markdown-input');
    const previewContent = document.getElementById('preview-content');
    const exportBtn = document.getElementById('export-btn');
    const themeSelector = document.getElementById('theme-selector');
    const fontFactorSlider = document.getElementById('font-factor');
    const fontFactorDisplay = document.getElementById('font-factor-display');

    // Sample Content Load
    markdownInput.value = `# മലയാളം Title 

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

---

> "ഇതൊരു ഉദ്ധരണിയാണ്." (This is a quote.)

## സബ് ഹെഡിംഗ്

ഈ ഭാഗം **ബോൾഡ്** ആണ്, ഇത് *ഇറ്റാലിക്സ്* ആണ്.`;

    // Render logic
    const renderMarkdown = () => {
        const markdownSource = markdownInput.value;
        const htmlContext = md.render(markdownSource);
        previewContent.innerHTML = htmlContext;
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

    // Export PDF listener
    exportBtn.addEventListener('click', () => {
        window.print();
    });
});
