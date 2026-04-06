/* ============================================
   PUPPY TRAINING FOR PUPPIES
   AI Features: Weekly Plan + Daily Breed Fact
   Supabase Edge Functions + Client Rendering
   ============================================ */

// ---- CONFIG ----
// Replace these with your actual Supabase project values
const SUPABASE_URL = 'https://rvfbszfefnrdqvuzngbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZmJzemZlZm5yZHF2dXpuZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjYyMDgsImV4cCI6MjA5MDgwMjIwOH0.LxL6Yt6e35eKRs7TgC8fhvkFvaWrWLht_CYuZuJyIqw';
const EDGE_FN_BASE = SUPABASE_URL + '/functions/v1';

// ---- DEVICE ID ----
function getOrCreateDeviceId() {
  let id = localStorage.getItem('sygap_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem('sygap_device_id', id);
  }
  return id;
}

// ---- WEEK CALCULATION ----
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

// ---- DOG PHASE ----
function getDogPhase(ageWeeks) {
  if (ageWeeks <= 8) return { name: 'Foundation', range: 'weeks 0-8' };
  if (ageWeeks <= 16) return { name: 'Socialization window', range: 'weeks 9-16' };
  if (ageWeeks <= 24) return { name: 'Adolescence begins', range: 'weeks 17-24' };
  if (ageWeeks <= 36) return { name: 'Teen phase', range: 'weeks 25-36' };
  return { name: 'Maturity', range: 'weeks 37-52' };
}

// ---- TODAY STRING ----
function getTodayString() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---- API CALLS ----
function getWeeklyProgress() {
  // Gather what the user actually completed this week from the training log
  try {
    const log = JSON.parse(localStorage.getItem('puppy_training_log') || '{}');
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const weekSessions = [];

    // Look back through this week (Mon-Sun)
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayData = log[key];
      if (dayData && dayData.completed && dayData.completed.length > 0) {
        const details = dayData.completedDetails || {};
        const names = dayData.completed.map(id => {
          // Get the human-readable name from completedDetails, fallback to ID
          const baseName = id.replace(/-rep-\d+$/, '');
          return details[baseName] || baseName.replace('plan-area-', 'focus ');
        });
        weekSessions.push({ date: key, count: dayData.sessions || 0, items: [...new Set(names)] });
      }
    }

    // Get this week's reflection
    const { week, year } = getISOWeekNumber(now);
    const reflectionKey = 'sygap_reflection_' + year + '_' + week;
    const reflection = localStorage.getItem(reflectionKey) || '';

    // Get last week's reflection too
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeek = getISOWeekNumber(lastWeekDate);
    const lastReflectionKey = 'sygap_reflection_' + lastWeek.year + '_' + lastWeek.week;
    const lastReflection = localStorage.getItem(lastReflectionKey) || '';

    // Get last week's AI training summary (from "how am I doing?" button)
    let lastWeekSummary = null;
    try {
      const summaryRaw = localStorage.getItem('sygap_log_summary_' + lastWeek.year + '_' + lastWeek.week);
      if (summaryRaw) lastWeekSummary = JSON.parse(summaryRaw);
    } catch(e) { /* ignore */ }

    return {
      sessions_this_week: weekSessions,
      total_sessions_this_week: weekSessions.reduce((sum, d) => sum + d.count, 0),
      reflection: reflection,
      last_week_reflection: lastReflection,
      last_week_summary: lastWeekSummary,
    };
  } catch(e) {
    return { sessions_this_week: [], total_sessions_this_week: 0, reflection: '', last_week_reflection: '', last_week_summary: null };
  }
}

async function fetchWeeklyPlan(profile, forceRefresh, checkinAnswers) {
  const deviceId = getOrCreateDeviceId();
  const age = getDogAge(profile.dogBirthday);
  const { week, year } = getISOWeekNumber(new Date());
  const modules = getModuleProgress();
  const progress = getWeeklyProgress();

  // If no checkin answers passed, try loading saved ones
  if (!checkinAnswers) {
    try {
      const saved = localStorage.getItem('sygap_checkin_' + year + '_' + week);
      if (saved) checkinAnswers = JSON.parse(saved);
    } catch(e) {}
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(EDGE_FN_BASE + '/generate-weekly-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({
        device_id: deviceId,
        dog_name: profile.dogName,
        dog_breed: profile.dogBreed,
        dog_gender: profile.dogGender || null,
        dog_age_weeks: age.weeks,
        modules_completed: modules,
        week_number: week,
        year: year,
        force_refresh: !!forceRefresh,
        weekly_progress: progress,
        checkin_answers: checkinAnswers || null,
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('fetchWeeklyPlan API error:', res.status, errBody);
      throw new Error('API returned ' + res.status);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.plan;
  } catch (err) {
    clearTimeout(timeout);
    console.error('fetchWeeklyPlan error:', err);

    // Auto-retry once after a short delay
    if (!forceRefresh) {
      console.log('Retrying weekly plan...');
      try {
        const retryRes = await fetch(EDGE_FN_BASE + '/generate-weekly-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            device_id: getOrCreateDeviceId(),
            dog_name: profile.dogName,
            dog_breed: profile.dogBreed,
            dog_gender: profile.dogGender || null,
            dog_age_weeks: getDogAge(profile.dogBirthday).weeks,
            modules_completed: getModuleProgress(),
            week_number: getISOWeekNumber(new Date()).week,
            year: getISOWeekNumber(new Date()).year,
            force_refresh: true,
            weekly_progress: getWeeklyProgress(),
            checkin_answers: checkinAnswers || null,
          }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          if (retryData.plan) return retryData.plan;
        }
      } catch (retryErr) {
        console.error('Retry also failed:', retryErr);
      }
    }

    return null;
  }
}

