import { GoogleGenAI, Type } from "@google/genai";

const REVOKED_KEYS = new Set([
  "AIzaSyBRhhFbQMsVtM-MQNe97LKIfJqPgXLY04A",
]);

const USER_CONFIGURED_KEY = "AQ.Ab8RN6JiRrJl5z0WvwP_sMHrgptm3pCsE1sOxVLsUiwTShLvEg";

function isValidGeminiApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 15) return false;
  if (
    k.includes("MY_") ||
    k.includes("YOUR_") ||
    k.startsWith("<") ||
    k === "MY_GEMINI_API_KEY" ||
    REVOKED_KEYS.has(k)
  ) {
    return false;
  }
  return true;
}

function getGeminiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (isValidGeminiApiKey(envKey)) {
    return envKey!;
  }
  return USER_CONFIGURED_KEY;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { base64Image, accounts } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ error: "base64Image is required" });
    }

    const apiKey = getGeminiApiKey();
    const base64Data = base64Image.split(",")[1] || base64Image;
    const mimeType = base64Image.includes(";") ? base64Image.split(";")[0].split(":")[1] : "image/jpeg";

    const ai = new GoogleGenAI({ apiKey });
    const accountsList = Array.isArray(accounts)
      ? accounts.map((a: any) => `- ${a.name} (ID: ${a.id}, Type: ${a.type})`).join("\n")
      : "";

    const promptText = `Extract transaction details from this receipt.

Available accounts:
${accountsList}

Return a JSON object with:
- amount: number (total amount)
- description: string (merchant name or short description)
- date: string (YYYY-MM-DD format, if visible)
- debitAccount: string (the ID of the expense account that best matches the items bought)
- tags: array of strings (e.g. ["food", "groceries"])
- intent: string (one of "need", "want", "investment", "transfer", or null)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "image/jpeg",
          },
        },
        promptText,
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
    return res.status(200).json({ result: jsonStr ? JSON.parse(jsonStr) : null });
  } catch (err: any) {
    console.error("Receipt parse error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse receipt" });
  }
}
