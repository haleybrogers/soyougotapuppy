/* ============================================
   SO YOU GOT A PUPPY
   Auth + Profile System (Supabase Auth + Google)
   ============================================ */

const PROFILE_KEY = 'sygap_profile';
const SUPABASE_AUTH_URL = 'https://rvfbszfefnrdqvuzngbf.supabase.co';
const SUPABASE_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZmJzemZlZm5yZHF2dXpuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjYyMDgsImV4cCI6MjA5MDgwMjIwOH0.LxL6Yt6e35eKRs7TgC8fhvkFvaWrWLht_CYuZuJyIqw';
const SYNC_FN_URL = SUPABASE_AUTH_URL + '/functions/v1/sync-profile';

// Supabase client (loaded from CDN in HTML)
let _supaClient = null;
function getSupaClient() {
  if (_supaClient) return _supaClient;
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    _supaClient = supabase.createClient(SUPABASE_AUTH_URL, SUPABASE_AUTH_KEY);
  }
  return _supaClient;
}

// ---- PROFILE DATA (localStorage cache + server sync) ----
function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
  } catch { return null; }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  // Async sync to server (fire and forget)
  syncProfileToServer();
}

function isLoggedIn() {
  const p = getProfile();
  return p && p.ownerName;
}

// ---- SERVER SYNC ----
let _syncTimeout = null;
function syncProfileToServer() {
  // Debounce — wait 2 seconds after last save
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(async () => {
    try {
      const client = getSupaClient();
      if (!client) return;

      const { data: { session } } = await client.auth.getSession();
      if (!session) return; // Not logged in with Supabase Auth

      const profile = getProfile();
      const trainingLog = JSON.parse(localStorage.getItem('puppy_training_log') || '{}');
      const modules = JSON.parse(localStorage.getItem('puppy_modules') || '{}');

      await fetch(SYNC_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_AUTH_KEY,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          profile: profile,
          training_log: trainingLog,
          modules: modules,
        }),
      });
    } catch (err) {
      console.warn('Profile sync failed:', err);
    }
  }, 2000);
}

