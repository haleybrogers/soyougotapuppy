/* ============================================
   PUPPY TRAINING FOR PUPPIES
   Panic Chat — Inline Claude-powered crisis coach
   ============================================ */

// ---- CONFIG ----
const PANIC_EDGE_FN = 'https://rvfbszfefnrdqvuzngbf.supabase.co/functions/v1/panic-chat';
const PANIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZmJzemZlZm5yZHF2dXpuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjYyMDgsImV4cCI6MjA5MDgwMjIwOH0.LxL6Yt6e35eKRs7TgC8fhvkFvaWrWLht_CYuZuJyIqw';

// ---- STATE ----
let _panicMessages = []; // Anthropic Messages API format: [{role, content}]
let _panicOpen = false;

// ---- PROFILE HELPERS ----
function getPanicProfile() {
  try {
    const p = JSON.parse(localStorage.getItem('sygap_profile') || 'null');
    if (!p) return { dog_name: 'your puppy', dog_breed: 'mixed breed', dog_age_weeks: 12 };

    let ageWeeks = 12;
    if (p.dogBirthday) {
      const born = new Date(p.dogBirthday);
      const now = new Date();
      ageWeeks = Math.max(0, Math.round((now - born) / (1000 * 60 * 60 * 24 * 7)));
    }

    return {
      dog_name: p.dogName || 'your puppy',
      dog_breed: p.dogBreed || 'mixed breed',
      dog_age_weeks: ageWeeks
    };
  } catch {
    return { dog_name: 'your puppy', dog_breed: 'mixed breed', dog_age_weeks: 12 };
  }
}

// ---- INJECT PANEL HTML ----
function injectPanicPanel() {
  // Don't inject on homepage (it has its own hero)
  if (document.body.classList.contains('page-home')) return;

  const panicBar = document.querySelector('.panic-bar');
  if (!panicBar) return;

  // Create the inline panel (hidden by default)
  const panel = document.createElement('div');
  panel.id = 'panicPanel';
  panel.className = 'panic-panel';
  panel.innerHTML = `
    <div class="panic-panel__header">
      <span class="panic-panel__title">Puppy Crisis Coach</span>
      <button class="panic-panel__close" onclick="closePanic()" aria-label="Close">&times;</button>
    </div>
    <div class="panic-panel__messages" id="panicMessages"></div>
    <div class="panic-panel__input-area">
      <input type="text" class="panic-panel__input" id="panicInput" placeholder="describe what's happening..." />
      <button class="panic-panel__send" onclick="sendPanicMessage()">Send</button>
    </div>
  `;

  // Insert before the panic bar
  panicBar.parentNode.insertBefore(panel, panicBar);
}

// ---- OPEN / CLOSE ----
function openPanic() {
  let panel = document.getElementById('panicPanel');
  if (!panel) {
    injectPanicPanel();
    panel = document.getElementById('panicPanel');
  }
  if (!panel) return;

  _panicOpen = true;
  _panicMessages = [];
  panel.classList.add('panic-panel--open');

  // Clear old messages
  const msgContainer = document.getElementById('panicMessages');
  if (msgContainer) msgContainer.innerHTML = '';

  // First bot message
  const profile = getPanicProfile();
  const greeting = `What's going on with ${profile.dog_name}?`;
  appendBotMessage(greeting);

  // Focus input
  const input = document.getElementById('panicInput');
  if (input) setTimeout(() => input.focus(), 300);
}

function closePanic() {
  const panel = document.getElementById('panicPanel');
  if (panel) panel.classList.remove('panic-panel--open');
  _panicOpen = false;
}

