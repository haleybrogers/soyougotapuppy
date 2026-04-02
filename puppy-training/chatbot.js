/* ============================================
   PUPPY TRAINING FOR PUPPIES
   Behavior Triage Chatbot
   Pre-written flows + Claude API fallback
   ============================================ */

// ---- TRIAGE FLOWS ----
// Each flow follows: normalize → diagnose → check needs → action → reframe
const triageFlows = {
  barking: {
    steps: [
      {
        type: 'bot',
        text: "okay. breathe. barking is one of the most annoying things on earth but your puppy isn't broken.",
        delay: 800
      },
      {
        type: 'bot',
        text: "quick check — have their needs been met today?",
        delay: 1200,
        options: [
          { label: "✅ Yes, all good", next: 'barking_needsMet' },
          { label: "🤔 Not sure", next: 'barking_needsUnsure' },
          { label: "❌ Probably not", next: 'barking_needsNo' }
        ]
      }
    ]
  },
  barking_needsNo: {
    steps: [
      {
        type: 'bot',
        text: "yeah that might be why. a bored/hungry/under-exercised puppy is gonna make noise about it.",
        delay: 600
      },
      {
        type: 'bot',
        text: "meet the needs first:\n→ food\n→ potty\n→ walk or play session\n→ something to chew on\n\nthen see if the barking is still happening. most of the time... it won't be.",
        delay: 1000
      },
      {
        type: 'bot',
        text: "your puppy isn't being bad. they're just telling you something. once you listen, the noise usually stops. 🤷‍♀️",
        delay: 800
      }
    ]
  },
  barking_needsUnsure: {
    steps: [
      {
        type: 'bot',
        text: "run through this real quick:\n\n🍗 eaten in the last few hours?\n🚽 been outside to potty?\n🏃 had play or a walk today?\n🧠 any mental stimulation?\n😴 had enough sleep (puppies need 18-20 hrs)?",
        delay: 800
      },
      {
        type: 'bot',
        text: "if ANY of those are a no... handle that first. then come back. your puppy might just be communicating an unmet need through the only channel they have: screaming.",
        delay: 1000
      }
    ]
  },
  barking_needsMet: {
    steps: [
      {
        type: 'bot',
        text: "ok so needs are met but they're still going off. this is demand barking.",
        delay: 600
      },
      {
        type: 'bot',
        text: "here's what's happening: at some point, barking got them something. attention, eye contact, you saying \"SHHH,\" anything. so now they think: bark = stuff happens.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "👉 what to do RIGHT NOW:\n\n1. completely ignore it. no eye contact, no \"quiet,\" no nothing\n2. wait for even 1 second of silence\n3. the INSTANT they're quiet → calmly reward\n4. if they start again → back to ignoring\n\nit might get worse before it gets better (extinction burst). that's normal. they're testing if the old strategy still works.",
        delay: 1500
      },
      {
        type: 'bot',
        text: "real talk... every time you say \"shush\" you're literally having a conversation with them about barking. they think you're joining in. 🤦‍♀️",
        delay: 800,
        accountability: true
      }
    ]
  },

  biting: {
    steps: [
      {
        type: 'bot',
        text: "congrats you got a land shark 🦈\n\nthis is completely normal puppy behavior. their mouth is how they explore everything.",
        delay: 800
      },
      {
        type: 'bot',
        text: "how old is your puppy?",
        delay: 600,
        options: [
          { label: "Under 4 months", next: 'biting_young' },
          { label: "4-6 months", next: 'biting_teething' },
          { label: "Over 6 months", next: 'biting_older' }
        ]
      }
    ]
  },
  biting_young: {
    steps: [
      {
        type: 'bot',
        text: "ok so at this age, mouthing is totally normal and actually important. you don't want to suppress ALL mouthing — you want to teach bite pressure control (soft mouth).",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 when they bite too hard:\n1. say \"ouch\" calmly (don't yelp)\n2. let your hand go limp\n3. remove ALL attention for 30 seconds\n4. resume playing\n\nbiting hard = fun ENDS. that's the lesson.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "redirect to appropriate chew toys when they mouth on you. and whatever you do... do NOT keep playing while laughing through the bites. you're training a professional biter. 😬",
        delay: 1000,
        accountability: true
      }
    ]
  },
  biting_teething: {
    steps: [
      {
        type: 'bot',
        text: "they're teething. their mouth hurts. everything must be chewed. this is peak land shark phase and it WILL pass.",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 same rules as before (ouch → disengage) BUT also:\n\n→ frozen Kongs\n→ frozen wet washcloths\n→ bully sticks\n→ appropriate chew toys EVERYWHERE\n\ntheir gums are killing them. give them relief so they don't use your hands.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "this peaks around 4-5 months and usually calms down by 6-7 months when adult teeth are in. you will survive this. probably.",
        delay: 800
      }
    ]
  },
  biting_older: {
    steps: [
      {
        type: 'bot',
        text: "at this age, mouthing should be getting softer and less frequent. if it's still intense...",
        delay: 600
      },
      {
        type: 'bot',
        text: "👉 are you accidentally rewarding it?\n\nask yourself:\n→ do you keep playing when they bite?\n→ do you laugh or push them away (which feels like play to them)?\n→ do they get ANY attention from biting?\n\nif yes to any of those... that's why it's still happening.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "the fix is the same: bite = ALL fun stops immediately. walk away. become incredibly boring. and make sure everyone in the house does the same. consistency from ALL humans is non-negotiable.",
        delay: 1000,
        accountability: true
      }
    ]
  },

  zooming: {
    steps: [
      {
        type: 'bot',
        text: "ah yes. the psycho puppy moment. tale as old as time.",
        delay: 600
      },
      {
        type: 'bot',
        text: "quick check — when's the last time they napped?",
        delay: 800,
        options: [
          { label: "Recently (within 2 hrs)", next: 'zooming_rested' },
          { label: "It's been a while", next: 'zooming_tired' },
          { label: "They refuse to nap", next: 'zooming_noNap' }
        ]
      }
    ]
  },
  zooming_tired: {
    steps: [
      {
        type: 'bot',
        text: "yeah that's an overtired puppy. like a toddler past their bedtime who gets MORE hyper, not less.",
        delay: 600
      },
      {
        type: 'bot',
        text: "👉 crate them calmly with a chew toy\n→ let them cry it out if needed\n→ they WILL settle\n→ open the door when calm\n\nenforced nap time isn't mean. it's necessary. puppies need 18-20 hours of sleep per day.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "your puppy didn't choose violence. they're just so tired their brain broke. nap fixes everything.",
        delay: 800
      }
    ]
  },
  zooming_rested: {
    steps: [
      {
        type: 'bot',
        text: "ok so they're rested and still being wild. this is probably just excess energy or overstimulation.",
        delay: 600
      },
      {
        type: 'bot',
        text: "👉 try this:\n1. don't chase or engage (you'll make it worse)\n2. stay calm and boring\n3. if it doesn't pass in a couple minutes → crate with chew toy\n4. let them settle\n5. release when calm\n\nOR... use this as an opportunity to practice the ON/OFF switch. Say your hype word, play for 30 sec, then \"ENOUGH\" and go still.",
        delay: 1400
      }
    ]
  },
  zooming_noNap: {
    steps: [
      {
        type: 'bot',
        text: "refusing to nap = they NEED to nap. that's the puppy paradox.",
        delay: 600
      },
      {
        type: 'bot',
        text: "they don't know they're tired. they can't self-regulate yet. that's YOUR job.\n\n👉 crate them now. give a Kong or chew. they will protest. let them. within 10-15 minutes they'll be passed out.\n\nthis is literally emotional regulation training. they're learning to come down from hype.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "if you wait for a puppy to \"calm down on their own\"... you'll be waiting forever. 🫠",
        delay: 800
      }
    ]
  },

  crying: {
    steps: [
      {
        type: 'bot',
        text: "ok first — this is normal. your puppy isn't traumatized. they're just like \"hello?? where did my person go??\"",
        delay: 800
      },
      {
        type: 'bot',
        text: "urgent question: do they need to potty?",
        delay: 600,
        options: [
          { label: "They might actually need to pee", next: 'crying_potty' },
          { label: "No, they just went", next: 'crying_noPotty' },
          { label: "I'm not sure", next: 'crying_unsure' }
        ]
      }
    ]
  },
  crying_potty: {
    steps: [
      {
        type: 'bot',
        text: "ok take them out. boring potty trip — no play, no fuss. just business. then back in the crate.",
        delay: 600
      },
      {
        type: 'bot',
        text: "if they cry again after pottying... now we know it's not a need. it's a want. and we handle that differently. come back if they start up again.",
        delay: 800
      }
    ]
  },
  crying_unsure: {
    steps: [
      {
        type: 'bot',
        text: "when in doubt, take them out for a quick potty break. boring trip — straight out, straight back in. no play.",
        delay: 600
      },
      {
        type: 'bot',
        text: "if they go → great, they needed it\nif they don't → back in the crate, now you know it's not a potty thing\n\nthen treat the crying as emotional regulation practice (see below 👇)",
        delay: 800,
        options: [
          { label: "OK they pottied but still crying", next: 'crying_noPotty' },
          { label: "They didn't even go. Just wanted out", next: 'crying_noPotty' }
        ]
      }
    ]
  },
  crying_noPotty: {
    steps: [
      {
        type: 'bot',
        text: "ok so needs are met. this is emotional regulation time.",
        delay: 600
      },
      {
        type: 'bot',
        text: "here's what's happening: they're learning whether crying = getting let out. this is the moment that matters.",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 DO NOT open the crate while they're crying\n→ wait for even 2 seconds of quiet\n→ THEN open the door\n→ walk away like it's no big deal\n\ncalm = freedom\ncrying = nothing happens",
        delay: 1200
      },
      {
        type: 'bot',
        text: "this is hard. it sucks to listen to. but if you open that crate while they're screaming... you just taught them screaming works. and they WILL do it louder and longer next time. that's just how brains work.",
        delay: 1000,
        accountability: true
      }
    ]
  },

  jumping: {
    steps: [
      {
        type: 'bot',
        text: "jumping = \"I want attention and this has worked before.\"\n\nit's not dominance. it's not disrespect. they just learned that going vertical = people react.",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 right now:\n1. turn away completely (arms folded, no eye contact)\n2. wait for all four paws on the floor\n3. the SECOND they're on the ground → calmly pet them\n4. if they jump again → turn away again\n\nrepeat until they figure out: calm = attention, jumping = nothing.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "the hard part? EVERYONE needs to do this. if your partner, your friends, or your mom are squealing \"HIII BABY!!\" while the dog jumps on them... you're fighting a losing battle. consistency from ALL humans.",
        delay: 1000,
        accountability: true
      }
    ]
  },

  pulling: {
    steps: [
      {
        type: 'bot',
        text: "being dragged by a tiny dictator. classic.",
        delay: 600
      },
      {
        type: 'bot',
        text: "here's why it happens: pulling = forward motion. forward motion is what they want. so pulling is WORKING for them.",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 the fix:\n1. the instant the leash goes tight → STOP walking\n2. become a tree\n3. wait for them to look at you OR for the leash to go slack\n4. then move forward again\n5. repeat... a lot\n\npulling = nothing happens\nloose leash = we go",
        delay: 1200
      },
      {
        type: 'bot',
        text: "pro tip: reward them with treats when they're walking nicely next to you. make being near you on a walk the best thing ever.\n\nalso... ditch the retractable leash if you have one. those literally train dogs to pull. 6ft flat leash is the way.",
        delay: 1000,
        accountability: true
      }
    ]
  },

  ignoring: {
    steps: [
      {
        type: 'bot',
        text: "they're not ignoring you to be rude. they just haven't learned that coming to you = the best thing ever.",
        delay: 800
      },
      {
        type: 'bot',
        text: "real question: what happens when they DO come to you? do they get:\n→ treats?\n→ play?\n→ good things?\n\nor do they get:\n→ put in the crate?\n→ brought inside from the yard?\n→ a bath?\n→ something they don't want?",
        delay: 1200
      },
      {
        type: 'bot',
        text: "👉 the fix:\n\n1. hand-feed all meals with the GET IT / COME game\n2. carry kibble and reward EVERY time they look at you or come to you randomly\n3. never call them for something unpleasant\n4. make yourself the most rewarding thing in their world\n\nyou need to become the vending machine. every time they check in = jackpot.",
        delay: 1400
      },
      {
        type: 'bot',
        text: "why would they come to you? serious question. what have you done for them lately? make it worth their while. 💰",
        delay: 800,
        accountability: true
      }
    ]
  },

  chewing: {
    steps: [
      {
        type: 'bot',
        text: "RIP your stuff. but also: chewing is normal. it's how they explore + it soothes teething pain.",
        delay: 800
      },
      {
        type: 'bot',
        text: "the real question isn't \"how do I stop them from chewing.\" it's \"am I giving them stuff they're ALLOWED to chew?\"",
        delay: 800
      },
      {
        type: 'bot',
        text: "👉 right now:\n1. take away the forbidden item (trade for a treat, don't chase)\n2. give them something appropriate (Kong, bully stick, frozen chew)\n3. puppy-proof your space — if they can reach it, they will destroy it\n\nmanagement is half the game. shoes on the floor within puppy reach? that's a you problem.",
        delay: 1200
      },
      {
        type: 'bot',
        text: "never punish after the fact. they CANNOT connect your anger to the shoe they chewed 20 minutes ago. they just think you're being scary for no reason.\n\nand if they're over 6 months and still destroying stuff... check their exercise and mental stimulation. a bored dog is a destructive dog.",
        delay: 1000,
        accountability: true
      }
    ]
  }
};