async function fetchBreedFact(profile) {
  const deviceId = getOrCreateDeviceId();
  const age = getDogAge(profile.dogBirthday);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(EDGE_FN_BASE + '/generate-breed-fact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({
        device_id: deviceId,
        dog_breed: profile.dogBreed,
        dog_age_weeks: age.weeks,
        date: getTodayString(),
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.fact;
  } catch (err) {
    clearTimeout(timeout);
    console.error('fetchBreedFact error:', err);
    return null;
  }
}

// ---- SKELETON RENDERERS ----
function renderFactSkeleton() {
  const el = document.getElementById('breedFactContent');
  if (!el) return;
  el.innerHTML = `
    <div class="skeleton skeleton--line"></div>
    <div class="skeleton skeleton--line-short"></div>
  `;
}

function renderPlanSkeleton() {
  const el = document.getElementById('weeklyPlanContent');
  if (!el) return;
  el.innerHTML = `
    <div style="padding: 1.25rem;">
      <div class="skeleton skeleton--line-short" style="margin-bottom: 0.75rem;"></div>
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--line" style="margin-top: 0.75rem;"></div>
      <div class="skeleton skeleton--line-short"></div>
    </div>
  `;
}

// ---- WEEKLY CHECK-IN (interactive plan builder) ----
function renderPlanCheckin() {
  const el = document.getElementById('weeklyPlanContent');
  if (!el || !_currentProfile) return;

  const progress = getWeeklyProgress();
  const profile = _currentProfile;
  const dogName = profile.dogName || 'your pup';

  // Build last week recap from actual data
  let recapHTML = '';
  if (progress.sessions_this_week && progress.sessions_this_week.length > 0) {
    const totalSessions = progress.total_sessions_this_week;
    const allItems = [];
    progress.sessions_this_week.forEach(d => {
      d.items.forEach(item => { if (!allItems.includes(item)) allItems.push(item); });
    });
    const daysActive = progress.sessions_this_week.length;
    recapHTML = `
      <div class="checkin__recap">
        <div class="checkin__recap-label">last week's recap</div>
        <div class="checkin__recap-stats">
          <span class="checkin__stat">${totalSessions} session${totalSessions !== 1 ? 's' : ''}</span>
          <span class="checkin__stat">${daysActive} day${daysActive !== 1 ? 's' : ''} active</span>
        </div>
        ${allItems.length ? `<div class="checkin__recap-items">worked on: ${allItems.map(i => escapeHTML(i)).join(', ')}</div>` : ''}
      </div>
    `;
  } else {
    recapHTML = `
      <div class="checkin__recap">
        <div class="checkin__recap-label">last week</div>
        <p class="checkin__recap-empty">no sessions logged yet — that's ok, we're starting fresh</p>
      </div>
    `;
  }

  // Last week's reflection if they wrote one
  let reflectionHTML = '';
  if (progress.last_week_reflection) {
    reflectionHTML = `<div class="checkin__prev-reflection"><span class="checkin__prev-reflection-label">you said:</span> "${escapeHTML(progress.last_week_reflection)}"</div>`;
  }

  // Focus area options based on phase
  const age = getDogAge(profile.dogBirthday);
  const phase = getDogPhase(age.weeks);
  const focusOptions = getFocusOptions(age.weeks);

  el.innerHTML = `
    <div class="checkin">
      <div class="checkin__header">
        <div class="checkin__title">weekly check-in</div>
        <p class="checkin__subtitle">let's build ${escapeHTML(dogName)}'s plan for this week</p>
      </div>

      ${recapHTML}
      ${reflectionHTML}

      <div class="checkin__questions">
        <div class="checkin__question">
          <label class="checkin__label" for="checkinHowItWent">how did last week go?</label>
          <div class="checkin__quick-options" id="checkinMoodOptions">
            <button class="checkin__option" data-value="great" onclick="selectCheckinOption(this)">crushed it 💪</button>
            <button class="checkin__option" data-value="ok" onclick="selectCheckinOption(this)">it was ok</button>
            <button class="checkin__option" data-value="rough" onclick="selectCheckinOption(this)">pretty rough</button>
            <button class="checkin__option" data-value="skip" onclick="selectCheckinOption(this)">didn't train much</button>
          </div>
          <textarea class="checkin__input" id="checkinHowItWent" rows="2" placeholder="anything specific? wins, struggles, things you noticed..."></textarea>
        </div>

        <div class="checkin__question">
          <label class="checkin__label">what do you want to focus on most?</label>
          <div class="checkin__focus-options" id="checkinFocusOptions">
            ${focusOptions.map(opt => `<button class="checkin__focus-btn" data-value="${escapeHTML(opt.key)}" onclick="toggleCheckinFocus(this)">${escapeHTML(opt.label)}</button>`).join('')}
          </div>
          <textarea class="checkin__input" id="checkinFocusNotes" rows="1" placeholder="anything else you want to work on?"></textarea>
        </div>

        <div class="checkin__question">
          <label class="checkin__label">anything you're struggling with?</label>
          <textarea class="checkin__input" id="checkinStruggles" rows="2" placeholder="biting? potty accidents? leash pulling? leave blank if nothing specific"></textarea>
        </div>
      </div>

      <button class="checkin__submit" onclick="submitCheckin()">build my plan ✨</button>
    </div>
  `;
}

