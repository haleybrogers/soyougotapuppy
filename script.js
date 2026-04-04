/* ============================================
   PUPPY TRAINING FOR PUPPIES
   Main interactions: nav, tabs, decision tree,
   tracker, streaks, fade-in, oscillating text,
   voice notes
   ============================================ */

// ---- NAV ----
const nav = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// Close mobile menu on link click
document.querySelectorAll('.nav__links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Nav scroll shadow + floating panic visibility
window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ---- OSCILLATING HERO TEXT ----
const scenarios = [
  'biting my hands',
  'barking at absolutely nothing',
  'crying in the crate again',
  'running around like a psycho',
  'pulling me down the street',
  'jumping on everyone I know',
  'completely ignoring me',
  'eating my favorite shoes',
  'having a full meltdown',
  'being a tiny adorable terrorist'
];

let currentScenario = 0;
const oscillatingEl = document.getElementById('oscillatingText');

function cycleScenario() {
  if (!oscillatingEl) return;
  oscillatingEl.classList.add('fade-out');
  setTimeout(() => {
    currentScenario = (currentScenario + 1) % scenarios.length;
    oscillatingEl.textContent = scenarios[currentScenario];
    oscillatingEl.classList.remove('fade-out');
  }, 400);
}

if (oscillatingEl) {
  setInterval(cycleScenario, 2500);
}

// ---- HERO SEARCH + SUGGESTIONS ----
function showSuggestions() {
  const box = document.getElementById('heroSuggestions');
  if (box) box.style.display = 'flex';
}

function hideSuggestions() {
  setTimeout(() => {
    const box = document.getElementById('heroSuggestions');
    if (box) box.style.display = 'none';
  }, 200);
}

function filterSuggestions(query) {
  const box = document.getElementById('heroSuggestions');
  if (!box) return;
  const q = query.toLowerCase().trim();
  const btns = box.querySelectorAll('.hero__suggestion');
  btns.forEach(btn => {
    btn.style.display = btn.textContent.toLowerCase().includes(q) || !q ? '' : 'none';
  });
  // If they typed something custom and hit enter
  if (q) box.style.display = 'flex';
}

function pickSuggestion(scenario) {
  const input = document.getElementById('heroSearch');
  if (input) input.value = '';
  const box = document.getElementById('heroSuggestions');
  if (box) box.style.display = 'none';
  startTriage(scenario);
}

// Submit hero search on Enter
document.addEventListener('DOMContentLoaded', () => {
  const heroSearch = document.getElementById('heroSearch');
  if (heroSearch) {
    heroSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = heroSearch.value.trim();
        if (val) {
          const box = document.getElementById('heroSuggestions');
          if (box) box.style.display = 'none';
          startTriage('custom', val);
          heroSearch.value = '';
        }
      }
    });
    heroSearch.addEventListener('blur', hideSuggestions);
  }
});

// ---- TABS ----
function switchTab(tabGroupId, tabId) {
  const group = document.getElementById(tabGroupId);
  if (!group) return;

  // Deactivate all tabs in group
  group.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  // Activate clicked tab
  const clickedTab = group.querySelector(`[data-tab="${tabId}"]`);
  if (clickedTab) clickedTab.classList.add('active');

  // Find the parent section for tab contents
  const section = group.closest('section') || group.parentElement;

  // Hide all tab-content in this section
  section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  // Show target
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}

// ---- MODULE EXPAND/COLLAPSE ----
function toggleModule(card) {
  const content = card.querySelector('.module-content');
  if (!content) return;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  card.classList.toggle('card--expanded', !isOpen);
}

