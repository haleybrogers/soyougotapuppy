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
    const { dog_name, dog_breed, dog_age_weeks, training_log } = await req.json();

    if (!dog_name || !training_log) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a warm, knowledgeable puppy training coach reviewing a training log. Analyze the data and return valid JSON matching this schema:

{
  "themes": "2-3 sentences about the overarching themes you see in their training — what areas they've been focusing on, patterns in their consistency, and how their training approach is shaping up.",
  "wins": "2-3 sentences highlighting specific things they're doing well. Be specific — reference actual sessions or notes from the log. Celebrate their effort.",
  "recommendations": "2-3 actionable, specific recommendations based on gaps you see. If they're heavy on one area and light on another, suggest rebalancing. If notes mention struggles, address them directly.",
  "encouragement": "1-2 sentences of genuine encouragement. Not generic — reference something specific from their log that shows they're trying."
}

Rules:
- Be specific and reference their actual data — don't be generic
- Tone: warm, direct, slightly funny, like a friend who knows dogs
- If they have very little data, keep it short and encourage them to keep logging
- Return ONLY valid JSON, no markdown, no backticks`;

    const userPrompt = `Here's the training log for ${dog_name}, a ${dog_breed} who is ${dog_age_weeks} weeks old:

${training_log}

Analyze this log and give me themes, wins, recommendations, and encouragement.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: userPrompt }],
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
    const jsonStr = rawText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
    const summary = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-log-summary error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate summary." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