function getFocusOptions(ageWeeks) {
  // Return relevant focus areas based on age phase
  const allOptions = [
    { key: 'potty', label: 'potty training' },
    { key: 'crate', label: 'crate training' },
    { key: 'biting', label: 'biting / mouthing' },
    { key: 'calm', label: 'calm / settle' },
    { key: 'come', label: 'recall / come' },
    { key: 'manners', label: 'manners / impulse control' },
    { key: 'socializing', label: 'socialization' },
    { key: 'handling', label: 'handling / grooming' },
    { key: 'leash', label: 'leash walking' },
    { key: 'meeting-dogs', label: 'meeting dogs' },
    { key: 'meeting-people', label: 'meeting people' },
  ];

  // For young puppies, prioritize foundation skills
  if (ageWeeks <= 12) {
    return allOptions.filter(o => ['potty', 'crate', 'biting', 'come', 'handling', 'socializing'].includes(o.key));
  }
  if (ageWeeks <= 20) {
    return allOptions.filter(o => ['potty', 'crate', 'biting', 'calm', 'come', 'manners', 'socializing', 'leash', 'handling'].includes(o.key));
  }
  return allOptions;
}

function selectCheckinOption(btn) {
  // Single-select for mood
  btn.parentElement.querySelectorAll('.checkin__option').forEach(b => b.classList.remove('checkin__option--selected'));
  btn.classList.add('checkin__option--selected');
}

function toggleCheckinFocus(btn) {
  // Multi-select for focus areas (max 3)
  if (btn.classList.contains('checkin__focus-btn--selected')) {
    btn.classList.remove('checkin__focus-btn--selected');
    return;
  }
  const selected = btn.parentElement.querySelectorAll('.checkin__focus-btn--selected');
  if (selected.length >= 3) return; // max 3
  btn.classList.add('checkin__focus-btn--selected');
}

async function submitCheckin() {
  if (!_currentProfile) return;

  // Gather answers
  const moodBtn = document.querySelector('.checkin__option--selected');
  const mood = moodBtn ? moodBtn.dataset.value : '';
  const howItWent = (document.getElementById('checkinHowItWent') || {}).value || '';
  const focusBtns = document.querySelectorAll('.checkin__focus-btn--selected');
  const focusAreas = Array.from(focusBtns).map(b => b.dataset.value);
  const focusNotes = (document.getElementById('checkinFocusNotes') || {}).value || '';
  const struggles = (document.getElementById('checkinStruggles') || {}).value || '';

  const checkinAnswers = {
    mood,
    how_it_went: howItWent,
    focus_areas: focusAreas,
    focus_notes: focusNotes,
    struggles,
  };

  // Save the check-in answers so they persist
  try {
    const { week, year } = getISOWeekNumber(new Date());
    localStorage.setItem('sygap_checkin_' + year + '_' + week, JSON.stringify(checkinAnswers));
  } catch(e) {}

  // Show skeleton while generating
  renderPlanSkeleton();

  // Fetch plan with check-in answers
  const plan = await fetchWeeklyPlan(_currentProfile, true, checkinAnswers);
  if (plan) {
    const age = getDogAge(_currentProfile.dogBirthday);
    renderWeeklyPlan(plan, age.weeks);
    updatePlanChecks();
  } else {
    renderPlanError();
  }
}

// ---- CONTENT RENDERERS ----
function renderBreedFact(fact) {
  const el = document.getElementById('breedFactContent');
  if (!el) return;
  el.textContent = fact;
  // Update label with current breed
  const label = document.querySelector('#breedFactCard .ai-card__label');
  if (label && _currentProfile && _currentProfile.dogBreed) {
    label.textContent = _currentProfile.dogBreed.toLowerCase() + ' fact of the day';
  }
}

