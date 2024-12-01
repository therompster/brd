// scripts.js
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Mermaid when the DOM is fully loaded
    mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    flowchart: {
        useMaxWidth: true,
        diagramPadding: 20,
        width: 1500, // Adjust width to make the diagram fit better.
        height: 600, // Increase the height to make it more legible.
        nodeSpacing: 120, // Increase node spacing for clarity.
        rankSpacing: 150, // Increase rank spacing for readability.
    }
    });
   // mermaid.initialize({
   //     startOnLoad: false,
    //    securityLevel: 'loose',
     //   flowchart: {
      //      useMaxWidth: true,
       //     nodeSpacing: 100,
       //     rankSpacing: 100
       // },    
      //  theme: 'default',
    //});       

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
                const response = await fetch("http://172.18.4.229:5000/api/parse-brd", {
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
		    //console.log(parsedData);
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
	    if (typeof label !== 'string') {
	        // If label is not a string, convert it to a string
	        label = String(label);
	    }
	
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
                const label = typeof item === "object" ? `${key} ${index + 1}` : sanitizeLabel(String(item)); // Ensure label is sanitized
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
	    console.log(parsedData);

            try {
                const response = await fetch("http://172.18.4.229:5000/api/generate-wireframes", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ parsed_data: parsedData })
                });

                const result = await response.json();

                if (response.ok) {
                    // Display wireframes
                    document.getElementById('wireframes-heading').style.display = 'block';
                    window.wireframeData = result.wireframes; // Store for later use

                    // Render wireframes using Konva.js
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

    // Function to render wireframes using Konva.js
    function renderWireframes(wireframes) {
        const wireframesContainer = document.getElementById('wireframes-container');
        wireframesContainer.innerHTML = '';

        wireframes.forEach((wireframe, index) => {
            const wireframeDiv = document.createElement('div');
            wireframeDiv.classList.add('wireframe');

            const title = document.createElement('h3');
            title.textContent = `Wireframe for: ${wireframe.screenName}`;
            wireframeDiv.appendChild(title);

            // Create a container for the canvas
            const canvasContainer = document.createElement('div');
            canvasContainer.id = `canvas-container-${index}`;
            canvasContainer.style.width = '800px';
            canvasContainer.style.height = '600px';
            canvasContainer.style.border = '1px solid #ccc';
            wireframeDiv.appendChild(canvasContainer);

            wireframesContainer.appendChild(wireframeDiv);

            // Initialize Konva Stage
            const stage = new Konva.Stage({
                container: canvasContainer.id,
                width: 800,
                height: 600,
            });

            const layer = new Konva.Layer();
            stage.add(layer);
            try {
                if (!wireframe.wireframeDescription) {
                    console.error('Wireframe description is empty or null');
                    throw new Error('Wireframe description is empty or null');
                }
            
                console.log('Parsing wireframe description:', wireframe.wireframeDescription);
            
                const wireframeData = JSON.parse(wireframe.wireframeDescription);
                if (!wireframeData.components || !Array.isArray(wireframeData.components)) {
                    console.error('Components property is missing or not an array');
                    throw new Error('Components property is missing or not an array');
                }
            
                const components = wireframeData.components;
            
                components.forEach((component) => {
                    renderComponent(component, layer);
                });
            
            } catch (e) {
                console.error('Error parsing wireframe JSON:', e);
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'Error rendering wireframe: ' + e.message;
                wireframeDiv.appendChild(errorMsg);
            }
        });
    }

// Function to render individual components using Konva.js
function renderComponent(component, layer) {
    let konvaElement;

    // Default styles with enhancements for better UI simulation
    const defaultStyles = {
        fill: component.styles?.backgroundColor || '#f0f0f0',
        stroke: component.styles?.borderColor || '#333',
        strokeWidth: component.styles?.borderWidth || 1,
        shadowBlur: 10,
        shadowOffset: { x: 4, y: 4 },
        shadowOpacity: 0.2,
    };

    // Determine position and size
    const position = {
        x: component.position?.x || 20,
        y: component.position?.y || 20,
    };

    const size = {
        width: parseInt(component.size?.width) || 200,
        height: parseInt(component.size?.height) || 60,
    };

    switch (component.componentType.toLowerCase()) {
        case 'text':
            konvaElement = new Konva.Text({
                x: position.x,
                y: position.y,
                text: component.content || 'Sample Text',
                fontSize: component.styles?.fontSize || 18,
                fontFamily: component.styles?.fontFamily || 'Roboto',
                fill: component.styles?.color || '#333',
            });
            break;

        case 'image':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 10,
                ...defaultStyles,
            });

            // Load image or placeholder
            const imageUrl = component.content && isValidURL(component.content) ? component.content : 'https://via.placeholder.com/150';
            const imageObj = new Image();
            imageObj.onload = function () {
                konvaElement.fillPatternImage(imageObj);
                konvaElement.fillPatternScale({
                    x: size.width / imageObj.width,
                    y: size.height / imageObj.height,
                });
                layer.draw();
            };
            imageObj.src = imageUrl;
            break;

        case 'button':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 10,
                fill: component.styles?.backgroundColor || '#007bff',
                stroke: component.styles?.borderColor || '#0056b3',
                strokeWidth: component.styles?.borderWidth || 2,
                shadowBlur: 5,
                shadowOpacity: 0.2,
            });

            const buttonText = new Konva.Text({
                x: position.x + size.width / 2,
                y: position.y + size.height / 2,
                text: component.content || 'Button',
                fontSize: component.styles?.fontSize || 16,
                fontFamily: component.styles?.fontFamily || 'Roboto',
                fill: component.styles?.color || '#fff',
            });
            buttonText.offsetX(buttonText.width() / 2);
            buttonText.offsetY(buttonText.height() / 2);

            layer.add(konvaElement, buttonText);
            return;

        case 'header':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 5,
                ...defaultStyles,
            });

            const headerText = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Header Text',
                fontSize: 20,
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                fill: '#333',
            });

            layer.add(konvaElement, headerText);
            return;

        case 'footer':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 5,
                ...defaultStyles,
            });

            const footerText = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Footer Text',
                fontSize: 16,
                fontFamily: 'Roboto',
                fill: '#333',
            });

            layer.add(konvaElement, footerText);
            return;

        case 'input':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: 40,
                cornerRadius: 5,
                ...defaultStyles,
            });

            const inputPlaceholder = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Input Field',
                fontSize: 14,
                fontFamily: 'Roboto',
                fill: '#999',
            });

            layer.add(konvaElement, inputPlaceholder);
            return;

        case 'hero-section':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 10,
                ...defaultStyles,
            });

            const heroText = new Konva.Text({
                x: position.x + 20,
                y: position.y + 20,
                text: component.content || 'Hero Section Title',
                fontSize: 24,
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                fill: '#007bff',
            });

            const subText = new Konva.Text({
                x: position.x + 20,
                y: position.y + 60,
                text: 'Hero Section Subtitle or Subheadline',
                fontSize: 16,
                fontFamily: 'Roboto',
                fill: '#555',
            });

            layer.add(konvaElement, heroText, subText);
            return;

        case 'navigation-menu':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 5,
                ...defaultStyles,
            });

            const navText = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Home | About | Services | Contact',
                fontSize: 14,
                fontFamily: 'Roboto',
                fill: '#333',
            });

            layer.add(konvaElement, navText);
            return;

        case 'form':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 8,
                ...defaultStyles,
            });

            const formText = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Form Title',
                fontSize: 18,
                fontFamily: 'Roboto',
                fill: '#333',
            });

            layer.add(konvaElement, formText);
            return;

        case 'card':
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 8,
                ...defaultStyles,
            });

            const cardTitle = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.content || 'Card Title',
                fontSize: 18,
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                fill: '#333',
            });

            const cardSubtitle = new Konva.Text({
                x: position.x + 10,
                y: position.y + 40,
                text: 'Subtitle or Description',
                fontSize: 14,
                fill: '#666',
            });

            layer.add(konvaElement, cardTitle, cardSubtitle);
            return;

        default:
            konvaElement = new Konva.Rect({
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                cornerRadius: 5,
                ...defaultStyles,
            });

            const defaultText = new Konva.Text({
                x: position.x + 10,
                y: position.y + 10,
                text: component.componentType || 'Unknown Component',
                fontSize: 14,
                fill: '#666',
            });

            layer.add(konvaElement, defaultText);
            return;
    }

    layer.add(konvaElement);
    layer.draw();
}
    // Helper function to validate URLs
    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Attach event listener for the "Generate Code" button
    const generateCodeBtn = document.getElementById('generate-code-btn');

    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', async function () {
            const wireframeData = window.wireframeData;

            try {
                const response = await fetch("http://172.18.4.229:5000/api/generate-code", {
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

