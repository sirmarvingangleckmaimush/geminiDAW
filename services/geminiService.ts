
import { GoogleGenAI, Type } from "@google/genai";

// Always initialize with the named parameter and direct process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePattern = async (genre: string, tracksCount: number) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a ${genre} drum pattern for ${tracksCount} tracks over 16 steps. 
               Return a JSON object where keys are track indices (0 to ${tracksCount - 1}) 
               and values are arrays of 16 booleans representing the sequence.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: Object.fromEntries(
            Array.from({ length: tracksCount }, (_, i) => [
                i.toString(),
                {
                    type: Type.ARRAY,
                    items: { type: Type.BOOLEAN }
                }
            ])
        )
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse pattern", e);
    return null;
  }
};

export const getMusicAdvice = async (prompt: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are a world-class music producer and FL Studio expert. Give concise, technical, and inspiring advice."
    }
  });
  return response.text;
};