// ---- DECISION TREE ----
const decisionTreeData = {
  start: {
    emoji: '🤯',
    text: 'Is your puppy being a psycho right now?',
    options: [
      { label: '🔥 Yes, full chaos mode', next: 'needsCheck' },
      { label: '😐 Kinda, just annoying', next: 'annoying' },
      { label: '😌 No, just want to learn', next: 'learn' }
    ]
  },
  needsCheck: {
    emoji: '📋',
    text: 'Quick check — have their basic needs been met?',
    options: [
      { label: '🍗 They haven\'t eaten recently', next: 'resultFeed' },
      { label: '🚽 They might need to potty', next: 'resultPotty' },
      { label: '🏃 They haven\'t had exercise/play', next: 'resultExercise' },
      { label: '✅ Yes, all needs are met', next: 'needsMet' }
    ]
  },
  needsMet: {
    emoji: '🧠',
    text: 'OK so their needs are met but they\'re still being wild. What\'s happening?',
    options: [
      { label: '😭 Crying/whining in crate', next: 'resultCrate' },
      { label: '💨 Zoomies / bouncing off walls', next: 'resultZoomies' },
      { label: '🗣️ Barking nonstop', next: 'resultBarking' },
      { label: '🦷 Biting / mouthing me', next: 'resultBiting' }
    ]
  },
  annoying: {
    emoji: '🤔',
    text: 'What kind of annoying?',
    options: [
      { label: '🦘 Jumping on me/people', next: 'resultJumping' },
      { label: '🏋️ Pulling on leash', next: 'resultPulling' },
      { label: '👟 Chewing stuff they shouldn\'t', next: 'resultChewing' },
      { label: '🙄 Ignoring me completely', next: 'resultIgnoring' }
    ]
  },
  learn: {
    emoji: '📚',
    text: 'Love that energy. What do you want to work on?',
    options: [
      { label: '🎯 Recall (coming when called)', next: 'resultRecallLearn' },
      { label: '🔄 On/Off switch', next: 'resultOnOffLearn' },
      { label: '✋ Impulse control', next: 'resultImpulseLearn' },
      { label: '🧘 Calm settle', next: 'resultCalmLearn' }
    ]
  },
  resultFeed: {
    result: true,
    emoji: '🍗',
    title: 'Feed them first, troubleshoot second.',
    advice: 'A hungry puppy is a chaotic puppy. Feed them (use the meal for training if you can — hand-feed with the recall game). Then see if the behavior is still happening. Most "behavior problems" are just unmet needs.',
    savage: 'you wouldn\'t be your best self hangry either, honestly.'
  },
  resultPotty: {
    result: true,
    emoji: '🚽',
    title: 'Take them out. Right now.',
    advice: 'Whining, circling, sniffing the ground, or general restlessness can all be potty signals. Take them out immediately. Reward the SECOND they go outside. Then reassess the behavior.',
    savage: 'if they have an accident, that\'s on you, not them. they literally can\'t tell you in words.'
  },
  resultExercise: {
    result: true,
    emoji: '🏃',
    title: 'They need to burn energy before you can expect calm.',
    advice: 'A walk, play session, or even 5 minutes of the recall game. Get some energy out. An under-exercised puppy is just a tiny terrorist with a valid complaint. Meet the need, then address behavior.',
    savage: 'imagine being locked inside all day with the energy of a toddler who just ate cake. that\'s your puppy right now.'
  },
  resultCrate: {
    result: true,
    emoji: '🏠',
    title: 'Do NOT open that crate.',
    advice: 'If their needs are met (fed, pottied, exercised), this is emotional regulation training. They\'re learning that screaming doesn\'t work. Wait for even 2 seconds of quiet. THEN open. Walk away like it\'s no big deal. Calm = freedom. Not screaming = freedom.',
    savage: 'if you open it while they\'re crying, congrats — you just trained a professional screamer. they\'re taking notes.'
  },
  resultZoomies: {
    result: true,
    emoji: '💨',
    title: 'Crate them calmly and let it pass.',
    advice: 'If all needs are met, this is an overtired/overstimulated puppy. Like a toddler past their bedtime who gets MORE hyper, not less. Calmly crate them with a chew toy. Let them cry it out. They\'ll settle. Open the door when they\'re calm.',
    savage: 'they\'re literally too tired to function but their body won\'t stop. enforced nap time is an act of love.'
  },
  resultBarking: {
    result: true,
    emoji: '🗣️',
    title: 'Don\'t give it attention. Any attention.',
    advice: 'If needs are met and they\'re just demand barking: completely ignore it. No eye contact, no "shush," no "quiet." ANY response = attention = reward. Wait for silence. Even 1 second. Then calmly reward the quiet. Repeat forever.',
    savage: 'every time you say "SHHH" you\'re literally having a conversation with them about barking. they think you\'re joining in.'
  },
  resultBiting: {
    result: true,
    emoji: '🦷',
    title: 'Say "ouch" → remove attention → repeat.',
    advice: 'Biting = play ends. Say "ouch" calmly (don\'t yelp). Let your hand go limp. Remove attention for 30 seconds. Resume. They learn: biting makes the fun stop. Also: make sure they have appropriate chew toys for teething.',
    savage: 'do NOT keep playing through the biting while laughing. you\'re literally training a land shark.'
  },
  resultJumping: {
    result: true,
    emoji: '🦘',
    title: 'Turn into a statue.',
    advice: 'Jumping = attention seeking. Turn away, fold arms, do not look at them. The SECOND all four paws hit the floor → pet them, praise them. They learn: calm = attention, jumping = nothing. Tell your guests too or you\'re wasting your time.',
    savage: 'if you squeal "awww hiiii baby!!" while they\'re jumping... that\'s not training, that\'s encouraging a kangaroo.'
  },
  resultPulling: {
    result: true,
    emoji: '🏋️',
    title: 'Stop walking. Immediately.',
    advice: 'Pulling = walk stops. The leash goes tight, you become a tree. Wait for them to look at you or for the leash to go slack. Then move forward. Pulling = nothing happens. Loose leash = we go. Every. Single. Time.',
    savage: 'you\'re being dragged by a 12 lb dictator. take your power back. you control the forward motion.'
  },
  resultChewing: {
    result: true,
    emoji: '👟',
    title: 'They need something better to chew on.',
    advice: 'Redirect to appropriate chews (Kong, bully stick, frozen washcloth for teething). Puppy-proof your space — if they can reach it, they will eat it. Don\'t punish after the fact. They can\'t connect your anger to the shoe they chewed 20 minutes ago.',
    savage: 'if your shoes are on the floor within puppy reach, that\'s a you problem. management is half the game.'
  },
  resultIgnoring: {
    result: true,
    emoji: '🙄',
    title: 'Make yourself more interesting than everything else.',
    advice: 'They\'re not ignoring you to be rude. Coming to you just isn\'t rewarding enough yet. Hand-feed meals. Play the GET IT / COME game. Reward every time they look at you randomly. Carry kibble. Make yourself the best thing in their world.',
    savage: 'why would they come to you? what have you done for them lately? serious question. become the vending machine.'
  },
  resultRecallLearn: {
    result: true,
    emoji: '🎯',
    title: 'Play the GET IT / COME game.',
    advice: 'Hand-feed their meals. Say "GET IT" + throw kibble. When they look back say "COME." Reward. Repeat until the meal is done. Do this at every single meal. By week 2 they\'ll come sprinting before you finish the word.',
    savage: null
  },
  resultOnOffLearn: {
    result: true,
    emoji: '🔄',
    title: 'Practice the ON/OFF switch.',
    advice: 'Say "READY??" → play for 30 seconds → say "ENOUGH" → go completely still like a robot that powered down. Wait for any calm. The SECOND they settle → "READY??" again. Do 3-4 cycles. You\'re teaching them to regulate on command.',
    savage: null
  },
  resultImpulseLearn: {
    result: true,
    emoji: '✋',
    title: 'Start with doorway manners.',
    advice: 'Walk to the door. Reach for the handle. If they get excited → remove hand, wait. Try again. Only open when calm. If they blast through → close door, reset. Calm = door opens. Apply this to everything: crate, food, leash, toys. Calm earns things.',
    savage: null
  },
  resultCalmLearn: {
    result: true,
    emoji: '🧘',
    title: 'Carry kibble and capture calmness.',
    advice: 'Have kibble in your pocket. When they lie down on their own → quietly toss a treat. When they sit calmly → treat. When they make eye contact → treat. Don\'t say anything. Just reward calm whenever you see it. This is the most powerful "non-training" training that exists.',
    savage: null
  }
};

