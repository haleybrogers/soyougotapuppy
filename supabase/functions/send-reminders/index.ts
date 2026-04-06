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
    // This function is triggered by a cron job (Supabase pg_cron or external scheduler)
    // It checks which users need reminders today and sends them

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      throw new Error("Twilio credentials not configured");
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday

    // Get all enabled subscriptions
    const { data: subs, error } = await supabase
      .from("reminder_subscriptions")
      .select("*")
      .eq("enabled", true);

    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const sub of subs) {
      // Skip if already sent today
      if (sub.last_sent === today) continue;

      // Weekly subscribers only get Monday messages
      if (sub.frequency === "weekly" && dayOfWeek !== 1) continue;

      // Generate a personalized training reminder
      const message = await generateReminder(anthropicKey, sub);

      // Send SMS
      await sendSMS(twilioSid, twilioAuth, twilioFrom, sub.phone, message);

      // Update last_sent
      await supabase
        .from("reminder_subscriptions")
        .update({ last_sent: today })
        .eq("device_id", sub.device_id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount, total_subs: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateReminder(anthropicKey: string | undefined, sub: any): Promise<string> {
  if (!anthropicKey) {
    // Fallback if no API key
    const name = sub.dog_name || "your puppy";
    return `🐾 training time! ${name} is waiting. even 5 minutes of focused practice today makes a difference. you've got this.`;
  }

  const dogName = sub.dog_name || "your puppy";
  const breed = sub.dog_breed || "mixed breed";
  const ageWeeks = sub.dog_age_weeks || "unknown";

  const systemPrompt = `You write short SMS training reminders for puppy owners. Max 160 characters. Include one specific, actionable thing to practice today. Use the dog's name. Tone: warm, direct, slightly irreverent — like a knowledgeable friend who texts you. Lowercase. Start with 🐾. No links, no hashtags, no exclamation marks.`;

  const userPrompt = `Write a training reminder for ${dogName}, a ${breed} who is ${ageWeeks} weeks old.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
    });

    if (!res.ok) throw new Error("Anthropic API error");
    const data = await res.json();
    return data.content[0].text.trim();
  } catch (err) {
    console.warn("AI generation failed, using fallback:", err);
    return `🐾 ${dogName} is ready when you are. 5 minutes of focused practice > 30 minutes of chaos management. go do the thing.`;
  }
}

async function sendSMS(sid: string, auth: string, from: string, to: string, body: string) {
  const phone = to.startsWith("+") ? to : "+1" + to;

  const params = new URLSearchParams({
    To: phone,
    From: from,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(sid + ":" + auth),
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Twilio send failed: " + errText);
  }
}
