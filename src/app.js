// ─────────────────────────────────────────
//  app.js  — Luxori main React application
// ─────────────────────────────────────────
const { useState, useEffect, useCallback, useRef } = React;
const h = React.createElement;

// ── Icons (SVG) ───────────────────────────
const Icon = ({ name, size = 18, color = 'currentColor' }) => {
  const paths = {
    home:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    lesson:  'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    users:   'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    chat:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    game:    'M6 12h8 M10 8v8 M19 12a7 7 0 1 0-14 0 7 7 0 0 0 14 0',
    user:    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    plus:    'M12 5v14 M5 12h14',
    trash:   'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
    upload:  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
    check:   'M20 6L9 17l-5-5',
    x:       'M18 6L6 18 M6 6l12 12',
    chevron: 'M9 18l6-6-6-6',
    phone:   'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
    star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  };
  const d = paths[name] || '';
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    ...d.split(' M ').filter(Boolean).map((seg, i) =>
      h('path', { key: i, d: (i === 0 ? '' : 'M ') + seg })
    )
  );
};

// ── Auth screens ──────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [err, setErr]     = useState('');
  const [busy, setBusy]   = useState(false);

  const validate = () => {
    if (!email.includes('@')) return 'Enter a valid email.';
    if (pass.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'signup' && !/[A-Z]/.test(pass)) return 'Password needs an uppercase letter.';
    if (mode === 'signup' && !/[0-9]/.test(pass)) return 'Password needs a number.';
    return '';
  };

  const submit = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setBusy(true); setErr('');
    try {
      const fn = mode === 'login' ? 'signInWithPassword' : 'signUp';
      const { data, error } = await getSupa().auth[fn]({ email, password: pass });
      if (error) throw error;
      onAuth(data.user || data.session?.user);
    } catch (e) {
      setErr(e.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return h('div', { className: 'auth-wrap' },
    h('img', { src: 'src/logo.png', alt: 'Luxori', style: { width: 180, marginBottom: 4 } }),
    h('p', { className: 'auth-sub' }, 'Your AI-powered study assistant'),
    h('div', { className: 'auth-card' },
      h('h2', { style: { fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 } },
        mode === 'login' ? 'Sign in' : 'Create account'
      ),
      h('div', { className: 'field' },
        h('label', { className: 'label' }, 'Email'),
        h('input', { className: 'input', type: 'email', placeholder: 'you@example.com', value: email, onChange: e => setEmail(e.target.value) })
      ),
      h('div', { className: 'field' },
        h('label', { className: 'label' }, 'Password'),
        h('input', { className: 'input', type: 'password', placeholder: '••••••••', value: pass, onChange: e => setPass(e.target.value), onKeyDown: e => e.key === 'Enter' && submit() })
      ),
      err && h('div', { className: 'alert alert-err', style: { marginBottom: 12 } }, err),
      h('button', { className: 'btn btn-primary btn-full btn-lg', onClick: submit, disabled: busy },
        busy ? h('span', { className: 'loader' }) : (mode === 'login' ? 'Sign in' : 'Create account')
      ),
      h('div', { style: { textAlign: 'center', marginTop: 16, fontSize: '.85rem', color: 'var(--c-muted)' } },
        mode === 'login' ? "Don't have an account? " : 'Already have an account? ',
        h('button', {
          style: { background: 'none', border: 'none', color: 'var(--c-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '.85rem' },
          onClick: () => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }
        }, mode === 'login' ? 'Sign up' : 'Sign in')
      )
    )
  );
}

// ── Subjects screen ───────────────────────
function SubjectsScreen({ user, subjects, onOpen, onNew }) {
  return h('div', { className: 'page' },
    h('div', { style: { marginBottom: 20 } },
      h('h1', { style: { fontSize: '1.5rem', fontFamily: 'var(--font-serif)' } }, 'My Subjects'),
      h('p', { className: 'c-muted fs-sm mt-2' }, 'Upload material, Luxori teaches the rest.')
    ),
    h('div', { className: 'subj-grid' },
      subjects.map(s =>
        h('div', {
          key: s.id,
          className: 'subj-card',
          'data-sid': s.id,
          'data-sname': s.name,
          onClick: () => onOpen(s)
        },
          h('div', { className: 'subj-icon', style: { background: s.color + '18' } }, s.emoji || '📚'),
          h('div', { className: 'subj-name' }, s.name),
          h('div', { className: 'subj-meta' }, (s.material_count || 0) + ' materials'),
          h('div', { className: 'progress-bar' },
            h('div', { className: 'progress-fill', style: { width: (s.mastery || 0) + '%' } })
          )
        )
      ),
      h('div', { className: 'subj-card subj-new', onClick: onNew },
        h(Icon, { name: 'plus', size: 20 }),
        h('span', { style: { fontSize: '.82rem', fontWeight: 500 } }, 'New Subject')
      )
    )
  );
}

// ── New subject modal ─────────────────────
function NewSubjectModal({ user, onSave, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const subj = { id: uid(), user_id: user.id, name: name.trim(), color, emoji, mastery: 0, material_count: 0, created_at: new Date().toISOString() };
      await db.saveSubject(subj);
      onSave(subj);
    } finally { setBusy(false); }
  };

  return h('div', { className: 'sheet-overlay', onClick: e => e.target === e.currentTarget && onClose() },
    h('div', { className: 'sheet' },
      h('div', { className: 'sheet-handle' }),
      h('h2', { style: { fontSize: '1.1rem', fontWeight: 700, marginBottom: 18 } }, 'New Subject'),
      h('div', { className: 'field' },
        h('label', { className: 'label' }, 'Name'),
        h('input', { className: 'input', placeholder: 'e.g. Human Anatomy', value: name, onChange: e => setName(e.target.value), autoFocus: true })
      ),
      h('div', { className: 'field' },
        h('label', { className: 'label' }, 'Emoji'),
        h('div', { className: 'chips' }, EMOJIS.map(e =>
          h('button', { key: e, className: 'chip' + (emoji === e ? ' on' : ''), onClick: () => setEmoji(e), style: { fontSize: '1.1rem' } }, e)
        ))
      ),
      h('div', { className: 'field' },
        h('label', { className: 'label' }, 'Color'),
        h('div', { style: { display: 'flex', gap: 8 } }, COLORS.map(c =>
          h('button', {
            key: c,
            onClick: () => setColor(c),
            style: {
              width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid #111' : '2px solid transparent', cursor: 'pointer'
            }
          })
        ))
      ),
      h('div', { style: { display: 'flex', gap: 10, marginTop: 8 } },
        h('button', { className: 'btn btn-ghost btn-full', onClick: onClose }, 'Cancel'),
        h('button', { className: 'btn btn-primary btn-full', onClick: save, disabled: busy || !name.trim() },
          busy ? h('span', { className: 'loader' }) : 'Create'
        )
      )
    )
  );
}

