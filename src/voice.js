// ─────────────────────────────────────────
//  voice.js  — Luxori voice call
//  Uses OpenAI Realtime API via WebRTC
// ─────────────────────────────────────────

const _vc = {
  on: false,
  pc: null,    // RTCPeerConnection
  dc: null,    // DataChannel
  stream: null,
  audio: null,
  lang: 'English',
};

// ── Orb animation ─────────────────────────
let _orbCtx = null, _orbMode = 'idle', _orbPhase = 0;

function initOrb() {
  const cv = document.getElementById('vc-canvas');
  if (!cv) return;
  _orbCtx = cv.getContext('2d');
  drawOrb();
}

function drawOrb() {
  if (!_orbCtx) return;
  const ctx = _orbCtx, cx = 50, cy = 50, w = 100, h = 100;
  ctx.clearRect(0, 0, w, h);
  _orbPhase += 0.04;

  const r = _orbMode === 'listen' ? 34 + Math.sin(_orbPhase * 2.5) * 6
          : _orbMode === 'speak'  ? 32 + Math.sin(_orbPhase * 5) * 7
          : 32 + Math.sin(_orbPhase) * 2;

  // Outer glow
  const glow = ctx.createRadialGradient(cx, cy, r * .2, cx, cy, r * 2);
  glow.addColorStop(0, _orbMode === 'listen' ? 'rgba(5,150,105,.25)' : _orbMode === 'speak' ? 'rgba(79,70,229,.25)' : 'rgba(79,70,229,.1)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, Math.PI * 2); ctx.fill();

  // Main sphere
  const grad = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .05, cx, cy, r);
  if (_orbMode === 'speak') {
    grad.addColorStop(0, '#c4b5fd'); grad.addColorStop(.5, '#7c3aed'); grad.addColorStop(1, '#3b0764');
  } else if (_orbMode === 'listen') {
    grad.addColorStop(0, '#6ee7b7'); grad.addColorStop(.5, '#059669'); grad.addColorStop(1, '#064e3b');
  } else if (_orbMode === 'think') {
    grad.addColorStop(0, '#93c5fd'); grad.addColorStop(.5, '#3b82f6'); grad.addColorStop(1, '#1e3a8a');
  } else {
    grad.addColorStop(0, '#818cf8'); grad.addColorStop(.5, '#4f46e5'); grad.addColorStop(1, '#312e81');
  }
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Shine
  const shine = ctx.createRadialGradient(cx - r * .35, cy - r * .35, 0, cx - r * .2, cy - r * .2, r * .5);
  shine.addColorStop(0, 'rgba(255,255,255,.4)');
  shine.addColorStop(1, 'transparent');
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Rings when active
  if (_orbMode !== 'idle') {
    [1, 2].forEach(i => {
      ctx.strokeStyle = `rgba(255,255,255,${.1 + Math.sin(_orbPhase * 3 + i) * .06})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r + i * 12, 0, Math.PI * 2); ctx.stroke();
    });
  }

  requestAnimationFrame(drawOrb);
}

// ── UI helpers ────────────────────────────
function vcStatus(text) {
  const el = document.getElementById('vc-status');
  if (el) el.textContent = text;
}

function vcAddMsg(role, text) {
  const box = document.getElementById('vc-msgs');
  if (!box || !text) return;
  const b = document.createElement('div');
  b.className = 'vc-bubble ' + role;
  b.textContent = text;
  box.appendChild(b);
  setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
}

// ── Show/hide FABs on mobile ──────────────
function vcUpdateFabs() {
  if (window.innerWidth >= 1024) return;
  const visible = !!document.querySelector('.top-brand, [data-sid]');
  const vcBtn  = document.getElementById('vc-fab');
  if (vcBtn) vcBtn.style.display = visible ? 'flex' : 'none';
}
setInterval(vcUpdateFabs, 700);

// ── Start call ────────────────────────────
async function vcStart() {
  _vc.on = true;

  // Clear previous messages
  const box = document.getElementById('vc-msgs');
  if (box) box.innerHTML = '';

  // Show call screen
  const screen = document.getElementById('vc-screen');
  if (screen) screen.classList.add('on');

  _orbMode = 'think';
  vcStatus('Connecting...');

  try {
    // 1. Mic
    _vc.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Language + subject context
    _vc.lang = localStorage.getItem('lx_lang') || 'English';
    const subjEl = document.querySelector('[data-nid]');
    const subjName = subjEl?.dataset?.nnm || '';

    // 3. Get ephemeral key
    vcStatus('Getting session...');
    const sessRes = await fetch('/.netlify/functions/realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subjName, lang: _vc.lang }),
    });
    const sessData = await sessRes.json();

    if (!sessData.ephemeral_key) {
      vcStatus('Session error: ' + (sessData.error || 'unknown'));
      console.error('[Voice]', sessData);
      return;
    }

    // 4. WebRTC setup
    _vc.pc = new RTCPeerConnection();

    // 5. Audio output
    _vc.audio = document.createElement('audio');
    _vc.audio.autoplay = true;
    document.body.appendChild(_vc.audio);
    _vc.pc.ontrack = e => {
      _vc.audio.srcObject = e.streams[0];
    };

    // 6. Add mic track
    _vc.stream.getTracks().forEach(t => _vc.pc.addTrack(t, _vc.stream));

    // 7. Data channel
    _vc.dc = _vc.pc.createDataChannel('oai-events');
    _vc.dc.onopen = () => {
      const isSv = _vc.lang === 'Svenska';
      _orbMode = 'think';
      vcStatus(isSv ? 'Luxori tänker...' : 'Luxori thinking...');

      // Send greeting — Luxori speaks first
      const greetingMap = {
        'Svenska':    'Hej! Jag är Luxori, din AI-studieassistent. Vad vill du lära dig idag?',
        'English':    "Hi! I'm Luxori, your AI study assistant. What would you like to learn today?",
        'German':     'Hallo! Ich bin Luxori, dein KI-Lernassistent. Was möchtest du heute lernen?',
        'Norwegian':  'Hei! Jeg er Luxori, din AI-studieassistent. Hva vil du lære i dag?',
        'French':     "Bonjour! Je suis Luxori, votre assistant d'étude IA. Que voulez-vous apprendre aujourd'hui?",
        'Spanish':    '¡Hola! Soy Luxori, tu asistente de estudio IA. ¿Qué quieres aprender hoy?',
        'Portuguese': 'Olá! Sou Luxori, seu assistente de estudo IA. O que você quer aprender hoje?',
        'Russian':    'Привет! Я Luxori, ваш ИИ-помощник в учёбе. Что вы хотите изучить сегодня?',
        'Arabic':     'مرحباً! أنا Luxori، مساعدك الذكي للدراسة. ماذا تريد أن تتعلم اليوم؟',
        'Mandarin':   '你好！我是Luxori，你的AI学习助手。今天想学什么？',
        'Japanese':   'こんにちは！私はLuxori、あなたのAI学習アシスタントです。今日は何を学びたいですか？',
      };
      const greeting = greetingMap[_vc.lang] || greetingMap['English'];

      // Send as conversation item so Luxori speaks it
      setTimeout(() => {
        if (_vc.dc?.readyState === 'open') {
          _vc.dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: greeting }]
            }
          }));
          _vc.dc.send(JSON.stringify({ type: 'response.create' }));
        }
      }, 500);
    };

    _vc.dc.onmessage = e => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'input_audio_buffer.speech_started') {
          _orbMode = 'listen';
          vcStatus(_vc.lang === 'Svenska' ? '🎙️ Jag hör dig...' : '🎙️ I hear you...');
        }
        if (ev.type === 'input_audio_buffer.speech_stopped') {
          _orbMode = 'think';
          vcStatus(_vc.lang === 'Svenska' ? 'Luxori tänker...' : 'Luxori thinking...');
        }
        if (ev.type === 'response.audio.delta') {
          _orbMode = 'speak';
          vcStatus(_vc.lang === 'Svenska' ? 'Luxori talar...' : 'Luxori speaking...');
        }
        if (ev.type === 'response.audio.done') {
          _orbMode = 'listen';
          vcStatus(_vc.lang === 'Svenska' ? '🎙️ Lyssnar...' : '🎙️ Listening...');
        }
        if (ev.type === 'conversation.item.input_audio_transcription.completed') {
          vcAddMsg('user', ev.transcript);
        }
        if (ev.type === 'response.audio_transcript.done') {
          vcAddMsg('ai', ev.transcript);
        }
        if (ev.type === 'error') {
          console.error('[Voice event error]', ev.error);
          vcStatus('Error: ' + (ev.error?.message || 'unknown'));
        }
      } catch (err) {
        console.error('[Voice] Event parse error:', err);
      }
    };

    // 8. SDP offer
    const offer = await _vc.pc.createOffer();
    await _vc.pc.setLocalDescription(offer);

    // 9. Send to OpenAI
    vcStatus('Connecting to Luxori AI...');
    const sdpUrl = sessData.mode === 'ga'
      ? 'https://api.openai.com/v1/realtime/calls'
      : 'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';

    const sdpRes = await fetch(sdpUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + sessData.ephemeral_key,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!sdpRes.ok) {
      const errText = await sdpRes.text();
      vcStatus('Connection failed: ' + sdpRes.status);
      console.error('[Voice] SDP error:', errText);
      return;
    }

    const answerSdp = await sdpRes.text();
    await _vc.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    vcStatus(_vc.lang === 'Svenska' ? '✓ Ansluten — prata fritt' : '✓ Connected — speak freely');

  } catch (e) {
    _vc.on = false;
    console.error('[Voice] Start error:', e);
    if (e.name === 'NotAllowedError') vcStatus('⚠️ Allow microphone access');
    else if (e.name === 'NotFoundError') vcStatus('⚠️ No microphone found');
    else vcStatus('Error: ' + e.name);
  }
}

// ── End call ──────────────────────────────
function vcEnd() {
  _vc.on = false;
  _orbMode = 'idle';

  if (_vc.dc)  try { _vc.dc.close(); }  catch {}
  if (_vc.pc)  try { _vc.pc.close(); }  catch {}
  if (_vc.stream) _vc.stream.getTracks().forEach(t => t.stop());
  if (_vc.audio) { _vc.audio.srcObject = null; _vc.audio.remove(); }

  _vc.pc = null; _vc.dc = null; _vc.stream = null; _vc.audio = null;

  const screen = document.getElementById('vc-screen');
  if (screen) screen.classList.remove('on');
}

// ── Inject voice UI into DOM ──────────────
document.addEventListener('DOMContentLoaded', () => {
  // FABs (mobile)
  const vcFab = document.createElement('button');
  vcFab.id = 'vc-fab';
  vcFab.className = 'vc-fab';
  vcFab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  vcFab.style.display = 'none';
  vcFab.onclick = vcStart;
  document.body.appendChild(vcFab);

  // Voice call screen
  const screen = document.createElement('div');
  screen.id = 'vc-screen';
  screen.className = 'vc-screen';
  screen.innerHTML = `
    <canvas id="vc-canvas" width="100" height="100" style="border-radius:50%"></canvas>
    <div class="vc-name">Luxori</div>
    <div class="vc-status" id="vc-status">Connecting...</div>
    <div class="vc-msgs" id="vc-msgs"></div>
    <div class="vc-controls">
      <div class="vc-wave">
        <span></span><span></span><span></span>
      </div>
      <button class="vc-end-btn" onclick="vcEnd()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(screen);

  // Init orb
  setTimeout(initOrb, 100);
});
