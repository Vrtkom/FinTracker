export const parseReceipt = async (
  base64Image: string,
  accounts: { id: string; name: string; type: string }[],
) => {
  try {
    const res = await fetch("/api/ai/parse-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, accounts }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.result || null;
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
    const res = await fetch("/api/ai/parse-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, accounts }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.result || null;
  } catch (error) {
    console.error("Error parsing transaction:", error);
    throw error;
  }
};