// ── Subject detail screen ─────────────────
function SubjectScreen({ subject, user, lang, onBack, onLesson, onDual, onChat, onGames }) {
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showText, setShowText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    db.loadMaterials(subject.id).then(setMaterials);
  }, [subject.id]);

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      let content = '', type = 'text', name = file.name;
      if (file.type === 'application/pdf') {
        content = await extractPDF(file);
        type = 'pdf';
      } else if (file.type.startsWith('image/')) {
        content = await imageToBase64(file);
        type = 'image';
        name = file.name;
      } else {
        content = await file.text();
      }
      const mat = { id: uid(), subject_id: subject.id, user_id: user.id, name, type, content: content.slice(0, 15000), created_at: new Date().toISOString() };
      await db.saveMaterial(mat);
      setMaterials(prev => [...prev, mat]);
    } finally { setUploading(false); }
  };

  const addText = async () => {
    if (!textInput.trim()) return;
    const mat = { id: uid(), subject_id: subject.id, user_id: user.id, name: 'Text note', type: 'text', content: textInput.trim().slice(0, 15000), created_at: new Date().toISOString() };
    await db.saveMaterial(mat);
    setMaterials(prev => [...prev, mat]);
    setTextInput(''); setShowText(false);
  };

  const deleteMat = async (id) => {
    await db.deleteMaterial(id);
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const modes = [
    { id: 'lesson', icon: 'lesson', label: 'Lesson', desc: 'AI tutor explains step by step', color: '#eef2ff', onClick: onLesson },
    { id: 'dual',   icon: 'users',  label: 'Dual AI', desc: 'Atlas explains, Spark challenges', color: '#fdf4ff', onClick: onDual },
    { id: 'chat',   icon: 'chat',   label: 'Chat',    desc: 'Ask anything from your material', color: '#f0fdf4', onClick: onChat },
    { id: 'games',  icon: 'game',   label: 'Games',   desc: 'Flashcards, quizzes and more', color: '#fff7ed', onClick: onGames },
  ];

  return h('div', null,
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack },
        h(Icon, { name: 'chevron', size: 16, color: 'var(--c-primary)' }),
        ' Back'
      ),
      h('span', {
        className: 'topbar-title',
        'data-nid': subject.id,
        'data-nnm': subject.name
      }, subject.name),
      h('div', { style: { width: 60 } })
    ),
    h('div', { className: 'page' },
      // Study modes
      h('div', { className: 'section-hd', style: { marginBottom: 10 } },
        h('span', { className: 'section-title' }, 'Study modes')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 } },
        modes.map(m =>
          h('button', {
            key: m.id,
            className: 'btn btn-ghost',
            style: { justifyContent: 'flex-start', gap: 12, padding: '12px 14px', background: m.color, border: 'none', borderRadius: 'var(--radius)' },
            onClick: m.onClick,
            disabled: !materials.length
          },
            h(Icon, { name: m.icon, size: 20, color: 'var(--c-primary)' }),
            h('div', { style: { textAlign: 'left' } },
              h('div', { style: { fontWeight: 600, fontSize: '.9rem' } }, m.label),
              h('div', { style: { fontSize: '.78rem', color: 'var(--c-muted)', marginTop: 1 } }, m.desc)
            )
          )
        )
      ),
      !materials.length && h('div', { className: 'alert alert-info', style: { marginBottom: 16 } },
        '⬆️ Upload material to unlock study modes.'
      ),

      // Materials
      h('div', { className: 'section-hd' },
        h('span', { className: 'section-title' }, `Materials (${materials.length})`),
        h('button', {
          className: 'btn btn-primary btn-sm',
          onClick: () => fileRef.current?.click(),
          disabled: uploading
        }, uploading ? h('span', { className: 'loader' }) : '+ Upload')
      ),
      h('input', { ref: fileRef, type: 'file', accept: '.pdf,image/*,.txt', style: { display: 'none' }, onChange: e => e.target.files[0] && uploadFile(e.target.files[0]) }),

      materials.map(m =>
        h('div', { key: m.id, className: 'mat-item' },
          h('div', { className: 'mat-icon' }, m.type === 'pdf' ? '📄' : m.type === 'image' ? '🖼️' : '📝'),
          h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.name),
          h('button', {
            style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', padding: '2px 4px' },
            onClick: () => deleteMat(m.id)
          }, h(Icon, { name: 'trash', size: 14 }))
        )
      ),

      h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
        h('button', { className: 'btn btn-ghost btn-sm', onClick: () => setShowText(!showText) }, '+ Add text'),
      ),
      showText && h('div', { style: { marginTop: 10 } },
        h('textarea', { className: 'input', rows: 4, placeholder: 'Paste text, notes, or content here...', value: textInput, onChange: e => setTextInput(e.target.value) }),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          h('button', { className: 'btn btn-ghost btn-sm', onClick: () => setShowText(false) }, 'Cancel'),
          h('button', { className: 'btn btn-primary btn-sm', onClick: addText, disabled: !textInput.trim() }, 'Save')
        )
      )
    )
  );
}

