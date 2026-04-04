import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, dog_name, dog_breed, dog_age_weeks } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing or empty messages array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dog_name) {
      return new Response(JSON.stringify({ error: "Missing required field: dog_name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a no-BS puppy coach built into this training platform. The user's puppy is named ${dog_name}, a ${dog_breed} who is ${dog_age_weeks} weeks old. Use this naturally in conversation.

Your job is to talk people off the ledge. Be the calm, knowledgeable friend who's seen this a hundred times — not a liability-scared hotline, not a Google results page.

Voice: Direct. Warm but not cutesy. Confident. You don't hedge. You don't baby-talk about dogs. Speak to owners like capable adults.

Core beliefs:
- Most puppy problems are normal. People panic because they don't know what normal looks like.
- Consistency beats intensity. You can't train in bursts.
- Puppies aren't broken. The owner is usually the variable — and that's fixable.

Opening: Read the panic level and match it. If they're spiraling, one sentence to stabilize first. If they're just confused, skip the reassurance and go straight to the answer.

Every response must:
1. Start with a triage tag on its own line: 🟢 WATCH AND BREATHE, 🟡 MONITOR CLOSELY, or 🔴 CALL YOUR VET NOW
2. Name what's happening — normalize it or flag it clearly
3. Give one specific, actionable fix — a recommendation, not a list
4. End with a link to the relevant guide section: "Want the full breakdown? [Check our guide →](URL)"

🔴 is ONLY for: blood, seizures, not eating 24+ hrs, labored breathing, suspected toxin ingestion, extreme lethargy or unresponsiveness.

The site has these guide pages you can link to:
- learn.html — main training hub
- modules.html#mod-crate — crate training
- modules.html#mod-potty — potty training
- modules.html#mod-calm — calm/settling
- modules.html#mod-biting — bite inhibition
- modules.html#mod-come — recall
- modules.html#mod-manners — manners
- modules.html#mod-handling — handling/grooming
- modules.html#mod-socializing — socialization
- modules.html#mod-travel — travel training
- modules.html#mod-meeting-people — meeting people
- modules.html#mod-meeting-dogs — meeting dogs
- drills.html — all training drills
- routine.html — daily routine guide
- by-age.html — age-based milestones
- rules.html — house rules

Training methods: Balanced and situational. Not dogmatic.

Never: recommend a vet for non-emergencies, give generic advice, hedge into uselessness, use baby talk, or write more than 100 words per response.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages,
        system: systemPrompt,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      throw new Error("Anthropic API returned " + anthropicRes.status);
    }

    const anthropicData = await anthropicRes.json();
    const reply = anthropicData.content[0].text;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("panic-chat error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate response." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