function renderWeeklyPlan(plan, ageWeeks) {
  const el = document.getElementById('weeklyPlanContent');
  if (!el) return;

  const phase = getDogPhase(ageWeeks);

  // Valid drill IDs (must match drills.html)
  const VALID_DRILLS = new Set([
    'drill-crate-reset','drill-build-duration','drill-calm-entry-reps',
    'drill-schedule-reset','drill-potty-spot-focus',
    'drill-place-reps','drill-capturing-calm','drill-duration-building','drill-on-off-switch',
    'drill-name-game','drill-short-recall-reps','drill-distraction-ladder',
    'drill-redirect-reps','drill-reverse-timeout','drill-engagement-reset',
    'drill-door-wait-reps','drill-threshold-training','drill-leash-pressure-intro',
    'drill-distance-exposure','drill-neutral-observation','drill-recovery-reps',
    'drill-carrier-comfort','drill-movement-simulation','drill-duration-build',
    'drill-calm-greeting-setup','drill-door-knock-protocol','drill-stranger-approach',
    'drill-scent-swap','drill-gate-intro','drill-supervised-coexist',
    'drill-watch-and-dismiss','drill-street-pass','drill-body-block',
    'drill-loose-leash-greeting','drill-walk-away-reset',
    'drill-parallel-walk','drill-controlled-intro','drill-decompression-check',
    'drill-paw-touch-reps','drill-clipper-intro','drill-brush-intro',
    'drill-sound-desensitization','drill-mock-exam','drill-restraint-reps','drill-happy-visit',
  ]);

  const VALID_MODULES = new Set([
    'crate','potty','calm','biting','come','manners','handling',
    'socializing','travel','meeting-people','meeting-dogs',
  ]);

  // Module key → display name mapping
  const MODULE_NAMES = {
    'crate': 'Crate', 'potty': 'Potty', 'calm': 'Calm', 'biting': 'Biting',
    'come': 'Come / Recall', 'manners': 'Manners', 'handling': 'Handling',
    'socializing': 'Socializing', 'travel': 'Travel', 'meeting-people': 'Meeting people',
    'meeting-dogs': 'Meeting dogs'
  };

  let areasHTML = '';
  if (plan.focus_areas && plan.focus_areas.length) {
    areasHTML = plan.focus_areas.map((area, idx) => {
      let drillLinks = '';
      if (area.related_drills && area.related_drills.length) {
        const validDrills = area.related_drills.filter(id => VALID_DRILLS.has(id));
        if (validDrills.length) {
          const pills = validDrills.map(id => {
            const name = id.replace('drill-', '').replace(/-/g, ' ');
            return `<a href="drills.html#${escapeHTML(id)}" class="plan__drill-link">↗ ${escapeHTML(name)}</a>`;
          }).join('');
          drillLinks = `<div class="plan__drills"><span class="plan__drills-label">drills</span>${pills}</div>`;
        }
      }

      let moduleLinks = '';
      if (area.related_modules && area.related_modules.length) {
        const validMods = area.related_modules.filter(key => VALID_MODULES.has(key));
        if (validMods.length) {
          const pills = validMods.map(key => {
            const name = MODULE_NAMES[key] || key.replace(/-/g, ' ');
            return `<a href="modules.html#mod-${escapeHTML(key)}" class="plan__module-link">↗ ${escapeHTML(name)} module</a>`;
          }).join('');
          moduleLinks = `<div class="plan__drills"><span class="plan__drills-label">learn more</span>${pills}</div>`;
        }
      }

      const areaId = 'plan-area-' + idx;
      const isSession = area.type === 'session';
      const reps = isSession ? (area.reps || 1) : 0;
      const repsLabel = area.reps_label || 'sessions this week';

      // Build checkboxes only for formal sessions
      let checksHTML = '';
      if (isSession && reps > 0) {
        for (let r = 0; r < reps; r++) {
          const repId = areaId + '-rep-' + r;
          checksHTML += `<span class="plan__area-check" data-area="${repId}" onclick="event.stopPropagation(); togglePlanArea('${repId}')"></span>`;
        }
      }

      const durationText = isSession
        ? `${escapeHTML(area.session_length)} · ${reps} ${escapeHTML(repsLabel)}`
        : escapeHTML(area.session_length || 'weave into your day');

      const typeTag = isSession
        ? ''
        : '<span class="plan__area-habit-tag">daily habit</span>';

      return `
        <details class="plan__area ${isSession ? '' : 'plan__area--habit'}" data-area-id="${areaId}" data-total-reps="${reps}">
          <summary class="plan__area-title">
            ${checksHTML ? `<div class="plan__area-checks">${checksHTML}</div>` : ''}
            <span class="plan__area-name">${escapeHTML(area.title)}${typeTag}</span>
            <span class="plan__area-duration">${durationText}</span>
          </summary>
          <div class="plan__area-body">
            <p>${escapeHTML(area.what_to_do)}</p>
            ${area.breed_nudge ? `<p class="plan__breed-nudge">${escapeHTML(area.breed_nudge)}</p>` : ''}
            ${moduleLinks}
            ${drillLinks}
          </div>
        </details>
      `;
    }).join('');
  }

  const recapHTML = plan.last_week_recap
    ? `<div class="plan__recap"><span class="plan__recap-label">last week</span><p>${escapeHTML(plan.last_week_recap)}</p></div>`
    : '';

  el.innerHTML = `
    ${recapHTML}
    <div class="plan__summary">
      <div class="plan__week-label-row">
        <div class="plan__week-label">week ${ageWeeks} · ${phase.name}</div>
        <button class="plan__refresh-btn" onclick="refreshPlan()" title="Generate a new plan">↻ new plan</button>
      </div>
      <div class="plan__focus">${escapeHTML(plan.week_focus)}</div>
    </div>
    <div class="plan__areas">
      ${areasHTML}
    </div>
    <div class="plan__reflection">
      <div class="plan__reflection-label">how's it going this week?</div>
      <textarea class="plan__reflection-input" id="weeklyReflection" rows="2" placeholder="what's clicking? what's hard? what did you notice?">${escapeHTML(getWeeklyReflection())}</textarea>
      <button class="plan__reflection-save" onclick="saveWeeklyReflection()">save</button>
      <span class="plan__reflection-saved" id="reflectionSaved">saved</span>
    </div>
    <div class="plan__footer">
      <div class="plan__note">
        <span class="plan__note-label">development note</span>
        <p>${escapeHTML(plan.dev_note)}</p>
      </div>
      <div class="plan__warning">
        <span class="plan__warning-label">watch out</span>
        <p>${escapeHTML(plan.watch_out)}</p>
      </div>
    </div>
  `;
}

