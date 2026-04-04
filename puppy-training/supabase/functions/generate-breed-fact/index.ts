import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { device_id, dog_breed, dog_age_weeks, date } = await req.json();

    if (!device_id || !dog_breed || dog_age_weeks == null || !date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase client with service role for DB writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache
    const { data: cached } = await supabase
      .from("daily_breed_facts")
      .select("fact")
      .eq("device_id", device_id)
      .eq("fact_date", date)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ cached: true, fact: cached.fact }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a canine development expert. Give one genuinely interesting, specific, and actionable breed fact. Respond with ONLY the fact text, 1-3 sentences. No JSON, no formatting, just the plain text.

Rules:
- Must be specific to the breed, not generic dog facts
- Must be relevant to the puppy's current age/development stage
- Should be something the owner can actually use or observe today
- Tone: warm, slightly surprising, like "did you know?" energy
- Never repeat common knowledge — go deeper`;

    const userPrompt = `Give me one breed fact for a ${dog_breed} who is ${dog_age_weeks} weeks old.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
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
    const fact = anthropicData.content[0].text.trim();

    // Cache in Supabase
    await supabase.from("daily_breed_facts").insert({
      device_id,
      fact_date: date,
      breed: dog_breed,
      dog_age_weeks,
      fact,
    });

    return new Response(JSON.stringify({ cached: false, fact }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-breed-fact error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate breed fact. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
