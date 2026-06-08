// ─────────────────────────────────────────
//  utils.js  — Luxori shared utilities
// ─────────────────────────────────────────

// ── Supabase ──────────────────────────────
const SUPABASE_URL = 'https://jmsaceushtshgqulreyu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmc2FjZXVzaHRzaGdxdWxyZXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2OTgxOTQsImV4cCI6MjA1OTI3NDE5NH0.N4DrM2i6p0l0mO5g5dP1VpKrX7MhwHTVWqUl52JqO_0';

let _supa = null;
function getSupa() {
  if (_supa) return _supa;
  _supa = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
  return _supa;
}

// Lazy-load Supabase SDK
(function loadSupabase() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = () => { _supa = null; }; // reset so next call re-creates
  document.head.appendChild(s);
})();

// ── Storage (localStorage) ────────────────
const S = {
  get:    (k, def) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch { return def; } },
  set:    (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  remove: (k)      => { try { localStorage.removeItem(k); } catch {} },
};

// ── API call ──────────────────────────────
async function callAI(system, messages, maxTokens = 800, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const token = await getToken();
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ system, messages, maxTokens }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.text || '';
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(600 * (i + 1));
    }
  }
}

async function getToken() {
  try {
    const s = await getSupa()?.auth.getSession();
    return s?.data?.session?.access_token || null;
  } catch { return null; }
}

// ── JSON parser ───────────────────────────
function parseJSON(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
  }
}

// ── PDF text extraction ───────────────────
async function extractPDF(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(s => s.str).join(' ') + '\n';
        }
        resolve(text.trim().slice(0, 12000));
      } catch { resolve(''); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Image to base64 ───────────────────────
function imageToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// ── Helpers ───────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Material text ─────────────────────────
function getMaterialText(materials) {
  if (!materials?.length) return '';
  return materials
    .filter(m => m.type === 'text' || m.type === 'pdf' || m.type === 'url')
    .map(m => `[${m.name}]\n${m.content}`)
    .join('\n\n')
    .slice(0, 10000);
}

// ── System prompts ────────────────────────
const PROMPTS = {
  lesson: (subject, materials, level, lang) => `You are Luxori, an expert AI tutor for "${subject}".
Language: ${lang}. Level: ${level}.
RULE: Answer ONLY from the provided materials. If not covered, say: "That topic isn't in your uploaded materials."
Use **bold** for key terms. Keep responses clear and structured. End with one follow-up question.
MATERIALS:\n${getMaterialText(materials)}`,

  atlas: (subject, materials, level, lang) => `You are Atlas, a structured tutor for "${subject}".
Language: ${lang}. Level: ${level}.
RULE: Use ONLY the provided materials. Ask ONE short question to check understanding.
Max 3 sentences + 1 question. If asked "explain more" → give a deeper example from materials.
MATERIALS:\n${getMaterialText(materials)}`,

  spark: (subject, materials, lang) => `You are Spark, a Socratic challenger for "${subject}".
Language: ${lang}.
RULE: Use ONLY the materials. Challenge the student with ONE question per response.
If correct → confirm briefly + harder question. If wrong → guide without giving the answer.
Max 2 sentences + 1 question.
MATERIALS:\n${getMaterialText(materials)}`,

  chat: (subject, materials, lang) => `You are Luxori AI assistant for "${subject}".
Language: ${lang}.
RULE: Answer ONLY from the provided materials. Cite [Source: name] when relevant.
If not in materials, say: "That isn't in your uploaded materials."
MATERIALS:\n${getMaterialText(materials)}`,

  voice: (subject, materials, lang) => {
    const isSv = lang === 'Svenska';
    return (isSv
      ? `Du är Luxori, en varm AI-studieassistent i ett röstsamtal. Svara på svenska. Max 3 meningar. Prioritera materialet. Om inte i materialet: "Det finns inte i ditt material, men generellt..."`
      : `You are Luxori, a warm AI study tutor in a voice call. Max 3 sentences. Prioritize study material. If not in material: "That's not in your material, but generally..."`)
      + (subject ? ` Subject: ${subject}.` : '')
      + (materials?.length ? `\nMATERIAL:\n${getMaterialText(materials).slice(0, 3000)}` : '');
  },
};

// ── DB helpers ────────────────────────────
const db = {
  async loadSubjects(userId) {
    const r = await getSupa()?.from('subjects').select('*').eq('user_id', userId).order('created_at');
    return r?.data || [];
  },

  async saveSubject(data) {
    const r = await getSupa()?.from('subjects').upsert(data).select();
    return r?.data?.[0];
  },

  async deleteSubject(id) {
    await getSupa()?.from('subjects').delete().eq('id', id);
  },

  async loadMaterials(subjectId) {
    const r = await getSupa()?.from('materials').select('*').eq('subject_id', subjectId).order('created_at');
    return r?.data || [];
  },

  async saveMaterial(data) {
    const r = await getSupa()?.from('materials').upsert(data).select();
    return r?.data?.[0];
  },

  async deleteMaterial(id) {
    await getSupa()?.from('materials').delete().eq('id', id);
  },

  async saveSession(key, userId, messages) {
    await getSupa()?.from('sessions').upsert({ key, user_id: userId, messages: JSON.stringify(messages) });
  },

  async loadSession(key, userId) {
    const r = await getSupa()?.from('sessions').select('messages').eq('key', key).eq('user_id', userId).single();
    try { return r?.data ? JSON.parse(r.data.messages) : null; } catch { return null; }
  },
};

// ── Color palette ─────────────────────────
const COLORS = ['#4f46e5','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#db2777'];
const EMOJIS = ['📚','🧬','⚗️','🔢','🌍','🎨','💻','📖','🏛️','🎭','🏃','🎵'];
