// ─────────────────────────────────────────
//  desktop.js  — Luxori desktop sidebar
// ─────────────────────────────────────────

let _noteKey = 'lx_notes_default';

// ── Resize handler ────────────────────────
function onResize() {
  const isDesktop = window.innerWidth >= 1024;
  const left  = document.getElementById('lx-sidebar-left');
  const right = document.getElementById('lx-sidebar-right');
  if (left)  left.style.display  = isDesktop ? 'flex' : 'none';
  if (right) right.style.display = isDesktop ? 'flex' : 'none';
}

// ── Nav ───────────────────────────────────
function lxNav(tab) {
  for (let i = 0; i < 5; i++) {
    const b = document.getElementById('lx-nb-' + i);
    if (b) b.classList.toggle('on', i === ['subjects','lesson','dual','games','profile'].indexOf(tab));
  }
  document.dispatchEvent(new CustomEvent('lx-nav', { detail: tab }));
}

// ── Sync subjects list ────────────────────
function lxSyncSubjects() {
  const list = document.getElementById('lx-subj-list');
  if (!list) return;

  const cards = Array.from(document.querySelectorAll('[data-sid]'));
  if (!cards.length) {
    list.innerHTML = '<div class="sl-empty">No subjects yet</div>';
    return;
  }

  // Only rebuild if count changed
  if (list.children.length === cards.length) return;
  list.innerHTML = '';

  cards.forEach((card, i) => {
    const name  = card.dataset.sname || 'Subject ' + (i + 1);
    const emoji = card.querySelector('[style*="font-size"]')?.textContent?.trim()?.slice(0, 2) || '📚';

    const btn = document.createElement('button');
    btn.className = 'sl-subj-row';
    btn.innerHTML = `<span style="flex-shrink:0">${emoji}</span><span>${name}</span>`;
    btn.onclick = () => {
      card.click();
      const nid = card.dataset.sid;
      const newKey = 'lx_notes_' + nid;
      if (newKey !== _noteKey) {
        _noteKey = newKey;
        lxNoteLoad();
        const title = document.getElementById('lx-note-title');
        if (title) title.textContent = 'Notes — ' + name;
      }
    };
    list.appendChild(btn);
  });
}

// ── Notes ─────────────────────────────────
function lxNoteLoad() {
  const ta = document.getElementById('lx-note-ta');
  if (ta) ta.value = localStorage.getItem(_noteKey) || '';
  lxNoteSaved();
}

function lxNoteSave() {
  const v = document.getElementById('lx-note-ta')?.value || '';
  try { localStorage.setItem(_noteKey, v); } catch {}
  lxNoteSaved();
}

function lxNoteSaved() {
  const v = document.getElementById('lx-note-ta')?.value || '';
  const s = document.getElementById('lx-note-saved');
  if (s) s.textContent = v.length ? v.length + ' chars saved' : 'Start writing...';
}

function lxNoteDownload() {
  const v = document.getElementById('lx-note-ta')?.value || '';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([v], { type: 'text/plain' }));
  a.download = 'luxori-notes.txt';
  a.click();
}

function lxNoteClear() {
  if (!confirm('Clear all notes?')) return;
  const ta = document.getElementById('lx-note-ta');
  if (ta) ta.value = '';
  lxNoteSave();
}

function lxNoteOpen() {
  document.getElementById('lx-sidebar-right')?.classList.add('open');
}

function lxNoteClose() {
  document.getElementById('lx-sidebar-right')?.classList.remove('open');
}

// ── Build sidebar HTML ────────────────────
function buildSidebar() {
  // Left sidebar
  const left = document.createElement('div');
  left.id = 'lx-sidebar-left';
  left.className = 'sidebar-left';
  left.style.display = 'none';
  left.innerHTML = `
    <div class="sl-logo">
      <div class="sl-logo-mark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <img src="src/logo.png" alt="Luxori" style="height:28px">
    </div>
    <div class="sl-section">
      <span class="sl-label">Navigation</span>
      <button id="lx-nb-0" class="sl-btn on" data-nav="subjects">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Home
      </button>
      <button id="lx-nb-1" class="sl-btn" data-nav="lesson">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Lesson
      </button>
      <button id="lx-nb-2" class="sl-btn" data-nav="dual">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Dual AI
      </button>
      <button id="lx-nb-3" class="sl-btn" data-nav="games">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>
        Games
      </button>
      <button id="lx-nb-4" class="sl-btn" data-nav="profile">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </button>
      <div class="sl-divider"></div>
      <button class="sl-btn call" onclick="vcStart()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call Luxori
      </button>
    </div>
    <div class="sl-subj-list">
      <div class="sl-subj-hd">
        <span class="sl-subj-lbl">My Subjects</span>
        <button class="sl-add" onclick="document.dispatchEvent(new CustomEvent('lx-newsub'))">+</button>
      </div>
      <div id="lx-subj-list"><div class="sl-empty">No subjects yet</div></div>
    </div>
  `;

  // Right sidebar (notes)
  const right = document.createElement('div');
  right.id = 'lx-sidebar-right';
  right.className = 'sidebar-right';
  right.style.display = 'none';
  right.innerHTML = `
    <button class="sr-tab" onclick="lxNoteOpen()">
      <div class="sr-vert">NOTES</div>
    </button>
    <div class="sr-panel">
      <div class="sr-hd">
        <span class="sr-title" id="lx-note-title">Notes</span>
        <button class="sr-close" onclick="lxNoteClose()">✕</button>
      </div>
      <div class="sr-body">
        <textarea class="sr-ta" id="lx-note-ta" placeholder="Write your notes here...&#10;&#10;• Key concepts&#10;• Definitions&#10;• Questions to ask" oninput="lxNoteSave()"></textarea>
        <div class="sr-foot">
          <span class="sr-saved" id="lx-note-saved">Start writing...</span>
          <div class="sr-btns">
            <button style="color:var(--c-primary)" onclick="lxNoteDownload()">Download</button>
            <button style="color:var(--c-danger)" onclick="lxNoteClear()">Clear</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Insert into DOM: left | root | right
  const root = document.getElementById('root');
  document.body.insertBefore(left, root);
  root.insertAdjacentElement('afterend', right);
}

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();
  // Bind nav buttons via addEventListener (not inline onclick)
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => lxNav(btn.dataset.nav));
  });
  onResize();
  window.addEventListener('resize', onResize);
  setTimeout(lxNoteLoad, 500);
  setInterval(lxSyncSubjects, 900);
});
