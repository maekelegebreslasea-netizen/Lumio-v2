// ─────────────────────────────────────────
//  realtime.js  — Netlify function
//  Creates OpenAI Realtime session
// ─────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENAI_API_KEY not configured in Netlify' }) };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang    = body.lang || 'English';
    const isSv    = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara alltid på svenska. Håll svaren korta — max 3 meningar. Var naturlig och uppmuntrande.${subject ? ` Ämne: ${subject}.` : ''}`
      : `You are Luxori, a warm AI study tutor in a voice call. Keep answers SHORT — max 3 sentences. Be natural and encouraging.${subject ? ` Subject: ${subject}.` : ''}`;

    // Try GA endpoint first
    let res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions,
          audio: { output: { voice: 'alloy' } },
          turn_detection: { type: 'server_vad' },
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: data.value, mode: 'ga' }) };
    }

    // Fallback: beta endpoint
    res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        instructions,
        turn_detection: { type: 'server_vad' },
        input_audio_transcription: { model: 'whisper-1' },
      })
    });

    const text = await res.text();
    console.log('[Realtime] Beta status:', res.status, text.slice(0, 200));

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: 'OpenAI error', detail: text }) };
    }

    const data = JSON.parse(text);
    return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: data.client_secret?.value, mode: 'beta' }) };

  } catch (e) {
    console.error('[Realtime]', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
