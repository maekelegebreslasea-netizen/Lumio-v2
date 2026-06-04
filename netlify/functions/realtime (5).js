exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No OpenAI key' }) };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const subject = body.subject || '';
    const lang = body.lang || 'English';
    const isSv = lang === 'Svenska';

    const instructions = isSv
      ? `Du är Luxori, en varm AI-studieassistent. Svara på svenska. Max 3 meningar. ${subject ? 'Ämne: ' + subject : ''}`
      : `You are Luxori, a warm AI study tutor. Short answers max 3 sentences. ${subject ? 'Subject: ' + subject : ''}`;

    // NEW GA endpoint: /v1/realtime/client_secrets
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          audio: {
            output: { voice: 'alloy' }
          },
          instructions,
          turn_detection: { type: 'server_vad' }
        }
      })
    });

    const text = await response.text();
    console.log('[Realtime] Status:', response.status, text.slice(0, 300));

    if (!response.ok) {
      // Try old beta endpoint as fallback
      const fallbackResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          instructions
        })
      });

      const fallbackText = await fallbackResp.text();
      console.log('[Realtime] Fallback status:', fallbackResp.status, fallbackText.slice(0, 300));

      if (!fallbackResp.ok) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Both endpoints failed', detail: fallbackText }) };
      }

      const fallbackData = JSON.parse(fallbackText);
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ 
          ephemeral_key: fallbackData.client_secret?.value,
          session_id: fallbackData.id,
          mode: 'beta'
        })
      };
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ 
        ephemeral_key: data.value,
        session_id: data.id || 'ga',
        mode: 'ga'
      })
    };

  } catch (e) {
    console.error('[Realtime]', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
