import { GoogleGenAI, Type } from "@google/genai";
import { LegoSet, LegoPart } from "../types";
console.log("API KEY:", import.meta.env.VITE_API_KEY);

export const fetchLegoSetData = async (setNumber: string): Promise<LegoSet> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const prompt = `COMPLETE INVENTORY SCAN: Fetch the 100% full list of parts for LEGO set ${setNumber}.
  
  MANDATORY DATA FOR EACH PART:
  1. Part Name & Color.
  2. Quantity in this set.
  3. Design ID (e.g., 3001 for a 2x4 brick).
  4. Element ID (e.g., 4113233).
  
  Return ALL parts. DO NOT TRUNCATE. Use BrickLink or Rebrickable as source of truth.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          theme: { type: Type.STRING },
          totalParts: { type: Type.NUMBER },
          parts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                color: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                description: { type: Type.STRING },
                designId: { type: Type.STRING },
                elementId: { type: Type.STRING }
              },
              required: ["name", "color", "quantity", "description", "designId", "elementId"]
            }
          }
        },
        required: ["name", "theme", "totalParts", "parts"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Brak danych z modelu.");

  let rawData;
    try {
      rawData = JSON.parse(text.trim());
    } catch (e) {
      console.error("Niepoprawny JSON:", text);
      throw new Error("Model zwrócił błędne dane.");
    }
  
  const parts: LegoPart[] = rawData.parts.map((p: any, index: number) => {
    // Oficjalny serwer obrazów LEGO po Element ID
    const legoImg = `https://www.lego.com/service/bricks/5/2/${p.elementId}`;
    
    return {
      ...p,
      id: `part-${Date.now()}-${index}`,
      collected: 0,
      imageUrl: legoImg 
    };
  });

  return {
    id: `set-${Date.now()}`,
    number: setNumber,
    name: rawData.name,
    theme: rawData.theme,
    totalParts: rawData.totalParts || parts.reduce((acc, p) => acc + p.quantity, 0),
    imageUrl: `https://images.brickset.com/sets/images/${setNumber}-1.jpg`,
    parts,
    lastModified: Date.now(),
    externalUrls: response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(c => c.web).map(c => ({ title: c.web!.title, uri: c.web!.uri })) || []
  };
};
