exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return { 
    statusCode: 500, headers, 
    body: JSON.stringify({ error: 'OPENAI_API_KEY not set in Netlify' }) 
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang = body.lang || 'English';
    const isSv = lang === 'Svenska';
    const instructions = isSv
      ? `Du är Luxori, en varm AI-studieassistent. Svara på svenska. Håll svar korta max 3 meningar. ${subject ? 'Ämne: ' + subject : ''}`
      : `You are Luxori, a warm AI study tutor. Keep answers short max 3 sentences. ${subject ? 'Subject: ' + subject : ''}`;

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2025-06-03',
        voice: 'alloy',
        instructions,
        turn_detection: { type: 'server_vad' }
      })
    });

    const text = await response.text();
    console.log('[Realtime] Status:', response.status, 'Body:', text.slice(0, 500));

    if (!response.ok) {
      return { 
        statusCode: response.status, headers, 
        body: JSON.stringify({ error: 'OpenAI error ' + response.status, detail: text }) 
      };
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ ephemeral_key: data.client_secret?.value, session_id: data.id })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