// ---- CHAT ENGINE ----
let currentFlow = null;
let currentStep = 0;
let chatQueue = [];
let isProcessingQueue = false;

function openTriage(scenario) {
  const overlay = document.getElementById('triageOverlay');
  const messages = document.getElementById('chatMessages');
  const inputArea = document.getElementById('chatInputArea');

  if (!overlay || !messages) return;

  // Reset
  messages.innerHTML = '';
  currentStep = 0;
  chatQueue = [];
  isProcessingQueue = false;

  overlay.style.display = 'flex';

  // Find the flow
  const flow = triageFlows[scenario];
  if (flow) {
    currentFlow = scenario;
    processFlow(flow);
  } else {
    // Fallback — show text input for Claude API
    addBotMessage("hmm I don't have a specific flow for that yet. tell me what's happening and I'll help.");
    if (inputArea) inputArea.style.display = 'flex';
  }
}

function processFlow(flow) {
  flow.steps.forEach((step, i) => {
    chatQueue.push(step);
  });
  processQueue();
}

function processQueue() {
  if (isProcessingQueue || chatQueue.length === 0) return;
  isProcessingQueue = true;

  const step = chatQueue.shift();
  const delay = step.delay || 800;

  // Show typing indicator
  showTyping();

  setTimeout(() => {
    hideTyping();

    if (step.type === 'bot') {
      addBotMessage(step.text, step.options);

      // Show accountability check after the last step
      if (step.accountability && chatQueue.length === 0) {
        setTimeout(() => showAccountabilityCheck(), 1500);
      }
    }

    isProcessingQueue = false;
    if (chatQueue.length > 0 && !step.options) {
      processQueue();
    }
  }, delay);
}

