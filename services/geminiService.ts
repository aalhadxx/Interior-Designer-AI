import { GoogleGenAI, Type } from "@google/genai";
import { DesignCategory, DesignAdvice } from "../types";

// Initialize Gemini Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip data:image/jpeg;base64, prefix if present for API calls
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

const TOP_10_BOOKS = [
  "The Interior Design Handbook by Frida Ramstedt",
  "Domino: The Book of Decorating",
  "Architectural Digest at 100",
  "Habitat: The Field Guide to Decorating by Lauren Liess",
  "Elements of Style by Erin Gates",
  "Homebody by Joanna Gaines",
  "Made for Living by Amber Lewis",
  "Live Beautiful by Athena Calderone",
  "The Finer Things by Christiane Lemieux",
  "Vogue Living: Country, City, Coast"
];

// 1. Clean Room Feature (Image Editing)
export const cleanRoomImage = async (imageBase64: string): Promise<string> => {
  const ai = getClient();
  const model = "gemini-2.5-flash-image"; 

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(imageBase64),
            },
          },
          {
            text: "Act as a professional home organizer and interior photographer. Your task is to 'digitally declutter' this room. 1) Remove all loose items from floors, tables, and countertops (papers, clothes, toys, trash). 2) Straighten rugs, pillows, and curtains. 3) Keep the architectural structure, lighting, flooring, and main furniture pieces EXACTLY as they are. Do not change the wall color or furniture style. The goal is to make the room look like it was just tidied up for a real estate listing.",
          },
        ],
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error cleaning room:", error);
    throw error;
  }
};

// 2. Analyze Room & Provide Text Recommendations
export const analyzeRoomDesign = async (
  imageBase64: string,
  category: DesignCategory
): Promise<DesignAdvice[]> => {
  const ai = getClient();
  const model = "gemini-3-pro-preview"; 

  const systemInstruction = `
    You are a Senior Interior Design Architect. Your advice is strictly grounded in the principles found in the top 10 interior design books:
    ${TOP_10_BOOKS.map((b, i) => `${i+1}. ${b}`).join('\n')}

    RULES:
    1. ANALYZE the image accurately. Do not hallucinate furniture or windows that are not there.
    2. Suggest improvements based ONLY on the user's selected category.
    3. For every piece of advice, you MUST cite a specific principle or concept from one of the books above.
    4. Be concise and actionable.
  `;

  const prompt = `
    Analyze this room photo.
    Focus specifically on the category: "${category}".
    
    Provide 4 distinct, actionable design improvements. 
    
    Return the response as a JSON object with the following schema:
    {
      "advice": [
        { "title": "Headline", "description": "Detailed advice", "principleSource": "Book Name: Principle Name" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(imageBase64) } },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  principleSource: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const json = JSON.parse(response.text || "{}");
    return json.advice || [];
  } catch (error) {
    console.error("Error analyzing room:", error);
    throw error;
  }
};

// 3. Generate Visualization Ideas
export const generateDesignVisualizations = async (
  imageBase64: string,
  category: DesignCategory,
  count: number = 4
): Promise<string[]> => {
  const ai = getClient();
  const model = "gemini-2.5-flash-image"; 

  // Determine prompt variations based on category
  let variations: string[] = [];

  switch (category) {
    case DesignCategory.LIGHTING:
      variations = [
        "Apply the 'Layered Lighting' principle. Show Ambient lighting as the base layer for overall illumination.",
        "Apply the 'Task Lighting' principle. Focus on direct light for reading or working areas (lamps, under-cabinet).",
        "Apply the 'Accent Lighting' principle. Highlight architectural features or art with directional spotlights.",
        "Apply the 'Atmospheric/Mood Lighting' principle. Use warm color temperatures, dimmers, and soft diffusers for a cozy vibe."
      ];
      break;
    case DesignCategory.LAYOUT:
      variations = [
        "Layout Principle: 'The Triangle of Flow'. Optimize pathways between major furniture pieces for easy movement.",
        "Layout Principle: 'Social Convergence'. Arrange furniture to face each other to encourage conversation (circular or U-shape).",
        "Layout Principle: 'Zoning'. Create distinct functional zones (e.g. reading nook vs watching TV) using rugs or furniture placement.",
        "Layout Principle: 'Symmetry and Balance'. Create a formal, mirror-image arrangement for a calm, stable look."
      ];
      break;
    case DesignCategory.COLOR_PALETTE:
      variations = [
        "Color Theory: Monochromatic harmony. Use varying shades of a single dominant color found in the room.",
        "Color Theory: Analogous colors. Use colors that sit next to each other on the color wheel for a serene look.",
        "Color Theory: Complementary contrast. Introduce accents that are opposite on the color wheel to the main room color.",
        "Color Theory: The 60-30-10 Rule. 60% dominant neutral, 30% secondary color, 10% bold accent color."
      ];
      break;
    default:
      variations = [
        "Design Style: Minimalist and Modern. Clean lines, decluttered surfaces, functional furniture.",
        "Design Style: Organic Modern (Biophilic). Introduce plants, natural wood textures, and soft curves.",
        "Design Style: Transitional. Blend traditional warmth with modern lines.",
        "Design Style: Eclectic. Mix textures, eras, and patterns for a collected, curated look."
      ];
  }

  // Ensure we have exactly 'count' prompts
  const selectedVariations = variations.slice(0, count);

  const promises = selectedVariations.map(async (variationDescription) => {
    const fullPrompt = `
      Create a photorealistic visualization of this room.
      Keep the room's main structure (walls, windows, floor type) exactly the same.
      Apply this design principle: ${variationDescription}.
      Make it look like a high-end interior design portfolio shot.
    `;

    try {
        const result = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(imageBase64) } },
                    { text: fullPrompt }
                ]
            }
        });
        
        for (const part of result.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Failed to generate variation:", variationDescription, e);
        return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((url): url is string => url !== null);
};