function renderDecisionTree(nodeId) {
  const tree = document.getElementById('decisionTree');
  if (!tree) return;

  const node = decisionTreeData[nodeId];
  if (!node) return;

  if (node.result) {
    tree.innerHTML = `
      <div class="dt-result">
        <div class="dt-question__emoji">${node.emoji}</div>
        <div class="dt-result__title">${node.title}</div>
        <div class="dt-result__advice">${node.advice}</div>
        ${node.savage ? `<div class="callout callout--savage"><span class="callout__label">girl...</span>${node.savage}</div>` : ''}
        <button class="btn btn--secondary btn--small" onclick="renderDecisionTree('start')" style="margin-top: 1rem;">Start over</button>
      </div>
    `;
  } else {
    const optionsHtml = node.options.map(opt =>
      `<button class="dt-btn" onclick="renderDecisionTree('${opt.next}')"><span>${opt.label.split(' ')[0]}</span> ${opt.label.substring(opt.label.indexOf(' ') + 1)}</button>`
    ).join('');

    tree.innerHTML = `
      <div class="dt-question">
        <div class="dt-question__emoji">${node.emoji}</div>
        <div class="dt-question__text">${node.text}</div>
        <div class="dt-buttons">${optionsHtml}</div>
      </div>
    `;
  }
}

// Init decision tree
document.addEventListener('DOMContentLoaded', () => {
  renderDecisionTree('start');
});