function addBotMessage(text, options) {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg--bot';
  msgDiv.innerHTML = formatMessage(text);

  if (options) {
    const optDiv = document.createElement('div');
    optDiv.className = 'chat-options';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-option';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handleOption(opt));
      optDiv.appendChild(btn);
    });
    msgDiv.appendChild(optDiv);
  }

  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

function addUserMessage(text) {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg chat-msg--user';
  msgDiv.textContent = text;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

function handleOption(opt) {
  // Remove all option buttons from the last message
  const allOptions = document.querySelectorAll('.chat-options');
  allOptions.forEach(o => {
    o.querySelectorAll('.chat-option').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
  });

  addUserMessage(opt.label);

  if (opt.next && triageFlows[opt.next]) {
    currentFlow = opt.next;
    processFlow(triageFlows[opt.next]);
  }
}

function showTyping() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  const typing = document.createElement('div');
  typing.className = 'chat-msg chat-msg--bot chat-msg--typing';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

function formatMessage(text) {
  // Convert newlines to <br> and basic markdown-like formatting
  return text
    .replace(/\n/g, '<br>')
    .replace(/→/g, '→')
    .replace(/👉/g, '👉')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ---- ACCOUNTABILITY CHECK (after triage) ----
function showAccountabilityCheck() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  const checkDiv = document.createElement('div');
  checkDiv.className = 'chat-msg chat-msg--bot';
  checkDiv.innerHTML = `
    <div style="margin-bottom: 0.5rem; font-weight: 600;">real talk... did you accidentally reward this behavior before asking for help? 👀</div>
    <div class="chat-options">
      <button class="chat-option" onclick="handleAccountability('yes')">yes 😬</button>
      <button class="chat-option" onclick="handleAccountability('no')">no, I held strong 💪</button>
      <button class="chat-option" onclick="handleAccountability('kinda')">...kind of</button>
    </div>
  `;
  messages.appendChild(checkDiv);
  messages.scrollTop = messages.scrollHeight;
}

function handleAccountability(answer) {
  // Disable buttons
  const allOptions = document.querySelectorAll('.chat-options');
  allOptions.forEach(o => {
    o.querySelectorAll('.chat-option').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
  });

  if (answer === 'yes' || answer === 'kinda') {
    addUserMessage(answer === 'yes' ? 'yes 😬' : '...kind of');
    setTimeout(() => {
      addBotMessage("hey, at least you're honest. that's more than most people. log it and we fix it next rep. 💛\n\nyour dog just learned something from that. now you know what to do differently. that's progress.");
      // Log it
      if (typeof logBehavior === 'function') {
        logBehavior('chaos', 'Admitted to rewarding chaos (triage)');
      }
    }, 800);
  } else {
    addUserMessage('no, I held strong 💪');
    setTimeout(() => {
      addBotMessage("THAT'S what I'm talking about. your dog just learned that the old strategy doesn't work anymore. one rep at a time. 🔥");
      if (typeof logBehavior === 'function') {
        logBehavior('calm', 'Held strong during chaos (triage)');
      }
    }, 800);
  }
}

// ---- TEXT INPUT / CLAUDE API FALLBACK ----
function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  input.value = '';
  addUserMessage(text);

  // For now, use a keyword-based fallback
  // TODO: integrate Claude API for real responses
  setTimeout(() => {
    const response = getKeywordResponse(text);
    addBotMessage(response);
  }, 1200);
}

