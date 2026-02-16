import { GoogleGenAI, Type } from "@google/genai";
import { LegoSet, LegoPart } from "../types";

export const fetchLegoSetData = async (setNumber: string): Promise<LegoSet> => {
  // Tworzymy instancję tuż przed wywołaniem, aby mieć pewność co do klucza API
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Jesteś ekspertem LEGO. Znajdź pełną listę części dla zestawu LEGO o numerze: ${setNumber}.
  
  WYMAGANIA:
  1. Zwróć WSZYSTKIE elementy (klocki) znajdujące się w tym zestawie.
  2. Dla każdej części podaj: Nazwę, Kolor, Ilość, Design ID i Element ID.
  3. Użyj Google Search, aby zweryfikować dane na BrickLink lub Rebrickable.
  4. Odpowiedź MUSI być czystym obiektem JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    if (!text) throw new Error("Model nie zwrócił żadnych danych.");

    const rawData = JSON.parse(text.trim());
    
    const parts: LegoPart[] = rawData.parts.map((p: any, index: number) => {
      // Oficjalny serwer obrazów LEGO używa Element ID
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
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Błąd systemu: ${error.message || "Nie udało się pobrać danych zestawu."}`);
  }
};