// ---- BEHAVIOR TRACKER ----
const TRACKER_KEY = 'puppyTracker';

function getTrackerData() {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem(TRACKER_KEY) || '{}');
  if (!stored[today]) {
    stored[today] = { calm: 0, chaos: 0, log: [], streak: stored._streak || 0 };
  }
  return { data: stored, today };
}

function saveTrackerData(data) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(data));
}

// ---- JOURNAL CONVERSATION ENGINE ----
let journalStep = 0;
let journalEntries = [];

const journalQuestions = [
  {
    bot: "hey! tell me the good and the bad of today. what went well with your pup?",
    type: 'good',
    placeholder: "the good stuff..."
  },
  {
    bot: "love that. now the real talk — what went sideways? no judgment, just honesty.",
    type: 'bad',
    placeholder: "the not-so-great stuff..."
  },
  {
    followUp: true // dynamic follow-up based on what they said
  }
];

function initJournal() {
  const messages = document.getElementById('journalMessages');
  if (!messages) return;

  messages.innerHTML = '';
  journalStep = 0;
  journalEntries = [];

  addJournalBot(journalQuestions[0].bot);
  updateJournalPlaceholder();
}

function addJournalBot(text, options) {
  const messages = document.getElementById('journalMessages');
  if (!messages) return;

  const msg = document.createElement('div');
  msg.className = 'journal__msg journal__msg--bot';
  msg.innerHTML = text.replace(/\n/g, '<br>');

  if (options) {
    const optDiv = document.createElement('div');
    optDiv.className = 'journal__msg--options';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'journal__opt';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        // Disable all options
        optDiv.querySelectorAll('.journal__opt').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
        addJournalUser(opt.label);
        if (opt.action) opt.action();
      });
      optDiv.appendChild(btn);
    });
    msg.appendChild(optDiv);
  }

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

function addJournalUser(text) {
  const messages = document.getElementById('journalMessages');
  if (!messages) return;

  const msg = document.createElement('div');
  msg.className = 'journal__msg journal__msg--user';
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

function updateJournalPlaceholder() {
  const input = document.getElementById('journalInput');
  if (!input) return;
  const q = journalQuestions[journalStep];
  if (q && q.placeholder) {
    input.placeholder = q.placeholder;
  } else {
    input.placeholder = 'Type here...';
  }
}

function submitJournalEntry() {
  const input = document.getElementById('journalInput');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  addJournalUser(text);

  const step = journalStep;
  journalStep++;

  if (step === 0) {
    // They told us the good — log as calm
    logBehavior('calm', text);
    journalEntries.push({ type: 'good', text });

    setTimeout(() => {
      addJournalBot(journalQuestions[1].bot);
      updateJournalPlaceholder();
    }, 600);

  } else if (step === 1) {
    // They told us the bad — log as chaos
    logBehavior('chaos', text);
    journalEntries.push({ type: 'bad', text });

    // Follow up with interview question
    setTimeout(() => {
      askFollowUp(text);
    }, 600);

  } else {
    // Additional follow-ups
    journalEntries.push({ type: 'followup', text });

    setTimeout(() => {
      wrapUpJournal();
    }, 600);
  }
}

function askFollowUp(badText) {
  const lower = badText.toLowerCase();

  let question = "ok real talk... when that happened, did you accidentally reinforce it? like, did they get what they wanted?";
  let options = [
    { label: "yeah... I gave in", action: () => handleFollowUp('gave_in') },
    { label: "no, I held strong", action: () => handleFollowUp('held') },
    { label: "honestly not sure", action: () => handleFollowUp('unsure') }
  ];

  if (lower.includes('bark') || lower.includes('whine') || lower.includes('cry')) {
    question = "when they were doing that... did you give them attention? even saying \"shh\" or looking at them counts.";
  } else if (lower.includes('bit') || lower.includes('mouth') || lower.includes('nip')) {
    question = "when they bit you... did you pull away fast, push them, or keep playing? all of those reward biting btw.";
  } else if (lower.includes('jump')) {
    question = "when they jumped... did anyone pet them, talk to them, or push them down? all attention, even negative, reinforces it.";
  } else if (lower.includes('pull') || lower.includes('leash')) {
    question = "when they pulled... did you keep walking forward? because that's literally telling them pulling works.";
  } else if (lower.includes('crate') || lower.includes('kennel')) {
    question = "did you open the crate while they were fussing? even once? because that's all it takes.";
  }

  addJournalBot(question, options);
  updateJournalPlaceholder();
}

function handleFollowUp(answer) {
  journalEntries.push({ type: 'followup_answer', text: answer });

  setTimeout(() => {
    if (answer === 'gave_in') {
      addJournalBot("hey, at least you're honest. that's more than most people. now you know what happened — and you can do it differently next time.\n\nthe fact that you're here tracking this means you care. that counts for a lot.");
    } else if (answer === 'held') {
      addJournalBot("that's huge. seriously. holding your ground when they're being chaotic is the hardest part and you did it. your dog learned something real today.");
      // Log an extra calm point for holding strong
      logBehavior('calm', 'Held strong during chaos');
    } else {
      addJournalBot("that's ok — start watching for it. the question is always: \"did my puppy get what they wanted from that behavior?\" if yes, you reinforced it. if no, you're on the right track.");
    }

    setTimeout(() => {
      addJournalBot("anything else from today? or are we good?", [
        { label: "I have more", action: () => { journalStep = 0; setTimeout(() => { addJournalBot("ok tell me more — what else happened?"); updateJournalPlaceholder(); }, 400); }},
        { label: "that's it for today", action: () => wrapUpJournal() }
      ]);
    }, 800);
  }, 500);
}

function wrapUpJournal() {
  const { data, today } = getTrackerData();
  const dayData = data[today];
  const total = dayData.calm + dayData.chaos;

  let summary = "nice work checking in today. ";
  if (total === 0) {
    summary += "even just thinking about this stuff puts you ahead of 90% of dog owners.";
  } else if (dayData.calm > dayData.chaos) {
    summary += `you're at ${Math.round((dayData.calm / total) * 100)}% calm today. your dog is learning that being chill gets them what they want. keep going.`;
  } else if (dayData.calm === dayData.chaos) {
    summary += "50/50 today. not bad, not great. the goal is just to tip the scale a little more toward calm each day.";
  } else {
    summary += `tough day — more chaos than calm. but here's the thing: you noticed. most people don't even get that far. tomorrow's a new day.`;
  }

  addJournalBot(summary);
  updateTrackerUI();
}

function submitVoiceToJournal() {
  const textEl = document.getElementById('voiceText');
  const input = document.getElementById('journalInput');
  if (textEl && input && textEl.value.trim()) {
    input.value = textEl.value.trim();
    cancelVoiceNote();
    submitJournalEntry();
  }
}

// Init journal on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('journalMessages')) {
    initJournal();
  }
});