// ── Chat screen (shared for Lesson, Chat) ─
function ChatScreen({ subject, materials, lang, level, mode, user, onBack }) {
  const [msgs, setMsgs]     = useState([]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const systemPrompt = () => {
    if (mode === 'lesson') return PROMPTS.lesson(subject.name, materials, level, lang);
    return PROMPTS.chat(subject.name, materials, lang);
  };

  const modeLabel = mode === 'lesson' ? 'Lesson' : 'Chat';

  useEffect(() => {
    // Load session
    db.loadSession(mode + '_' + subject.id, user.id).then(saved => {
      if (saved?.length) setMsgs(saved);
      else {
        const welcome = { role: 'assistant', id: uid(), text: mode === 'lesson'
          ? `Hi! I'm Luxori, your tutor for **${subject.name}**. What would you like to learn today?`
          : `Hi! Ask me anything about **${subject.name}** — I'll answer from your uploaded materials.`
        };
        setMsgs([welcome]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', id: uid(), text: input.trim() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const history = newMsgs.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const reply = await callAI(systemPrompt(), history, 900);
      const aiMsg = { role: 'assistant', id: uid(), text: reply };
      const updated = [...newMsgs, aiMsg];
      setMsgs(updated);
      await db.saveSession(mode + '_' + subject.id, user.id, updated.slice(-20));
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', id: uid(), text: 'Connection error. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, msgs, loading]);

  const chips = mode === 'lesson'
    ? ["Explain this more", "Give an example", "Simpler please", "What's the key point?"]
    : ["What's on the exam?", "Summarize this", "Key concepts?", "What should I focus on?"];

  return h('div', { className: 'chat-wrap' },
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, modeLabel + ' — ' + subject.name),
      h('div', { style: { width: 60 } })
    ),
    h('div', { className: 'chat-msgs' },
      msgs.map(m =>
        h('div', { key: m.id, className: 'msg ' + (m.role === 'user' ? 'msg-user' : 'msg-ai') },
          m.text?.replace(/\*\*(.*?)\*\*/g, '$1')
        )
      ),
      loading && h('div', { className: 'msg msg-ai' }, h('span', { className: 'loader' })),
      h('div', { ref: bottomRef })
    ),
    h('div', { className: 'chips', style: { padding: '4px 12px 0', overflowX: 'auto', flexWrap: 'nowrap' } },
      chips.map(c => h('button', { key: c, className: 'chip', style: { whiteSpace: 'nowrap' }, onClick: () => setInput(c) }, c))
    ),
    h('div', { className: 'chat-input-row' },
      h('textarea', {
        className: 'chat-input',
        rows: 1,
        placeholder: 'Ask a question...',
        value: input,
        onChange: e => setInput(e.target.value),
        onKeyDown: e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())
      }),
      h('button', { className: 'send-btn', onClick: send, disabled: !input.trim() || loading },
        h(Icon, { name: 'chevron', size: 18, color: '#fff' })
      )
    )
  );
}

// ── Dual AI screen ────────────────────────
function DualScreen({ subject, materials, lang, level, user, onBack }) {
  const [msgs, setMsgs]   = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(null); // 'atlas'|'spark'|null

  useEffect(() => {
    const welcome = { role: 'atlas', id: uid(), text: `Hi! I'm **Atlas**, your structured tutor. Let's explore **${subject.name}** together. What topic shall we start with?` };
    setMsgs([welcome]);
  }, []);

  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', id: uid(), text: input.trim() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput('');

    const last = [...newMsgs].reverse().find(m => m.role === 'atlas' || m.role === 'spark');
    const next = (!last || last.role === 'spark') ? 'atlas' : 'spark';
    setLoading(next);

    const history = newMsgs.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    const sys = next === 'atlas'
      ? PROMPTS.atlas(subject.name, materials, level, lang)
      : PROMPTS.spark(subject.name, materials, lang);

    try {
      const reply = await callAI(sys, history, 500);
      setMsgs(prev => [...prev, { role: next, id: uid(), text: reply }]);
    } catch {
      setMsgs(prev => [...prev, { role: next, id: uid(), text: 'Connection error. Try again.' }]);
    } finally { setLoading(null); }
  };

  const roleColor = r => r === 'atlas' ? 'var(--c-primary)' : r === 'spark' ? '#e11d48' : 'transparent';
  const roleLabel = r => r === 'atlas' ? 'ATLAS' : r === 'spark' ? 'SPARK' : '';

  return h('div', { className: 'chat-wrap' },
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, 'Dual AI'),
      h('div', { style: { width: 60 } })
    ),
    h('div', { className: 'chat-msgs' },
      msgs.map(m =>
        h('div', { key: m.id, className: 'msg msg-ai', style: { borderLeft: m.role !== 'user' ? '3px solid ' + roleColor(m.role) : 'none', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--c-primary)' : 'var(--c-surface)', color: m.role === 'user' ? '#fff' : 'var(--c-text)' } },
          m.role !== 'user' && h('div', { className: 'msg-role', style: { color: roleColor(m.role) } }, roleLabel(m.role)),
          m.text?.replace(/\*\*(.*?)\*\*/g, '$1')
        )
      ),
      loading && h('div', { className: 'msg msg-ai', style: { borderLeft: '3px solid ' + roleColor(loading) } },
        h('div', { className: 'msg-role', style: { color: roleColor(loading) } }, roleLabel(loading)),
        h('span', { className: 'loader' })
      ),
      h('div', { ref: bottomRef })
    ),
    h('div', { className: 'chat-input-row' },
      h('textarea', {
        className: 'chat-input',
        rows: 1,
        placeholder: 'Reply to Atlas or Spark...',
        value: input,
        onChange: e => setInput(e.target.value),
        onKeyDown: e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())
      }),
      h('button', { className: 'send-btn', onClick: send, disabled: !input.trim() || !!loading },
        h(Icon, { name: 'chevron', size: 18, color: '#fff' })
      )
    )
  );
}