// ---- ERROR RENDERERS ----
function renderFactError() {
  const el = document.getElementById('breedFactContent');
  if (!el) return;
  el.innerHTML = `<div class="ai-card__error" onclick="retryFact()">couldn't load today's breed fact. tap to retry.</div>`;
}

function renderPlanError() {
  const el = document.getElementById('weeklyPlanContent');
  if (!el) return;
  el.innerHTML = `<div class="ai-card__error" onclick="retryPlan()">couldn't load this week's plan. tap to retry.</div>`;
}

// ---- COMPLETION STATE ----
function renderCompletionState(dogName) {
  const el = document.getElementById('weeklyPlanContent');
  if (!el) return;
  el.innerHTML = `
    <div class="plan__complete">
      <div class="plan__complete-emoji">🎓</div>
      <div class="plan__complete-title">you made it through puppyhood</div>
      <div class="plan__complete-text">
        ${escapeHTML(dogName)} is officially past the puppy phase. the foundation you built matters.
        keep reinforcing what they know, stay consistent, and remember — training is a lifestyle, not a phase.
      </div>
    </div>
  `;
}

function renderTooYoungState(dogName, ageWeeks) {
  const el = document.getElementById('weeklyPlanContent');
  if (!el) return;
  const weeksLeft = 8 - ageWeeks;
  el.innerHTML = `
    <div class="plan__complete">
      <div class="plan__complete-emoji">🍼</div>
      <div class="plan__complete-title">this plan is for puppies 8 weeks – 1 year</div>
      <div class="plan__complete-text">
        ${escapeHTML(dogName)} is only ${ageWeeks} week${ageWeeks === 1 ? '' : 's'} old — still a tiny baby!
        the training plan kicks in at 8 weeks. for now, just let them eat, sleep, and be adorable.
        check back in ${weeksLeft} week${weeksLeft === 1 ? '' : 's'}!
      </div>
    </div>
  `;
}

// ---- RETRY HANDLERS ----
let _currentProfile = null;

function retryPlan() {
  if (!_currentProfile) return;
  renderPlanSkeleton();
  fetchWeeklyPlan(_currentProfile).then(plan => {
    if (plan) {
      const age = getDogAge(_currentProfile.dogBirthday);
      renderWeeklyPlan(plan, age.weeks);
      updatePlanChecks();
    } else {
      renderPlanError();
    }
  });
}

// ---- WEEKLY REFLECTION ----
function getWeeklyReflection() {
  try {
    const { week, year } = getISOWeekNumber(new Date());
    const key = 'sygap_reflection_' + year + '_' + week;
    return localStorage.getItem(key) || '';
  } catch(e) { return ''; }
}

function saveWeeklyReflection() {
  const el = document.getElementById('weeklyReflection');
  if (!el) return;
  const { week, year } = getISOWeekNumber(new Date());
  const key = 'sygap_reflection_' + year + '_' + week;
  localStorage.setItem(key, el.value);

  const saved = document.getElementById('reflectionSaved');
  if (saved) {
    saved.classList.add('plan__reflection-saved--show');
    setTimeout(() => { saved.classList.remove('plan__reflection-saved--show'); }, 1500);
  }
}

