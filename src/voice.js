// ─────────────────────────────────────────
//  voice.js — Luxori Voice Call
//  OpenAI Realtime API via WebRTC
//  ✅ AI pratar först automatiskt
//  ✅ Mikrofon alltid aktiv
//  ✅ Naturligt telefonsamtal
// ─────────────────────────────────────────

const _vc = {
  pc: null,       // RTCPeerConnection
  dc: null,       // DataChannel
  stream: null,   // Mic stream
  on: false,
  lang: 'English',
  subject: '',
};

// ── Greeting per language ─────────────────
const GREETINGS = {
  'Svenska':    'Hej! Jag är Luxori, din AI-studieassistent. Hur kan jag hjälpa dig idag?',
  'English':    "Hi! I'm Luxori, your AI study assistant. How can I help you today?",
  'German':     'Hallo! Ich bin Luxori, dein KI-Lernassistent. Wie kann ich dir heute helfen?',
  'Norwegian':  'Hei! Jeg er Luxori, din AI-studieassistent. Hvordan kan jeg hjelpe deg i dag?',
  'French':     "Bonjour! Je suis Luxori, votre assistant d'étude IA. Comment puis-je vous aider aujourd'hui?",
  'Spanish':    '¡Hola! Soy Luxori, tu asistente de estudio IA. ¿Cómo puedo ayudarte hoy?',
  'Portuguese': 'Olá! Sou Luxori, seu assistente de estudo IA. Como posso ajudar você hoje?',
  'Russian':    'Привет! Я Luxori, ваш ИИ-репетитор. Чем я могу помочь вам сегодня?',
  'Arabic':     'مرحباً! أنا Luxori، مساعدك الذكي للدراسة. كيف يمكنني مساعدتك اليوم؟',
  'Mandarin':   '你好！我是Luxori，你的AI学习助手。今天我能帮你做什么？',
  'Japanese':   'こんにちは！私はLuxori、あなたのAI学習アシスタントです。今日はどのようにお手伝いできますか？',
};

// ── Instructions per language ─────────────
function getInstructions(lang, subject) {
  const subj = subject ? ` Ämne: ${subject}.` : '';
  const map = {
    'Svenska':    `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara ALLTID på naturlig svenska. Max 2-3 korta meningar per svar. Var uppmuntrande och personlig.${subj}`,
    'English':    `You are Luxori, a warm AI study tutor. Always respond in English. Keep answers SHORT — max 2-3 sentences. Be natural and encouraging.${subject ? ` Subject: ${subject}.` : ''}`,
    'German':     `Du bist Luxori, ein freundlicher KI-Lernassistent. Antworte IMMER auf Deutsch. Maximal 2-3 Sätze.${subject ? ` Thema: ${subject}.` : ''}`,
    'Norwegian':  `Du er Luxori, en varm AI-studieassistent. Svar ALLTID på norsk. Maks 2-3 setninger.${subject ? ` Fag: ${subject}.` : ''}`,
    'French':     `Tu es Luxori, un assistant d'étude IA. Réponds TOUJOURS en français. Max 2-3 phrases.${subject ? ` Sujet: ${subject}.` : ''}`,
    'Spanish':    `Eres Luxori, un asistente de estudio IA. Responde SIEMPRE en español. Máximo 2-3 oraciones.${subject ? ` Tema: ${subject}.` : ''}`,
    'Portuguese': `Você é Luxori, um assistente IA. Responda SEMPRE em português. Máximo 2-3 frases.${subject ? ` Assunto: ${subject}.` : ''}`,
    'Russian':    `Ты Luxori, ИИ-репетитор. Отвечай ВСЕГДА на русском. Максимум 2-3 предложения.${subject ? ` Тема: ${subject}.` : ''}`,
    'Arabic':     `أنت Luxori، مساعد دراسة ذكاء اصطناعي. أجب دائماً بالعربية. 2-3 جمل كحد أقصى.`,
    'Mandarin':   `你是Luxori，AI学习助手。始终用中文回答。最多2-3句话。${subject ? ` 科目：${subject}。` : ''}`,
    'Japanese':   `あなたはLuxori、AI学習アシスタントです。必ず日本語で答えてください。最大2-3文。`,
  };
  return map[lang] || map['English'];
}

