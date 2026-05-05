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
        let markdownSource = markdownInput.value;

        // General fallback for standalone equations (often on their own lines)
        let lines = markdownSource.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            // Skip lines that are lists, headers, quotes or already contain backticks/dollars
            if (/^([#*\->+]|\d+\.)\s/.test(line) || line.length === 0 || line.includes('$') || line.includes('`')) continue;

            // Check if it's a standalone math equation
            // (typically contains an equals sign '=' AND contains a slash '\', underscore '_', or caret '^')
            const hasMathNotation = line.includes('\\') || line.includes('_') || line.includes('^');
            const hasEquals = line.includes('=');
            
            // If it has math traits and is relatively short (not a huge paragraph of text), wrap it block math
            if (hasEquals && hasMathNotation && line.length < 100) {
                lines[i] = '$$ ' + line + ' $$';
            }
        }
        markdownSource = lines.join('\n');

        // Inline-wrap standalone powers/scientific notation if not wrapped yet (e.g. 10^-3, 10^{3}, 1.6 x 10^-19)
        markdownSource = markdownSource.replace(/(?<![\$\`])\b(\d+(\.\d+)?\s*(x|×|\*)\s*)?10\^[{]?[-+]?\d+[}]?(?![\$\`])/g, "$$$&$$");

        // Convert \( ... \) and \[ ... \] to $ ... $ and $$ ... $$ 
        markdownSource = markdownSource.replace(/\\\((.*?)\\\)/gs, "$$$1$");
        markdownSource = markdownSource.replace(/\\\[(.*?)\\\]/gs, "$$$$ \n$1\n $$$$");

        const htmlContext = md.render(markdownSource);
        previewContent.innerHTML = htmlContext;
        
        // Render math with MathJax
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([previewContent]).catch((err) => console.log('MathJax error:', err));
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
