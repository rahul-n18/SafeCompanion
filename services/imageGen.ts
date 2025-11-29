import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL_NAME } from "../constants";

export async function generateVisualAidImage(apiKey: string, prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
}