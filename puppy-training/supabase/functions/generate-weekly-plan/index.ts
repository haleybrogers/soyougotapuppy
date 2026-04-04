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
    const { device_id, dog_name, dog_breed, dog_age_weeks, modules_completed, week_number, year, force_refresh } = await req.json();

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
        const areas = (plan.focus_areas || []).map((a: any) => a.title).join(", ");
        return `- Week ${p.week_number}: "${plan.week_focus}" — focus areas: ${areas}`;
      }).join("\n");
      previousContext = `\n\nPREVIOUS WEEKS' PLANS (build on these, do NOT repeat the same focus areas):\n${summaries}`;
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

    const systemPrompt = `You are a professional puppy training curriculum designer. You create weekly training plans personalized to a specific puppy's breed, age, and development phase.

You MUST respond with valid JSON matching this exact schema:
{
  "last_week_recap": "1-2 sentences summarizing what was covered last week and how this week builds on it. If there is no previous week data, set to null.",
  "week_focus": "A 1-sentence theme for this week",
  "dev_note": "2-3 sentences about what's happening developmentally at this age for this breed. Science-backed, no fluff.",
  "watch_out": "1 sentence warning about a common pitfall or regression to watch for this week",
  "focus_areas": [
    {
      "title": "Short title",
      "what_to_do": "2-4 sentences of specific, actionable instructions",
      "session_length": "e.g., '3-5 minutes, 2x daily'",
      "breed_nudge": "1 sentence of breed-specific advice, or null if not applicable",
      "related_drills": ["drill-id-1", "drill-id-2"] or null,
      "related_modules": ["module-key-1"] or null
    }
  ]
}

Available module keys you can reference (use ONLY these exact keys):
- "crate" (Crate training)
- "potty" (Potty training)
- "calm" (Capturing calm / settling)
- "biting" (Bite inhibition)
- "come" (Come / Recall)
- "manners" (Doorway manners, impulse control)
- "handling" (Body handling / grooming / vet prep)
- "socializing" (Sound, surface, novelty exposure)
- "travel" (Car rides, carrier work)
- "meeting-people" (Greeting strangers, calm around visitors)
- "meeting-dogs" (Dog-to-dog social skills)

Available drill IDs — use ONLY these EXACT IDs. Do NOT invent new ones:
Crate: "drill-crate-reset", "drill-build-duration", "drill-calm-entry-reps"
Potty: "drill-schedule-reset", "drill-potty-spot-focus"
Calm: "drill-place-reps", "drill-capturing-calm", "drill-duration-building", "drill-on-off-switch"
Recall: "drill-name-game", "drill-short-recall-reps", "drill-distraction-ladder"
Biting: "drill-redirect-reps", "drill-reverse-timeout", "drill-engagement-reset"
Manners: "drill-door-wait-reps", "drill-threshold-training", "drill-leash-pressure-intro"
Socializing: "drill-distance-exposure", "drill-neutral-observation", "drill-recovery-reps"
Travel: "drill-carrier-comfort", "drill-movement-simulation", "drill-duration-build"
Meeting people: "drill-calm-greeting-setup", "drill-door-knock-protocol", "drill-stranger-approach"
Meeting dogs (home): "drill-scent-swap", "drill-gate-intro", "drill-supervised-coexist"
Meeting dogs (street): "drill-watch-and-dismiss", "drill-street-pass", "drill-body-block"
Meeting dogs (greetings): "drill-loose-leash-greeting", "drill-walk-away-reset"
Meeting dogs (play): "drill-parallel-walk", "drill-controlled-intro", "drill-decompression-check"
Handling: "drill-paw-touch-reps", "drill-clipper-intro", "drill-brush-intro", "drill-sound-desensitization", "drill-mock-exam", "drill-restraint-reps", "drill-happy-visit"

Rules:
- Generate exactly 3-5 focus areas per week
- Tailor advice to the specific breed's traits, energy level, and common challenges
- Be specific and actionable, not generic
- Use a warm, direct, slightly irreverent tone (like a knowledgeable friend)
- The breed_nudge should reference real breed tendencies
- Session lengths should be realistic for the puppy's age (younger = shorter sessions)
- CRITICAL: If a module is marked "completed", do NOT suggest introducing it or its basics. Instead, suggest reinforcement, proofing, or advancing that skill. Never say "introduce" or "start" something they've already done.
- If a module is "not started", you CAN suggest introducing it if age-appropriate.
- Drills are STRUCTURED, REPEATABLE training exercises — not simple tasks. "Check your puppy's ears" is NOT a drill. "Practice restraint holds while touching ears" IS a drill (drill-restraint-reps). Only include related_drills when the focus area involves a real structured exercise from the list above. If no drill fits, set related_drills to null and just explain what to do in the what_to_do text.
- EVERY focus area MUST include related_modules with exactly 1 module key from the module list above. Every training activity maps to a module — pick the closest one. This is required, never null.
- Return ONLY valid JSON, no markdown, no backticks, no extra text`;

    const userPrompt = `Create a week ${week_number} training plan for ${dog_name}, a ${dog_breed} who is ${dog_age_weeks} weeks old.

Development phase: ${phase.name} (${phase.range})
Phase curriculum focus: ${phase.focus}

Modules ALREADY COMPLETED (do NOT re-introduce these — suggest reinforcement or advancement only): ${completedList}
Modules NOT YET STARTED (can introduce if age-appropriate): ${notStartedList}
${previousContext}

Important:
- The owner has been training for ${dog_age_weeks} weeks. If a module like "crate" is completed, don't say "introduce the crate" — they've been doing it. Say "proof crate duration" or "add distractions to crate settling" instead.
- This plan must PROGRESS from previous weeks. If last week focused on basic recall in the house, this week should advance to recall with distractions or in a new environment. Don't repeat the same difficulty level.
- Each week should feel like a natural next step — building duration, adding distractions, changing environments, or layering skills together.
- In last_week_recap, briefly mention what was covered last week and explain how this week builds on it. Use a warm, encouraging tone like "last week you worked on X — this week we're leveling that up by Y." If there's no previous data, set last_week_recap to null.`;

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
        max_tokens: 1024,
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
    const jsonStr = rawText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    const plan = JSON.parse(jsonStr);

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
