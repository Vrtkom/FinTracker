import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!aiClient) {
    // You can paste your API key here if you want to hardcode it
    const hardcodedKey = "AIzaSyBRhhFbQMsVtM-MQNe97LKIfJqPgXLY04A";
    const apiKey =
      hardcodedKey ||
      process.env.GEMINI_API_KEY ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Gemini API Key is missing. Please set it in your environment variables or hardcode it.",
      );
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const parseReceipt = async (
  base64Image: string,
  accounts: { id: string; name: string; type: string }[],
) => {
  try {
    // Remove the data:image/jpeg;base64, prefix
    const base64Data = base64Image.split(",")[1];
    const mimeType = base64Image.split(";")[0].split(":")[1];

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        `Extract transaction details from this receipt.
        
        Available accounts:
        ${accounts.map((a) => `- ${a.name} (ID: ${a.id}, Type: ${a.type})`).join("\n")}
        
        Return a JSON object with the following fields:
        - amount: number (total amount)
        - description: string (merchant name or short description)
        - date: string (YYYY-MM-DD format, if visible)
        - debitAccount: string (the ID of the expense account that best matches the items bought)
        - tags: array of strings (e.g. ["food", "groceries"])
        - intent: string (one of "need", "want", "investment", "transfer", or null)
        `,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            date: { type: Type.STRING },
            debitAccount: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            intent: { type: Type.STRING },
          },
          required: ["amount", "description"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};
export const parseNaturalLanguageTransaction = async (
  text: string,
  accounts: { id: string; name: string; type: string }[],
) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following natural language transaction into structured data.
      
      Available accounts:
      ${accounts.map((a) => `- ${a.name} (ID: ${a.id}, Type: ${a.type})`).join("\n")}
      
      Transaction text: "${text}"
      
      Return a JSON object with the following fields:
      - amount: number (positive)
      - description: string (short, concise)
      - debitAccount: string (the ID of the account receiving the value/expense)
      - creditAccount: string (the ID of the account providing the value/source of funds)
      - tags: array of strings (e.g. ["food", "dinner"])
      - intent: string (one of "need", "want", "investment", "transfer", or null if unclear)
      
      If you cannot determine the exact account ID, pick the closest match or leave it empty.
      For expenses, debitAccount is usually the expense category, and creditAccount is the payment method (e.g. HDFC).
      For income, debitAccount is the receiving account (e.g. Bank), and creditAccount is the income source (e.g. Salary).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            debitAccount: { type: Type.STRING },
            creditAccount: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            intent: { type: Type.STRING },
          },
          required: ["amount", "description"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (jsonStr) {
      return JSON.parse(jsonStr);
    }
    return null;
  } catch (error) {
    console.error("Error parsing transaction:", error);
    throw error;
  }
};
