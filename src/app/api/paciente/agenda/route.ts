import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNowInTimezone } from "@/lib/time";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id, name, timezone")
    .eq("access_code", code.trim())
    .single();

  if (householdError || !household) {
    return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  }

  const { date: today, dayOfWeek } = getNowInTimezone(household.timezone);

  const { data: medications, error: medsError } = await supabase
    .from("medications")
    .select("*, schedules(*)")
    .eq("household_id", household.id)
    .eq("active", true);

  if (medsError) {
    return NextResponse.json({ error: medsError.message }, { status: 500 });
  }

  const scheduleIds = (medications ?? []).flatMap((m) =>
    (m.schedules ?? []).filter((s: { active: boolean }) => s.active).map((s: { id: string }) => s.id)
  );

  const { data: logs } = await supabase
    .from("intake_logs")
    .select("*")
    .in("schedule_id", scheduleIds.length > 0 ? scheduleIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("scheduled_date", today);

  const doses = (medications ?? []).flatMap((med) =>
    (med.schedules ?? [])
      .filter((s: { active: boolean; days_of_week: number[] }) => s.active && s.days_of_week.includes(dayOfWeek))
      .map((s: { id: string; time_of_day: string }) => {
        const log = logs?.find((l) => l.schedule_id === s.id);
        return {
          schedule_id: s.id,
          time_of_day: s.time_of_day,
          medication: {
            id: med.id,
            name: med.name,
            color: med.color,
            shape: med.shape,
            notes: med.notes,
            photo_url: med.photo_url,
          },
          status: log?.status ?? "pending",
        };
      })
  );

  doses.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));

  return NextResponse.json({
    household: { id: household.id, name: household.name },
    today,
    doses,
  });
}
