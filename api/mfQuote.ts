export default async function handler(req: any, res: any) {
  try {
    const { schemeCode } = req.query;
    if (!schemeCode || typeof schemeCode !== "string") {
      return res.status(400).json({ error: "Scheme code is required" });
    }

    const targetUrl = `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`;
    
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `AMFI API responded with ${response.status}` });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Proxy mf error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch mutual fund data" });
  }
}
