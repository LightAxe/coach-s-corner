import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_URL = "https://api.resend.com/emails";
const TWILIO_VERIFY_BASE = "https://verify.twilio.com/v2/Services";

// Dynamic CORS with pattern matching for lovable.app domains
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

// Cryptographically secure OTP generation
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000)).padStart(6, "0");
}

// Rate limiting: max 5 requests per identifier per hour
// deno-lint-ignore no-explicit-any
async function checkRateLimit(supabase: any, identifier: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("otp_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier.toLowerCase())
    .eq("action_type", "send")
    .gte("created_at", oneHourAgo);
  if (error) {
    console.error("Rate limit check error:", error);
    return true;
  }
  return (count || 0) < 5;
}

// deno-lint-ignore no-explicit-any
async function recordRateLimit(supabase: any, identifier: string): Promise<void> {
  await supabase.from("otp_rate_limits").insert({
    identifier: identifier.toLowerCase(),
    action_type: "send",
  });
}

// ── SMS flow via Twilio Verify ──────────────────────────────────────────────
async function handleSmsSend(
  phone: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate E.164 US format
  if (!/^\+1\d{10}$/.test(phone)) {
    return jsonResponse({ success: false, error: "Invalid US phone number" }, 400, corsHeaders);
  }

  // Verify a profile exists with this phone number
  // Normalize to last 10 digits for comparison (handles +1, 1, or bare 10-digit storage)
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneLast10 = phoneDigits.slice(-10);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, phone")
    .not("phone", "is", null);

  const matchingProfile = profiles?.find((p: { phone: string | null }) => {
    if (!p.phone) return false;
    const storedDigits = p.phone.replace(/\D/g, "");
    return storedDigits.slice(-10) === phoneLast10;
  });

  if (!matchingProfile) {
    // Generic message to prevent enumeration
    return jsonResponse(
      { success: false, error: "No account found with that phone number." },
      400,
      corsHeaders
    );
  }

  // Rate limit check
  const withinRateLimit = await checkRateLimit(supabase, phone);
  if (!withinRateLimit) {
    return jsonResponse(
      { success: false, error: "Too many requests. Please try again later." },
      429,
      corsHeaders
    );
  }
  await recordRateLimit(supabase, phone);

  // Call Twilio Verify
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    console.error("Twilio environment variables not configured");
    return jsonResponse({ success: false, error: "SMS service not configured" }, 500, corsHeaders);
  }

  const twilioUrl = `${TWILIO_VERIFY_BASE}/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const twilioResponse = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" }),
  });

  if (!twilioResponse.ok) {
    const errText = await twilioResponse.text();
    console.error("Twilio Verify error:", errText);
    return jsonResponse({ success: false, error: "Failed to send SMS code" }, 500, corsHeaders);
  }

  console.log("SMS OTP sent via Twilio Verify");
  return jsonResponse({ success: true, message: "OTP sent successfully" }, 200, corsHeaders);
}

async function handleSmsPhoneVerificationSend(
  phone: string,
  requesterId: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!/^\+1\d{10}$/.test(phone)) {
    return jsonResponse({ success: false, error: "Invalid US phone number" }, 400, corsHeaders);
  }

  // Prevent using a phone number that belongs to another profile.
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneLast10 = phoneDigits.slice(-10);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, phone")
    .not("phone", "is", null);

  const conflictingProfile = profiles?.find((p: { id: string; phone: string | null }) => {
    if (!p.phone || p.id === requesterId) return false;
    const storedDigits = p.phone.replace(/\D/g, "");
    return storedDigits.slice(-10) === phoneLast10;
  });

  if (conflictingProfile) {
    return jsonResponse({ success: false, error: "Phone number is already in use." }, 409, corsHeaders);
  }

  const withinRateLimit = await checkRateLimit(supabase, phone);
  if (!withinRateLimit) {
    return jsonResponse(
      { success: false, error: "Too many requests. Please try again later." },
      429,
      corsHeaders
    );
  }
  await recordRateLimit(supabase, phone);

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    console.error("Twilio environment variables not configured");
    return jsonResponse({ success: false, error: "SMS service not configured" }, 500, corsHeaders);
  }

  const twilioUrl = `${TWILIO_VERIFY_BASE}/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const twilioResponse = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" }),
  });

  if (!twilioResponse.ok) {
    const errText = await twilioResponse.text();
    console.error("Twilio Verify error:", errText);
    return jsonResponse({ success: false, error: "Failed to send SMS code" }, 500, corsHeaders);
  }

  return jsonResponse({ success: true, message: "OTP sent successfully" }, 200, corsHeaders);
}