// Handle enter key in chat input
const chatInput = document.getElementById('chatInput');
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });
}

function getKeywordResponse(text) {
  const lower = text.toLowerCase();

  if (lower.includes('bark') || lower.includes('loud') || lower.includes('noise')) {
    return "sounds like barking. here's the deal: any attention (even \"SHHH\") = reward. completely ignore the barking. wait for quiet. reward the quiet. it gets worse before it gets better (extinction burst) but it DOES get better.";
  }
  if (lower.includes('bite') || lower.includes('teeth') || lower.includes('mouth') || lower.includes('nip')) {
    return "land shark mode. say \"ouch\" calmly → remove ALL attention for 30 seconds → resume. biting = fun ends. also make sure they have appropriate chew toys — their mouth might hurt from teething.";
  }
  if (lower.includes('crate') || lower.includes('cry') || lower.includes('whine') || lower.includes('scream')) {
    return "if their needs are met (fed, pottied, played), do NOT open the crate while they're crying. wait for even 2 seconds of quiet. THEN open. walk away calmly. calm = freedom. screaming = nothing happens.";
  }
  if (lower.includes('jump')) {
    return "jumping = attention seeking that works. turn away completely. wait for four paws on the ground. THEN pet them. repeat. and tell everyone in your life to do the same or you're wasting your time.";
  }
  if (lower.includes('pull') || lower.includes('leash') || lower.includes('walk')) {
    return "pulling = forward motion (which is what they want). the instant the leash goes tight → stop. become a tree. wait for loose leash → move forward. also: ditch the retractable leash. 6ft flat leash only.";
  }
  if (lower.includes('pott') || lower.includes('pee') || lower.includes('accident') || lower.includes('house')) {
    return "potty training = schedule + supervision. take them out after waking, eating, playing, and every 1-2 hours. reward IMMEDIATELY when they go outside. accidents inside? clean with enzymatic cleaner and take them out more. never punish after the fact.";
  }
  if (lower.includes('zoom') || lower.includes('crazy') || lower.includes('psycho') || lower.includes('energy')) {
    return "psycho puppy moment. first check: when did they last nap? overtired puppies get MORE wild, not less. if they haven't napped in a while → crate them with a chew. they'll crash. if they're rested → this is excess energy. use the on/off switch practice.";
  }
  if (lower.includes('chew') || lower.includes('destroy') || lower.includes('shoe') || lower.includes('furniture')) {
    return "chewing is normal, especially during teething. the fix: redirect to appropriate chews + puppy-proof your space. if they can reach it, they will destroy it. that's a management problem, not a training problem. and never punish after the fact — they can't connect it.";
  }
  if (lower.includes('come') || lower.includes('recall') || lower.includes('ignore') || lower.includes('listen')) {
    return "they're not coming because coming to you isn't rewarding enough yet. fix: hand-feed all meals with the GET IT / COME game. carry kibble and reward every time they look at you or come randomly. never call them for something unpleasant. become the vending machine.";
  }
  if (lower.includes('food') || lower.includes('eat') || lower.includes('treat')) {
    return "carry kibble around like a crazy person. reward any behavior you like: sitting, lying down, checking in with you, being calm. let them figure out how to \"activate\" the food. that's the cheat code. a thinking puppy is a tired puppy.";
  }

  // Generic fallback
  return "here's what I always come back to: what is working for your puppy right now? whatever behavior they're doing... something about it is working for them. your job is to make the CALM behaviors work, and the chaotic ones... not work. carry kibble. reward calm. ignore chaos. be consistent. that's 90% of puppy training.";
}

// ---- TRIAGE OVERLAY STYLES (injected) ----
const triageStyles = document.createElement('style');
triageStyles.textContent = `
  .triage-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(42, 42, 42, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .triage-modal {
    background: #FFFFFF;
    border-radius: 24px;
    width: 100%;
    max-width: 550px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    overflow: hidden;
  }

  .triage-modal .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 2rem 1.5rem 1rem;
    min-height: 300px;
    max-height: 60vh;
  }

  .triage-modal .chat-input-area {
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid rgba(61, 43, 31, 0.06);
  }

  .triage-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--soft-gray, #8B8B8B);
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 150ms ease;
    z-index: 10;
  }

  .triage-close:hover {
    background: rgba(61, 43, 31, 0.06);
    color: var(--bark, #3D2B1F);
  }

  .triage-modal {
    position: relative;
  }

  @media (max-width: 600px) {
    .triage-modal {
      max-height: 95vh;
      border-radius: 20px 20px 0 0;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: 100%;
    }
    .triage-overlay {
      align-items: flex-end;
      padding: 0;
    }
  }
`;
document.head.appendChild(triageStyles);