function logBehavior(type, description) {
  const { data, today } = getTrackerData();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  data[today][type]++;
  data[today].log.unshift({ type, description, time: timeStr });

  // Update streak
  if (type === 'chaos') {
    data._streak = 0;
  }

  saveTrackerData(data);
  updateTrackerUI();
  showAccountability(type, description);
}

function updateTrackerUI() {
  const { data, today } = getTrackerData();
  const dayData = data[today];

  // Date
  const dateEl = document.getElementById('trackerDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // Stats
  const calmEl = document.getElementById('calmCount');
  const chaosEl = document.getElementById('chaosCount');
  const totalEl = document.getElementById('totalCount');
  if (calmEl) calmEl.textContent = dayData.calm;
  if (chaosEl) chaosEl.textContent = dayData.chaos;
  if (totalEl) totalEl.textContent = dayData.calm + dayData.chaos;

  // Streak
  const streak = data._streak || 0;
  const streakSection = document.getElementById('streakSection');
  if (streakSection && streak > 0) {
    streakSection.style.display = 'block';
    document.getElementById('streakCount').textContent = streak;
  }

  // Consistency bar
  const total = dayData.calm + dayData.chaos;
  const consistencyBar = document.getElementById('consistencyBar');
  if (consistencyBar && total > 0) {
    consistencyBar.style.display = 'block';
    const pct = Math.round((dayData.calm / total) * 100);
    document.getElementById('consistencyFill').style.width = pct + '%';
    document.getElementById('consistencyPct').textContent = pct + '% calm';
  }

  // Log entries
  const logContainer = document.getElementById('logEntries');
  const emptyLog = document.getElementById('emptyLog');
  if (logContainer && dayData.log.length > 0) {
    if (emptyLog) emptyLog.style.display = 'none';
    const existingEntries = logContainer.querySelectorAll('.log-entry');
    existingEntries.forEach(e => e.remove());

    dayData.log.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      const voiceTag = entry.voice ? '<span class="log-entry__voice">🎙️</span>' : '';
      div.innerHTML = `
        <div class="log-entry__dot log-entry__dot--${entry.type === 'calm' ? 'good' : 'bad'}"></div>
        <div class="log-entry__time">${entry.time}</div>
        <div>${entry.description}${voiceTag}</div>
      `;
      logContainer.appendChild(div);
    });
  }

  // Daily summary
  updateDailySummary(dayData);
}

