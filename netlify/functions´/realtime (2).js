// ─────────────────────────────────────────
//  realtime.js  — Netlify function
//  Creates OpenAI Realtime ephemeral token
//  GA endpoint: POST /v1/realtime/client_secrets
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
    body: JSON.stringify({ error: 'OPENAI_API_KEY not configured in Netlify' })
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang    = body.lang || 'English';
    const isSv    = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara alltid på svenska med naturlig, flytande svenska — inte översatt engelska. Håll svaren korta, max 3 meningar. Var uppmuntrande och personlig.${subject ? ` Ämnet är: ${subject}.` : ''}`
      : `You are Luxori, a warm AI study tutor in a voice call. Keep answers SHORT — max 3 sentences. Be natural and encouraging.${subject ? ` Subject: ${subject}.` : ''}`;

    // GA endpoint (current)
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        // NOTE: No OpenAI-Beta header for GA
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2',
          instructions,
          audio: {
            output: { voice: isSv ? 'shimmer' : 'alloy' },
          },
          turn_detection: { type: 'server_vad' },
          input_audio_transcription: { model: 'whisper-1' },
        }
      })
    });

    const text = await res.text();
    console.log('[Realtime] GA status:', res.status, text.slice(0, 300));

    if (res.ok) {
      const data = JSON.parse(text);
      // GA response: { client_secret: { value: "ek_..." }, ... }
      const key = data.client_secret?.value;
      if (!key) {
        console.error('[Realtime] No client_secret.value in response:', text.slice(0, 300));
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'No ephemeral key in response', detail: text.slice(0, 300) }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: key, mode: 'ga' }) };
    }

    // Fallback: beta endpoint (gpt-4o-realtime-preview)
    console.log('[Realtime] GA failed, trying beta fallback...');
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
      return { statusCode: betaRes.status, headers, body: JSON.stringify({ error: 'OpenAI error', detail: betaText }) };
    }

    const betaData = JSON.parse(betaText);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ ephemeral_key: betaData.client_secret?.value, mode: 'beta' })
    };

  } catch (e) {
    console.error('[Realtime]', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
