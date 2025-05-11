let activeEditor = 'html';
let isDragging = false;
let editors = {};
let lastValidCode = {
    html: '',
    css: '',
    js: ''
};

// Initial boilerplate code
const htmlBoilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Document</title>
    <!-- Link to External CSS -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <main>
        <p>This is the main content area.</p>
    </main>
    <footer>
        <p>&copy; 2023 My Website</p>
    </footer>
    <!-- Link to External JavaScript -->
    <script src="script.js"></script>
</body>
</html>`;

const cssBoilerplate = `/* Reset default browser styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
/* General body styling */
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    background-color: #f4f4f4;
    color: #333;
    padding: 20px;
}
/* Header styling */
header {
    text-align: center;
    margin-bottom: 20px;
}
/* Main content styling */
main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
/* Footer styling */
footer {
    text-align: center;
    margin-top: 20px;
    font-size: 0.9em;
    color: #777;
}`;

const jsBoilerplate = `// DOM Content Loaded Event Listener
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");
    // Example: Change the text of the header
    const header = document.querySelector("header h1");
    if (header) {
        header.textContent = "Hello, World!";
    }
    // Example: Add a click event listener to the footer
    const footer = document.querySelector("footer p");
    if (footer) {
        footer.addEventListener("click", () => {
            alert("Footer clicked!");
        });
    }
});`;

// Initialize editors with enhanced features
function initEditors() {
    // Configure HTML editor
    editors.html = CodeMirror(document.getElementById('html-editor'), {
        mode: 'xml',
        theme: 'neat',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        matchTags: { bothTags: true },
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "'<'": completeAfter,
            "'/'": completeIfAfterLt,
            "' '": completeIfInTag,
            "'='": completeIfInTag,
            "Tab": "indentAuto",
            "Shift-Tab": "indentLess"
        },
        value: htmlBoilerplate,
        gutters: ["CodeMirror-lint-markers"],
        foldGutter: true
    });

    // Configure CSS editor
    editors.css = CodeMirror(document.getElementById('css-editor'), {
        mode: 'css',
        theme: 'neat',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Tab": "indentAuto",
            "Shift-Tab": "indentLess"
        },
        value: cssBoilerplate
    });

    // Configure JavaScript editor
    editors.js = CodeMirror(document.getElementById('js-editor'), {
        mode: 'javascript',
        theme: 'neat',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Tab": "indentAuto",
            "Shift-Tab": "indentLess"
        },
        value: jsBoilerplate
    });

    // Store initial valid code
    lastValidCode.html = htmlBoilerplate;
    lastValidCode.css = cssBoilerplate;
    lastValidCode.js = jsBoilerplate;

    // Add enhanced change listeners
    editors.html.on('change', debounce(validateAndPreview, 500));
    editors.css.on('change', debounce(validateAndPreview, 500));
    editors.js.on('change', debounce(validateAndPreview, 500));

    // Initial preview
    updatePreview();
}

function completeAfter(cm, pred) {
    const cursor = cm.getCursor();
    if (!pred || pred()) {
        setTimeout(() => {
            if (!cm.state.completionActive) {
                cm.showHint({ completeSingle: false });
            }
        }, 100);
    }
    return CodeMirror.Pass;
}

function completeIfAfterLt(cm) {
    return completeAfter(cm, () => {
        const cursor = cm.getCursor();
        return cm.getRange(CodeMirror.Pos(cursor.line, cursor.ch - 1), cursor) === "/";
    });
}

function completeIfInTag(cm) {
    return completeAfter(cm, () => {
        const tok = cm.getTokenAt(cm.getCursor());
        if (tok.type === "string" || tok.type === "attribute") return false;
        const inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
        return inner.tagName;
    });
}

function switchTab(tab) {
    document.querySelectorAll('.shadow__btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.editor').forEach(e => e.style.display = 'none');
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}-editor`).style.display = 'block';
    activeEditor = tab;
    editors[tab].refresh();
}

function validateAndPreview() {
    try {
        // Validate HTML
        const html = editors.html.getValue();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        // Check for parser errors
        if (doc.querySelector('parsererror')) {
            const errorElement = doc.querySelector('parsererror');
            const errorText = errorElement.textContent;
            let lineMatch = errorText.match(/line (\d+)/i);
            let line = lineMatch ? parseInt(lineMatch[1]) - 1 : editors.html.getCursor().line;
            throw new Error(`HTML Error: ${errorText.split('\n')[0]} at line ${line + 1}`);
        }

        // Validate CSS
        const css = editors.css.getValue();
        try {
            const style = new CSSStyleSheet();
            style.replaceSync(css);
        } catch (e) {
            const lineMatch = e.message.match(/line (\d+)/i);
            const line = lineMatch ? parseInt(lineMatch[1]) - 1 : editors.css.getCursor().line;
            throw new Error(`CSS Error: ${e.message.split(':')[0]} at line ${line + 1}`);
        }

        // Validate JavaScript
        const js = editors.js.getValue();
        try {
            // Create a function to validate syntax without executing
            new Function(js);
        } catch (e) {
            const stackLines = e.stack.split('\n');
            let line = 0;
            // Try to extract line number from stack trace
            for (const stackLine of stackLines) {
                const match = stackLine.match(/:(\d+):(\d+)/);
                if (match) {
                    line = parseInt(match[1]) - 1;
                    break;
                }
            }
            if (line === 0) {
                line = editors.js.getCursor().line;
            }
            throw new Error(`JS Error: ${e.message} at line ${line + 1}`);
        }

        // If all validations passed, update last valid code
        lastValidCode.html = html;
        lastValidCode.css = css;
        lastValidCode.js = js;
        updatePreview();
        showSuccess("Code is valid and running!");
    } catch (error) {
        showError(error.message);
        // Revert to last valid code if current is invalid
        updatePreview(true);
    }
}

