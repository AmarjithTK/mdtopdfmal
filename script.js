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

    // Sample Content Load
    markdownInput.value = `# മലയാളം Title 

ഇത് ഒരു സാമ്പിൾ വാചകമാണ്. (This is a sample text.)

* പോയിന്റ് 1
* പോയിന്റ് 2

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
            // Remove all themes
            previewContent.classList.remove('prose-dense_minimal', 'prose-dense_blue', 'prose-dense_classic');
            // Add new theme
            previewContent.classList.add(e.target.value);
        });
    }

    // Export PDF listener
    exportBtn.addEventListener('click', () => {
        window.print();
    });
});
