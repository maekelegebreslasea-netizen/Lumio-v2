exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { audio } = JSON.parse(event.body);
    if (!audio) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No audio' }) };

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No OpenAI key' }) };

    const audioBuffer = Buffer.from(audio, 'base64');

    // Build multipart form data manually — no external packages needed
    const boundary = '----LumioWhisper' + Date.now();
    const CRLF = '\r\n';

    const partHeader = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="audio.webm"',
      'Content-Type: audio/webm',
      '',
      ''
    ].join(CRLF);

    const modelPart = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="model"',
      '',
      'whisper-1',
      ''
    ].join(CRLF);

    const closing = `--${boundary}--${CRLF}`;

    const body = Buffer.concat([
      Buffer.from(partHeader, 'utf8'),
      audioBuffer,
      Buffer.from(CRLF + modelPart + closing, 'utf8')
    ]);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      body
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Whisper error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Transcription failed', detail: err }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify({ text: data.text || '' }) };

  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