// ── Games screen ──────────────────────────
function GamesScreen({ subject, materials, lang, level, onBack }) {
  const [game, setGame] = useState(null);

  if (game === 'flash')  return h(FlashGame,  { subject, materials, lang, onBack: () => setGame(null) });
  if (game === 'speed')  return h(SpeedGame,  { subject, materials, lang, onBack: () => setGame(null) });
  if (game === 'exam')   return h(ExamGame,   { subject, materials, lang, level, onBack: () => setGame(null) });

  const games = [
    { id: 'flash', icon: '🃏', label: 'Flashcards', desc: 'Flip cards to learn key concepts', color: '#eef2ff' },
    { id: 'speed', icon: '⚡', label: 'Speed Quiz',  desc: '10 questions — how fast can you go?', color: '#fdf4ff' },
    { id: 'exam',  icon: '📝', label: 'Exam Prep',   desc: 'Full exam with explanations', color: '#f0fdf4' },
  ];

  return h('div', null,
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, 'Games')
    ),
    h('div', { className: 'page' },
      h('p', { className: 'c-muted fs-sm mb-4' }, 'Learn through play. All questions come from your uploaded material.'),
      !materials.length && h('div', { className: 'alert alert-warn mb-4' }, '⚠️ Upload study material first to generate games.'),
      h('div', { className: 'game-grid' },
        games.map(g =>
          h('button', {
            key: g.id,
            className: 'game-card',
            onClick: () => setGame(g.id),
            disabled: !materials.length,
            style: { background: g.color, border: '1px solid var(--c-border)', cursor: materials.length ? 'pointer' : 'not-allowed' }
          },
            h('div', { className: 'game-icon', style: { background: 'rgba(255,255,255,.7)' } }, g.icon),
            h('div', null,
              h('div', { style: { fontWeight: 600, fontSize: '.9rem' } }, g.label),
              h('div', { style: { fontSize: '.78rem', color: 'var(--c-muted)', marginTop: 2 } }, g.desc)
            )
          )
        )
      )
    )
  );
}