function updateDailySummary(dayData) {
  const total = dayData.calm + dayData.chaos;
  if (total < 2) return;

  const summaryEl = document.getElementById('dailySummary');
  const textEl = document.getElementById('summaryText');
  if (!summaryEl || !textEl) return;

  summaryEl.style.display = 'block';
  const ratio = dayData.calm / total;

  let message;
  if (ratio >= 0.8) {
    message = `You rewarded calm ${dayData.calm} times today vs chaos ${dayData.chaos} times. Your dog is learning that calm = the move. Keep going. 🔥`;
  } else if (ratio >= 0.6) {
    message = `Calm: ${dayData.calm}, Chaos: ${dayData.chaos}. You're getting there... but your dog still thinks screaming works sometimes. Consistency is the game.`;
  } else if (ratio >= 0.4) {
    message = `Calm: ${dayData.calm}, Chaos: ${dayData.chaos}. It's about 50/50 right now. Your dog is confused about what works. Pick a lane.`;
  } else {
    message = `Calm: ${dayData.calm}, Chaos: ${dayData.chaos}. girl... you're accidentally training chaos more than calm right now. But that's why we're tracking. Tomorrow's a new day.`;
  }

  textEl.textContent = message;
}

// ---- ACCOUNTABILITY POP-UPS ----
const savageResponses = {
  chaos: [
    "you just trained that, btw.",
    "your dog is taking notes right now.",
    "and that's why it'll happen again tomorrow.",
    "hey... at least you logged it. awareness is step one.",
    "we fix it next rep. but like... for real this time.",
    "your puppy just learned that worked. congrats.",
  ],
  calm: [
    "yes. THIS is how you train a calm dog.",
    "your puppy's brain just went: 'oh, THAT works?'",
    "one more rep like that and you're golden.",
    "this is the boring work that creates amazing dogs.",
    "they're learning. you're teaching. it's working.",
    "that right there? that's how behavior changes.",
  ]
};

function showAccountability(type, description) {
  const el = document.getElementById('accountability');
  const textEl = document.getElementById('accountabilityText');
  const optionsEl = document.getElementById('accountabilityOptions');
  if (!el || !textEl) return;

  const responses = savageResponses[type];
  const response = responses[Math.floor(Math.random() * responses.length)];

  textEl.textContent = response;
  optionsEl.innerHTML = `<button class="btn btn--small btn--ghost" onclick="hideAccountability()">got it</button>`;

  el.style.display = 'block';

  setTimeout(hideAccountability, 5000);
}

function hideAccountability() {
  const el = document.getElementById('accountability');
  if (el) el.style.display = 'none';
}

// ---- GLOSSARY FILTER ----
function filterGlossary() {
  const search = document.getElementById('glossarySearch');
  if (!search) return;
  const query = search.value.toLowerCase();
  const items = document.querySelectorAll('.glossary__item');

  items.forEach(item => {
    const term = item.getAttribute('data-term') || '';
    const text = item.textContent.toLowerCase();
    item.style.display = (text.includes(query) || term.includes(query)) ? '' : 'none';
  });
}

// ---- FADE-IN ON SCROLL ----
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
  updateTrackerUI();
});

// ---- TRIAGE OVERLAY ----
function startTriage(scenario, customText) {
  if (typeof openTriage === 'function') {
    openTriage(scenario, customText);
  }
}

function closeTriage() {
  const overlay = document.getElementById('triageOverlay');
  if (overlay) overlay.style.display = 'none';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeTriage(); closeSiteSearch(); }
});

// ---- VOICE NOTE RECORDING ----
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;

function toggleVoiceNote() {
  const statusEl = document.getElementById('voiceStatus');
  const recordingEl = document.getElementById('voiceRecording');
  const resultEl = document.getElementById('voiceResult');
  const labelEl = document.getElementById('voiceLabel');
  const iconEl = document.getElementById('voiceIcon');

  if (!statusEl) return;

  // Check for speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Fallback: just show text input
    statusEl.style.display = 'block';
    recordingEl.style.display = 'none';
    resultEl.style.display = 'block';
    document.getElementById('voiceText').placeholder = 'Type your note here (speech recognition not supported in this browser)...';
    document.getElementById('voiceText').focus();
    return;
  }

  // Start recording
  statusEl.style.display = 'block';
  recordingEl.style.display = 'flex';
  resultEl.style.display = 'none';
  labelEl.textContent = 'Recording...';
  iconEl.textContent = '🔴';

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = '';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    document.getElementById('voiceText').value = finalTranscript + interim;
  };

  recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    stopVoiceNote();
  };

  recognition.onend = () => {
    // Show result for user to categorize
    recordingEl.style.display = 'none';
    resultEl.style.display = 'block';
    labelEl.textContent = 'Record a note';
    iconEl.textContent = '🎙️';
  };

  recognition.start();
}

