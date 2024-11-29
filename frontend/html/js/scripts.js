// scripts.js

document.addEventListener('DOMContentLoaded', function () {
    // Initialize Mermaid when the DOM is fully loaded
    mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        flowchart: {
            useMaxWidth: true,
            nodeSpacing: 100,
            rankSpacing: 100
        },
        theme: 'default',
    });

    // Attach event listener for the parse button only after DOM is loaded
    const parseButton = document.getElementById("parse-btn");

    if (parseButton) {
        parseButton.addEventListener("click", async function () {
            let brdContent = document.getElementById("brd-content").value;

            if (!brdContent) {
                alert("Please enter some content!");
                return;
            }

            const requestBody = { brd_content: brdContent };

            try {
                const response = await fetch("http://172.18.15.47:5000/api/parse-brd", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                const result = await response.json();

                if (response.ok) {
                    const parsedData = result.parsed_data;
                    document.getElementById("result").textContent = JSON.stringify(parsedData, null, 2);

                    // Generate Mermaid syntax
                    const layout = document.querySelector('input[name="layout"]:checked').value;
                    const mermaidSyntax = generateMermaidSyntax(parsedData, layout);
                    document.getElementById("mermaid-syntax").textContent = mermaidSyntax;

                    // Render the Mermaid diagram after ensuring the container is ready
                    renderMermaidDiagram(mermaidSyntax);

                    // Show the "Generate Wireframes" button
                    const generateWireframesBtn = document.getElementById('generate-wireframes-btn');
                    generateWireframesBtn.style.display = 'inline-block';

                    // Store parsedData for later use
                    window.parsedData = parsedData;
                } else {
                    document.getElementById("result").textContent = result.error || "Error processing request.";
                }
            } catch (error) {
                console.error("Fetch error:", error);
                document.getElementById("result").textContent = "Network error. Please try again.";
            }
        });
    }

    // Function to generate Mermaid syntax from parsed data
    function generateMermaidSyntax(parsedData, layout) {
        let mermaidDiagram = `graph ${layout};\n`;

        function sanitizeId(id) {
            return id.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
        }

        function sanitizeLabel(label) {
            const maxLength = 50; // Limit label length for readability
            let sanitizedLabel = label.replace(/["<>]/g, function (match) {
                return {
                    '"': '\\"',
                    '<': '&lt;',
                    '>': '&gt;'
                }[match];
            });
            sanitizedLabel = sanitizedLabel.replace(/\n/g, ' '); // Remove newlines
            return sanitizedLabel.length > maxLength ? sanitizedLabel.substring(0, maxLength) + '...' : sanitizedLabel;
        }

        function processNode(parentId, key, value) {
            const nodeId = sanitizeId(`${parentId}_${key}`);

            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    const arrayNodeId = sanitizeId(`${nodeId}_${index}`);
                    const label = typeof item === "object" ? `${key} ${index + 1}` : item;
                    mermaidDiagram += `${nodeId} --> ${arrayNodeId}["${sanitizeLabel(label)}"];\n`;

                    if (typeof item === "object") {
                        Object.entries(item).forEach(([subKey, subValue]) => {
                            processNode(arrayNodeId, subKey, subValue);
                        });
                    }
                });
            } else if (typeof value === "object" && value !== null) {
                mermaidDiagram += `${parentId} --> ${nodeId}["${sanitizeLabel(key)}"];\n`;
                Object.entries(value).forEach(([subKey, subValue]) => {
                    processNode(nodeId, subKey, subValue);
                });
            } else {
                mermaidDiagram += `${parentId} --> ${nodeId}["${sanitizeLabel(value)}"];\n`;
            }
        }

        // Root node
        const rootId = "root";
        mermaidDiagram += `${rootId}["BRD"];\n`;

        Object.entries(parsedData).forEach(([key, value]) => {
            const sectionId = sanitizeId(`section_${key}`);
            mermaidDiagram += `${rootId} --> ${sectionId}["${sanitizeLabel(key)}"];\n`;

            if (typeof value === "object" && value !== null) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    processNode(sectionId, subKey, subValue);
                });
            }
        });

        return mermaidDiagram;
    }

    // Function to render the Mermaid diagram
    function renderMermaidDiagram(mermaidSyntax) {
        const diagramContainer = document.getElementById("mermaid-diagram");

        if (diagramContainer) {
            // Clear any previous diagram
            diagramContainer.innerHTML = '';

            mermaid.render('generatedDiagram', mermaidSyntax)
                .then(({ svg, bindFunctions }) => {
                    diagramContainer.innerHTML = svg;

                    // If there are any event handlers to bind (for interactions)
                    if (bindFunctions) {
                        bindFunctions(diagramContainer);
                    }
                })
                .catch((error) => {
                    console.error('Mermaid render error:', error);
                    diagramContainer.innerHTML = '<p>Error rendering diagram</p>';
                });
        }
    }

    // Attach event listener for the "Generate Wireframes" button
    const generateWireframesBtn = document.getElementById('generate-wireframes-btn');

    if (generateWireframesBtn) {
        generateWireframesBtn.addEventListener('click', async function () {
            const parsedData = window.parsedData;

            try {
                const response = await fetch("http://172.18.15.47:5000/api/generate-wireframes", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parsed_data: parsedData })
                });

                const result = await response.json();

                if (response.ok) {
                    // Display wireframes
                    document.getElementById('wireframes-heading').style.display = 'block';
                    window.wireframeData = result.wireframes; // Store for later use

                    // Render wireframes visually
                    renderWireframes(result.wireframes);

                    // Show the "Generate Code" button
                    const generateCodeBtn = document.getElementById('generate-code-btn');
                    generateCodeBtn.style.display = 'inline-block';
                } else {
                    console.error(result.error);
                }
            } catch (error) {
                console.error('Error generating wireframes:', error);
            }
        });
    }

    // Function to render wireframes visually
    function renderWireframes(wireframes) {
        const wireframesContainer = document.getElementById('wireframes-container');
        wireframesContainer.innerHTML = '';

        wireframes.forEach(wireframe => {
            const wireframeDiv = document.createElement('div');
            wireframeDiv.classList.add('wireframe');
            wireframeDiv.style.border = '1px solid #ccc';
            wireframeDiv.style.padding = '10px';
            wireframeDiv.style.marginBottom = '20px';
            wireframeDiv.style.position = 'relative';
            wireframeDiv.style.width = '100%';
            wireframeDiv.style.height = '600px';

            const title = document.createElement('h3');
            title.textContent = `Wireframe for: ${wireframe.screenName}`;
            wireframeDiv.appendChild(title);

            try {
                const wireframeData = JSON.parse(wireframe.wireframeDescription);

                const components = wireframeData.components;

                components.forEach(component => {
                    const compDiv = document.createElement('div');
                    compDiv.style.position = 'absolute';

                    // Set position
                    if (component.position) {
                        // Assuming position is given as coordinates or percentages
                        if (typeof component.position === 'object') {
                            if (component.position.x) compDiv.style.left = component.position.x + 'px';
                            if (component.position.y) compDiv.style.top = component.position.y + 'px';
                        } else if (typeof component.position === 'string') {
                            switch (component.position.toLowerCase()) {
                                case 'top left':
                                    compDiv.style.top = '0';
                                    compDiv.style.left = '0';
                                    break;
                                case 'top center':
                                    compDiv.style.top = '0';
                                    compDiv.style.left = '50%';
                                    compDiv.style.transform = 'translateX(-50%)';
                                    break;
                                case 'top right':
                                    compDiv.style.top = '0';
                                    compDiv.style.right = '0';
                                    break;
                                case 'center':
                                    compDiv.style.top = '50%';
                                    compDiv.style.left = '50%';
                                    compDiv.style.transform = 'translate(-50%, -50%)';
                                    break;
                                // Add more cases as needed
                            }
                        }
                    }

                    // Set size
                    if (component.size) {
                        if (typeof component.size === 'object') {
                            if (component.size.width) compDiv.style.width = component.size.width;
                            if (component.size.height) compDiv.style.height = component.size.height;
                        } else if (typeof component.size === 'string') {
                            compDiv.style.width = component.size;
                        }
                    } else {
                        compDiv.style.width = 'auto';
                        compDiv.style.height = 'auto';
                    }

                    // Set styles
                    if (component.styles) {
                        Object.keys(component.styles).forEach(styleProp => {
                            compDiv.style[styleProp] = component.styles[styleProp];
                        });
                    }

                    // Set content based on component type
                    if (component.componentType.toLowerCase() === 'text') {
                        compDiv.textContent = component.content || '';
                    } else if (component.componentType.toLowerCase() === 'image') {
                        const img = document.createElement('img');
                        img.src = component.content || '';
                        img.style.width = '100%';
                        img.style.height = '100%';
                        compDiv.appendChild(img);
                    } else if (component.componentType.toLowerCase() === 'button') {
                        const btn = document.createElement('button');
                        btn.textContent = component.content || 'Button';
                        compDiv.appendChild(btn);
                    }
                    // Add other component types as needed

                    wireframeDiv.appendChild(compDiv);
                });

            } catch (e) {
                console.error('Error parsing wireframe JSON:', e);
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Error rendering wireframe.';
                wireframeDiv.appendChild(errorMsg);
            }

            wireframesContainer.appendChild(wireframeDiv);
        });
    }

    // Attach event listener for the "Generate Code" button
    const generateCodeBtn = document.getElementById('generate-code-btn');

    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', async function () {
            const wireframeData = window.wireframeData;

            try {
                const response = await fetch("http://172.18.15.47:5000/api/generate-code", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wireframe_data: wireframeData })
                });

                const result = await response.json();

                if (response.ok) {
                    // Display generated code
                    const codeContainer = document.getElementById('generated-code-container');
                    codeContainer.innerHTML = '';
                    document.getElementById('generated-code-heading').style.display = 'block';

                    result.generated_code.forEach(screen => {
                        const screenDiv = document.createElement('div');
                        screenDiv.classList.add('screen-section');

                        const title = document.createElement('h3');
                        title.textContent = `Code for: ${screen.screenName}`;
                        screenDiv.appendChild(title);

                        const codePre = document.createElement('pre');
                        codePre.textContent = screen.code;
                        screenDiv.appendChild(codePre);

                        // Render the code in an iframe
                        const iframe = document.createElement('iframe');
                        iframe.style.width = '100%';
                        iframe.style.height = '600px';
                        iframe.style.border = '1px solid #ccc';

                        // Ensure the code is a complete HTML document
                        let code = screen.code;

                        // Remove any Markdown code blocks or backticks
                        code = code.replace(/```html|```css|```/g, '');

                        // Create a Blob from the code
                        const blob = new Blob([code], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);

                        iframe.src = url;
                        screenDiv.appendChild(iframe);

                        codeContainer.appendChild(screenDiv);
                    });
                } else {
                    console.error(result.error);
                }
            } catch (error) {
                console.error('Error generating code:', error);
            }
        });
    }
});

