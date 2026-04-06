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
    const { device_id, phone, frequency, dog_name, dog_breed, dog_age_weeks, enabled } = await req.json();

    if (!device_id || !phone) {
      return new Response(JSON.stringify({ error: "Missing required fields: device_id and phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert reminder preferences
    const { error } = await supabase
      .from("reminder_subscriptions")
      .upsert({
        device_id,
        phone,
        frequency: frequency || "weekly",
        dog_name: dog_name || null,
        dog_breed: dog_breed || null,
        dog_age_weeks: dog_age_weeks || null,
        enabled: enabled !== false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "device_id",
      });

    if (error) {
      console.error("Upsert error:", error);
      throw new Error(error.message);
    }

    // If this is a new subscription, send a welcome text
    if (enabled !== false) {
      try {
        await sendWelcomeText(phone, dog_name);
      } catch (smsErr) {
        console.warn("Welcome SMS failed (non-blocking):", smsErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("register-reminders error:", err);
    return new Response(JSON.stringify({ error: "Failed to save reminder preferences." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWelcomeText(phone: string, dogName?: string) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioSid || !twilioAuth || !twilioFrom) {
    console.warn("Twilio credentials not configured — skipping welcome SMS");
    return;
  }

  const name = dogName ? dogName + "'s" : "your";
  const body = `🐾 welcome to puppy training reminders! you'll get ${name} training plan sent right here. reply STOP anytime to opt out.`;

  const params = new URLSearchParams({
    To: phone.startsWith("+") ? phone : "+1" + phone,
    From: twilioFrom,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(twilioSid + ":" + twilioAuth),
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Twilio error: " + errText);
  }
}
