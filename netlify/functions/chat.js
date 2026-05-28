// netlify/functions/chat.js
// Lumio AI proxy — all Claude calls go through here
// Students never see or need an API key

const MODEL = "claude-haiku-4-5-20251001";
const FREE_LIMIT = 50;

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server not configured correctly." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const { system = "", messages, maxTokens = 600 } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Messages required" }) };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
      });

      if (res.status === 429 || res.status === 529) {
        if (attempt < 2) { await sleep(8000 * (attempt + 1)); continue; }
        return { statusCode: 429, headers: cors, body: JSON.stringify({ error: "För många förfrågningar. Vänta 30 sekunder." }) };
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: errData.error?.message || "Fel " + res.status }) };
      }

      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      return { statusCode: 200, headers: cors, body: JSON.stringify({ text }) };

    } catch (err) {
      if (attempt === 2) {
        return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "Nätverksfel. Kontrollera uppkopplingen." }) };
      }
      await sleep(2000);
    }
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
