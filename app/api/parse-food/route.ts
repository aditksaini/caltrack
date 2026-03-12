import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'Input string is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in the environment.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `
      You are a specialized nutritionist and calorie estimation assistant. The user will provide a natural language description of food they ate.
      Your job is to identify each food item, its quantity, and estimate the total calories, protein, carbs, and fat for that quantity.
      Also provide a very brief summary of key vitamins/minerals.
      Be especially knowledgeable about Indian foods (e.g., paneer, dosa, chaat, chai, roti, dal) and their typical serving sizes.
      For generic items (e.g., "1 plate biryani" or "3 paneer pieces") make a reasonable estimate based on standard restaurant/home serving sizes.

      User Input: "${input}"

      Return your answer strictly as a JSON object matching this structure exactly:
      {
        "reasoning": "A 1-2 sentence explanation of how you estimated the sizes/calories (e.g., 'Assuming standard restaurant sizes for the Paneer. 1 small Chai is typically 50 kcal.').",
        "items": [
          {
            "name": "Name of the food item (e.g., Samosa)",
            "quantity_description": "The quantity the user specified or your interpretation (e.g., 2 pieces)",
            "calories": 400, // integer
            "protein": 12, // integer (grams)
            "carbs": 45, // integer (grams)
            "fat": 20, // integer (grams),
            "nutritional_breakdown": {
              "Fiber": "3g",
              "Sugar": "12g",
              "Sodium": "400mg",
              "Potassium": "300mg",
              "Vitamin A": "10% DV",
              "Vitamin C": "25% DV",
              "Calcium": "5% DV",
              "Iron": "15% DV"
            } // Include at least 6-8 relevant micronutrients, vitamins, or detailed macros like fiber/sugar.
          }
        ]
      }
      
      Do not include any other text, markdown blocks, or explanation. Just the raw JSON object.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';

    // Attempt to extract the JSON object if the model accidentally included markdown
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsedData = { reasoning: "", items: [] };

    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", text);
        throw new Error("Invalid format returned from AI.");
      }
    } else {
      // Fallback to trying to parse the whole string
      try {
        parsedData = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse Gemini JSON (no match):", text);
        throw new Error("Invalid format returned from AI.");
      }
    }

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error parsing food with Gemini:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to parse food input.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