// ── Status display ────────────────────────
function vcStatus(msg) {
  const el = document.getElementById('vc-status');
  if (el) el.textContent = msg;
}

function vcOrb(mode) {
  const orb = document.getElementById('vc-orb');
  if (!orb) return;
  orb.className = 'vc-orb ' + (mode || '');
}

// ── End call ─────────────────────────────
function vcEnd() {
  _vc.on = false;
  if (_vc.dc)     { try { _vc.dc.close(); } catch {} _vc.dc = null; }
  if (_vc.pc)     { try { _vc.pc.close(); } catch {} _vc.pc = null; }
  if (_vc.stream) { _vc.stream.getTracks().forEach(t => t.stop()); _vc.stream = null; }

  const screen = document.getElementById('vc-screen');
  if (screen) screen.style.display = 'none';
  vcOrb('idle');
  vcStatus('');
}

// ── Start call ────────────────────────────
async function vcStart() {
  if (_vc.on) { vcEnd(); return; }
  _vc.on = true;

  // Read language from localStorage
  _vc.lang = localStorage.getItem('lx_lang') || 'English';
  _vc.subject = localStorage.getItem('lx_active_subject') || '';

  // Show call screen
  const screen = document.getElementById('vc-screen');
  if (screen) screen.style.display = 'flex';
  vcOrb('think');
  vcStatus(_vc.lang === 'Svenska' ? 'Ansluter...' : 'Connecting...');

  try {
    // 1. Get mic FIRST (before API call)
    vcStatus(_vc.lang === 'Svenska' ? 'Aktiverar mikrofon...' : 'Starting microphone...');
    _vc.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Get ephemeral key from Netlify
    vcStatus(_vc.lang === 'Svenska' ? 'Startar session...' : 'Starting session...');
    const sessRes = await fetch('/.netlify/functions/realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: _vc.lang, subject: _vc.subject }),
    });

    const rawText = await sessRes.text();
    let sessData;
    try { sessData = JSON.parse(rawText); }
    catch {
      vcStatus('Server error');
      console.error('[Voice] Non-JSON:', rawText.slice(0, 200));
      _vc.on = false;
      return;
    }

    if (!sessRes.ok || !sessData.ephemeral_key) {
      vcStatus('Session error: ' + (sessData.error || sessData.detail || 'HTTP ' + sessRes.status));
      console.error('[Voice]', sessData);
      _vc.on = false;
      return;
    }

    // 3. WebRTC setup
    _vc.pc = new RTCPeerConnection();

    // Add mic track
    _vc.stream.getTracks().forEach(track => _vc.pc.addTrack(track, _vc.stream));

    // Play AI audio
    _vc.pc.ontrack = (e) => {
      let audio = document.getElementById('vc-audio');
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'vc-audio';
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = e.streams[0];
    };

    // 4. DataChannel
    _vc.dc = _vc.pc.createDataChannel('oai-events');

    _vc.dc.onopen = () => {
      vcOrb('listen');
      vcStatus(_vc.lang === 'Svenska' ? '🎙️ Luxori lyssnar...' : '🎙️ Luxori listening...');

      // Send greeting — AI speaks first
      const greeting = GREETINGS[_vc.lang] || GREETINGS['English'];
      setTimeout(() => {
        if (_vc.dc?.readyState !== 'open') return;

        // Create greeting message
        _vc.dc.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'text', text: greeting }]
          }
        }));

        // Trigger AI to speak it
        _vc.dc.send(JSON.stringify({ type: 'response.create' }));
      }, 300);
    };

    _vc.dc.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'response.audio.delta') {
          vcOrb('speak');
          vcStatus(_vc.lang === 'Svenska' ? '🔊 Luxori pratar...' : '🔊 Luxori speaking...');
        } else if (ev.type === 'response.done') {
          vcOrb('listen');
          vcStatus(_vc.lang === 'Svenska' ? '🎙️ Din tur...' : '🎙️ Your turn...');
        } else if (ev.type === 'input_audio_buffer.speech_started') {
          vcOrb('listen');
          vcStatus(_vc.lang === 'Svenska' ? '🎤 Lyssnar på dig...' : '🎤 Listening to you...');
        }
      } catch {}
    };

    _vc.dc.onerror = (e) => {
      console.error('[Voice] DC error:', e);
      vcStatus('Connection error');
    };

    // 5. SDP exchange
    const offer = await _vc.pc.createOffer();
    await _vc.pc.setLocalDescription(offer);

    const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessData.ephemeral_key,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!sdpRes.ok) {
      const err = await sdpRes.text();
      vcStatus('SDP error: ' + sdpRes.status);
      console.error('[Voice] SDP:', err);
      vcEnd();
      return;
    }

    const answerSdp = await sdpRes.text();
    await _vc.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    // Session config — set language instructions
    setTimeout(() => {
      if (_vc.dc?.readyState !== 'open') return;
      _vc.dc.send(JSON.stringify({
        type: 'session.update',
        session: {
          instructions: getInstructions(_vc.lang, _vc.subject),
          voice: ['Svenska','Norwegian','Mandarin','Japanese'].includes(_vc.lang) ? 'shimmer' : 'alloy',
          turn_detection: { type: 'server_vad', silence_duration_ms: 800 },
          input_audio_transcription: { model: 'whisper-1' },
        }
      }));
    }, 200);

  } catch (e) {
    _vc.on = false;
    console.error('[Voice] Error:', e);
    if (e.name === 'NotAllowedError')  vcStatus('⚠️ Tillåt mikrofon');
    else if (e.name === 'NotFoundError') vcStatus('⚠️ Ingen mikrofon');
    else vcStatus('⚠️ ' + e.message);
    setTimeout(vcEnd, 3000);
  }
}

