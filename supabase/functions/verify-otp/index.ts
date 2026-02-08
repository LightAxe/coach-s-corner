import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TWILIO_VERIFY_BASE = "https://verify.twilio.com/v2/Services";

// Dynamic CORS
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

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const VALID_ROLES = ["coach", "athlete", "parent"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

interface SignupData {
  firstName: string;
  lastName: string;
  phone?: string;
  role: ValidRole;
}

// Rate limiting: max 10 verification attempts per identifier per hour
// deno-lint-ignore no-explicit-any
async function checkVerifyRateLimit(supabase: any, identifier: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("otp_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier.toLowerCase())
    .eq("action_type", "verify")
    .gte("created_at", oneHourAgo);
  if (error) {
    console.error("Rate limit check error:", error);
    return true;
  }
  return (count || 0) < 10;
}

// deno-lint-ignore no-explicit-any
async function recordVerifyAttempt(supabase: any, identifier: string): Promise<void> {
  await supabase.from("otp_rate_limits").insert({
    identifier: identifier.toLowerCase(),
    action_type: "verify",
  });
}

// ── SMS verification via Twilio Verify ──────────────────────────────────────
async function handleSmsVerify(
  phone: string,
  code: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return jsonResponse({ success: false, error: "SMS service not configured" }, 500, corsHeaders);
  }

  // Call Twilio VerificationCheck
  const twilioUrl = `${TWILIO_VERIFY_BASE}/${TWILIO_VERIFY_SERVICE_SID}/VerificationChecks`;
  const twilioResponse = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, Code: code }),
  });

  const twilioData = await twilioResponse.json();

  if (!twilioResponse.ok || twilioData.status !== "approved") {
    return jsonResponse(
      { success: false, error: "Invalid or expired code. Please try again." },
      400,
      corsHeaders
    );
  }

  // Twilio approved — find user by phone number (normalize to last 10 digits)
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneLast10 = phoneDigits.slice(-10);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, phone")
    .not("phone", "is", null);

  const matchingProfile = profiles?.find((p: { phone: string | null }) => {
    if (!p.phone) return false;
    const storedDigits = p.phone.replace(/\D/g, "");
    return storedDigits.slice(-10) === phoneLast10;
  });

  if (!matchingProfile) {
    return jsonResponse(
      { success: false, error: "No account found with that phone number." },
      400,
      corsHeaders
    );
  }

  // Look up auth user by profile email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const authUser = existingUsers?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === matchingProfile.email?.toLowerCase()
  );

  if (!authUser) {
    return jsonResponse(
      { success: false, error: "Invalid or expired code. Please try again." },
      400,
      corsHeaders
    );
  }

  // Generate session
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: authUser.email,
  });

  if (sessionError || !sessionData.properties?.action_link) {
    console.error("Error generating session:", sessionError);
    throw new Error("Failed to generate session");
  }

  return jsonResponse(
    {
      success: true,
      isNewUser: false,
      userId: authUser.id,
      actionLink: sessionData.properties.action_link,
    },
    200,
    corsHeaders
  );
}

// ── Email verification (existing flow, unchanged) ───────────────────────────
async function handleEmailVerify(
  email: string,
  code: string,
  signupData: SignupData | undefined,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Find valid OTP
  const { data: otpRecord, error: findError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (findError || !otpRecord) {
    // Increment verification_attempts
    const { data: latestCode } = await supabase
      .from("otp_codes")
      .select("id, verification_attempts")
      .eq("email", email.toLowerCase())
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestCode) {
      const newAttempts = (latestCode.verification_attempts || 0) + 1;
      if (newAttempts >= 5) {
        await supabase.from("otp_codes").update({ used: true }).eq("id", latestCode.id);
      } else {
        await supabase.from("otp_codes").update({ verification_attempts: newAttempts }).eq("id", latestCode.id);
      }
    }

    return jsonResponse(
      { success: false, error: "Invalid or expired code. Please try again." },
      400,
      corsHeaders
    );
  }

  // Mark OTP as used
  await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);

  // Check if user exists in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;
  let isNewUser = false;
  let hasProfile = false;

  if (existingUser) {
    userId = existingUser.id;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    hasProfile = !!profileData;

    if (!hasProfile && !signupData) {
      return jsonResponse(
        { success: false, error: "Invalid or expired code. Please try again." },
        400,
        corsHeaders
      );
    }

    if (!hasProfile && signupData) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        email: email.toLowerCase(),
        phone: signupData.phone || null,
        role: signupData.role,
      });
      if (profileError) {
        console.error("Error creating profile:", profileError);
      } else {
        hasProfile = true;
        isNewUser = true;
      }
    }
  } else {
    if (!signupData) {
      return jsonResponse(
        { success: false, error: "Invalid or expired code. Please try again." },
        400,
        corsHeaders
      );
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      throw new Error("Failed to create account");
    }

    userId = newUser.user.id;
    isNewUser = true;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      first_name: signupData.firstName,
      last_name: signupData.lastName,
      email: email.toLowerCase(),
      phone: signupData.phone || null,
      role: signupData.role,
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
    }
  }

  // Generate session
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: email.toLowerCase(),
  });

  if (sessionError) {
    console.error("Error generating session:", sessionError);
    throw new Error("Failed to generate session");
  }

  const actionLink = sessionData.properties?.action_link;
  if (!actionLink) {
    throw new Error("Failed to generate login link");
  }

  return jsonResponse(
    { success: true, isNewUser, userId, actionLink },
    200,
    corsHeaders
  );
}

// ── Main handler ────────────────────────────────────────────────────────────
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

    // Backwards compat: accept { email, code } as { identifier, method: 'email', code }
    const identifier: string = body.identifier ?? body.email;
    const method: string = body.method ?? "email";
    const code: string = body.code;
    const signupData: SignupData | undefined = body.signupData;

    if (!identifier || !code) {
      throw new Error("Identifier and code are required");
    }

    // Sanitize code
    const sanitizedCode = code.trim();
    if (!/^\d{6}$/.test(sanitizedCode)) {
      return jsonResponse({ success: false, error: "Invalid code format" }, 400, corsHeaders);
    }

    // Validate signup data if provided
    if (signupData) {
      if (!VALID_ROLES.includes(signupData.role)) {
        return jsonResponse({ success: false, error: "Invalid role specified" }, 400, corsHeaders);
      }
      if (signupData.firstName.length > 50 || signupData.lastName.length > 50) {
        return jsonResponse({ success: false, error: "Name is too long" }, 400, corsHeaders);
      }
      if (signupData.phone && signupData.phone.length > 20) {
        return jsonResponse({ success: false, error: "Phone number is too long" }, 400, corsHeaders);
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check rate limit
    const withinRateLimit = await checkVerifyRateLimit(supabase, identifier);
    if (!withinRateLimit) {
      return jsonResponse(
        { success: false, error: "Too many attempts. Please request a new code." },
        429,
        corsHeaders
      );
    }
    await recordVerifyAttempt(supabase, identifier);

    if (method === "sms") {
      return await handleSmsVerify(identifier, sanitizedCode, supabase, corsHeaders);
    } else {
      return await handleEmailVerify(identifier, sanitizedCode, signupData, supabase, corsHeaders);
    }
  } catch (error: unknown) {
    console.error("Error in verify-otp function:", error);
    const errCorsHeaders = getCorsHeaders(req);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...errCorsHeaders } }
    );
  }
});
