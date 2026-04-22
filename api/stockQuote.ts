export default async function handler(req: any, res: any) {
  try {
    const { ticker } = req.query;
    if (!ticker || typeof ticker !== "string") {
      return res.status(400).json({ error: "Ticker is required" });
    }

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Yahoo Finance responded with ${response.status}` });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch stock data" });
  }
}
