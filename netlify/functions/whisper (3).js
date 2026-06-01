exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body);
    const { audio, mimeType } = body;
    
    if (!audio) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No audio provided' }) };

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenAI key not configured' }) };

    const audioBuffer = Buffer.from(audio, 'base64');
    console.log(`[Whisper] Audio size: ${audioBuffer.length} bytes, mime: ${mimeType}`);

    // Determine file extension from mime type
    let filename = 'audio.webm';
    let contentType = 'audio/webm';
    
    if (mimeType) {
      if (mimeType.includes('mp4')) { filename = 'audio.mp4'; contentType = 'audio/mp4'; }
      else if (mimeType.includes('ogg')) { filename = 'audio.ogg'; contentType = 'audio/ogg'; }
      else if (mimeType.includes('webm')) { filename = 'audio.webm'; contentType = 'audio/webm'; }
      else { filename = 'audio.webm'; contentType = 'audio/webm'; }
    }

    // Build multipart form data manually
    const boundary = '----LuxoriWhisper' + Date.now();
    const CRLF = '\r\n';

    const fileHeader = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: ${contentType}`,
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

    const formBody = Buffer.concat([
      Buffer.from(fileHeader, 'utf8'),
      audioBuffer,
      Buffer.from(CRLF + modelPart + closing, 'utf8')
    ]);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formBody
    });

    const responseText = await response.text();
    console.log(`[Whisper] Status: ${response.status}, Response: ${responseText.slice(0, 200)}`);

    if (!response.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Transcription failed', detail: responseText }) };
    }

    const data = JSON.parse(responseText);
    return { statusCode: 200, headers, body: JSON.stringify({ text: data.text || '' }) };

  } catch (err) {
    console.error('[Whisper] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