function stopVoiceNote() {
  if (recognition) {
    recognition.stop();
  }
  const recordingEl = document.getElementById('voiceRecording');
  const resultEl = document.getElementById('voiceResult');
  const labelEl = document.getElementById('voiceLabel');
  const iconEl = document.getElementById('voiceIcon');

  if (recordingEl) recordingEl.style.display = 'none';
  if (resultEl) resultEl.style.display = 'block';
  if (labelEl) labelEl.textContent = 'Record a note';
  if (iconEl) iconEl.textContent = '🎙️';
}

function saveVoiceNote(type) {
  const textEl = document.getElementById('voiceText');
  const text = textEl ? textEl.value.trim() : '';

  if (!text) return;

  // Log with voice flag
  const { data, today } = getTrackerData();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  data[today][type]++;
  data[today].log.unshift({ type, description: text, time: timeStr, voice: true });

  if (type === 'chaos') {
    data._streak = 0;
  }

  saveTrackerData(data);
  updateTrackerUI();
  showAccountability(type, text);

  // Reset
  cancelVoiceNote();
}

function cancelVoiceNote() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  const statusEl = document.getElementById('voiceStatus');
  const textEl = document.getElementById('voiceText');
  const labelEl = document.getElementById('voiceLabel');
  const iconEl = document.getElementById('voiceIcon');

  if (statusEl) statusEl.style.display = 'none';
  if (textEl) textEl.value = '';
  if (labelEl) labelEl.textContent = 'Record a note';
  if (iconEl) iconEl.textContent = '🎙️';
}

// ---- GENERIC CARD/DRILL FILTER ----
function filterCards(selector, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(selector).forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
  // Open/close drill groups based on whether they have visible drills
  document.querySelectorAll('.drill-group').forEach(group => {
    const hasVisible = Array.from(group.querySelectorAll('.drill-accordion')).some(d => d.style.display !== 'none');
    if (q) {
      group.open = hasVisible;
      group.style.display = hasVisible ? '' : 'none';
    } else {
      group.open = false;
      group.style.display = '';
    }
  });
}