async function loadProfileFromServer() {
  try {
    const client = getSupaClient();
    if (!client) return false;

    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;

    const res = await fetch(SYNC_FN_URL + '?user_id=' + session.user.id, {
      headers: { 'Authorization': 'Bearer ' + SUPABASE_AUTH_KEY },
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.profile && data.profile.setupComplete) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      if (data.training_log && Object.keys(data.training_log).length > 0) {
        localStorage.setItem('puppy_training_log', JSON.stringify(data.training_log));
      }
      if (data.modules && Object.keys(data.modules).length > 0) {
        localStorage.setItem('puppy_modules', JSON.stringify(data.modules));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Profile load failed:', err);
    return false;
  }
}

// ---- GOOGLE SIGN-IN (Supabase Auth) ----
async function signInWithGoogle() {
  const client = getSupaClient();
  if (!client) {
    console.error('Supabase client not available');
    return;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
  }
  // User gets redirected to Google, then back
}

// ---- LOGIN MODAL ----
function showLoginModal() {
  if (isLoggedIn()) return;

  const existing = document.getElementById('loginOverlay');
  if (existing) { existing.style.display = 'flex'; return; }

  const overlay = document.createElement('div');
  overlay.id = 'loginOverlay';
  overlay.className = 'login-overlay';
  overlay.innerHTML = `
    <div class="login-modal">
      <button class="login-close" onclick="closeLogin()">&times;</button>
      <h2 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 0.25rem;">welcome to the chaos</h2>
      <p style="color: var(--soft-gray); margin-bottom: 1.5rem;">sign in to track your progress, log behaviors, and get a grade on your puppy parenting (no pressure)</p>

      <div id="loginStep1">
        <button style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.7rem 1rem; background: #fff; color: #3c4043; border: 1px solid #dadce0; border-radius: 9999px; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: background 150ms ease, box-shadow 150ms ease;" onmouseover="this.style.background='#f7f8f8';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.08)'" onmouseout="this.style.background='#fff';this.style.boxShadow='none'" onclick="signInWithGoogle()">
          <svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0;"><path fill="#4285F4" d="M17.64 9.2a10 10 0 0 0-.164-1.8H9v3.4h4.844a4.14 4.14 0 0 1-1.796 2.716v2.264h2.908c1.702-1.567 2.684-3.874 2.684-6.58z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.264c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.338A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.956H.957A8.997 8.997 0 0 0 0 9a9 9 0 0 0 .957 4.044l3.007-2.338z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
          sign in with Google
        </button>
        <div class="login-divider"><span>or continue without account</span></div>
        <form onsubmit="event.preventDefault(); manualLogin();">
          <input type="text" class="login-input" id="manualName" placeholder="your name(s)" required>
          <button type="submit" class="btn" style="width: 100%; margin-top: 0.5rem; background: var(--cream-warm); color: var(--bark); border: 1px solid rgba(0,0,0,0.1);">continue as guest</button>
        </form>
      </div>

      <div id="loginStep2" style="display: none;">
        <p style="font-weight: 600; margin-bottom: 1rem;" id="loginGreeting">nice to meet you!</p>
        <form onsubmit="event.preventDefault(); saveDogProfile();">
          <input type="text" class="login-input" id="dogName" placeholder="your puppy's name" required>
          <input type="text" class="login-input" id="dogBreed" placeholder="breed (or best guess)" required>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <label class="gender-btn"><input type="radio" name="dogGender" value="girl" required><span>girl</span></label>
            <label class="gender-btn"><input type="radio" name="dogGender" value="boy"><span>boy</span></label>
          </div>
          <label style="display: block; font-size: 0.85rem; color: var(--soft-gray); margin-bottom: 0.25rem; margin-top: 0.5rem;">puppy's birthday (or gotcha day)</label>
          <input type="date" class="login-input" id="dogBirthday" required>
          <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 0.75rem;">let's go</button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeLogin() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.style.display = 'none';
}

function manualLogin() {
  const name = document.getElementById('manualName').value.trim();
  if (!name) return;

  saveProfile({ ownerName: name });
  goToStep2(name);
}

function goToStep2(name) {
  const step1 = document.getElementById('loginStep1');
  const step2 = document.getElementById('loginStep2');
  const greeting = document.getElementById('loginGreeting');

  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
  if (greeting) greeting.textContent = `hey ${name}! tell me about your pup.`;
}

function saveDogProfile() {
  const profile = getProfile() || {};
  profile.dogName = document.getElementById('dogName').value.trim();
  profile.dogBreed = document.getElementById('dogBreed').value.trim();
  profile.dogBirthday = document.getElementById('dogBirthday').value;
  const genderEl = document.querySelector('input[name="dogGender"]:checked');
  profile.dogGender = genderEl ? genderEl.value : 'girl';
  profile.setupComplete = true;
  profile.joinedDate = profile.joinedDate || new Date().toISOString().split('T')[0];
  saveProfile(profile);

  closeLogin();
  refreshDashboard();
  populateSettings();
}

// ---- WELCOME BANNER ----
function showWelcome() {
  // Welcome banner removed — greeting + age card now built into tracker page
  return;
}

// ---- DOG AGE HELPERS ----
function getDogAge(birthday) {
  if (!birthday) return { weeks: 0, months: 0, text: '??' };
  const born = new Date(birthday);
  const now = new Date();
  const diffMs = now - born;
  const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const months = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));

  if (weeks < 16) return { weeks, months, text: `${weeks} weeks` };
  if (months < 24) return { weeks, months, text: `${months} months` };
  return { weeks, months, text: `${Math.floor(months / 12)} years` };
}

function getPuppyhoodPercent(birthday) {
  if (!birthday) return 0;
  const born = new Date(birthday);
  const now = new Date();
  const months = (now - born) / (30.44 * 24 * 60 * 60 * 1000);
  return Math.min(100, Math.round((months / 18) * 100));
}

// ---- GRADING SYSTEM (weekly) ----
function getWeeklyGrade() {
  const log = JSON.parse(localStorage.getItem('puppy_training_log') || '{}');

  const days = [];
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const key = d.toISOString().split('T')[0];
    days.push({ date: key, sessions: (log[key] && log[key].sessions) || 0 });
    d.setDate(d.getDate() - 1);
  }

  const daysTrained = days.filter(d => d.sessions > 0).length;
  const totalSessions = days.reduce((sum, d) => sum + d.sessions, 0);
  const avgSessions = daysTrained > 0 ? totalSessions / daysTrained : 0;

  let streak = 0;
  for (const day of days) {
    if (day.sessions > 0) { streak++; } else { break; }
  }

  let score = 0;
  score += Math.round((daysTrained / 7) * 50);
  score += Math.round(Math.min(1, avgSessions / 3) * 30);
  score += Math.round((streak / 7) * 20);
  score = Math.max(0, Math.min(100, score));

  if (score >= 95) return { letter: 'A+', score, desc: "your dog is literally writing you a thank-you note rn" };
  if (score >= 90) return { letter: 'A', score, desc: "you're killing it. your dog thinks you're a genius" };
  if (score >= 85) return { letter: 'A-', score, desc: "almost perfect. your dog would give you 5 stars on yelp" };
  if (score >= 80) return { letter: 'B+', score, desc: "solid work. your dog is bragging about you at the park" };
  if (score >= 75) return { letter: 'B', score, desc: "good job! your dog is learning the right stuff" };
  if (score >= 70) return { letter: 'B-', score, desc: "not bad. room for improvement but you're showing up" };
  if (score >= 65) return { letter: 'C+', score, desc: "you're trying. your dog appreciates the effort... kinda" };
  if (score >= 60) return { letter: 'C', score, desc: "average. check off some plan sessions to bump this up" };
  if (score >= 55) return { letter: 'C-', score, desc: "your dog is side-eyeing you a little" };
  if (score >= 50) return { letter: 'D+', score, desc: "hmm. your dog just filed a complaint with management" };
  if (score >= 40) return { letter: 'D', score, desc: "your dog is considering hiring a new human" };
  return { letter: 'F', score, desc: "ok your dog just called animal services... on YOU. (jk, check off some sessions!)" };
}

// ---- FUN FACTS BY AGE ----
function getFunFact(dogAge) {
  const weeks = dogAge.weeks;
  const facts = {
    baby: [
      "at this age, your puppy's brain is literally a sponge. every experience shapes who they become.",
      "puppies this young need 18-20 hours of sleep. if they're being insane, they might just be overtired.",
      "the socialization window is OPEN right now. expose them to everything (gently).",
      "fun fact: puppies can't fully control their bladder until ~16 weeks. accidents are YOUR fault, not theirs."
    ],
    teething: [
      "your puppy is losing baby teeth right now. finding tiny teeth on the floor is normal and lowkey cute.",
      "their mouth hurts. give them frozen stuff to chew on. they're not being bad, they're in pain.",
      "the socialization window is closing soon (~16 weeks). get those experiences in NOW.",
      "this is the best age to start basic obedience. their attention span is short but they're eager."
    ],
    teen: [
      "selective hearing is PEAK right now. they haven't forgotten — they're just choosing to ignore you.",
      "this is when they test every boundary. stay consistent. they're checking if the rules are real.",
      "their energy is at maximum capacity. increase mental stimulation — a tired brain > a tired body.",
      "regression is normal. stuff they knew last week? suddenly forgotten. stay the course."
    ],
    adolescent: [
      "this is the hardest phase. you're doing better than you think. it DOES get better.",
      "their brain is literally rewiring right now. it's like puberty but with more chewing.",
      "a second fear period can happen between 6-14 months. don't punish fear — support it.",
      "keep training even when it feels pointless. the foundation is being laid whether you see it or not."
    ],
    adult: [
      "you survived puppyhood. your dog's personality is stabilizing. the hard part is almost over.",
      "training doesn't stop just because they're grown. it's a lifestyle, not a phase.",
      "your consistency during puppyhood is paying off now. good job, human.",
      "large breeds can take up to 3 years for full emotional maturity. patience."
    ]
  };

  let stage = 'baby';
  if (weeks >= 52) stage = 'adult';
  else if (weeks >= 26) stage = 'adolescent';
  else if (weeks >= 17) stage = 'teen';
  else if (weeks >= 12) stage = 'teething';

  const pool = facts[stage];
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return pool[dayOfYear % pool.length];
}

// ---- DRILL TRACKING ----
function getDrillsToday() {
  const today = new Date().toISOString().split('T')[0];
  const data = JSON.parse(localStorage.getItem('sygap_drills_today') || '{}');
  if (data.date !== today) return { date: today, completed: [] };
  return data;
}

function toggleDrill(drillName) {
  const data = getDrillsToday();
  const idx = data.completed.indexOf(drillName);
  if (idx === -1) { data.completed.push(drillName); } else { data.completed.splice(idx, 1); }
  localStorage.setItem('sygap_drills_today', JSON.stringify(data));
  updateDrillChecklist();
}

function updateDrillChecklist() {
  const data = getDrillsToday();
  document.querySelectorAll('.drill-checklist__item').forEach(el => {
    const name = el.dataset.drill;
    el.classList.toggle('drill-checklist__item--done', data.completed.includes(name));
  });
  document.querySelectorAll('.drill-check').forEach(el => {
    const name = el.dataset.drill;
    el.classList.toggle('drill-check--done', data.completed.includes(name));
  });
  const countEl = document.getElementById('drillsDoneCount');
  if (countEl) countEl.textContent = data.completed.length;
}

// ---- MODULE TRACKING ----
const MODULE_LIST = [
  { key: 'crate', name: 'Crate', phase: 'Home life' },
  { key: 'potty', name: 'Potty', phase: 'Home life' },
  { key: 'calm', name: 'Calm', phase: 'Home life' },
  { key: 'biting', name: 'Biting', phase: 'Home life' },
  { key: 'come', name: 'Come / Recall', phase: 'Skills' },
  { key: 'manners', name: 'Manners', phase: 'Skills' },
  { key: 'handling', name: 'Handling', phase: 'Skills' },
  { key: 'socializing', name: 'Socializing', phase: 'Out in the world' },
  { key: 'travel', name: 'Travel', phase: 'Out in the world' },
  { key: 'meeting-people', name: 'Meeting people', phase: 'Out in the world' },
  { key: 'meeting-dogs', name: 'Meeting dogs', phase: 'Out in the world' },
];

function getModuleProgress() {
  return JSON.parse(localStorage.getItem('puppy_modules') || '{}');
}

function toggleModuleTracker(moduleName) {
  const data = getModuleProgress();
  data[moduleName] = !data[moduleName];
  localStorage.setItem('puppy_modules', JSON.stringify(data));
  updateModuleUI();
  refreshDashboard();
  syncProfileToServer(); // Sync modules too
}

function updateModuleUI() {
  const data = getModuleProgress();
  const container = document.getElementById('moduleTracker');
  if (!container) return;

  const done = MODULE_LIST.filter(m => !!data[m.key]).length;
  const total = MODULE_LIST.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const countEl = document.getElementById('moduleProgressCount');
  const fillEl = document.getElementById('moduleTrackerFill');
  if (countEl) countEl.textContent = done;
  if (fillEl) fillEl.style.width = pct + '%';

  let html = '';
  let currentPhase = '';
  MODULE_LIST.forEach(m => {
    if (m.phase !== currentPhase) {
      currentPhase = m.phase;
      html += `<div class="module-tracker__phase">${currentPhase.toLowerCase()}</div>`;
    }
    const isDone = !!data[m.key];
    html += `
      <a href="modules.html#mod-${m.key}" class="module-tracker__item ${isDone ? 'module-tracker__item--done' : ''}">
        <span class="module-tracker__check">${isDone ? '✓' : ''}</span>
        <span class="module-tracker__name">${m.name}</span>
        <span class="module-tracker__arrow">→</span>
      </a>
    `;
  });
  container.innerHTML = html;

  document.querySelectorAll('.module-progress__item').forEach(el => {
    const name = el.dataset.module;
    el.classList.toggle('module-progress__item--done', !!data[name]);
  });
}

// ---- DASHBOARD REFRESH ----
const TRACKER_GREETINGS = [
  (name) => `hey ${name}`,
  (name) => `welcome back ${name}`,
  (name) => `let's go ${name}`,
  (name) => `alright ${name}`,
  (name) => `ok ${name}`,
  (name) => `hi ${name}`,
];

const TRACKER_SUBS = [
  (dog, p) => `${dog} isn't gonna train ${p.self}`,
  (dog, p) => `${dog} has been plotting all day`,
  (dog, p) => `${dog} is judging your consistency`,
  (dog, p) => `let's make ${dog} slightly less feral`,
  (dog, p) => `time to earn that "good dog parent" title`,
  (dog, p) => `${dog}'s brain is ready. are you?`,
  (dog, p) => `every rep counts. even the messy ones.`,
  (dog, p) => `you showed up. that's already more than most do.`,
  (dog, p) => `consistency isn't sexy but it's everything.`,
  (dog, p) => `${dog} doesn't know ${p.they}'s in training. keep it that way.`,
  (dog, p) => `${dog} is watching. and learning. always learning.`,
  (dog, p) => `today's a good day to not reward chaos.`,
];

function getPronouns(gender) {
  if (gender === 'boy') return { they: 'he', them: 'him', their: 'his', self: 'himself' };
  return { they: 'she', them: 'her', their: 'her', self: 'herself' };
}

// ---- PUPPY PHASE (matches by-age.html) ----
function getPuppyPhase(weeks) {
  if (weeks < 12) return { name: 'Baby baby', vibe: 'the cute-but-clueless phase', range: '8–12 weeks' };
  if (weeks < 17) return { name: 'Teething gremlin', vibe: 'why is everything in their mouth', range: '3–4 months' };
  if (weeks < 26) return { name: 'Teenage dirtbag', vibe: 'they know what you want and are choosing not to do it', range: '4–6 months' };
  if (weeks < 52) return { name: 'Full adolescent chaos', vibe: 'the hardest phase. you\'re doing better than you think.', range: '6–12 months' };
  return { name: 'Finally a dog', vibe: 'you survived. they survived. everyone survived.', range: '1–2 years' };
}

function getDaysUntilOneYear(birthday) {
  if (!birthday) return 0;
  const born = new Date(birthday);
  const oneYear = new Date(born);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const now = new Date();
  return Math.ceil((oneYear - now) / (1000 * 60 * 60 * 24));
}

function getYearProgress(birthday) {
  if (!birthday) return 0;
  const born = new Date(birthday);
  const now = new Date();
  const oneYear = new Date(born);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  const total = oneYear - born;
  const elapsed = now - born;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function refreshDashboard() {
  const profile = getProfile();

  const headingEl = document.getElementById('trackerHeading');
  const subEl = document.getElementById('trackerSubheading');
  if (headingEl && profile && profile.ownerName && profile.dogName) {
    const firstName = profile.ownerName.split(' ')[0].toLowerCase();
    const dogName = profile.dogName.toLowerCase();
    const pronouns = getPronouns(profile.dogGender);
    const greetIdx = Math.floor(Math.random() * TRACKER_GREETINGS.length);
    headingEl.textContent = TRACKER_GREETINGS[greetIdx](firstName);
    if (subEl) {
      const subIdx = Math.floor(Math.random() * TRACKER_SUBS.length);
      subEl.textContent = TRACKER_SUBS[subIdx](dogName, pronouns);
    }
  }

  const grade = getWeeklyGrade();
  const gradeEl = document.getElementById('dashGrade');
  const gradeDescEl = document.getElementById('dashGradeDesc');
  if (gradeEl) gradeEl.textContent = grade.letter;
  if (gradeDescEl) gradeDescEl.textContent = grade.desc;

  if (profile && profile.dogBirthday) {
    const pct = getPuppyhoodPercent(profile.dogBirthday);
    const pctEl = document.getElementById('dashPuppyhood');
    const fillEl = document.getElementById('dashPuppyhoodFill');
    if (pctEl) pctEl.innerHTML = `${pct}<span style="font-size: 1rem;">%</span>`;
    if (fillEl) fillEl.style.width = `${pct}%`;

    const dogAge = getDogAge(profile.dogBirthday);
    const factEl = document.getElementById('dashFact');
    if (factEl) factEl.textContent = getFunFact(dogAge);

    const ageCard = document.getElementById('puppyAgeCard');
    if (ageCard) {
      ageCard.style.display = '';
      const dogName = profile.dogName || 'your pup';
      const ageText = document.getElementById('puppyAgeText');
      const countdownEl = document.getElementById('puppyCountdown');
      const ageFill = document.getElementById('puppyAgeFill');
      const phaseText = document.getElementById('puppyPhaseText');

      if (ageText) ageText.textContent = `${dogName} is ${dogAge.text} old`;

      const daysLeft = getDaysUntilOneYear(profile.dogBirthday);
      if (countdownEl) {
        countdownEl.textContent = daysLeft > 0 ? `${daysLeft} days until the 1-year mark` : `past the 1-year mark!`;
      }

      const yearPct = getYearProgress(profile.dogBirthday);
      if (ageFill) ageFill.style.width = yearPct + '%';

      const phase = getPuppyPhase(dogAge.weeks);
      if (phaseText) phaseText.innerHTML = `<strong>${phase.name}</strong> · ${phase.vibe}`;

      startLiveTimer(profile.dogBirthday);
    }
  }

  updateDrillChecklist();
  updateModuleUI();
}

// ---- LIVE AGE TIMER ----
let _liveTimerInterval = null;
function startLiveTimer(birthday) {
  const el = document.getElementById('puppyLiveTimer');
  if (!el || !birthday) return;
  if (_liveTimerInterval) clearInterval(_liveTimerInterval);

  function tick() {
    const born = new Date(birthday);
    const now = new Date();
    let diff = Math.abs(now - born);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    diff -= hrs * (1000 * 60 * 60);
    const mins = Math.floor(diff / (1000 * 60));
    diff -= mins * (1000 * 60);
    const secs = Math.floor(diff / 1000);
    const pad = n => String(n).padStart(2, '0');
    el.textContent = `${days}d ${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s alive`;
  }

  tick();
  _liveTimerInterval = setInterval(tick, 1000);
}

// ---- PROFILE SETTINGS ----
function populateSettings() {
  const profile = getProfile();
  if (!profile) return;

  const ownerEl = document.getElementById('settingsOwnerName');
  const dogEl = document.getElementById('settingsDogName');
  const breedEl = document.getElementById('settingsBreed');
  const bdayEl = document.getElementById('settingsBirthday');

  if (ownerEl) ownerEl.value = profile.ownerName || '';
  if (dogEl) dogEl.value = profile.dogName || '';
  if (breedEl) breedEl.value = profile.dogBreed || '';
  if (bdayEl) bdayEl.value = profile.dogBirthday || '';

  const genderRadio = document.querySelector(`input[name="settingsGender"][value="${profile.dogGender || 'girl'}"]`);
  if (genderRadio) genderRadio.checked = true;
}

function saveSettingsProfile() {
  const profile = getProfile() || {};

  const ownerEl = document.getElementById('settingsOwnerName');
  const dogEl = document.getElementById('settingsDogName');
  const breedEl = document.getElementById('settingsBreed');
  const bdayEl = document.getElementById('settingsBirthday');
  const genderEl = document.querySelector('input[name="settingsGender"]:checked');

  if (ownerEl && ownerEl.value.trim()) profile.ownerName = ownerEl.value.trim();
  if (dogEl && dogEl.value.trim()) profile.dogName = dogEl.value.trim();
  if (breedEl && breedEl.value.trim()) profile.dogBreed = breedEl.value.trim();
  if (bdayEl && bdayEl.value) profile.dogBirthday = bdayEl.value;
  if (genderEl) profile.dogGender = genderEl.value;

  saveProfile(profile);
  refreshDashboard();

  const savedEl = document.getElementById('settingsSaved');
  if (savedEl) {
    savedEl.style.display = 'inline';
    setTimeout(() => { savedEl.style.display = 'none'; }, 2000);
  }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
  const client = getSupaClient();

  // Check for OAuth callback (hash fragment from Google redirect)
  if (client && window.location.hash.includes('access_token')) {
    // Supabase handles the token exchange automatically
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      // Try to load profile from server first
      const loaded = await loadProfileFromServer();
      if (loaded) {
        refreshDashboard();
        populateSettings();
        return;
      }

      // New Google user — pre-fill their name and go to step 2
      const user = session.user;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'friend';
      saveProfile({ ownerName: name, email: user.email, picture: user.user_metadata?.avatar_url });
      showLoginModal();
      goToStep2(name.split(' ')[0]);
      return;
    }
  }

  // Check if we have an existing Supabase session
  if (client) {
    const { data: { session } } = await client.auth.getSession();
    if (session && !isLoggedIn()) {
      // Have a session but no local profile — try loading from server
      const loaded = await loadProfileFromServer();
      if (loaded) {
        refreshDashboard();
        populateSettings();
        return;
      }
    }
  }

  // Normal flow
  const profile = getProfile();
  if (profile && profile.setupComplete) {
    // Already set up
  } else {
    setTimeout(() => {
      if (!isLoggedIn()) showLoginModal();
    }, 1500);
  }

  refreshDashboard();
  populateSettings();
});
