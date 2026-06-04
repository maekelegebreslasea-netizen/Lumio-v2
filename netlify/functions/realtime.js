exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No OpenAI key' }) };

    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang = body.lang || 'English';
    const isSv = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm och uppmuntrande AI-studieassistent. Svara alltid på svenska. Håll svaren korta och naturliga — max 3 meningar. ${subject ? `Du hjälper studenten med ämnet: ${subject}. Prioritera det uppladdade materialet.` : ''} Var vänlig och engagerande.`
      : `You are Luxori, a warm and encouraging AI study tutor. Keep answers short and natural — max 3 sentences. ${subject ? `You are helping the student study: ${subject}. Prioritize the uploaded study material.` : ''} Be friendly and engaging.`;

    // Try newest model first, fallback to older
    const models = [
      'gpt-4o-realtime-preview-2025-06-03',
      'gpt-4o-realtime-preview-2024-12-17',
      'gpt-4o-realtime-preview'
    ];

    let sessionData = null;
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            voice: 'alloy',
            instructions,
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'whisper-1' }
          })
        });

        if (response.ok) {
          sessionData = await response.json();
          console.log(`[Realtime] Using model: ${model}`);
          break;
        } else {
          lastError = await response.text();
          console.error(`[Realtime] ${model} failed:`, lastError);
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!sessionData?.client_secret?.value) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Session failed', detail: lastError }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ephemeral_key: sessionData.client_secret.value,
        session_id: sessionData.id
      })
    };

  } catch (e) {
    console.error('[Realtime] Error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
