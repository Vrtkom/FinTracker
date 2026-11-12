import { GoogleGenAI } from "@google/genai";

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
    const { messages, contextSummary } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are "FinTrack AI", an intelligent, discreet, and highly competent Personal Financial Advisor & Bookkeeper built inside the user's finance tracker app.

You have direct access to the user's real-time financial ledger data provided in the prompt context.

Financial Context of the user:
${contextSummary || "No ledger summary available."}

Guidelines for your responses:
1. Always be concise, polite, encouraging, and clear.
2. Provide direct, numbers-backed answers using their ledger data (e.g. mention exact accounts, balances, budgets, recurring bills, and savings rates).
3. Use currency format (e.g. ₹ or their currency) appropriately.
4. When suggesting transactions or budget adjustments, be specific and practical.
5. Format your answers with clean, highly readable markdown. Prefer organized bullet points, bold key figures, and structured sections for fast readability on mobile screens and sidebars. Avoid excessive pipe tables unless presenting concise 2-3 column comparisons. Never output raw ASCII bar clutter or unformatted pipe delimiter lists.
6. If the user asks you to log a transaction, suggest the exact double-entry pair (debit account for the expense/destination, credit account for payment source).
7. Respect user privacy and maintain professional financial advice etiquette.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let lastErr: any = null;
    let reply: string | undefined = undefined;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });
        reply = response.text;
        if (reply) break;
      } catch (err: any) {
        console.warn(`Model ${model} failed:`, err.message);
        lastErr = err;
        if (
          err.message?.includes("leaked") ||
          err.message?.includes("API key not valid") ||
          err.message?.includes("API_KEY_INVALID")
        ) {
          throw err;
        }
      }
    }

    if (!reply) {
      throw lastErr || new Error("Failed to generate response from all available models");
    }

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    let errMsg = error.message || "Failed to generate AI response";
    if (
      errMsg.includes("leaked") ||
      errMsg.includes("API key not valid") ||
      errMsg.includes("API_KEY_INVALID")
    ) {
      errMsg =
        "Your Gemini API key was rejected by Google (reported as leaked or invalid). Please configure a fresh Gemini API key in the AI Studio Secrets panel.";
    }
    return res.status(500).json({ error: errMsg });
  }
}