function updatePreview(useLastValid = false) {
    const html = useLastValid ? lastValidCode.html : editors.html.getValue();
    const css = useLastValid ? lastValidCode.css : editors.css.getValue();
    const js = useLastValid ? lastValidCode.js : editors.js.getValue();
    const preview = document.getElementById('preview');
    const doc = preview.contentWindow.document;
    try {
        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : "Untitled";
        // Update the main header's title
        document.getElementById('pageTitle').textContent = title;
        // Extract favicon from HTML
        const parser = new DOMParser();
        const docParsed = parser.parseFromString(html, "text/html");
        const faviconLink = docParsed.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        const faviconHref = faviconLink ? faviconLink.getAttribute('href') : 'assets/favicon.png';
        document.getElementById('favicon').src = faviconHref;
        // Write updated iframe content
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <link rel="shortcut icon" href="${faviconHref}" type="image/x-icon">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>
                    try {
                        ${js}
                    } catch(e) {
                        console.error(e);
                    }
                <\/script>
            </body>
            </html>
        `);
        doc.close();
        // Set iframe title dynamically
        preview.contentDocument.title = title;
    } catch (error) {
        console.error("Preview error:", error);
    }
}

function showError(message) {
    const errorBar = document.getElementById('errorBar');
    errorBar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button class="close-btn" onclick="this.parentElement.parentElement.style.display = 'none'">×</button>
        </div>
    `;
    errorBar.style.display = 'block';
    // Hide success bar if showing
    document.getElementById('successBar').style.display = 'none';
}

function showSuccess(message) {
    const successBar = document.getElementById('successBar');
    successBar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>✓ ${message}</span>
            <button class="close-btn" onclick="this.parentElement.parentElement.style.display = 'none'">×</button>
        </div>
    `;
    successBar.style.display = 'block';
    // Auto-hide after 3 seconds
    setTimeout(() => {
        successBar.style.display = 'none';
    }, 3000);
    // Hide error bar if showing
    document.getElementById('errorBar').style.display = 'none';
}

function downloadProject() {
    const zip = new JSZip();
    // Create HTML file with external references
    zip.file("index.html", `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    ${lastValidCode.html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')}
    <script src="script.js"><\/script>
</body>
</html>`);
    zip.file("style.css", lastValidCode.css);
    zip.file("script.js", lastValidCode.js);
    zip.generateAsync({ type: "blob" }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "project.zip";
        link.click();
        showSuccess("Project downloaded successfully!");
    });
}

// Divider drag functionality
document.getElementById('divider').addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const container = document.querySelector('.main-container');
    const containerRect = container.getBoundingClientRect();
    const percentage = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    // Limit divider movement (10% - 90%)
    const limitedPercentage = Math.min(Math.max(percentage, 10), 90);
    container.style.gridTemplateColumns = `${limitedPercentage}% 5px ${100 - limitedPercentage - 5}%`;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Debounce function
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

// Enhanced autocomplete for all editors
CodeMirror.commands.autocomplete = function (cm) {
    const mode = cm.getMode().name;
    if (mode === 'xml') {
        CodeMirror.showHint(cm, CodeMirror.hint.html, {
            completeSingle: false,
            matchInMiddle: true,
            tags: {
                '!top': ['html', 'head', 'body'],
                'html': ['head', 'body'],
                'head': ['title', 'meta', 'link', 'style', 'script'],
                'body': ['div', 'h1', 'h2', 'h3', 'p', 'a', 'img', 'ul', 'ol', 'li', 'span', 'table', 'tr', 'td', 'form', 'input', 'button'],
                'div': ['@class', '@id', '@style'],
                'a': ['@href', '@target'],
                'img': ['@src', '@alt', '@width', '@height'],
                'input': ['@type', '@name', '@value', '@placeholder'],
                'button': ['@type', '@onclick']
            }
        });
    } else if (mode === 'css') {
        CodeMirror.showHint(cm, CodeMirror.hint.css, {
            completeSingle: false
        });
    } else if (mode === 'javascript') {
        CodeMirror.showHint(cm, CodeMirror.hint.javascript, {
            completeSingle: false,
            globalScope: {
                // Add common JavaScript globals
                console: null,
                document: null,
                window: null,
                setTimeout: null,
                setInterval: null,
                clearTimeout: null,
                clearInterval: null,
                Array: null,
                Object: null,
                String: null,
                Number: null,
                Date: null,
                Math: null,
                JSON: null
            }
        });
    }
};

// Initialize on load
window.onload = function () {
    initEditors();
    // Set up auto-indentation for all editors
    Object.values(editors).forEach(editor => {
        editor.setOption('extraKeys', {
            ...editor.getOption('extraKeys'),
            'Enter': (cm) => {
                // Auto-indent on Enter
                cm.execCommand('newlineAndIndent');
            }
        });
    });
};