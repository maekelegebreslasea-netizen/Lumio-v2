// netlify/functions/chat.js
const MODEL = 'claude-haiku-4-5';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    console.error('[chat] ANTHROPIC_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { system, messages, maxTokens = 800 } = body;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: system || 'You are Luxori, a helpful AI study assistant.',
        messages: messages || [],
      }),
    });

    const raw = await res.text();
    console.log('[chat] Anthropic status:', res.status, raw.slice(0, 100));

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: 'Anthropic error', detail: raw.slice(0, 200) }) };
    }

    const data = JSON.parse(raw);
    const text = data.content?.[0]?.text || '';
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (e) {
    console.error('[chat] Exception:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
