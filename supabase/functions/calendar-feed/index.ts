import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatICalDate(dateStr: string): string {
  // Convert yyyy-mm-dd to YYYYMMDD (all-day VALUE=DATE format)
  return dateStr.replace(/-/g, "");
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function nowICalTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const include = url.searchParams.get("include") || "races";

    if (!token) {
      return new Response("Missing token parameter", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up team by calendar_feed_token
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("calendar_feed_token", token)
      .single();

    if (teamError || !team) {
      return new Response("Invalid or expired token", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const events: string[] = [];
    const dtstamp = nowICalTimestamp();

    // Fetch races
    if (include === "races" || include === "all") {
      const { data: races } = await supabase
        .from("races")
        .select("id, name, race_date, location, transportation_info, details")
        .eq("team_id", team.id)
        .order("race_date", { ascending: true });

      if (races) {
        for (const race of races) {
          const descParts: string[] = [];
          if (race.transportation_info) descParts.push(`Transportation: ${race.transportation_info}`);
          if (race.details) descParts.push(race.details);

          let event = `BEGIN:VEVENT
UID:race-${race.id}@coachscorner
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${formatICalDate(race.race_date)}
DTEND;VALUE=DATE:${addDays(race.race_date, 1)}
SUMMARY:${escapeICalText(race.name)}`;

          if (race.location) {
            event += `\nLOCATION:${escapeICalText(race.location)}`;
          }
          if (descParts.length > 0) {
            event += `\nDESCRIPTION:${escapeICalText(descParts.join("\n"))}`;
          }

          event += "\nEND:VEVENT";
          events.push(event);
        }
      }
    }

    // Fetch scheduled workouts
    if (include === "workouts" || include === "all") {
      const { data: workouts } = await supabase
        .from("scheduled_workouts")
        .select("id, title, scheduled_date, type, description, athlete_notes")
        .eq("team_id", team.id)
        .order("scheduled_date", { ascending: true });

      if (workouts) {
        for (const workout of workouts) {
          const descParts: string[] = [];
          descParts.push(`Type: ${workout.type}`);
          if (workout.description) descParts.push(workout.description);
          if (workout.athlete_notes) descParts.push(`Notes: ${workout.athlete_notes}`);

          let event = `BEGIN:VEVENT
UID:workout-${workout.id}@coachscorner
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${formatICalDate(workout.scheduled_date)}
DTEND;VALUE=DATE:${addDays(workout.scheduled_date, 1)}
SUMMARY:${escapeICalText(workout.title)}`;

          if (descParts.length > 0) {
            event += `\nDESCRIPTION:${escapeICalText(descParts.join("\n"))}`;
          }

          event += "\nEND:VEVENT";
          events.push(event);
        }
      }
    }

    const calendarName = `${team.name} - ${include === "all" ? "Schedule" : include === "workouts" ? "Workouts" : "Races"}`;

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Coach's Corner//Calendar Feed//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICalText(calendarName)}
X-WR-TIMEZONE:America/New_York
${events.join("\n")}
END:VCALENDAR`;

    return new Response(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=calendar.ics",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in calendar-feed function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
