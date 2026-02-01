import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Valid roles whitelist
const VALID_ROLES = ['coach', 'athlete', 'parent'] as const;
type ValidRole = typeof VALID_ROLES[number];

interface VerifyRequest {
  email: string;
  code: string;
  signupData?: {
    firstName: string;
    lastName: string;
    phone?: string;
    role: ValidRole;
  };
}

// Rate limiting: max 10 verification attempts per email per hour
// deno-lint-ignore no-explicit-any
async function checkVerifyRateLimit(supabase: any, email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from("otp_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("action_type", "verify")
    .gte("created_at", oneHourAgo);
  
  if (error) {
    console.error("Rate limit check error:", error);
    return true; // Allow on error
  }
  
  return (count || 0) < 10; // More lenient for verify (allow some typos)
}

// deno-lint-ignore no-explicit-any
async function recordVerifyAttempt(supabase: any, email: string): Promise<void> {
  await supabase
    .from("otp_rate_limits")
    .insert({
      email: email.toLowerCase(),
      action_type: "verify",
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

    const { email, code, signupData }: VerifyRequest = await req.json();
    if (!email || !code) {
      throw new Error("Email and code are required");
    }

    // Sanitize and validate OTP input - must be exactly 6 digits
    const sanitizedCode = code.trim();
    if (!/^\d{6}$/.test(sanitizedCode)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid code format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate role if signupData is provided
    if (signupData && !VALID_ROLES.includes(signupData.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid role specified" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate signup data field lengths
    if (signupData) {
      if (signupData.firstName.length > 50 || signupData.lastName.length > 50) {
        return new Response(
          JSON.stringify({ success: false, error: "Name is too long" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      if (signupData.phone && signupData.phone.length > 20) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone number is too long" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check verification rate limit
    const withinRateLimit = await checkVerifyRateLimit(supabase, email);
    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many attempts. Please request a new code." 
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Record this verification attempt
    await recordVerifyAttempt(supabase, email);

    // Find valid OTP
    const { data: otpRecord, error: findError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", sanitizedCode)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !otpRecord) {
      // We'll increment verification_attempts below after fetching the latest code

      // Check if code should be invalidated (too many attempts)
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
          // Invalidate code after 5 failed attempts
          await supabase
            .from("otp_codes")
            .update({ used: true })
            .eq("id", latestCode.id);
        } else {
          // Just increment the counter
          await supabase
            .from("otp_codes")
            .update({ verification_attempts: newAttempts })
            .eq("id", latestCode.id);
        }
      }

      // Generic error message to prevent user enumeration
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired code. Please try again." 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Check if user exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;
    let hasProfile = false;

    if (existingUser) {
      userId = existingUser.id;
      
      // Check if they have a profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      hasProfile = !!profileData;
      
      // If no profile and no signup data, return generic error (prevents user enumeration)
      if (!hasProfile && !signupData) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid or expired code. Please try again."
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      // If they have signup data but no profile, create the profile
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
      // New user - need signup data
      if (!signupData) {
        // Generic error message to prevent user enumeration
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid or expired code. Please try again."
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      // Create new user
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

      // Create profile
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

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
    });

    if (sessionError) {
      console.error("Error generating session:", sessionError);
      throw new Error("Failed to generate session");
    }

    // Extract the token from the action link
    const actionLink = sessionData.properties?.action_link;
    if (!actionLink) {
      throw new Error("Failed to generate login link");
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        userId,
        actionLink,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in verify-otp function:", error);
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
