// Netlify function: creates OpenAI Realtime session + returns ephemeral key
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

    // Get subject context if provided
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang = body.lang || 'English';
    const isSv = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm och uppmuntrande AI-studieassistent. 
         Svara alltid på svenska. Håll svaren korta och naturliga — max 3 meningar.
         ${subject ? `Du hjälper studenten med ämnet: ${subject}. Svara bara från det materialet.` : ''}
         Var vänlig, tydlig och engagerande. Fråga en fråga i taget.`
      : `You are Luxori, a warm and encouraging AI study tutor.
         Keep answers short and natural — max 3 sentences.
         ${subject ? `You are helping the student study: ${subject}. Answer only from that material.` : ''}
         Be friendly, clear and engaging. Ask one question at a time.`;

    // Create Realtime session
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        instructions,
        turn_detection: { type: 'server_vad' },
        input_audio_transcription: { model: 'whisper-1' }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Realtime] Session error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ephemeral_key: data.client_secret?.value,
        session_id: data.id
      })
    };
  } catch (e) {
    console.error('[Realtime] Error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