// ── Flashcards game ───────────────────────
function FlashGame({ subject, materials, lang, onBack }) {
  const [cards, setCards]   = useState(null);
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => { generate(); }, []);

  const generate = async () => {
    setLoading(true); setErr('');
    try {
      const mt = getMaterialText(materials);
      const raw = await callAI('Return ONLY valid JSON, no markdown.', [{
        role: 'user',
        content: `Create 12 flashcards in ${lang} based ONLY on this material.\nJSON: {"cards":[{"front":"term or concept","back":"definition or explanation"}]}\n\nMATERIAL:\n${mt.slice(0, 3000)}`
      }], 1500);
      const data = parseJSON(raw);
      if (!data?.cards?.length) throw new Error('No cards generated');
      setCards(data.cards);
      setIdx(0); setFlipped(false); setKnown(0);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 } },
    h('span', { className: 'loader' }),
    h('p', { className: 'c-muted fs-sm' }, 'Generating flashcards...')
  );

  if (err) return h('div', { className: 'page' }, h('div', { className: 'alert alert-err' }, err), h('button', { className: 'btn btn-primary', onClick: generate }, 'Try again'));

  if (cards && idx >= cards.length) return h('div', { className: 'page', style: { textAlign: 'center' } },
    h('div', { className: 'score-banner', style: { marginTop: 32 } },
      h('div', { className: 'score-num' }, known + '/' + cards.length),
      h('p', { style: { fontSize: '.85rem', color: 'var(--c-muted)', marginTop: 4 } }, known >= cards.length * .8 ? '🏆 Excellent mastery!' : '📖 Keep reviewing!')
    ),
    h('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
      h('button', { className: 'btn btn-ghost btn-full', onClick: () => { setIdx(0); setFlipped(false); setKnown(0); } }, '🔄 Restart'),
      h('button', { className: 'btn btn-primary btn-full', onClick: generate }, '+ New cards')
    )
  );

  const card = cards?.[idx];
  return h('div', null,
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, `${idx + 1} / ${cards?.length}`),
      h('div', { style: { width: 60 } })
    ),
    h('div', { className: 'page' },
      h('div', { className: 'flash-card', onClick: () => setFlipped(!flipped) },
        h('div', { className: 'flash-label' }, flipped ? '✅ Answer' : '💡 Concept — tap to reveal'),
        h('div', { className: 'flash-text' }, flipped ? card?.back : card?.front)
      ),
      flipped && h('div', { style: { display: 'flex', gap: 10 } },
        h('button', {
          className: 'btn btn-ghost btn-full',
          onClick: () => { setIdx(idx + 1); setFlipped(false); }
        }, '😕 Still learning'),
        h('button', {
          className: 'btn btn-primary btn-full',
          onClick: () => { setKnown(known + 1); setIdx(idx + 1); setFlipped(false); }
        }, '✅ Got it')
      )
    )
  );
}

