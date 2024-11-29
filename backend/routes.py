# routes.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import Client
import json
import os
import re

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for the entire app
CORS(app)

# Initialize OpenAI Client with your API Key
client = Client(api_key='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')

@app.route('/api/parse-brd', methods=['POST'])
def parse_brd():
    """
    Endpoint to parse BRD content and return structured JSON using OpenAI's API with the new Client method.
    """
    try:
        # Get BRD content from the request
        brd_content = request.json.get('brd_content', '').strip()
        if not brd_content:
            return jsonify({"error": "No content provided"}), 400

        # Construct the prompt
        prompt = (
            "You are an expert in analyzing Business Requirement Documents (BRDs) and translating them into structured JSON output for UI wireframes. "
            "Your goal is to create a JSON representation of screens and their components suitable for generating dynamic wireframes. "
            "Follow these guidelines:\n\n"
            "1. Ensure the response is valid JSON without any extra explanations, comments, or extraneous text.\n"
            "2. For each screen and its components, include the following:\n"
            "   - 'componentType': A descriptive type for each component (e.g., 'button', 'text', 'image', 'card', 'navigation bar', 'hero section').\n"
            "   - 'name': A unique, descriptive name for the component.\n"
            "   - 'styles': A dictionary that includes width, height, colors, font sizes, alignment, and other style attributes.\n"
            "   - 'interactions': A list of possible interactions (e.g., 'hover', 'click', 'expandable', 'draggable').\n"
            "   - 'position': Specific positioning instructions (e.g., 'top-left', 'center', 'bottom-right') to describe how the component should be visually placed.\n"
            "   - 'uniqueIdentifier': A unique identifier for each component.\n\n"
            "3. Provide layout instructions for each screen:\n"
            "   - Specify how components should be arranged visually.\n"
            "   - Clearly mention any container relationships between components (e.g., sections containing buttons, forms, etc.).\n\n"
            f"Analyze the following BRD content and convert it into a detailed structured JSON with complete information about component types, names, styles, interactions, positioning, and layout:\n\n{brd_content}"
        )

        # OpenAI API call using the new Client method
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {'role': 'user', 'content': prompt}
            ],
            temperature=0
        )

        # Access the response content
        response_content = response.choices[0].message.content.strip()

        # Validate JSON
        try:
            structured_json = json.loads(response_content)
        except json.JSONDecodeError:
            return jsonify({"error": "OpenAI response is not valid JSON"}), 500

        # Return the structured JSON
        return jsonify({"parsed_data": structured_json})

    except Exception as e:
        print("Error during OpenAI API call:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-wireframes', methods=['POST'])
def generate_wireframes():
    data = request.get_json()
    parsed_data = data.get('parsed_data')

    if not parsed_data:
        return jsonify({'error': 'Parsed data is required.'}), 400

    try:
        wireframe_data = []
        for screen in parsed_data['screens']:
            prompt = f"""
            You are a professional UI/UX designer. Based on the following screen components, create a detailed wireframe description suitable for rendering with Konva.js.

            Screen Name: {screen['name']}
            Components:
            {''.join(f"- {component}\n" for component in screen['components'])}

            For each component, provide:
            - componentType (e.g., header, button, image, text)
            - content (e.g., text content, image URLs)
            - position: {{"x": value, "y": value}} in pixels (provide reasonable coordinates to layout the components without overlap)
            - size: {{"width": value, "height": value}} in pixels (provide appropriate sizes for each component)
            - styles: {{"color": "#hexcode", "backgroundColor": "#hexcode", "fontSize": value, "fontFamily": "font name", "fontWeight": "normal/bold", "borderColor": "#hexcode", "borderWidth": value}}
            - interactions: ["List of interactions"]

            When specifying images, use the following placeholder URL if none is provided: "https://via.placeholder.com/150"

            **Important Instructions:**
            - **Provide only the JSON object. Do not include any introductory text or explanations.**
            - **Ensure that the JSON is properly formatted and can be parsed programmatically.**
            - **Do not include any comments or code snippets.**

            Format the wireframe description as a structured JSON object like the following example:

            {{
              "screenName": "{screen['name']}",
              "components": [
                {{
                  "componentType": "Header",
                  "content": "{screen['name']}",
                  "position": {{"x": 0, "y": 0}},
                  "size": {{"width": 800, "height": 60}},
                  "styles": {{"backgroundColor": "#f0f0f0", "fontSize": 24, "fontWeight": "bold", "color": "#333333"}},
                  "interactions": []
                }},
                // Add more components as needed
              ]
            }}
            """

            response = client.chat.completions.create(
                messages=[{'role': 'user', 'content': prompt}],
                model="gpt-4",
                temperature=0
            )

            # Access the response content
            response_content = response.choices[0].message.content.strip()

            # Extract JSON from the response content
            import json
            import re

            # Use regex to extract the JSON object from the response
            json_match = re.search(r'(\{.*\})', response_content, re.DOTALL)
            if json_match:
                wireframe_description = json_match.group(1)
                # Optionally validate the JSON
                try:
                    json.loads(wireframe_description)
                except json.JSONDecodeError as e:
                    print(f"JSON decoding error: {e}")
                    wireframe_description = ''
            else:
                print("No JSON object found in the response.")
                wireframe_description = ''

            wireframe_data.append({
                'screenName': screen['name'],
                'wireframeDescription': wireframe_description
            })

        return jsonify({'wireframes': wireframe_data})

    except Exception as e:
        print(f"Error generating wireframes: {e}")
        return jsonify({'error': 'Failed to generate wireframes.', 'details': str(e)}), 500


@app.route('/api/generate-code', methods=['POST'])
def generate_code():
    data = request.get_json()
    wireframe_data = data.get('wireframe_data')

    if not wireframe_data:
        return jsonify({'error': 'Wireframe data is required.'}), 400

    try:
        generated_code = []
        for wireframe in wireframe_data:
            prompt = f"""
            You are a skilled frontend developer. Using the following wireframe description, generate clean and responsive HTML and CSS code. Use best practices and include comments where necessary.
            
            Wireframe Description:
            {wireframe['wireframeDescription']}
            
            Requirements:
            - Provide a complete HTML document with embedded CSS within `<style>` tags in the `<head>` section.
            - Use semantic HTML5 elements.
            - Make the design responsive using CSS Flexbox or Grid.
            - Include all specified components with their styles and interactions.
            - Avoid using external CSS files or links.
            
            Provide the complete code without any additional explanations or Markdown formatting.
            """

            response = client.chat.completions.create(
                messages=[{'role': 'user', 'content': prompt}],
                model="gpt-4",
                temperature=0
            )

            code_content = response.choices[0].message.content.strip()
            # Extract code between <code> tags
            code_match = re.search(r'<code>([\s\S]*?)<\/code>', code_content)
            code = code_match.group(1).strip() if code_match else code_content

            generated_code.append({
                'screenName': wireframe['screenName'],
                'code': code
            })

        return jsonify({'generated_code': generated_code})

    except Exception as e:
        print(f"Error generating code: {e}")
        return jsonify({'error': 'Failed to generate code.', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000,debug=True)