function refreshPlan() {
  if (!_currentProfile) return;
  // Clear this week's checkin answers so they can re-answer
  try {
    const { week, year } = getISOWeekNumber(new Date());
    localStorage.removeItem('sygap_checkin_' + year + '_' + week);
  } catch(e) {}
  renderPlanCheckin();
}

function retryFact() {
  if (!_currentProfile) return;
  renderFactSkeleton();
  fetchBreedFact(_currentProfile).then(fact => {
    if (fact) {
      renderBreedFact(fact);
    } else {
      renderFactError();
    }
  });
}

// ---- UTILITY ----
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- INIT ----
function initAIFeatures() {
  // Check if we're on the tracker page
  const factCard = document.getElementById('breedFactCard');
  const planCard = document.getElementById('weeklyPlanCard');
  if (!factCard && !planCard) return;

  // Check if profile is set up
  const profile = getProfile();
  if (!profile || !profile.setupComplete || !profile.dogBirthday) {
    // Hide AI cards if no profile
    if (factCard) factCard.style.display = 'none';
    if (planCard) planCard.style.display = 'none';
    return;
  }

  _currentProfile = profile;
  const age = getDogAge(profile.dogBirthday);
  const ageWeeks = age.weeks;

  // Show skeletons immediately
  renderFactSkeleton();

  if (ageWeeks < 8) {
    // Too young — show waiting state for plan, still load breed fact
    renderTooYoungState(profile.dogName, ageWeeks);
  } else if (ageWeeks > 52) {
    // Past puppyhood — show completion state for plan, still load breed fact
    renderCompletionState(profile.dogName);
  } else {
    renderPlanSkeleton();
  }

  // Fetch breed fact (always, regardless of age) — cache per day
  var cachedFact = null;
  try {
    var stored = JSON.parse(localStorage.getItem('sygap_breed_fact') || 'null');
    if (stored && stored.date === getTodayString() && stored.breed === profile.dogBreed) {
      cachedFact = stored.fact;
    }
  } catch(e) {}

  if (cachedFact) {
    renderBreedFact(cachedFact);
  } else {
    fetchBreedFact(profile).then(fact => {
      if (fact) {
        renderBreedFact(fact);
        try {
          localStorage.setItem('sygap_breed_fact', JSON.stringify({
            date: getTodayString(),
            breed: profile.dogBreed,
            fact: fact
          }));
        } catch(e) {}
      } else {
        renderFactError();
      }
    });
  }

  // Fetch weekly plan (only if in the 8 weeks – 1 year range)
  if (ageWeeks >= 8 && ageWeeks <= 52) {
    // Check if profile was changed (birthday/breed) — force refresh if so
    var forceRefresh = false;
    if (localStorage.getItem('sygap_plan_stale') === '1') {
      forceRefresh = true;
      localStorage.removeItem('sygap_plan_stale');
    }

    // First try to load cached plan (non-force, no API call needed if cached)
    fetchWeeklyPlan(profile, forceRefresh).then(plan => {
      if (plan) {
        renderWeeklyPlan(plan, ageWeeks);
        updatePlanChecks();
      } else {
        // No cached plan — show the interactive check-in instead of auto-generating
        renderPlanCheckin();
      }
    });
  }
}

// ---- TRAINING LOG (localStorage) ----
const TRAINING_LOG_KEY = 'puppy_training_log';

function getTrainingLog() {
  try { return JSON.parse(localStorage.getItem(TRAINING_LOG_KEY) || '{}'); }
  catch { return {}; }
}

function getTodayLog() {
  const log = getTrainingLog();
  const today = new Date().toISOString().split('T')[0];
  if (!log[today]) log[today] = { completed: [], sessions: 0 };
  return { date: today, data: log[today], full: log };
}

function saveTrainingLog(log) {
  localStorage.setItem(TRAINING_LOG_KEY, JSON.stringify(log));
}

function togglePlanArea(repId) {
  const { date, data, full } = getTodayLog();
  if (!data.completedDetails) data.completedDetails = {};

  const idx = data.completed.indexOf(repId);
  if (idx === -1) {
    data.completed.push(repId);
    // Store the title so the log can show what was done
    const checkEl = document.querySelector(`.plan__area-check[data-area="${repId}"]`);
    const nameEl = checkEl ? checkEl.closest('.plan__area-title')?.querySelector('.plan__area-name') : null;
    // Use the base area name (without rep suffix) for display
    const baseName = repId.replace(/-rep-\d+$/, '');
    if (nameEl) data.completedDetails[baseName] = nameEl.textContent.trim();
    data.sessions = data.completed.length;
  } else {
    data.completed.splice(idx, 1);
    data.sessions = data.completed.length;
  }
  full[date] = data;
  saveTrainingLog(full);
  updatePlanChecks();
  updateTrainingStats();
  renderTrainingLog();
}