// ── Speed Quiz game ───────────────────────
function SpeedGame({ subject, materials, lang, onBack }) {
  const [qs, setQs]       = useState(null);
  const [idx, setIdx]     = useState(0);
  const [ans, setAns]     = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  useEffect(() => { generate(); }, []);

  const generate = async () => {
    setLoading(true); setErr('');
    try {
      const mt = getMaterialText(materials);
      const raw = await callAI('Return ONLY valid JSON.', [{
        role: 'user',
        content: `Create 10 multiple choice questions in ${lang} based ONLY on this material.\nJSON: {"questions":[{"q":"question?","options":["A","B","C","D"],"answer":0}]}\nwhere "answer" is the index of the correct option.\n\nMATERIAL:\n${mt.slice(0, 3000)}`
      }], 2000);
      const data = parseJSON(raw);
      if (!data?.questions?.length) throw new Error('Could not generate questions');
      setQs(data.questions);
      setIdx(0); setAns(null); setScore(0); setDone(false);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 } },
    h('span', { className: 'loader' }), h('p', { className: 'c-muted fs-sm' }, 'Generating quiz...')
  );

  if (err) return h('div', { className: 'page' }, h('div', { className: 'alert alert-err' }, err), h('button', { className: 'btn btn-primary', onClick: generate }, 'Try again'));

  if (done) {
    const pct = Math.round(score / qs.length * 100);
    return h('div', { className: 'page' },
      h('div', { className: 'score-banner' },
        h('div', { className: 'score-num' }, score + '/' + qs.length + ' — ' + pct + '%'),
        h('p', { style: { fontSize: '.85rem', color: 'var(--c-muted)', marginTop: 4 } },
          pct >= 80 ? '🏆 Excellent work!' : pct >= 60 ? '👍 Good effort! Review what you missed.' : '📖 Keep studying and try again.')
      ),
      h('div', { style: { display: 'flex', gap: 10, marginTop: 12 } },
        h('button', { className: 'btn btn-ghost btn-full', onClick: () => { setIdx(0); setAns(null); setScore(0); setDone(false); } }, '🔄 Retry'),
        h('button', { className: 'btn btn-primary btn-full', onClick: generate }, '+ New quiz')
      )
    );
  }

  const q = qs?.[idx];
  return h('div', null,
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, `Question ${idx + 1} / ${qs?.length}`)
    ),
    h('div', { className: 'page' },
      h('div', { className: 'progress-bar', style: { marginBottom: 20 } },
        h('div', { className: 'progress-fill', style: { width: (idx / qs.length * 100) + '%' } })
      ),
      h('div', { className: 'quiz-q' }, q?.q),
      h('div', { className: 'quiz-opts' },
        q?.options?.map((opt, i) => {
          let cls = 'quiz-opt';
          if (ans !== null) {
            if (i === q.answer) cls += ' correct';
            else if (i === ans && ans !== q.answer) cls += ' wrong';
          }
          return h('button', {
            key: i,
            className: cls,
            disabled: ans !== null,
            onClick: () => {
              setAns(i);
              if (i === q.answer) setScore(s => s + 1);
              setTimeout(() => {
                if (idx + 1 >= qs.length) setDone(true);
                else { setIdx(idx + 1); setAns(null); }
              }, 900);
            }
          }, opt);
        })
      )
    )
  );
}

// ── Exam game ─────────────────────────────
function ExamGame({ subject, materials, lang, level, onBack }) {
  const [qs, setQs]   = useState(null);
  const [ans, setAns] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { generate(); }, []);

  const generate = async () => {
    setLoading(true); setErr('');
    try {
      const mt = getMaterialText(materials);
      const raw = await callAI('Return ONLY valid JSON.', [{
        role: 'user',
        content: `Create 6 exam questions in ${lang} at ${level} level based ONLY on this material.\nJSON: {"questions":[{"q":"question?","options":["A","B","C","D"],"answer":0,"explanation":"why this is correct"}]}\n\nMATERIAL:\n${mt.slice(0, 3000)}`
      }], 2500);
      const data = parseJSON(raw);
      if (!data?.questions?.length) throw new Error('Could not generate exam');
      setQs(data.questions);
      setAns({}); setDone(false);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 } },
    h('span', { className: 'loader' }), h('p', { className: 'c-muted fs-sm' }, 'Generating exam...')
  );

  if (err) return h('div', { className: 'page' }, h('div', { className: 'alert alert-err' }, err), h('button', { className: 'btn btn-primary', onClick: generate }, 'Try again'));

  const correct = done ? Object.entries(ans).filter(([i, a]) => qs[+i]?.answer === a).length : 0;
  const pct = done ? Math.round(correct / qs.length * 100) : 0;

  return h('div', null,
    h('div', { className: 'topbar' },
      h('button', { className: 'back-btn', onClick: onBack }, h(Icon, { name: 'chevron', size: 16 }), ' Back'),
      h('span', { className: 'topbar-title' }, 'Exam Prep')
    ),
    h('div', { className: 'page' },
      done && h('div', { className: 'score-banner' },
        h('div', { className: 'score-num' }, correct + '/' + qs.length + ' — ' + pct + '%'),
        h('p', { style: { fontSize: '.85rem', color: 'var(--c-muted)', marginTop: 4 } },
          pct >= 80 ? '🏆 Excellent! You are exam-ready.' : pct >= 60 ? '👍 Good — review the explanations below.' : '📖 Keep studying and try again.')
      ),
      qs?.map((q, qi) =>
        h('div', { key: qi, style: { marginBottom: 24 } },
          h('div', { className: 'quiz-q' }, `${qi + 1}. ${q.q}`),
          h('div', { className: 'quiz-opts' },
            q.options?.map((opt, oi) => {
              let cls = 'quiz-opt';
              if (done) {
                if (oi === q.answer) cls += ' correct';
                else if (oi === ans[qi] && ans[qi] !== q.answer) cls += ' wrong';
              } else if (ans[qi] === oi) {
                cls += ' on';
              }
              return h('button', {
                key: oi, className: cls, disabled: done,
                onClick: () => setAns({ ...ans, [qi]: oi })
              }, opt);
            })
          ),
          done && q.explanation && h('div', { className: 'alert alert-info', style: { marginTop: 8 } }, '💡 ' + q.explanation)
        )
      ),
      !done && h('button', {
        className: 'btn btn-primary btn-full btn-lg',
        style: { marginTop: 8 },
        disabled: Object.keys(ans).length < (qs?.length || 1),
        onClick: () => setDone(true)
      }, 'Submit exam'),
      done && h('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
        h('button', { className: 'btn btn-ghost btn-full', onClick: () => { setAns({}); setDone(false); } }, '🔄 Retry'),
        h('button', { className: 'btn btn-primary btn-full', onClick: generate }, '+ New exam')
      )
    )
  );
}

