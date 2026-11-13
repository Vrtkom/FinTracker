import { GoogleGenAI } from "@google/genai";

function isValidGeminiApiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 15) return false;
  if (
    k.includes("MY_") ||
    k.includes("YOUR_") ||
    k.startsWith("<") ||
    k === "MY_GEMINI_API_KEY"
  ) {
    return false;
  }
  return true;
}

function getGeminiApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (isValidGeminiApiKey(envKey)) {
    return envKey;
  }
  return undefined;
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
    if (!apiKey) {
      return res.status(500).json({
        error:
          "Gemini API key is not configured. Please add GEMINI_API_KEY in AI Studio Settings > Secrets (and in Vercel Environment Variables if deployed there).",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are "FinTrack AI", an intelligent, discreet, and highly competent Personal Financial Advisor & Bookkeeper built inside the user's finance tracker app.

You have direct access to BOTH:
1. The user's **Persistent Financial Memory / Profile** (salary, investments, fixed bills, goals, and custom notes saved permanently across chats).
2. The user's **Real-Time Financial Ledger Data** (accounts, balances, budgets, recurring bills, and recent transactions).

Financial Context of the user:
${contextSummary || "No ledger summary available."}

Guidelines for your responses:
1. Always be concise, polite, encouraging, and clear.
2. Always honor and incorporate details from the user's Persistent Financial Memory (salary, investments, bills, goals, notes) alongside their live ledger data, even in a brand-new or freshly cleared conversation.
3. Provide direct, numbers-backed answers using their data (e.g. mention exact accounts, balances, salary, SIPs, budgets, recurring bills, and savings rates).
4. Use currency format (e.g. ₹ or their currency) appropriately.
5. When suggesting transactions or budget adjustments, be specific and practical.
6. Format your answers with clean, highly readable markdown. Prefer organized bullet points, bold key figures, and structured sections for fast readability on mobile screens and sidebars. Avoid excessive pipe tables unless presenting concise 2-3 column comparisons. Never output raw ASCII bar clutter or unformatted pipe delimiter lists.
7. If the user asks you to log a transaction, suggest the exact double-entry pair (debit account for the expense/destination, credit account for payment source).
8. Respect user privacy and maintain professional financial advice etiquette.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const modelsToTry = ["gemini-4-hydrogen", "gemini-3.5-flash"];
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
          err.message?.includes("API_KEY_INVALID") ||
          err.message?.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")
        ) {
          throw err;
        }
      }
    }

    if (!reply) {
      throw lastErr || new Error("Failed to generate response from Gemini");
    }

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    let errMsg = error.message || "Failed to generate AI response";
    if (
      errMsg.includes("leaked") ||
      errMsg.includes("API key not valid") ||
      errMsg.includes("API_KEY_INVALID") ||
      errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")
    ) {
      errMsg =
        "Your Gemini API key was rejected by Google (invalid, expired, or flagged as leaked). Please create a fresh API key in Google AI Studio and add it to Settings > Secrets (and Vercel Environment Variables, never directly in code).";
    }
    return res.status(500).json({ error: errMsg });
  }
}
