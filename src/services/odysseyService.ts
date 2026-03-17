import { Chapter, Difficulty, Question } from "../types";
import { CANTO_TITLES } from "../constants";
import { STATIC_QUESTIONS } from "../data/questions";
import { GoogleGenAI, Type } from "@google/genai";
import { BOOK_DATA } from "../data/book";
import { PRIMARIA_DATA } from "../data/primaria";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// This is a simplified version for the demo. In a real app, this would be a large JSON or DB.
// I will populate this with the actual text from the PDF OCR provided.
const ODYSSEY_RAW_DATA: Record<number, { title: string, startPage: number, endPage: number }> = {
  1: { title: `Canto I. ${CANTO_TITLES[1]}`, startPage: 3, endPage: 23 },
  2: { title: `Canto II. ${CANTO_TITLES[2]}`, startPage: 24, endPage: 44 },
  3: { title: `Canto III. ${CANTO_TITLES[3]}`, startPage: 45, endPage: 68 },
  4: { title: `Canto IV. ${CANTO_TITLES[4]}`, startPage: 69, endPage: 105 },
  5: { title: `Canto V. ${CANTO_TITLES[5]}`, startPage: 106, endPage: 126 },
  6: { title: `Canto VI. ${CANTO_TITLES[6]}`, startPage: 127, endPage: 142 },
  7: { title: `Canto VII. ${CANTO_TITLES[7]}`, startPage: 143, endPage: 158 },
  8: { title: `Canto VIII. ${CANTO_TITLES[8]}`, startPage: 159, endPage: 185 },
  9: { title: `Canto IX. ${CANTO_TITLES[9]}`, startPage: 186, endPage: 211 },
  10: { title: `Canto X. ${CANTO_TITLES[10]}`, startPage: 212, endPage: 237 },
  11: { title: `Canto XI. ${CANTO_TITLES[11]}`, startPage: 238, endPage: 266 },
  12: { title: `Canto XII. ${CANTO_TITLES[12]}`, startPage: 267, endPage: 287 },
  13: { title: `Canto XIII. ${CANTO_TITLES[13]}`, startPage: 288, endPage: 307 },
  14: { title: `Canto XIV. ${CANTO_TITLES[14]}`, startPage: 308, endPage: 332 },
  15: { title: `Canto XV. ${CANTO_TITLES[15]}`, startPage: 333, endPage: 357 },
  16: { title: `Canto XVI. ${CANTO_TITLES[16]}`, startPage: 358, endPage: 378 },
  17: { title: `Canto XVII. ${CANTO_TITLES[17]}`, startPage: 379, endPage: 406 },
  18: { title: `Canto XVIII. ${CANTO_TITLES[18]}`, startPage: 407, endPage: 426 },
  19: { title: `Canto XIX. ${CANTO_TITLES[19]}`, startPage: 427, endPage: 454 },
  20: { title: `Canto XX. ${CANTO_TITLES[20]}`, startPage: 455, endPage: 472 },
  21: { title: `Canto XXI. ${CANTO_TITLES[21]}`, startPage: 473, endPage: 492 },
  22: { title: `Canto XXII. ${CANTO_TITLES[22]}`, startPage: 493, endPage: 514 },
  23: { title: `Canto XXIII. ${CANTO_TITLES[23]}`, startPage: 515, endPage: 531 },
  24: { title: `Canto XXIV. ${CANTO_TITLES[24]}`, startPage: 532, endPage: 557 },
};

// Cache for questions
const questionCache: Record<string, Question[]> = {};

export async function getChapter(chapterId: number, difficulty: Difficulty = "secundaria"): Promise<Chapter> {
  const info = ODYSSEY_RAW_DATA[chapterId];
  if (!info) throw new Error("Canto no encontrado");

  // If it's for 4th grade, use static simplified data
  if (difficulty === "primaria") {
    const simplifiedText = PRIMARIA_DATA[chapterId] || "Contenido no disponible para este nivel.";
    return {
      id: chapterId,
      title: `${info.title} (Versión para chicos)`,
      pages: [{ number: 1, content: simplifiedText }],
      fullText: simplifiedText
    };
  }

  // Check if we have local text
  const localText = BOOK_DATA[chapterId];
  
  if (!localText) {
    // Fallback to AI extraction if local text is not available
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extrae el texto íntegro y literal de las páginas ${info.startPage} a ${info.endPage} del PDF de La Odisea proporcionado. 
      Devuelve el contenido organizado por página. No resumas, no cambies palabras. 
      Formato JSON: { "pages": [{ "number": 3, "content": "..." }, ...] }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  content: { type: Type.STRING }
                },
                required: ["number", "content"]
              }
            }
          },
          required: ["pages"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    const pages = data.pages || [];
    const fullText = pages.map((p: any) => p.content).join("\n\n");
    
    return {
      id: chapterId,
      title: info.title,
      pages,
      fullText
    };
  }

  // Split into pages (roughly 400 words per page)
  const words = localText.trim().split(/\s+/);
  const wordsPerPage = 400;
  const pages = [];
  
  for (let i = 0; i < words.length; i += wordsPerPage) {
    const pageWords = words.slice(i, i + wordsPerPage);
    pages.push({
      number: Math.floor(i / wordsPerPage) + 1,
      content: pageWords.join(" ")
    });
  }

  return {
    id: chapterId,
    title: info.title,
    pages,
    fullText: localText
  };
}

export async function getChapterQuestions(chapterId: number, difficulty: Difficulty, fullText: string): Promise<Question[]> {
  const cacheKey = `${chapterId}-${difficulty}`;
  if (questionCache[cacheKey]) return questionCache[cacheKey];

  // Try to get static questions first
  const staticPool = STATIC_QUESTIONS[chapterId]?.[difficulty];
  
  if (staticPool && staticPool.length > 0) {
    // Shuffle and pick 6
    const shuffled = [...staticPool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6).map((q, index) => ({
      ...q,
      id: `q-static-${chapterId}-${difficulty}-${index}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    questionCache[cacheKey] = selected;
    return selected;
  }

  // Fallback for chapters not yet in STATIC_QUESTIONS
  const placeholders: Question[] = Array.from({ length: 6 }).map((_, i) => ({
    id: `placeholder-${chapterId}-${difficulty}-${i}`,
    text: `[Canto ${chapterId}] Esta es una pregunta de práctica para el nivel ${difficulty}. ¿Quién es el protagonista de la Odisea?`,
    options: ["Odiseo", "Aquiles", "Héctor", "Agamenón"],
    correctAnswer: 0
  }));

  return placeholders;
}