// ── Profile screen ────────────────────────
function ProfileScreen({ user, xp, lessonCount, correctCount, lang, onLangChange, onSignOut }) {
  const levels = ['English', 'Svenska', 'Amharic', 'Tigrinya', 'Arabic', 'French', 'Spanish', 'Somali'];
  const level = xp < 500 ? 'Beginner' : xp < 2000 ? 'Intermediate' : xp < 5000 ? 'Advanced' : 'Expert';
  const nextLvl = xp < 500 ? 500 : xp < 2000 ? 2000 : xp < 5000 ? 5000 : 10000;
  const pct = Math.min(100, Math.round(xp / nextLvl * 100));

  return h('div', { className: 'page' },
    h('div', { style: { textAlign: 'center', marginBottom: 24 } },
      h('div', { style: { width: 64, height: 64, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 12px' } }, '🎓'),
      h('div', { style: { fontWeight: 700, fontSize: '1rem' } }, user.email),
      h('div', { style: { fontSize: '.8rem', color: 'var(--c-muted)', marginTop: 2 } }, level)
    ),
    h('div', { className: 'xp-bar-wrap' },
      h('div', { className: 'xp-label' },
        h('span', null, `⚡ ${xp} XP`),
        h('span', null, `${xp}/${nextLvl}`)
      ),
      h('div', { className: 'progress-bar' },
        h('div', { className: 'progress-fill', style: { width: pct + '%' } })
      )
    ),
    h('div', { className: 'stat-grid' },
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-num' }, xp), h('div', { className: 'stat-lbl' }, 'Total XP')),
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-num' }, lessonCount), h('div', { className: 'stat-lbl' }, 'Lessons')),
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-num' }, correctCount), h('div', { className: 'stat-lbl' }, 'Correct'))
    ),
    h('div', { className: 'divider' }),
    h('div', { style: { marginBottom: 16 } },
      h('div', { className: 'label', style: { marginBottom: 8 } }, '🌍 Language'),
      h('div', { className: 'chips' }, levels.map(l =>
        h('button', { key: l, className: 'chip' + (lang === l ? ' on' : ''), onClick: () => onLangChange(l) }, l)
      ))
    ),
    h('div', { className: 'divider' }),
    h('button', { className: 'btn btn-ghost btn-full', style: { color: 'var(--c-danger)', borderColor: 'var(--c-danger)' }, onClick: onSignOut }, 'Sign out')
  );
}

// ── Main App ──────────────────────────────
function App() {
  const [user, setUser]         = useState(null);
  const [authLoad, setAuthLoad] = useState(true);
  const [tab, setTab]           = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [active, setActive]     = useState(null);
  const [subTab, setSubTab]     = useState('subject');  // subject | lesson | dual | chat | games
  const [showNew, setShowNew]   = useState(false);
  const [lang, setLang]         = useState(() => S.get('lx_lang', 'English'));
  const [level, setLevel]       = useState('medium');
  const [xp, setXp]             = useState(() => S.get('lx_xp', 0));
  const [lessonCount, setLessonCount] = useState(() => S.get('lx_lc', 0));
  const [correctCount, setCorrectCount] = useState(() => S.get('lx_cc', 0));
  const [materials, setMaterials] = useState([]);

  // Auth — wait for Supabase to be ready
  useEffect(() => {
    let cancelled = false;
    const tryInit = (attempts = 0) => {
      const supa = getSupa();
      if (!supa) {
        if (attempts > 20) { setAuthLoad(false); return; } // give up after 2s
        setTimeout(() => tryInit(attempts + 1), 100);
        return;
      }
      supa.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setUser(data?.session?.user || null);
        setAuthLoad(false);
      }).catch(() => { if (!cancelled) setAuthLoad(false); });
      const { data: { subscription } } = supa.auth.onAuthStateChange((_, session) => {
        if (!cancelled) setUser(session?.user || null);
      });
      return () => { cancelled = true; subscription.unsubscribe(); };
    };
    const cleanup = tryInit();
    return () => { cancelled = true; if (cleanup) cleanup(); };
  }, []);

  // Load subjects
  useEffect(() => {
    if (!user) return;
    db.loadSubjects(user.id).then(setSubjects);
  }, [user]);

  // Load materials when subject changes
  useEffect(() => {
    if (!active) return;
    db.loadMaterials(active.id).then(setMaterials);
  }, [active]);

  // Persist
  useEffect(() => { S.set('lx_lang', lang); }, [lang]);
  useEffect(() => { S.set('lx_xp', xp); }, [xp]);
  useEffect(() => { S.set('lx_lc', lessonCount); }, [lessonCount]);
  useEffect(() => { S.set('lx_cc', correctCount); }, [correctCount]);

  // Desktop nav events
  useEffect(() => {
    const onNav = e => setTab(e.detail);
    const onNew = () => setShowNew(true);
    document.addEventListener('lx-nav', onNav);
    document.addEventListener('lx-newsub', onNew);
    return () => { document.removeEventListener('lx-nav', onNav); document.removeEventListener('lx-newsub', onNew); };
  }, []);

  const signOut = async () => {
    await getSupa().auth.signOut();
    setUser(null); setSubjects([]); setActive(null);
  };

  const openSubject = (s) => {
    setActive(s);
    db.loadMaterials(s.id).then(setMaterials);
    setSubTab('subject');
    setTab('subject');
  };

  if (authLoad) return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' } }, h('span', { className: 'loader' }));
  if (!user) return h(AuthScreen, { onAuth: setUser });

  const navItems = [
    { id: 'subjects', icon: 'home',   label: 'Home' },
    { id: 'lesson',   icon: 'lesson', label: 'Lesson' },
    { id: 'dual',     icon: 'users',  label: 'Dual AI' },
    { id: 'games',    icon: 'game',   label: 'Games' },
    { id: 'profile',  icon: 'user',   label: 'Profile' },
  ];

  const renderMain = () => {
    if (tab === 'subject' && active) {
      if (subTab === 'lesson') return h(ChatScreen, { key: 'lesson', subject: active, materials, lang, level, mode: 'lesson', user, onBack: () => setSubTab('subject') });
      if (subTab === 'dual')   return h(DualScreen, { key: 'dual',   subject: active, materials, lang, level, user, onBack: () => setSubTab('subject') });
      if (subTab === 'chat')   return h(ChatScreen, { key: 'chat',   subject: active, materials, lang, level, mode: 'chat', user, onBack: () => setSubTab('subject') });
      if (subTab === 'games')  return h(GamesScreen, { key: 'games', subject: active, materials, lang, level, onBack: () => setSubTab('subject') });
      return h(SubjectScreen, {
        subject: active, user, lang,
        onBack: () => setTab('subjects'),
        onLesson: () => setSubTab('lesson'),
        onDual:   () => setSubTab('dual'),
        onChat:   () => setSubTab('chat'),
        onGames:  () => setSubTab('games'),
      });
    }

    if (tab === 'lesson' && active) return h(ChatScreen, { key: 'lesson2', subject: active, materials, lang, level, mode: 'lesson', user, onBack: () => setTab('subjects') });
    if (tab === 'dual'   && active) return h(DualScreen, { key: 'dual2',   subject: active, materials, lang, level, user, onBack: () => setTab('subjects') });
    if (tab === 'games'  && active) return h(GamesScreen, { key: 'games2', subject: active, materials, lang, level, onBack: () => setTab('subjects') });

    if (tab === 'profile') return h(ProfileScreen, {
      user, xp, lessonCount, correctCount, lang,
      onLangChange: setLang,
      onSignOut: signOut
    });

    // Default: subjects
    return h(SubjectsScreen, {
      user, subjects,
      onOpen: openSubject,
      onNew: () => setShowNew(true)
    });
  };

  return h('div', { className: 'app' },
    // Top brand bar (only on home)
    (tab === 'subjects' || (!active && tab !== 'profile')) && h('div', { className: 'topbar top-brand' },
      h('img', { src: 'src/logo.png', alt: 'Luxori', style: { height: 32 } }),
      h('div', { style: { display: 'flex', gap: 8 } },
        h('select', {
          value: level,
          onChange: e => setLevel(e.target.value),
          style: { fontSize: '.75rem', border: '1px solid var(--c-border)', borderRadius: 6, padding: '3px 6px', fontFamily: 'var(--font)', background: 'var(--c-bg)', color: 'var(--c-text)' }
        },
          h('option', { value: 'easy' }, 'Easy'),
          h('option', { value: 'medium' }, 'Medium'),
          h('option', { value: 'hard' }, 'Hard')
        )
      )
    ),
    renderMain(),
    // Bottom nav
    h('nav', { className: 'nav' },
      navItems.map(n => h('button', {
        key: n.id,
        className: 'ni' + (tab === n.id ? ' on' : ''),
        onClick: () => setTab(n.id)
      },
        h('div', { className: 'ni-ic' }, h(Icon, { name: n.icon, size: 20 })),
        h('span', { className: 'ni-lb' }, n.label)
      ))
    ),
    showNew && h(NewSubjectModal, {
      user,
      onSave: (s) => { setSubjects(prev => [...prev, s]); setShowNew(false); openSubject(s); },
      onClose: () => setShowNew(false)
    })
  );
}

// ── Mount ─────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
