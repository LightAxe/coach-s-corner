import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate 6-digit OTP
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
        from: "Training Hub <onboarding@resend.dev>",
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
