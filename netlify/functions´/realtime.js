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

    const instrMap = {
      'Svenska':    `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara ALLTID på naturlig svenska. Håll svaren korta — max 3 meningar. Var uppmuntrande.${subject ? ` Ämne: ${subject}.` : ''}`,
      'German':     `Du bist Luxori, ein freundlicher KI-Lernassistent in einem Gespräch. Antworte IMMER auf Deutsch. Maximal 3 Sätze.${subject ? ` Thema: ${subject}.` : ''}`,
      'Norwegian':  `Du er Luxori, en varm AI-studieassistent i en samtale. Svar ALLTID på norsk. Maks 3 setninger.${subject ? ` Fag: ${subject}.` : ''}`,
      'French':     `Tu es Luxori, un assistant d'étude IA dans un appel vocal. Réponds TOUJOURS en français. Max 3 phrases.${subject ? ` Sujet: ${subject}.` : ''}`,
      'Spanish':    `Eres Luxori, un asistente de estudio IA en una llamada. Responde SIEMPRE en español. Máximo 3 oraciones.${subject ? ` Tema: ${subject}.` : ''}`,
      'Portuguese': `Você é Luxori, um assistente de estudo IA numa chamada. Responda SEMPRE em português. Máximo 3 frases.${subject ? ` Assunto: ${subject}.` : ''}`,
      'Russian':    `Ты Luxori, дружелюбный ИИ-репетитор в голосовом звонке. Отвечай ВСЕГДА на русском языке. Максимум 3 предложения.${subject ? ` Тема: ${subject}.` : ''}`,
      'Arabic':     `أنت Luxori، مساعد دراسة ذكاء اصطناعي في مكالمة صوتية. أجب دائماً بالعربية. 3 جمل كحد أقصى.${subject ? ` الموضوع: ${subject}.` : ''}`,
      'Mandarin':   `你是Luxori，一个语音通话中的AI学习助手。始终用中文回答。最多3句话。${subject ? ` 科目：${subject}。` : ''}`,
      'Japanese':   `あなたはLuxori、音声通話中のAI学習アシスタントです。必ず日本語で答えてください。最大3文。${subject ? ` 科目：${subject}。` : ''}`,
      'English':    `You are Luxori, a warm AI study tutor in a voice call. Keep answers SHORT — max 3 sentences. Be natural and encouraging.${subject ? ` Subject: ${subject}.` : ''}`,
    };

    const instructions = instrMap[lang] || instrMap['English'];

    const voiceMap = {
      'Svenska': 'shimmer', 'Norwegian': 'shimmer', 'German': 'alloy',
      'French': 'alloy', 'Spanish': 'alloy', 'Portuguese': 'alloy',
      'Russian': 'echo', 'Arabic': 'echo', 'Mandarin': 'shimmer',
      'Japanese': 'shimmer', 'English': 'alloy',
    };
    const voice = voiceMap[lang] || 'alloy';

    // Beta endpoint (most reliable)
    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice,
        instructions,
        turn_detection: { type: 'server_vad' },
        input_audio_transcription: { model: 'whisper-1' },
      })
    });

    const text = await res.text();
    console.log('[Realtime] Status:', res.status, text.slice(0, 200));

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: 'OpenAI error', detail: text.slice(0, 300) }) };
    }

    const data = JSON.parse(text);
    const key = data.client_secret?.value;

    if (!key) {
      console.error('[Realtime] No client_secret.value in:', text.slice(0, 300));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No ephemeral key', raw: text.slice(0, 300) }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ephemeral_key: key, mode: 'beta' }) };

  } catch (e) {
    console.error('[Realtime]', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