// ── Email flow via Resend (unchanged) ───────────────────────────────────────
async function handleEmailSend(
  email: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  // Rate limit
  const withinRateLimit = await checkRateLimit(supabase, email);
  if (!withinRateLimit) {
    return jsonResponse(
      { success: false, error: "Too many requests. Please try again later." },
      429,
      corsHeaders
    );
  }
  await recordRateLimit(supabase, email);

  // Generate OTP
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate existing codes
  await supabase
    .from("otp_codes")
    .update({ used: true })
    .eq("email", email.toLowerCase())
    .eq("used", false);

  // Store new OTP
  const { error: insertError } = await supabase.from("otp_codes").insert({
    email: email.toLowerCase(),
    code,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("Error storing OTP:", insertError);
    throw new Error("Failed to generate verification code");
  }

  // Send email via Resend
  const emailResponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Faster Pack <noreply@goatmeal.org>",
      to: [email],
      subject: "Your Faster Pack Login Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background-color: #16a34a; color: white; font-weight: bold; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">FP</div>
            </div>
            <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center; margin: 0 0 16px 0;">
              Your Login Code
            </h1>
            <p style="font-size: 16px; color: #666666; text-align: center; margin: 0 0 32px 0; line-height: 1.5;">
              Enter this code to sign in to Faster Pack:
            </p>
            <div style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #16a34a;">
                ${code}
              </span>
            </div>
            <p style="font-size: 14px; color: #999999; text-align: center; margin: 0; line-height: 1.5;">
              This code expires in 10 minutes.<br>
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const errorData = await emailResponse.text();
    console.error("Resend API error:", errorData);
    throw new Error("Failed to send verification email");
  }

  console.log("Email sent successfully");
  return jsonResponse({ success: true, message: "OTP sent successfully" }, 200, corsHeaders);
}

// Helper
function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const body = await req.json();

    // Backwards compat: accept { email } as { identifier, method: 'email' }
    const identifier: string = body.identifier ?? body.email;
    const method: string = body.method ?? "email";
    const purpose: string = body.purpose ?? "login";

    if (!identifier) {
      throw new Error("Identifier is required");
    }

    // Validate input length
    if (identifier.length > 255) {
      return jsonResponse({ success: false, error: "Invalid input" }, 400, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Opportunistic cleanup
    await supabase.rpc("cleanup_expired_otp_codes");
    await supabase.rpc("cleanup_otp_rate_limits");

    if (purpose === "phone_verification") {
      if (method !== "sms") {
        return jsonResponse({ success: false, error: "Phone verification requires SMS." }, 400, corsHeaders);
      }

      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401, corsHeaders);
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401, corsHeaders);
      }

      return await handleSmsPhoneVerificationSend(identifier, userData.user.id, supabase, corsHeaders);
    }

    if (method === "sms") {
      return await handleSmsSend(identifier, supabase, corsHeaders);
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return jsonResponse({ success: false, error: "Invalid email format" }, 400, corsHeaders);
      }
      return await handleEmailSend(identifier, supabase, corsHeaders);
    }
  } catch (error: unknown) {
    console.error("Error in send-otp function:", error);
    const errCorsHeaders = getCorsHeaders(req);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...errCorsHeaders },
      }
    );
  }
});