// Also handle homepage panic (index.html)
function startTriage(mode) {
  if (mode === 'panic') {
    // On homepage, inject panel if needed
    if (!document.getElementById('panicPanel')) {
      const panicBar = document.querySelector('.panic-bar');
      if (!panicBar) return;

      const panel = document.createElement('div');
      panel.id = 'panicPanel';
      panel.className = 'panic-panel';
      panel.innerHTML = `
        <div class="panic-panel__header">
          <span class="panic-panel__title">Puppy Crisis Coach</span>
          <button class="panic-panel__close" onclick="closePanic()" aria-label="Close">&times;</button>
        </div>
        <div class="panic-panel__messages" id="panicMessages"></div>
        <div class="panic-panel__input-area">
          <input type="text" class="panic-panel__input" id="panicInput" placeholder="describe what's happening..." />
          <button class="panic-panel__send" onclick="sendPanicMessage()">Send</button>
        </div>
      `;
      panicBar.parentNode.insertBefore(panel, panicBar);
    }
    openPanic();
  }
}

// ---- SEND MESSAGE ----
async function sendPanicMessage() {
  const input = document.getElementById('panicInput');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';

  // Show user message
  appendUserMessage(text);

  // Add to history
  _panicMessages.push({ role: 'user', content: text });

  // Show typing indicator
  showPanicTyping();

  // Call edge function
  try {
    const profile = getPanicProfile();
    const res = await fetch(PANIC_EDGE_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + PANIC_ANON_KEY,
      },
      body: JSON.stringify({
        messages: _panicMessages,
        dog_name: profile.dog_name,
        dog_breed: profile.dog_breed,
        dog_age_weeks: profile.dog_age_weeks,
      }),
    });

    hidePanicTyping();

    if (!res.ok) throw new Error('API error ' + res.status);

    const data = await res.json();
    const reply = data.reply || "sorry, I'm having trouble thinking right now. try again?";

    // Add to history
    _panicMessages.push({ role: 'assistant', content: reply });

    // Parse and render with triage tag
    renderBotReply(reply);

  } catch (err) {
    hidePanicTyping();
    appendBotMessage("something went wrong. try again in a sec.");
    console.error('Panic chat error:', err);
  }
}

// ---- TRIAGE TAG PARSING ----
function parseTriageTag(text) {
  const tagPatterns = [
    { regex: /🟢\s*WATCH AND BREATHE\s*\n?/i, level: 'green', label: 'WATCH AND BREATHE' },
    { regex: /🟡\s*MONITOR CLOSELY\s*\n?/i, level: 'yellow', label: 'MONITOR CLOSELY' },
    { regex: /🔴\s*CALL YOUR VET NOW\s*\n?/i, level: 'red', label: 'CALL YOUR VET NOW' },
  ];

  for (const pat of tagPatterns) {
    if (pat.regex.test(text)) {
      const cleaned = text.replace(pat.regex, '').trim();
      return { level: pat.level, label: pat.label, body: cleaned };
    }
  }

  return { level: null, label: null, body: text };
}

// ---- RENDER MESSAGES ----
function appendBotMessage(text) {
  const container = document.getElementById('panicMessages');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = 'panic-msg panic-msg--bot';
  msg.innerHTML = formatPanicText(text);
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function renderBotReply(rawText) {
  const container = document.getElementById('panicMessages');
  if (!container) return;

  const { level, label, body } = parseTriageTag(rawText);

  const msg = document.createElement('div');
  msg.className = 'panic-msg panic-msg--bot';

  let html = '';
  if (level && label) {
    html += `<span class="panic-triage panic-triage--${level}">${label}</span>`;
  }
  html += formatPanicText(body);

  msg.innerHTML = html;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function appendUserMessage(text) {
  const container = document.getElementById('panicMessages');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = 'panic-msg panic-msg--user';
  msg.textContent = text;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function formatPanicText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="panic-link">$1</a>');
}

// ---- TYPING INDICATOR ----
function showPanicTyping() {
  const container = document.getElementById('panicMessages');
  if (!container) return;

  const typing = document.createElement('div');
  typing.className = 'panic-msg panic-msg--bot panic-msg--typing';
  typing.id = 'panicTyping';
  typing.innerHTML = '<div class="panic-dots"><span></span><span></span><span></span></div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function hidePanicTyping() {
  const el = document.getElementById('panicTyping');
  if (el) el.remove();
}

// ---- ENTER KEY ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && _panicOpen) {
    const input = document.getElementById('panicInput');
    if (input && document.activeElement === input) {
      sendPanicMessage();
    }
  }
});

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Inject the panel on all non-homepage pages
  injectPanicPanel();

  // Auto-open if arriving with ?panic=true
  const params = new URLSearchParams(window.location.search);
  if (params.get('panic') === 'true') {
    setTimeout(() => openPanic(), 300);
  }
});

