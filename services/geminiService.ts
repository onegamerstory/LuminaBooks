
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchBookMetadata = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find detailed information for the book: "${query}". Provide the official title, author, release year, a short 2-sentence description, and a suggested high-quality book cover image URL from a reliable source (like OpenLibrary, Google Books, or similar).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            year: { type: Type.INTEGER },
            description: { type: Type.STRING },
            coverUrl: { type: Type.STRING }
          },
          required: ["title", "author", "year", "coverUrl"]
        }
      }
    });

    // Access the .text property directly to extract string output as per guidelines
    const jsonStr = response.text;
    if (!jsonStr) {
      return null;
    }

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Failed to fetch book metadata:", error);
    return null;
  }
};