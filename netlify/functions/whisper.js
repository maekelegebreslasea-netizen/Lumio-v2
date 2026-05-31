exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { audio, language } = JSON.parse(event.body);
    if (!audio) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No audio provided' }) };

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenAI key not configured' }) };

    // Convert base64 audio to blob
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Create FormData for Whisper API
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-1');
    if (language) form.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Whisper error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Transcription failed' }) };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: data.text || '' })
    };

  } catch (err) {
    console.error('Whisper function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
