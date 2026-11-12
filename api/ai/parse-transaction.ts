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
    const { text, accounts } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const accountsList = Array.isArray(accounts)
      ? accounts.map((a: any) => `- ${a.name} (ID: ${a.id}, Type: ${a.type})`).join("\n")
      : "";

    const prompt = `Parse the following natural language transaction into structured data.

Available accounts:
${accountsList}

Transaction text: "${text}"

Return a JSON object with the following fields:
- amount: number (positive)
- description: string (short, concise)
- debitAccount: string (the ID of the account receiving the value/expense)
- creditAccount: string (the ID of the account providing the value/source of funds)
- tags: array of strings (e.g. ["food", "dinner"])
- intent: string (one of "need", "want", "investment", "transfer", or null if unclear)

If you cannot determine the exact account ID, pick the closest match or leave it empty.
For expenses, debitAccount is usually the expense category, and creditAccount is the payment method.
For income, debitAccount is the receiving account, and creditAccount is the income source.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
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
    return res.status(200).json({ result: jsonStr ? JSON.parse(jsonStr) : null });
  } catch (err: any) {
    console.error("Transaction parse error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse natural language transaction" });
  }
}
