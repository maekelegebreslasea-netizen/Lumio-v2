// netlify/functions/chat.js
// Lumio AI proxy — all Claude calls go through here
// Students never see or need an API key

const MODEL = "claude-haiku-4-5-20251001";
const FREE_LIMIT = 50; // messages per day on free plan

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  // Check server API key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not set in Netlify environment variables");
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server not configured correctly. Contact support." }) };
  }

  // Parse request body
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

  // Extract user ID from Supabase JWT (optional - for usage tracking)
  let userId = null;
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        userId = payload.sub || null;
      }
    } catch (e) {
      // JWT parse failed — continue without user ID
    }
  }

  // Usage tracking (requires SUPABASE_URL + SUPABASE_SERVICE_KEY in env vars)
  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const limitReached = await checkAndTrackUsage(userId);
    if (limitReached) {
      return {
        statusCode: 429,
        headers: cors,
        body: JSON.stringify({
          error: "Du har nått dagens gräns (50 meddelanden). Uppgradera för obegränsad tillgång.",
          code: "DAILY_LIMIT",
        }),
      };
    }
  }

  // Call Anthropic with retry logic
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages,
        }),
      });

      // Rate limited — wait and retry
      if (res.status === 429 || res.status === 529) {
        if (attempt < 2) {
          await sleep(8000 * (attempt + 1));
          continue;
        }
        return {
          statusCode: 429,
          headers: cors,
          body: JSON.stringify({ error: "Servern är tillfälligt överbelastad. Vänta 30 sekunder och försök igen." }),
        };
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || "API-fel " + res.status;
        console.error("Anthropic error:", res.status, msg);
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: msg }) };
      }

      const data = await res.json();
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      return { statusCode: 200, headers: cors, body: JSON.stringify({ text }) };

    } catch (err) {
      if (attempt === 2) {
        console.error("Network error:", err.message);
        return {
          statusCode: 503,
          headers: cors,
          body: JSON.stringify({ error: "Nätverksfel. Kontrollera din uppkoppling och försök igen." }),
        };
      }
      await sleep(2000);
    }
  }
};

// ── Supabase usage tracking ───────────────────────────────────────
async function checkAndTrackUsage(userId) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    const today = new Date().toISOString().slice(0, 10);
    const headers = {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // Get today's usage for this user
    const getRes = await fetch(
      `${url}/rest/v1/usage?user_id=eq.${userId}&date=eq.${today}&select=id,count`,
      { headers }
    );
    const rows = await getRes.json();

    if (!Array.isArray(rows)) return false; // On error, allow

    const current = rows[0];
    const count = current?.count || 0;

    if (count >= FREE_LIMIT) return true; // Limit reached

    // Increment or create
    if (!current) {
      await fetch(`${url}/rest/v1/usage`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: userId, date: today, count: 1 }),
      });
    } else {
      await fetch(`${url}/rest/v1/usage?id=eq.${current.id}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ count: count + 1 }),
      });
    }

    return false; // Not limited
  } catch (e) {
    console.error("Usage tracking error:", e.message);
    return false; // On error, allow the request
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
