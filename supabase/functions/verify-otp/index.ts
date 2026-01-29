import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  email: string;
  code: string;
  signupData?: {
    firstName: string;
    lastName: string;
    phone?: string;
    role: "coach" | "athlete" | "parent";
  };
}

serve(async (req) => {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      console.error("OTP validation failed:", findError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired code. Please request a new one." 
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

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Existing user - just return their info
      userId = existingUser.id;
    } else {
      // New user - create account
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

      // Create profile if signup data provided
      if (signupData) {
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
          // Don't throw - user is created, profile can be created later
        }
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