function updatePlanChecks() {
  const { data } = getTodayLog();
  // Update individual rep checkmarks
  document.querySelectorAll('.plan__area-check').forEach(el => {
    const id = el.dataset.area;
    const done = data.completed.includes(id);
    el.classList.toggle('plan__area-check--done', done);
  });
  // Mark parent area as fully done if all reps are checked
  document.querySelectorAll('.plan__area[data-area-id]').forEach(area => {
    const totalReps = parseInt(area.dataset.totalReps) || 1;
    const areaId = area.dataset.areaId;
    let doneCount = 0;
    for (let r = 0; r < totalReps; r++) {
      if (data.completed.includes(areaId + '-rep-' + r)) doneCount++;
    }
    area.classList.toggle('plan__area--done', doneCount === totalReps);
  });
}

function updateTrainingStats() {
  const log = getTrainingLog();
  const today = new Date().toISOString().split('T')[0];
  const todayData = log[today] || { sessions: 0 };

  // Update sessions count on dashboard
  const sessionsEl = document.getElementById('dashSessionsCount');
  if (sessionsEl) sessionsEl.textContent = todayData.sessions;

  // Total all-time sessions
  const totalEl = document.getElementById('dashTotalSessions');
  if (totalEl) {
    const total = Object.values(log).reduce((sum, day) => sum + (day.sessions || 0), 0);
    totalEl.textContent = total;
  }

  // Training streak (consecutive days with at least 1 session)
  const streakEl = document.getElementById('dashStreak');
  if (streakEl) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (log[key] && log[key].sessions > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    streakEl.textContent = streak;
  }
}

