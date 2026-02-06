import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_URL = "https://api.resend.com/emails";

// Dynamic CORS with pattern matching for lovable.app domains
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Allow lovable.app domains (preview and production)
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/i.test(origin)) {
    return true;
  }
  
  // Allow localhost for development
  if (/^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }
  
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
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
  return String(100000 + (array[0] % 900000)).padStart(6, '0');
}

// Rate limiting: max 5 requests per email per hour
// deno-lint-ignore no-explicit-any
async function checkRateLimit(supabase: any, email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from("otp_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("action_type", "send")
    .gte("created_at", oneHourAgo);
  
  if (error) {
    console.error("Rate limit check error:", error);
    return true; // Allow on error to not block legitimate users
  }
  
  return (count || 0) < 5;
}

// deno-lint-ignore no-explicit-any
async function recordRateLimit(supabase: any, email: string): Promise<void> {
  await supabase
    .from("otp_rate_limits")
    .insert({
      email: email.toLowerCase(),
      action_type: "send",
    });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const { email } = await req.json();
    if (!email) {
      throw new Error("Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Opportunistic cleanup of expired records
    await supabase.rpc('cleanup_expired_otp_codes');
    await supabase.rpc('cleanup_otp_rate_limits');

    // Check rate limit
    const withinRateLimit = await checkRateLimit(supabase, email);
    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many requests. Please try again later." 
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Record this request for rate limiting
    await recordRateLimit(supabase, email);

    // Generate cryptographically secure 6-digit OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing codes for this email
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Store the new OTP
    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Send email via Resend REST API
    const emailResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Training Hub <noreply@goatmeal.org>",
        to: [email],
        subject: "Your Training Hub Login Code",
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
                <div style="display: inline-block; background-color: #16a34a; color: white; font-weight: bold; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">XC</div>
              </div>
              
              <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center; margin: 0 0 16px 0;">
                Your Login Code
              </h1>
              
              <p style="font-size: 16px; color: #666666; text-align: center; margin: 0 0 32px 0; line-height: 1.5;">
                Enter this code to sign in to Training Hub:
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

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-otp function:", error);
    const corsHeaders = getCorsHeaders(req);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
