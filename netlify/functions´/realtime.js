// ─────────────────────────────────────────
//  realtime.js  — Netlify function
//  Creates OpenAI Realtime ephemeral token
// ─────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return {
    statusCode: 500, headers,
    body: JSON.stringify({ error: 'OPENAI_API_KEY saknas i Netlify environment variables' })
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang    = body.lang || 'English';
    const isSv    = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara ALLTID på naturlig svenska — inte översatt engelska. Håll svaren korta, max 3 meningar. Var uppmuntrande och personlig.${subject ? ` Ämnet är: ${subject}.` : ''}`
      : `You are Luxori, a warm AI study tutor in a voice call. Keep answers SHORT — max 3 sentences. Be natural and encouraging.${subject ? ` Subject: ${subject}.` : ''}`;

    // ── Try GA endpoint (current) ─────────────────────────────────
    const gaRes = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',   // model at top level for GA
        voice: isSv ? 'shimmer' : 'alloy',
        instructions,
        turn_detection: { type: 'server_vad' },
        input_audio_transcription: { model: 'whisper-1' },
      })
    });

    const gaText = await gaRes.text();
    console.log('[Realtime] GA status:', gaRes.status, gaText.slice(0, 300));

    if (gaRes.ok) {
      const data = JSON.parse(gaText);
      // GA response shape: { client_secret: { value: "ek_..." } }
      const key = data.client_secret?.value;
      if (key) {
        return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: key, mode: 'ga' }) };
      }
    }

    // ── Fallback: beta endpoint ───────────────────────────────────
    console.log('[Realtime] GA failed (' + gaRes.status + '), trying beta...');
    const betaRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: isSv ? 'shimmer' : 'alloy',
        instructions,
        turn_detection: { type: 'server_vad' },
        input_audio_transcription: { model: 'whisper-1' },
      })
    });

    const betaText = await betaRes.text();
    console.log('[Realtime] Beta status:', betaRes.status, betaText.slice(0, 200));

    if (!betaRes.ok) {
      return {
        statusCode: betaRes.status, headers,
        body: JSON.stringify({ error: 'OpenAI fel', detail: betaText.slice(0, 300) })
      };
    }

    const betaData = JSON.parse(betaText);
    const betaKey = betaData.client_secret?.value;
    if (!betaKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Ingen ephemeral key i svar', raw: betaText.slice(0, 300) }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: betaKey, mode: 'beta' }) };

  } catch (e) {
    console.error('[Realtime] Exception:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