// ---- INJECT STYLES ----
const panicStyles = document.createElement('style');
panicStyles.textContent = `
  /* --- Panic Panel (inline, fixed bottom) --- */
  .panic-panel {
    position: fixed;
    bottom: 4rem;
    right: 1.5rem;
    width: 380px;
    max-width: calc(100vw - 2rem);
    height: 0;
    opacity: 0;
    pointer-events: none;
    background: #FFFFFF;
    border-radius: 16px 16px 8px 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 799;
    transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.2s ease;
  }

  .panic-panel--open {
    height: 420px;
    opacity: 1;
    pointer-events: auto;
  }

  /* --- Header --- */
  .panic-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #D32F2F;
    color: white;
    flex-shrink: 0;
  }

  .panic-panel__title {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .panic-panel__close {
    background: none;
    border: none;
    color: white;
    font-size: 1.3rem;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 150ms ease;
    line-height: 1;
  }

  .panic-panel__close:hover {
    background: rgba(255,255,255,0.2);
  }

  /* --- Messages area --- */
  .panic-panel__messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* --- Input area --- */
  .panic-panel__input-area {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(0,0,0,0.06);
    flex-shrink: 0;
    background: #FAFAF7;
  }

  .panic-panel__input {
    flex: 1;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
    font-size: 0.85rem;
    outline: none;
    transition: border-color 150ms ease;
    background: white;
  }

  .panic-panel__input:focus {
    border-color: #D32F2F;
  }

  .panic-panel__input::placeholder {
    color: #999;
  }

  .panic-panel__send {
    background: #D32F2F;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 150ms ease;
    flex-shrink: 0;
  }

  .panic-panel__send:hover {
    background: #C62828;
  }

  /* --- Message bubbles --- */
  .panic-msg {
    max-width: 88%;
    padding: 0.6rem 0.85rem;
    border-radius: 12px;
    font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
    font-size: 0.85rem;
    line-height: 1.5;
    word-wrap: break-word;
  }

  .panic-msg--bot {
    background: #F5F0E8;
    color: #1B1B1B;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  .panic-msg--user {
    background: #D32F2F;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .panic-msg a.panic-link {
    color: #D32F2F;
    text-decoration: underline;
    font-weight: 600;
  }

  .panic-msg--user a.panic-link {
    color: white;
  }

  /* --- Triage tag pills --- */
  .panic-triage {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.5rem;
  }

  .panic-triage--green {
    background: #E4EDDA;
    color: #2E7D32;
  }

  .panic-triage--yellow {
    background: #FFF8E1;
    color: #F9A825;
  }

  .panic-triage--red {
    background: #FFEBEE;
    color: #C62828;
  }

  /* --- Typing indicator --- */
  .panic-dots {
    display: flex;
    gap: 4px;
    padding: 0.2rem 0;
  }

  .panic-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #999;
    animation: panicDotBounce 1.2s infinite;
  }

  .panic-dots span:nth-child(2) { animation-delay: 0.15s; }
  .panic-dots span:nth-child(3) { animation-delay: 0.3s; }

  @keyframes panicDotBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }

  /* --- Mobile --- */
  @media (max-width: 600px) {
    .panic-panel {
      right: 0;
      bottom: 3.5rem;
      width: 100%;
      max-width: 100%;
      border-radius: 16px 16px 0 0;
    }

    .panic-panel--open {
      height: 420px;
    }
  }
`;
document.head.appendChild(panicStyles);