// ---- LOG RENDERING ----
function formatLogDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'today';
  if (dateStr === yesterday) return 'yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderTodayLog() {
  const log = getTrainingLog();
  const todayEl = document.getElementById('logToday');
  if (!todayEl) return;

  const today = new Date().toISOString().split('T')[0];
  const todayData = log[today] || { completed: [], completedDetails: {}, notes: [] };

  let html = `<div class="log-day">`;
  html += `<div class="log-day__date">${formatLogDate(today)}</div>`;

  if (todayData.completed && todayData.completed.length > 0) {
    const details = todayData.completedDetails || {};
    html += `<div class="log-day__sessions">`;
    todayData.completed.forEach(id => {
      const name = details[id] || id.replace('plan-area-', 'session ');
      html += `<div class="log-day__session">✓ ${escapeHTML(name)}</div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="log-day__empty">no sessions checked off yet</div>`;
  }

  if (todayData.notes && todayData.notes.length > 0) {
    html += `<div class="log-day__notes">`;
    todayData.notes.forEach(note => {
      html += `<div class="log-day__note">${escapeHTML(note)}</div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  todayEl.innerHTML = html;
}

function renderTrainingLog() {
  renderTodayLog();
  renderWeekView();
}

// ---- WEEK VIEW ----
let _weekOffset = 0; // 0 = this week, -1 = last week, etc.

function shiftWeek(dir) {
  _weekOffset += dir;
  if (_weekOffset > 0) _weekOffset = 0;
  renderWeekView();
}

function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day + (offset * 7));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function renderWeekView() {
  const container = document.getElementById('weekDays');
  const label = document.getElementById('weekLabel');
  const rightNav = document.getElementById('weekNavRight');
  if (!container || !label) return;

  const log = getTrainingLog();
  const dates = getWeekDates(_weekOffset);
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // Week label
  const startDate = new Date(dates[0] + 'T12:00:00');
  const endDate = new Date(dates[6] + 'T12:00:00');
  if (_weekOffset === 0) {
    label.textContent = 'this week';
  } else if (_weekOffset === -1) {
    label.textContent = 'last week';
  } else {
    label.textContent = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Hide right arrow on current week
  if (rightNav) rightNav.style.visibility = (_weekOffset >= 0) ? 'hidden' : 'visible';

  let html = '';
  dates.forEach((dateStr, i) => {
    const dayData = log[dateStr];
    const sessions = dayData ? (dayData.sessions || 0) : 0;
    const hasNotes = dayData && dayData.notes && dayData.notes.length > 0;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;
    const details = dayData ? (dayData.completedDetails || {}) : {};

    let dotClass = '';
    if (sessions >= 3) dotClass = 'log-week__dot--hot';
    else if (sessions >= 1) dotClass = 'log-week__dot--warm';

    const hasContent = sessions > 0 || hasNotes;

    // Build expandable detail
    let detailHTML = '';
    if (hasContent) {
      detailHTML += `<div class="log-week__detail">`;
      if (dayData.completed && dayData.completed.length > 0) {
        dayData.completed.forEach(id => {
          const name = details[id] || id.replace('plan-area-', 'session ');
          detailHTML += `<div class="log-week__detail-session">✓ ${escapeHTML(name)}</div>`;
        });
      }
      if (dayData.notes && dayData.notes.length > 0) {
        dayData.notes.forEach(note => {
          detailHTML += `<div class="log-week__detail-note">${escapeHTML(note)}</div>`;
        });
      }
      detailHTML += `</div>`;
    }

    const dayNum = new Date(dateStr + 'T12:00:00').getDate();

    if (hasContent && !isFuture) {
      html += `
        <details class="log-week__day ${isToday ? 'log-week__day--today' : ''}">
          <summary class="log-week__day-header">
            <span class="log-week__day-name">${dayNames[i]}</span>
            <span class="log-week__day-num">${dayNum}</span>
            <span class="log-week__dot ${dotClass}"></span>
            ${hasNotes ? '<span class="log-week__note-icon">✎</span>' : ''}
          </summary>
          ${detailHTML}
        </details>`;
    } else {
      html += `
        <div class="log-week__day ${isToday ? 'log-week__day--today' : ''} ${isFuture ? 'log-week__day--future' : ''}">
          <div class="log-week__day-header">
            <span class="log-week__day-name">${dayNames[i]}</span>
            <span class="log-week__day-num">${dayNum}</span>
            <span class="log-week__dot"></span>
          </div>
        </div>`;
    }
  });

  container.innerHTML = html;
}

// ---- AI SUMMARY ----
async function generateLogSummary() {
  const btn = document.getElementById('summaryBtn');
  const contentEl = document.getElementById('logSummaryContent');
  if (!btn || !contentEl) return;

  const log = getTrainingLog();
  const profile = getProfile();
  if (!profile) return;

  // Gather all notes and session data
  const dates = Object.keys(log).sort();
  if (dates.length === 0) {
    contentEl.innerHTML = `<p class="log-summary__text">no training data yet — check off some plan sessions and add notes first!</p>`;
    contentEl.style.display = 'block';
    return;
  }

  let logSummary = '';
  dates.forEach(date => {
    const day = log[date];
    const details = day.completedDetails || {};
    const sessions = (day.completed || []).map(id => details[id] || id).join(', ');
    const notes = (day.notes || []).join('; ');
    if (sessions || notes) {
      logSummary += `${date}: ${day.sessions || 0} sessions`;
      if (sessions) logSummary += ` (${sessions})`;
      if (notes) logSummary += ` — notes: "${notes}"`;
      logSummary += '\n';
    }
  });

  if (!logSummary.trim()) {
    contentEl.innerHTML = `<p class="log-summary__text">no training data yet — check off some plan sessions and add notes first!</p>`;
    contentEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '✨ thinking...';
  contentEl.style.display = 'block';
  contentEl.innerHTML = `<div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line-short"></div><div class="skeleton skeleton--block"></div>`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(EDGE_FN_BASE + '/generate-log-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({
        dog_name: profile.dogName,
        dog_breed: profile.dogBreed,
        dog_age_weeks: getDogAge(profile.dogBirthday).weeks,
        training_log: logSummary,
      }),
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();

    if (data.summary) {
      // Cache the summary so the weekly plan can build on it
      try {
        const { week, year } = getISOWeekNumber(new Date());
        localStorage.setItem('sygap_log_summary_' + year + '_' + week, JSON.stringify(data.summary));
      } catch(e) { /* ignore storage errors */ }

      contentEl.innerHTML = `
        <div class="log-summary__text">
          ${data.summary.themes ? `<div class="log-summary__section"><span class="log-summary__label">themes</span><p>${escapeHTML(data.summary.themes)}</p></div>` : ''}
          ${data.summary.wins ? `<div class="log-summary__section"><span class="log-summary__label">wins</span><p>${escapeHTML(data.summary.wins)}</p></div>` : ''}
          ${data.summary.recommendations ? `<div class="log-summary__section"><span class="log-summary__label">recommendations</span><p>${escapeHTML(data.summary.recommendations)}</p></div>` : ''}
          ${data.summary.encouragement ? `<div class="log-summary__section log-summary__section--encourage"><p>${escapeHTML(data.summary.encouragement)}</p></div>` : ''}
        </div>
      `;
    } else {
      contentEl.innerHTML = `<p class="log-summary__text">${escapeHTML(data.error || 'something went wrong')}</p>`;
    }
  } catch (err) {
    console.error('Log summary error:', err);
    contentEl.innerHTML = `<p class="log-summary__text">couldn't generate summary. try again later.</p>`;
  }

  btn.disabled = false;
  btn.textContent = '✨ how am I doing?';
}

// ---- SAVE NOTE ----
function saveLogNote() {
  const input = document.getElementById('logNoteInput');
  if (!input || !input.value.trim()) return;

  const { date, data, full } = getTodayLog();
  if (!data.notes) data.notes = [];
  data.notes.push(input.value.trim());
  full[date] = data;
  saveTrainingLog(full);
  renderTrainingLog();
}

// Run after a short delay to ensure auth.js has initialized the profile
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAIFeatures, 100);
    setTimeout(() => { updateTrainingStats(); renderTrainingLog(); }, 150);
  });
} else {
  setTimeout(initAIFeatures, 100);
  setTimeout(() => { updateTrainingStats(); renderTrainingLog(); }, 150);
}