// ── Build call UI ─────────────────────────
function buildVoiceScreen() {
  if (document.getElementById('vc-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'vc-screen';
  screen.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    background: #0f172a;
    z-index: 1000;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
  `;

  screen.innerHTML = `
    <div style="text-align:center">
      <div id="vc-orb" class="vc-orb"></div>
      <h2 style="color:#fff;font-size:1.8rem;font-weight:700;margin:24px 0 8px">Luxori</h2>
      <p id="vc-status" style="color:#94a3b8;font-size:1rem"></p>
    </div>
    <button id="vc-end-btn" onclick="vcEnd()" style="
      width: 64px; height: 64px; border-radius: 50%;
      background: #ef4444; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; box-shadow: 0 4px 24px rgba(239,68,68,0.4);
    ">✕</button>
  `;

  document.body.appendChild(screen);

  // CSS for orb animation
  const style = document.createElement('style');
  style.textContent = `
    .vc-orb {
      width: 120px; height: 120px; border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #818cf8, #4f46e5);
      margin: 0 auto;
      box-shadow: 0 0 40px rgba(99,102,241,0.5);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .vc-orb.speak {
      animation: pulse-speak 0.8s ease-in-out infinite alternate;
      box-shadow: 0 0 60px rgba(99,102,241,0.8);
    }
    .vc-orb.listen {
      animation: pulse-listen 2s ease-in-out infinite;
    }
    .vc-orb.think {
      animation: spin-slow 3s linear infinite;
      opacity: 0.7;
    }
    @keyframes pulse-speak {
      from { transform: scale(1); }
      to   { transform: scale(1.15); }
    }
    @keyframes pulse-listen {
      0%,100% { transform: scale(1); opacity:1; }
      50%      { transform: scale(1.05); opacity:0.85; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg) scale(1); }
      to   { transform: rotate(360deg) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildVoiceScreen();

  // Bind call buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-voice-call], #lx-nb-call, .call-luxori-btn');
    if (btn) vcStart();
  });
});
