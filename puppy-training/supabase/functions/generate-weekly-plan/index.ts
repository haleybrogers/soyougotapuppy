import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHASE_CURRICULUM: Record<string, { name: string; range: string; focus: string }> = {
  "0-8": {
    name: "Foundation",
    range: "weeks 0-8",
    focus: "name recognition, come when called (short distance), crate intro, potty basics, handling (touch ears/paws/mouth)",
  },
  "9-16": {
    name: "Socialization window",
    range: "weeks 9-16",
    focus: "sit, down, stay (3 seconds), leash intro, socialization push, leave it intro",
  },
  "17-24": {
    name: "Adolescence begins",
    range: "weeks 17-24",
    focus: "stay duration, loose leash walking, recall with distraction, bite inhibition reinforcement",
  },
  "25-36": {
    name: "Teen phase",
    range: "weeks 25-36",
    focus: "impulse control, threshold work, down-stay in public, off-leash recall in safe spaces",
  },
  "37-52": {
    name: "Maturity",
    range: "weeks 37-52",
    focus: "proofing all commands in new environments, building independence, phasing out constant reinforcement",
  },
};

function getPhase(ageWeeks: number) {
  if (ageWeeks <= 8) return PHASE_CURRICULUM["0-8"];
  if (ageWeeks <= 16) return PHASE_CURRICULUM["9-16"];
  if (ageWeeks <= 24) return PHASE_CURRICULUM["17-24"];
  if (ageWeeks <= 36) return PHASE_CURRICULUM["25-36"];
  return PHASE_CURRICULUM["37-52"];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { device_id, dog_name, dog_breed, dog_gender, dog_age_weeks, modules_completed, week_number, year, force_refresh, weekly_progress, checkin_answers } = await req.json();

    if (!device_id || !dog_name || !dog_breed || dog_age_weeks == null || !week_number || !year) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase client with service role for DB writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If force refresh, delete existing cache entry
    if (force_refresh) {
      await supabase
        .from("weekly_plans")
        .delete()
        .eq("device_id", device_id)
        .eq("week_number", week_number)
        .eq("year", year);
    }

    // Check cache
    const { data: cached } = await supabase
      .from("weekly_plans")
      .select("plan")
      .eq("device_id", device_id)
      .eq("week_number", week_number)
      .eq("year", year)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ cached: true, plan: cached.plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch previous plans for context (last 3 weeks)
    const { data: previousPlans } = await supabase
      .from("weekly_plans")
      .select("week_number, year, plan")
      .eq("device_id", device_id)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false })
      .limit(3);

    let previousContext = "";
    if (previousPlans && previousPlans.length > 0) {
      const summaries = previousPlans.map(p => {
        const plan = p.plan;
        const areas = (plan.focus_areas || []).map((a: any) => {
          const typeLabel = a.type === 'habit' ? 'habit' : `session, ${a.reps || '?'} reps`;
          return `${a.title} (${typeLabel})`;
        }).join(", ");
        return `- Week ${p.week_number}: "${plan.week_focus}" — areas: ${areas}`;
      }).join("\n");
      previousContext = `\n\nPREVIOUS WEEKS' PLANS (build on these, don't repeat the same focus):\n${summaries}`;
    }

    // Build progress context from what the user actually did
    let progressContext = "";
    if (weekly_progress) {
      const parts: string[] = [];

      // What sessions they actually completed
      if (weekly_progress.sessions_this_week && weekly_progress.sessions_this_week.length > 0) {
        const sessionSummary = weekly_progress.sessions_this_week.map((d: any) =>
          `${d.date}: ${d.count} session(s) — ${d.items.join(", ")}`
        ).join("\n  ");
        parts.push(`WHAT THEY ACTUALLY DID THIS WEEK:\n  ${sessionSummary}\n  Total sessions: ${weekly_progress.total_sessions_this_week}`);
      } else {
        parts.push("WHAT THEY ACTUALLY DID THIS WEEK: nothing logged yet");
      }

      // Their reflection on last week
      if (weekly_progress.last_week_reflection) {
        parts.push(`OWNER'S REFLECTION ON LAST WEEK: "${weekly_progress.last_week_reflection}"`);
      }

      // Current week reflection (if mid-week refresh)
      if (weekly_progress.reflection) {
        parts.push(`OWNER'S NOTES THIS WEEK SO FAR: "${weekly_progress.reflection}"`);
      }

      // Last week's AI-generated training summary (the "how am I doing?" analysis)
      if (weekly_progress.last_week_summary) {
        const s = weekly_progress.last_week_summary;
        let summaryParts: string[] = [];
        if (s.themes) summaryParts.push(`Themes: ${s.themes}`);
        if (s.wins) summaryParts.push(`Wins: ${s.wins}`);
        if (s.recommendations) summaryParts.push(`Recommendations: ${s.recommendations}`);
        if (summaryParts.length > 0) {
          parts.push(`LAST WEEK'S TRAINING SUMMARY (AI-analyzed from their actual log):\n  ${summaryParts.join("\n  ")}`);
        }
      }

      if (parts.length > 0) {
        progressContext = "\n\n" + parts.join("\n\n");
      }
    }

    // Build check-in context from user's answers
    let checkinContext = "";
    if (checkin_answers) {
      const parts: string[] = [];
      if (checkin_answers.mood) {
        const moodMap: Record<string, string> = {
          'great': 'They said last week went great — they crushed it',
          'ok': 'They said last week was just ok — decent but not amazing',
          'rough': 'They said last week was pretty rough — they need encouragement and maybe simpler goals',
          'skip': "They didn't train much last week — ease them back in gently, no guilt",
        };
        parts.push(moodMap[checkin_answers.mood] || `Mood: ${checkin_answers.mood}`);
      }
      if (checkin_answers.how_it_went) {
        parts.push(`Owner's notes on last week: "${checkin_answers.how_it_went}"`);
      }
      if (checkin_answers.focus_areas && checkin_answers.focus_areas.length > 0) {
        parts.push(`OWNER WANTS TO FOCUS ON: ${checkin_answers.focus_areas.join(', ')} — this is their top priority, build the plan around this`);
      }
      if (checkin_answers.focus_notes) {
        parts.push(`Additional focus notes: "${checkin_answers.focus_notes}"`);
      }
      if (checkin_answers.struggles) {
        parts.push(`CURRENT STRUGGLES: "${checkin_answers.struggles}" — address this directly in the plan`);
      }
      if (parts.length > 0) {
        checkinContext = "\n\nWEEKLY CHECK-IN (the owner just answered these questions — use their answers to customize the plan):\n" + parts.join("\n");
      }
    }

    // Build prompt
    const phase = getPhase(dog_age_weeks);
    const completedList = Object.entries(modules_completed || {})
      .filter(([, done]) => done)
      .map(([name]) => name)
      .join(", ") || "none";
    const notStartedList = Object.entries(modules_completed || {})
      .filter(([, done]) => !done)
      .map(([name]) => name)
      .join(", ") || "none";

    const systemPrompt = `You are a puppy training coach who's basically their funny, slightly chaotic best friend who happens to know a LOT about dogs. You keep things simple because people are busy and overwhelmed. Your job is to give them ONE main thing to work on this week, plus 1-2 small extras they can sprinkle in. That's it.

Personality rules:
- Be genuinely funny. Not corny-funny, actually funny. Reference specific things from their check-in and training log
- If they said last week was rough, be like "ok so [dog name] chose violence last week, noted. here's the game plan"
- If they crushed it, hype them up for real
- If they didn't train much, zero guilt — just get them back in it with something easy
- Mirror their energy. If their notes are casual, be casual. If they're stressed, acknowledge it and keep things simple
- The last_week_recap is your chance to be a real friend — reference what ACTUALLY happened, not generic encouragement

You MUST respond with valid JSON matching this exact schema:
{
  "last_week_recap": "1-2 sentences that acknowledge what actually happened. Be specific — reference their check-in answers, their log data, their struggles. Make it funny and warm. If they said 'pretty rough' and mentioned biting, say something like 'so [name] turned into a land shark last week. classic. here's what we're gonna do.' If no data at all, set to null.",
  "week_focus": "A short, punchy theme for the week (e.g., 'this week is all about impulse control')",
  "dev_note": "1-2 sentences about what's happening developmentally. Make it feel like 'oh that explains everything.' Breed-specific. Can be funny too.",
  "watch_out": "1 sentence — the thing most likely to trip them up this week. Keep it real.",
  "focus_areas": [
    {
      "title": "Short, clear title",
      "type": "session or habit",
      "what_to_do": "2-3 sentences max. Tell them exactly what to do like you're texting a friend. No jargon.",
      "session_length": "How long each session takes. e.g., '2-3 minutes' or 'on your walk'. Never more than 5 minutes.",
      "reps": 3,
      "reps_label": "sessions this week",
      "breed_nudge": "1 sentence of breed-specific advice, or null if not applicable",
      "related_drills": ["drill-id-1"] or null,
      "related_modules": ["module-key-1"]
    }
  ]
}

Available module keys (use ONLY these exact keys):
"crate", "potty", "calm", "biting", "come", "manners", "handling", "socializing", "travel", "meeting-people", "meeting-dogs"

Available drill IDs — use ONLY these. Do NOT invent new ones:
Crate: "drill-crate-reset", "drill-build-duration", "drill-calm-entry-reps"
Potty: "drill-schedule-reset", "drill-potty-spot-focus"
Calm: "drill-place-reps", "drill-capturing-calm", "drill-duration-building", "drill-on-off-switch"
Recall: "drill-name-game", "drill-short-recall-reps", "drill-distraction-ladder"
Biting: "drill-redirect-reps", "drill-reverse-timeout", "drill-engagement-reset"
Manners: "drill-door-wait-reps", "drill-threshold-training", "drill-leash-pressure-intro"
Socializing: "drill-distance-exposure", "drill-neutral-observation", "drill-recovery-reps"
Travel: "drill-carrier-comfort", "drill-movement-simulation", "drill-duration-build"
Meeting people: "drill-calm-greeting-setup", "drill-door-knock-protocol", "drill-stranger-approach"
Meeting dogs: "drill-watch-and-dismiss", "drill-street-pass", "drill-parallel-walk", "drill-controlled-intro", "drill-scent-swap", "drill-gate-intro", "drill-loose-leash-greeting", "drill-walk-away-reset", "drill-decompression-check"
Handling: "drill-paw-touch-reps", "drill-clipper-intro", "drill-brush-intro", "drill-sound-desensitization", "drill-mock-exam", "drill-restraint-reps", "drill-happy-visit"

Rules:
- Generate exactly 2-3 focus areas. ONE main priority + 1-2 small extras
- The first focus area is THE thing for the week. The others are bonus
- Total daily training time should be 5-10 minutes max. These people have lives
- "type" is either "session" (a structured, sit-down training exercise with a start and end — these get checkboxes) or "habit" (something woven into daily life like "ask for sit before meals" — no checkboxes, just a reminder)
- Only "session" types get reps and checkboxes. For "habit" types, set reps to 0
- "reps" = how many formal training sessions to do THIS WEEK. Usually 3-5 for the main focus, 2-3 for extras. Keep it reasonable
- "reps_label" = "sessions this week" usually. Keep it consistent
- Session lengths should feel doable: "2-3 minutes" not "5-7 minutes, 3x daily"
- Tone: warm, funny, lowercase energy. Like your funniest friend who also happens to be a dog trainer texting you advice. Reference their actual check-in answers and log data to make it personal
- Breed-specific and age-specific — no generic filler
- CRITICAL: If a module is "completed", suggest advancing it — never re-introduce
- Only include related_drills when one genuinely fits. null is fine
- EVERY focus area MUST include related_modules with exactly 1 module key. Never null
- Return ONLY valid JSON, no markdown, no backticks, no extra text`;

    const pronouns = dog_gender === 'boy' ? 'he/him' : dog_gender === 'girl' ? 'she/her' : 'they/them';
    const userPrompt = `Week ${week_number} plan for ${dog_name}, a ${dog_gender || ''} ${dog_breed}, ${dog_age_weeks} weeks old. Use ${pronouns} pronouns for ${dog_name}.

Phase: ${phase.name} (${phase.range}) — focus: ${phase.focus}

Modules done: ${completedList}
Modules not started: ${notStartedList}
${previousContext}${progressContext}${checkinContext}

CRITICAL INSTRUCTIONS:
- The owner just did a weekly check-in. USE THEIR ANSWERS to build this plan. Their chosen focus areas are the #1 priority.
- If they mentioned struggles, address those directly — don't ignore them.
- This plan must BUILD on what actually happened. If they completed sessions, advance them. If they struggled, adjust. If they didn't train much, start easy.
- The last_week_recap MUST reference specific things from their check-in and log data. Be funny and personal. Not generic motivation.
- If the owner chose specific focus areas in their check-in, the plan's focus_areas MUST align with those choices.
- Keep it simple. One main thing to focus on, plus 1-2 small extras. Total daily effort: under 10 minutes.
- If something is "completed," level it up — don't re-introduce basics.
- For last_week_recap: be specific and funny. "you got 4 recall sessions in and ${dog_name} only ignored you twice — that's progress." Or null if truly no history at all.`;

    // Call Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          { role: "user", content: userPrompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      throw new Error("Anthropic API returned " + anthropicRes.status);
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content[0].text;

    // Parse JSON from response (strip any accidental markdown fencing)
    let jsonStr = rawText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();

    // If the response was truncated (stop_reason: max_tokens), try to salvage
    const stopReason = anthropicData.stop_reason;
    if (stopReason === "max_tokens") {
      console.warn("Response was truncated — attempting to close JSON");
      // Try to close open brackets/braces
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;

      // Close arrays then objects
      for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += "}";
    }

    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw text:", rawText.slice(0, 500));
      console.error("Stop reason:", stopReason);
      throw new Error("Failed to parse plan JSON — response may have been truncated");
    }

    // Cache in Supabase
    await supabase.from("weekly_plans").insert({
      device_id,
      week_number,
      year,
      dog_age_weeks,
      plan,
    });

    return new Response(JSON.stringify({ cached: false, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-weekly-plan error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate plan. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