// ---- SITE SEARCH OVERLAY ----
const siteSearchIndex = [
  // Glossary
  { title: 'Capturing', desc: 'Rewarding behaviors the dog offers naturally', page: 'glossary.html', section: 'Glossary' },
  { title: 'Marker / marker word', desc: 'A sound that marks the moment the dog did the right thing', page: 'glossary.html', section: 'Glossary' },
  { title: 'Positive reinforcement', desc: 'Adding something good to make a behavior happen more', page: 'glossary.html', section: 'Glossary' },
  { title: 'Threshold', desc: 'The point where a stimulus becomes too intense to learn', page: 'glossary.html', section: 'Glossary' },
  { title: 'Shaping', desc: 'Reinforcing successive approximations toward a target behavior', page: 'glossary.html', section: 'Glossary' },
  { title: 'Luring', desc: 'Using a treat to physically guide the dog into position', page: 'glossary.html', section: 'Glossary' },
  { title: 'Impulse control', desc: 'Resisting an immediate desire for a better outcome', page: 'glossary.html', section: 'Glossary' },
  { title: 'Desensitization', desc: 'Gradual exposure to a stimulus at sub-threshold intensity', page: 'glossary.html', section: 'Glossary' },
  { title: 'Counter-conditioning', desc: 'Changing emotional response by pairing with something good', page: 'glossary.html', section: 'Glossary' },
  { title: 'Extinction burst', desc: 'Temporary increase in behavior when reinforcement is removed', page: 'glossary.html', section: 'Glossary' },
  { title: 'Place / mat training', desc: 'Teaching a dog to go to a spot and remain calmly', page: 'glossary.html', section: 'Glossary' },
  { title: 'Generalization', desc: 'A behavior learned in one context performed in new contexts', page: 'glossary.html', section: 'Glossary' },
  { title: 'Enrichment', desc: 'Activities that stimulate the mind and fulfill species-typical needs', page: 'glossary.html', section: 'Glossary' },
  { title: 'Management', desc: 'Environmental modification to prevent unwanted behaviors', page: 'glossary.html', section: 'Glossary' },
  { title: 'Fear period', desc: 'Developmental stages where puppies are hypersensitive', page: 'glossary.html', section: 'Glossary' },
  { title: 'Dominance theory', desc: 'An outdated debunked framework from flawed wolf studies', page: 'glossary.html', section: 'Glossary' },
  // Learn modules
  { title: 'Crate training', desc: 'Making the crate a happy place, not a prison', page: 'learn.html', section: 'Learn' },
  { title: 'Bite inhibition', desc: 'Teaching a land shark to have a soft mouth', page: 'learn.html', section: 'Learn' },
  { title: 'Leash walking', desc: 'Getting them to stop pulling like a sled dog', page: 'learn.html', section: 'Learn' },
  { title: 'Socialization', desc: 'Exposure to the world before the window closes', page: 'learn.html', section: 'Learn' },
  { title: 'Potty training', desc: 'The schedule is everything', page: 'learn.html', section: 'Learn' },
  { title: 'Desensitization & handling', desc: 'Baths, nails, vet visits — go slow, pair with food', page: 'learn.html', section: 'Learn' },
  { title: 'Flying with your puppy', desc: 'Everything you need to know about air travel with a dog', page: 'learn.html', section: 'Learn' },
  { title: 'Introducing to older dogs', desc: 'How to introduce your puppy to an existing dog', page: 'learn.html', section: 'Learn' },
  // Drills
  { title: 'The Recall Game', desc: 'GET IT / COME game with kibble', page: 'drills.html', section: 'Drills' },
  { title: 'On/Off Switch', desc: 'READY to play, ENOUGH to settle', page: 'drills.html', section: 'Drills' },
  { title: 'Leave It', desc: 'Impulse control with treats at levels', page: 'drills.html', section: 'Drills' },
  { title: 'Place training', desc: 'Go to your mat and stay calm', page: 'drills.html', section: 'Drills' },
  { title: 'Doorway manners', desc: 'Wait at the door, earn the walk', page: 'drills.html', section: 'Drills' },
  { title: 'Settle', desc: 'Capturing calm with reward drops', page: 'drills.html', section: 'Drills' },
  // Rules / philosophy
  { title: 'The Only Rule', desc: 'Your puppy asks: did that work for me?', page: 'rules.html', section: 'The Rules' },
  { title: 'Training 24/7', desc: 'Every reaction is a lesson, even when you don\'t mean it', page: 'rules.html', section: 'The Rules' },
  { title: 'Meet needs first', desc: 'Food, potty, play, brain — then address behavior', page: 'rules.html', section: 'The Rules' },
  { title: 'Emotional regulation', desc: 'Teaching your puppy to self-soothe and calm down', page: 'rules.html', section: 'The Rules' },
  { title: 'Calm greetings', desc: 'Ignore chaos, reward calm when you come home', page: 'rules.html', section: 'The Rules' },
  // Pages
  { title: 'By Age guide', desc: 'What to focus on at each developmental stage', page: 'by-age.html', section: 'By Age' },
  { title: 'Daily Routine', desc: 'Sample schedules by age from morning to night', page: 'routine.html', section: 'Routine' },
  { title: 'Behavior Tracker', desc: 'Log calm vs chaos moments and track streaks', page: 'tracker.html', section: 'Tracker' },
];

function openSiteSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const input = document.getElementById('siteSearchInput');
    if (input) { input.value = ''; input.focus(); }
    renderSearchResults('');
  }
}

function closeSiteSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.style.display = 'none';
}

function renderSearchResults(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!resultsEl) return;

  const q = query.toLowerCase().trim();
  if (!q) {
    resultsEl.innerHTML = '<p style="color: var(--soft-gray); text-align: center; margin-top: 2rem;">Start typing to search across all pages</p>';
    return;
  }

  const matches = siteSearchIndex.filter(item =>
    item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.section.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    resultsEl.innerHTML = `<p style="color: var(--soft-gray); text-align: center; margin-top: 2rem;">No results for "${q}"</p><p style="text-align: center; margin-top: 0.5rem;"><a href="index.html" style="color: var(--rust);">Try asking about it on the home page</a></p>`;
    return;
  }

  resultsEl.innerHTML = matches.map(item =>
    `<a href="${item.page}" class="search-result">
      <span class="search-result__section">${item.section}</span>
      <span class="search-result__title">${item.title}</span>
      <span class="search-result__desc">${item.desc}</span>
    </a>`
  ).join('');
}
