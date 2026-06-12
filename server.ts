import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
