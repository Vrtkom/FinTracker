import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
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

function getGeminiApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (isValidGeminiApiKey(envKey)) {
    return envKey;
  }

  // Check local .env
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (match && match[1] && isValidGeminiApiKey(match[1])) {
      return match[1].trim();
    }
  }

  // Check .env.example
  const envExamplePath = path.join(process.cwd(), ".env.example");
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, "utf-8");
    const match = exampleContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (match && match[1] && isValidGeminiApiKey(match[1])) {
      return match[1].trim();
    }
  }

  // Fallback to user-provided key
  return USER_CONFIGURED_KEY;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // AI Assistant endpoint with resilient model fallback
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, contextSummary } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({
          error:
            "Gemini API key is not configured in the environment. Please add GEMINI_API_KEY in the AI Studio Secrets panel.",
        });
      }
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

      // Format messages for @google/genai
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Candidate models: gemini-3.5-flash is stable and fast, fallback to gemini-3.8-flash or flash-latest
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
          // If the key is leaked or invalid, don't retry other models
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

      res.json({ reply });
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
      res.status(500).json({ error: errMsg });
    }
  });

  // Server-side Receipt Parsing proxy
  app.post("/api/ai/parse-receipt", async (req, res) => {
    try {
      const { base64Image, accounts } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "base64Image is required" });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

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
      res.json({ result: jsonStr ? JSON.parse(jsonStr) : null });
    } catch (err: any) {
      console.error("Receipt parse error:", err);
      res.status(500).json({ error: err.message || "Failed to parse receipt" });
    }
  });

  // Server-side Natural Language Transaction Parsing proxy
  app.post("/api/ai/parse-transaction", async (req, res) => {
    try {
      const { text, accounts } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

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
      res.json({ result: jsonStr ? JSON.parse(jsonStr) : null });
    } catch (err: any) {
      console.error("Transaction parse error:", err);
      res.status(500).json({ error: err.message || "Failed to parse natural language transaction" });
    }
  });

  // API route to proxy fetch requests so adblockers (like Brave) don't block them
  app.get("/api/stockQuote", async (req, res) => {
    try {
      const { ticker } = req.query;
      if (!ticker || typeof ticker !== "string") {
        return res.status(400).json({ error: "Ticker is required" });
      }

      // Try query2 first as it is generally more permissive and resilient to consent walls, then fallback to query1
      const urls = [
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
      ];

      let lastError = null;
      let data = null;

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            throw new Error("Received HTML consent page or block page instead of JSON");
          }

          data = await response.json();
          if (data && data.chart) {
            break; // Success!
          }
        } catch (err: any) {
          console.warn(`Failed to fetch stock quote from ${url}:`, err.message);
          lastError = err;
        }
      }

      if (data) {
        res.json(data);
      } else {
        throw new Error(lastError ? lastError.message : "Failed to retrieve quote from Yahoo Finance");
      }
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stock data" });
    }
  });

  // API route to fetch Indian Mutual Fund NAV from public AMFI API
  app.get("/api/mfQuote", async (req, res) => {
    try {
      const { schemeCode } = req.query;
      if (!schemeCode || typeof schemeCode !== "string") {
        return res.status(400).json({ error: "Scheme code is required" });
      }

      const targetUrl = `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`;
      let response;
      let lastError = null;

      // Try up to 3 times to handle flakiness of the public AMFI API
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          response = await fetch(targetUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            return res.json(data);
          } else {
            throw new Error(`AMFI responded with status ${response.status}`);
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`AMFI fetch attempt ${attempt} failed for ${schemeCode}:`, err.message || err);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 800)); // wait 800ms before retrying
          }
        }
      }

      throw lastError || new Error("Failed to contact AMFI API after 3 attempts");
    } catch (error: any) {
      console.error("Proxy mf error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch mutual fund data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
